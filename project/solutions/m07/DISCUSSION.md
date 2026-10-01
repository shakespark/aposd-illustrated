# m07 参考答案：名字、注释，以及先写注释

对应章节：第 12 章（为什么写注释）、第 13 章（注释应描述代码里看不出来的东西）、第 14 章（起名字）、第 15 章（先写注释）。

查看完整改动：`diff -ru --exclude=build minikv solutions/m07`

外部行为只多了一个新命令 `RENAME`，原有测试全部不变；新增 `tests/test_rename.cpp`。

## 原来的问题

### 1. 含糊的名字（第 14.3、14.4 节）

`Store` 里最重要的两个成员是：

```cpp
uint64_t total_ = 0;   // total
uint64_t dead_ = 0;    // dead bytes
```

- `total_`：总什么？字节、记录数、键数都说得通。读 `Database::maybeCompact()` 里的 `garbage < ratio * store_.total()` 时，你得跳进 `store.cpp` 才能确认它是日志文件的字节数。
- `dead_`：注释只是把名字换了个说法。更糟的是**不一致**：README、`STATS` 的输出、`Database` 里的局部变量都叫它 garbage（`garbage_bytes=`），只有成员叫 dead。同一个概念两个名字，读者会怀疑它们是不是两个东西。
- `count()`：count of what？
- `handle(const Record&)`：handle 几乎可以指任何事。它实际做的是"把重放时读到的一条记录应用到内存里"。
- `mutable Stats stats_;  // stats`：注释零信息，而真正值得说的（为什么是 `mutable`）没说。

### 2. 重复代码的注释（第 13.2 节）

`index.h` 里的接口注释几乎全是名字的复述：`// Gets the value for the key.`、`// Erases the key.`、`// Returns the size.`。`store.cpp` 里有 `// write the record`、`// update index` 这类紧贴着代码、把代码再念一遍的注释。用书里的检验：一个没看过实现的人，只看旁边那行代码就能写出这条注释——那它就没有价值。

反过来，真正需要说明的地方没有注释。例如 `Index::find()` 返回的指针在下一次 `put()` 之后可能失效，`Store::set()` 等方法恰好依赖"先用 `old`、再 `put`"这个顺序，却没有任何地方写明这条约束。

### 3. 实现细节污染接口注释（第 13.5 节）

```cpp
// Loops over index_ and writes each entry with a second LogWriter opened
// with O_TRUNC on path_ + ".compact", fsyncs it, closes writer_,
// rename(2)s the new file over path_, reopens writer_ with O_APPEND,
// then sets total_ to the new size and dead_ to 0.
void compact();
```

这是一段步骤清单，提到了 4 个私有成员和 3 个系统调用。调用者真正想知道的——调用之后会怎样、要多久、失败了数据还在不在、中途崩溃会怎样——一句都没有。

### 4. 缺失的接口注释（第 13.1、13.5 节）

`Store` 的公有方法几乎都没有注释。只看声明，你回答不了：`get` 找不到时 `.second` 是什么？`getRange` 的 `end` 包含还是不包含？`del` 删不存在的 key 会怎样？`incr` 对不存在的 key 从几开始？失败时抛什么、数据会不会处于半改状态？这些都是接口的非正式部分（第 4.2 节），只能靠注释表达。

## 改了什么

- **改名**：`total_/total()` → `logBytes_/logBytes()`，`dead_/dead()` → `garbageBytes_/garbageBytes()`（和 STATS、README 用同一个词），`count()` → `keyCount()`，`handle()` → `replayRecord()`。`Database` 里的调用跟着改。
- **接口注释**：`Store` 的类注释说明它是什么、数据什么时候落盘、出错时内存和日志处于什么状态、不是线程安全的；每个公有方法写清楚返回值、不存在时的行为、包含/不包含、抛什么异常、失败后数据是否改变。`compact()` 的注释改成从调用者角度描述效果、代价和失败语义。
- **`index.h`**：删掉复述名字的注释，补上真正的约束（`find()` 返回的指针何时失效、`forEach` 的回调不能修改索引、`keysWithPrefix` 会扫描全部键、`recordSize` 什么时候变成垃圾）。
- **实现注释**：删掉 `// write the record` 之类，改为只写"为什么"：为什么先写日志再改内存、为什么删除记录一写下去就算垃圾、为什么压缩时只 fsync 一次、为什么 `replayRecord` 的垃圾统计必须和写路径一致。
- **`Database`**：不重复 `Store` 的注释，类注释里说一句"语义同 store.h 中的同名方法，另外每次写都可能触发压缩"（第 16.4 节：每个决定只在最显眼的地方记录一次，别处引用它）。

