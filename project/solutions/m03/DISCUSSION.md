# m03 参考答案：拆掉透传层，让变量只在用它的地方出现

对应章节：第 7 章（不同的层，不同的抽象）。

查看完整改动：`diff -ru --exclude=build minikv solutions/m03`

## 原来的问题

### 1. 透传方法（第 7.1 节）

一条 `GET` 命令在基线里依次经过：

```
Server::handleGet → Database::get → Store::get → Index::get → std::unordered_map::find
```

后三个类的签名几乎一样：

```cpp
std::pair<bool, std::string> Database::get(const std::string& key) const { return store_.get(key); }
std::pair<bool, std::string> Store::get(const std::string& key) const;  // 调 index_.get(key)，加一行统计
std::optional<std::string>   Index::get(const std::string& key) const;  // 调 map_.find(key)
```

`Database` 除构造函数外的 10 个公有方法里，`get`、`exists`、`keys`、`getRange`、`compact` 是纯转发；`set`、`del`、`incr`、`append` 是"转发 + 调一次 `maybeCompact()`"。它自己真正做的事只有三件：校验 Options、决定什么时候压缩、拼 STATS 那一行。而这三件事用的信息（垃圾字节数、日志字节数、键数）全在 `Store` 手里，`Database` 只能通过 `store_.dead()`、`store_.total()`、`store_.count()` 这几个 getter 一个个要过来。

`Store` 到 `Index` 这一层也一样：`Store::get/exists/keys` 基本上只是转给 `Index`。

透传方法的害处不在于多了几次函数调用（见下文的测量），而在于**每加一个命令都要在三个类里各加一个签名**，读代码的人也要多跳两层才能找到真正干活的地方。书里说这通常意味着类之间的职责划分不清楚。

### 2. 接口照搬实现（第 7.4 节）

`Index` 的接口是 `get/contains/find/put/erase/forEach/size`——几乎就是 `std::unordered_map` 的接口换了个名字，唯一多出来的是 `keysWithPrefix`。一个接口和内部表示一一对应的类，替使用者藏不住什么。

### 3. 透传变量（第 7.5 节）

`WriteOptions` 由 `Server` 构造一次，然后作为参数穿过 `Database` 的 4 个写方法、`Store` 的 4 个写方法，最后只在 `LogWriter::append` 里读了一个字段 `sync`。中间的 8 个方法都不看它，只是往下传。基线里 `WriteOptions`/`writeOptions_`/`wo` 在这几个文件中一共出现 31 次。更说明问题的是：**它的值在一次运行中从来不变**——`Server` 每次传的都是同一个对象。如果以后要加一个字段（比如写入时间戳），又得改一串签名。

## 改了什么

对照第 7.1 节给出的三种处理方式：

- **把下层直接暴露给调用者**：如果只删掉 `Database`、让 `Server` 直接用 `Store`，那"写完以后检查要不要压缩"这件事就得由 `Server` 记着做——等于把一条调用顺序约束推给了上层。不合适。
- **重新分配功能**：`Database` 仅有的实际工作（压缩时机、STATS、Options 校验）用的全是 `Store` 的信息，挪进 `Store` 后这些 getter 也就不需要了。
- **合并**：挪完以后 `Database` 只剩转发，于是删除。`Index` 合并进 `Store`：`Store` 直接持有 `std::unordered_map`，只保留一个私有的 `lookup()` 辅助函数，前缀查找也写在 `Store::keys()` 里。

具体结果：

- 删除 `database.h/.cpp`、`index.h/.cpp`。`Server` 直接持有 `Store`。
- `Store` 的构造函数校验 Options，记下压缩阈值；`maybeCompact()` 变成 `Store` 的私有方法，在每个写方法末尾调用。`Store::stats()` 直接返回 STATS 那一行。`count()/total()/dead()` 这几个只为 `Database` 存在的 getter 删掉了。
- `Store` 的写方法不再带 `WriteOptions` 参数。"每次写要不要 fsync"在构造时由 `options.sync_writes` 决定，存成成员 `writeOptions_`。
- `WriteOptions` 仍然留在 `LogWriter::append` 上，因为**在那一层它确实会变**：普通写按配置决定是否 fsync，而压缩时写的大量记录一律不 fsync，最后统一 fsync 一次。同一个参数，在 `LogWriter` 是合理的参数，在上面三层是透传变量。
- 外部行为不变，`tests/` 一行没改。

