# m02 参考答案：把专用方法换成一个通用核心

对应章节：第 6 章（通用的模块更深），第 11 章（设计两次，作为本任务的设计步骤）。

查看完整改动：`diff -ru --exclude=build minikv solutions/m02`

## 原来的问题

### 1. 一个命令一个方法（第 6.2 节、6.5 节）

基线的 `Store` 为每个写命令准备了一个方法：

```cpp
void    set(const std::string& key, const std::string& value, const WriteOptions& wo);
void    del(const std::string& key, const WriteOptions& wo);
int64_t incr(const std::string& key, int64_t delta, const WriteOptions& wo);
size_t  append(const std::string& key, const std::string& suffix, const WriteOptions& wo);
std::string getRange(const std::string& key, int64_t start, int64_t end) const;
```

每个方法只为一个命令服务，`Database` 又给每个方法配了一个同名转发。用第 6.5 节的三个问题来问：

- **能覆盖现有需求的最简接口是什么？** 存储层真正要提供的只有"读一个键""把键设成某个值""去掉一个键"。INCR、APPEND、GETRANGE 都能用这三样拼出来。
- **这个方法会在多少种场合被用到？** `incr` 只在 INCR 命令里用，`getRange` 只在 GETRANGE 里用。为单一用途设计的方法，是书里点名的警告信号。
- **对当前需求好不好用？** 好用，但代价在别处：想加一个 `DECR`、`SETNX` 或 `GETSET`，要同时改 `Store`、`Database`、`Server` 三个类，还要再复制一遍下面这段。

### 2. 同一段簿记代码写了五遍

`set`、`del`、`incr`、`append` 和重放用的 `handle` 各自做一遍"组一条 Record → 写日志 → 算这条记录多大 → 把旧记录算进垃圾 → 更新索引 → 记统计"。五份代码细节略有不同（`del` 要把墓碑本身也算成垃圾），哪天有人改了 `set` 里的垃圾统计而忘了改 `handle`，重启前后 `garbage_bytes` 就会对不上，而且没有测试会立刻发现。

### 3. 命令语义下沉到了存储层（第 6.6 节）

"值要能解析成 64 位整数""溢出要报错""GETRANGE 的 end 是闭区间"——这些是**命令语言**的规则，却写在 `Store` 里，还以异常的形式（`std::invalid_argument`、`std::overflow_error`、`std::out_of_range`、`KeyNotFound`）穿过 `Database` 传回 `Server`，再在那里翻译成错误回复。存储层被迫知道上层的特殊需求，这正是书里说的应该"把专用代码往上推"。

## 设计两次：两个候选接口

动手前先画两个差别很大的接口（第 11 章）。

**方案 A：三个原语。**

```cpp
std::pair<bool, std::string> get(const std::string& key) const;
void put(const std::string& key, const std::string& value, const WriteOptions& wo);
bool erase(const std::string& key, const WriteOptions& wo);   // 返回原来是否存在
```

INCR = `get` → 解析 → 加 → `put`；APPEND = `get` → 拼接 → `put`；GETRANGE = `get` → 截取。

**方案 B：一个读-改-写原语。**

```cpp
// fn 收到当前值（不存在时为 nullopt），返回新值；返回 nullopt 表示删除。
using Updater = std::function<std::optional<std::string>(const std::optional<std::string>&)>;
void update(const std::string& key, const Updater& fn, const WriteOptions& wo);
```

INCR = `update(key, [&](auto& old) { ... return std::to_string(n); })`；DEL 也能表达成"返回 nullopt"。

| 比较 | A：get/put/erase | B：update(key, fn) |
|---|---|---|
| 上层代码好不好写 | 直白，三个方法一看就懂 | 每个命令写一个 lambda，可读性取决于 lambda |
| 接口要解释的东西 | 每个方法一句话 | nullopt 进、nullopt 出各代表什么；fn 抛异常时日志里写了什么 |
| 查找次数 | 读-改-写要查两次哈希表 | 一次 |
| 原子性 | get 和 put 之间别人可能插进来 | `update` 内部可以加锁，天然原子 |
| 通用性 | 够用 | 更通用，连"条件删除"都能表达 |