`store.h` 从 62 行变成 116 行，注释行从 6 行变成 49 行；`store.cpp` 从 205 行变成 220 行（其中 `rename` 约 12 行）。

## 写注释时发现的东西（第 15.3 节）

认真写接口注释，就是在检查设计。这次写注释的过程中冒出了三件事：

1. **`compact()` 的失败语义很难写简单。** 想写"失败时数据不变"，回头一查实现：基线先关掉写端再 `rename`，如果 rename 失败，之后所有写操作都会失败。诚实的注释只好写成"……如果失败发生在切换到新文件时，之后每次写都会失败，直到重新打开"。这句别扭的话就是书里说的"煤矿里的金丝雀"：注释难写，说明设计有问题。我们只把它如实记录下来，没有在本任务里修（m01 的 `LogFile::rewrite` 顺带修掉了它）。
2. **`exists()` 的注释暴露了一个奇怪的副作用。** 为了写全，必须写"像 `get()` 一样，计一次命中或未命中"。一个"查一下在不在"的方法会改统计数据，写出来就显得很不对劲；GET 先 `exists` 再 `get`，一次命中被计了两次。这是 m08 要处理的问题，这里先让它在接口上可见。
3. **`Index::find()` 的指针有效期。** 写注释之前，这是一条只存在于作者脑子里的约束。

## 先写注释：RENAME

任务要求在写任何实现之前，先写 `Store::rename` 的接口注释。参考答案的注释：

```cpp
// Gives the value of `from` to `to` and removes `from`, as if by
// set(to, value) followed by del(from). An existing value of `to` is
// replaced. Renaming a key to itself does nothing. Throws KeyNotFound if
// `from` is absent; nothing changes then.
// Not atomic across crashes: the change is logged as two records, so a
// crash between them leaves both keys holding the value after a restart
// (never neither).
void rename(const std::string& from, const std::string& to, const WriteOptions& wo);
```

写这段注释时必须先回答这些问题，否则写不下去：

| 问题 | 决定 | 理由 |
|---|---|---|
| `from` 不存在？ | 抛 `KeyNotFound`，什么都不改 | 和现有的 `del` 一致；回复 `ERR no such key` |
| `to` 已存在？ | 覆盖 | 与 SET 的语义一致；想要"不覆盖"的人可以先 EXISTS |
| `from == to`？ | 什么都不做（但 `from` 仍须存在） | 若按"先 set 再 del"机械执行，值会被删掉——这是只有写注释时才会认真想到的边界 |
| 两条日志记录之间崩溃？ | 重启后两个 key 都有这个值 | 先写 `to` 再删 `from`，保证"两个都在"而不是"两个都没了" |

最后一行最值得说。真正原子的 RENAME 需要新的记录类型（一条记录同时表示"写 to、删 from"），要改日志格式和重放逻辑。我们权衡后没有做，而是把"不原子，但只会多不会少"写进接口。如果写注释时你觉得这句话不可接受，那正说明应该去改格式——注释在这里起到了设计评审的作用。

实现只有几行，因为注释已经把所有决定做完了。

## 代价与取舍

- **头文件变长了一倍。** 有人会说注释太多。书中第 13.1 节的立场是：每个类、每个类成员、每个方法都应该有注释，例外极少；我们只省略了 `contains()`、`keyCount()` 这种名字已经说完一切的声明。衡量标准不是行数，而是每一行是否提供了代码里看不出来的信息。
- **注释放在 .h 而不是 .cpp。** 书中第 16.2 节主张把接口注释放在实现旁边，便于修改代码时同步更新；C/C++ 社区的普遍习惯是放在头文件，方便调用者阅读。我们遵循了项目已有的约定（头文件），这是一个可以讨论的选择。
- **改名会扩大 diff。** `total_` → `logBytes_` 让 `database.cpp` 也跟着改。名字是接口的一部分，改名的成本在于所有使用者；越早改越便宜。

## 审稿人仍然会指出的问题

- `get()` 仍然返回 `std::pair<bool, std::string>`，`exists()` 仍有统计副作用，`Server::bulk(s, true, true)` 的两个 bool 参数仍然看不出含义：m08。
- `del`、`getRange` 的错误情况本可以定义掉（m06）；我们只是把它们如实写进了注释。注释越写越长的地方，往往就是设计可以更简单的地方。
- `WriteOptions` 仍然透传（m03），`Store` 的写方法仍然重复（m02）。`RENAME` 在 `Server` 里又复制了一遍参数检查和 try/catch（m05 的重复问题，这里遵循了现有写法）。