数字：`Database`+`Index`+`Store`+`Server` 四个类 770 行，合并后 `Store`+`Server` 600 行；`src/` 总计 1418 → 1248 行。`WriteOptions` 相关的出现次数从 31 次降到 7 次，全部在 `Store` 和 `LogWriter` 之间。现在调用链是：

```
Server（文本协议） → Store（持久化的内存键值表） → LogWriter（记录编码与写文件）
```

每一层提供的抽象都不同，这正是第 7 章想要的样子。

## 关于性能：透传层几乎不花时间

很多人会以为删掉两层调用能让 GET 变快。用 `make bench` 量一下：基线 GET 命中约 1230 ns，m03 约 1120 ns，差别在机器噪声范围内（两次运行之间的波动就有这么大）。`-O2` 下这些转发函数大多被内联了。透传层是**设计**问题——它让代码更难读、更难改——而不是性能问题。GET 的时间真正花在哪里，是 m08 的题目，那里会先测量再动手。

## 如果调用者真的要逐次选择呢？

LevelDB/RocksDB 的 `Put` 也带一个 `WriteOptions`，那里它不是透传变量：调用者确实会对**不同的写**做不同的选择（比如账务记录要 fsync，缓存数据不要），所以它是接口的一部分，每一层都必须原样传下去。判断标准是：**这个参数在调用之间会不会变、由谁决定。** 在 minikv 里，它由启动参数决定，一次运行里永远不变，所以应该是 Store 的属性。如果有一天要支持 `SET key value SYNC` 这样的逐条选择，那就该把它重新做成写方法的参数——而且是从命令层一直到 `LogWriter` 都有实际意义的参数。

## 另一条路：上下文对象（第 7.5 节）

书中对透传变量给出的常用解法是上下文对象：把系统级的配置和共享状态放进一个对象，每个主要对象在构造时拿到它的引用。如果用在 minikv 里，大概是这样（只是草图，参考答案没有采用）：

```cpp
// All process-wide settings and shared counters of one minikv instance.
struct Context {
    const Options options;  // fixed at startup; safe to read from anywhere
    Stats stats;            // counters that several layers update
};

class Store {
public:
    Store(const std::string& path, Context& ctx);
private:
    Context& ctx_;
};

class LogWriter {
public:
    explicit LogWriter(Context& ctx) : ctx_(ctx) {}
    uint64_t append(const Record& rec);  // reads ctx_.options.sync_writes
private:
    Context& ctx_;
};
```

它的好处：不用全局变量，一个进程里可以有多个实例（我们的测试就同时开很多个 `Server`），测试也能通过上下文改配置。作者也坦白承认了它的毛病：

- 和全局变量一样，看不出某个字段为什么存在、谁在用它；
- 容易变成什么都往里塞的杂物袋，制造不明显的依赖；
- 多线程时要小心，最好让字段不可变。

在 minikv 现在的规模下，只有一个变量、一个使用者，把它作为构造参数交给 `Store` 就够了，引入上下文对象反而增加一个概念。当需要跨层共享的东西变多（配置、统计、时钟、日志器……），而且每样都要到达好几个类时，上下文对象才划算。全局变量我们直接排除：测试会在同一个进程里打开很多个不同的数据库。

## 代价与取舍

- **`Store` 变大了**：`store.cpp` 205 → 247 行，`store.h` 62 → 74 行。它现在同时负责"内存表 + 日志 + 压缩时机"。这些都围绕同一份信息（键、记录大小、垃圾量），放在一起是合理的；但如果以后压缩策略变复杂（比如分段日志、后台压缩），可能值得把**策略**拆成一个有实际深度的类——前提是它的接口比现在 `Database` 那堆转发更窄。
- **失去了一个"库入口"的名字**：基线里 `Database` 看起来像是给库用户准备的门面。删掉以后，库的入口就是 `Store`（以及更外层的 `Server`）。对一个只有一个使用者的小库，这不是损失。
- **少了一个可以单独测试的 `Index`**：它本来就没有自己的测试，而且接口和 `unordered_map` 一样，单独测它测的是标准库。

## 审稿人仍然会指出的问题

- `Store` 里 `set/incr/append/del` 各自重复写日志、记垃圾、更新索引，INCR/GETRANGE 的命令语义仍在存储层（m02）。
- 日志格式知识仍然分散在 `LogWriter`/`LogReader`/`RecordParser`，`LogWriter::open` 仍然过度暴露（m01）。
- 压缩阈值、检查间隔、索引预留这些参数仍然推给用户去调（m04）。
- `Store::compact()` 的注释描述的是实现步骤，`total_`、`dead_` 这样的名字仍然含糊（m07）。