参考答案选了 **A**。minikv 是单线程的，get 和 put 之间不会有人插进来；A 的每个方法用一句话就能说清，B 的 `Updater` 光把 nullopt 的两种含义和异常语义讲清楚就要一段注释。多查一次哈希表在这里可以忽略（见 m08 的测量，GET 的大头根本不在查找上）。

**B 什么时候会赢：** 一旦 minikv 变成多客户端并发访问，INCR 用 A 实现就有丢失更新的问题——两个客户端同时 get 到 5、各自 put 6。那时需要一个在存储层内部原子完成的读-改-写操作，B 正好是它。好消息是 A 的内部结构（所有修改都经过一个私有的 `handle()`）让以后再加 `update` 很容易。

## 改了什么

- `Store` 的写接口只剩 `put` 和 `erase`，读接口不变（`get`、`exists`、`keys`）。`incr`、`append`、`getRange` 删除，`KeyNotFound` 异常类也随之删除。
- "把一条记录应用到内存状态"只写一次：私有的 `handle(const Record&)`，它返回记录大小。`put`、`erase` 和重放都走它。
- `Database` 的四个专用转发换成 `put`、`erase` 两个。
- INCR、APPEND、GETRANGE 的语义（整数解析、溢出检查、拼接、闭区间截取）搬进 `Server` 的命令处理函数，错误回复直接在那里产生，不再经过异常翻译。
- 外部行为不变：DEL 不存在的键仍然回复 `ERR no such key`（由 `erase` 返回 false 得出），所有错误文案保持原样，`tests/` 一行没改。

行数：`store.cpp` 205 → 127，`store.h` 62 → 59，`database.cpp` 78 → 63，`server.cpp` 232 → 246。五个相关文件合计 621 → 536。`Server` 变长了，因为命令语义本来就该在它那一层；`Store` 和 `Database` 的接口一共少了 6 个方法。

## 为什么这样更深

`Store` 的接口从"每个命令一个方法"变成"三个任何键值存储都会有的操作"，而它藏住的东西一样没少：日志格式、垃圾统计、重放、压缩。加一个新命令（比如 `DECR` 或 `STRLEN`）现在只需要在 `Server` 里写一个处理函数，存储层一行不用动。这就是第 6 章说的"有点通用"（somewhat general-purpose）：功能只覆盖今天的需要，但接口不绑死在今天的命令上。

## 代价与取舍

- **INCR、APPEND 多了一次查找和一次值拷贝。** `get` 返回的是拷贝，再 `put` 回去。单线程、内存数据，这点开销可以忽略；真正在意的话应该先测量（m08）。
- **STATS 里的 `keyspace_hits`/`keyspace_misses` 会变。** 基线的 `incr`/`append`/`getRange` 直接查索引，不计数；现在它们通过 `get` 读值，会被计入命中/未命中。这只影响统计计数，命令回复不变。我们认为这样反而更一致（这三个命令确实读了键），但这是一个可见的变化，应该在提交说明里写清楚。
- **`Server` 变胖了。** 命令语义集中到 `Server` 的处理函数里。如果命令继续增多，可以把它们挪到一个独立的 `commands.cpp`，但不要再下沉回存储层。
- **别走过头（第 6.5 节）。** 更"通用"的做法是让 `Store` 只暴露 `write(const Record&)`，让上层自己组 Record——那会把日志记录这个实现细节泄漏到 `Server`，上层反而要多写代码。`put`/`erase` 是对上层最顺手的那一层通用。

## 审稿人仍然会指出的问题

- `Server` 的处理函数里，参数个数检查、键长度检查、整数解析、try/catch 仍然到处重复，现在 INCR 的处理函数更长了（m05、m06）。
- `get` 返回 `std::pair<bool, std::string>`，读的人要猜 `.first` 是什么（m08）。
- `Database` 的 `get/exists/keys/compact` 仍然是纯转发，`WriteOptions` 仍然一路透传（m03）。
- DEL 不存在的键仍然是错误；`erase` 返回 bool 已经让存储层不再把它当错误，但协议层是否也该把它定义掉，是 m06 的题目。
