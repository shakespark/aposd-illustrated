# minikv 问题地图

基线 `minikv/` 里有意埋下的设计问题，每一条对应原书的哪一节、在哪个任务里处理。小节号是原书第 2 版的编号。

> 先做任务再看这张表。提前看到答案，就失去了"自己认出问题"的练习机会，而这正是整个项目要练的东西。

| # | 问题 | 位置 | 原书 | 任务 |
|---|---|---|---|---|
| 1 | 按时间顺序分解：写、读原始字节、解码拆成三个类，三者共享同一份格式知识 | `LogWriter`、`LogReader`、`RecordParser` | 5.3（红旗框在 5.4） | m01 |
| 2 | 后门式信息泄漏：记录头布局同时写在三个文件里（`LogReader::next` 里的 `r.skip(5)`、`LogWriter::append` 回填 crc、`RecordParser::parse`）；记录大小公式 `kRecordHeaderSize + key.size() + value.size()` 在 `store.cpp` 里出现 5 次 | `log_*.cpp`、`record_parser.cpp`、`store.cpp` | 5.2 | m01 |
| 3 | 类炎 / 浅类：`FileHandle` 的方法都是一行系统调用，部分写和 EINTR 的重试循环被调用方各写一遍；`ByteWriter`/`ByteReader`；只有一个静态方法的 `RecordParser` | `file_handle.*`、`byte_buffer.h`、`record_parser.*` | 4.5、4.6 | m01 |
| 4 | 过度暴露：`LogWriter::open(path, flags, mode, startOffset)`，调用者要知道 open 标志、权限位、文件当前大小、ENOENT 的含义，以及"先重放再打开写端"的顺序 | `LogWriter::open`、`Store::load` | 5.7（另见 4.2、4.7） | m01 |
| 5 | 专用方法：`Store::set/del/incr/append/getRange` 各自重复"组记录 → 追加 → 记垃圾 → 更新索引"；INCR 的整数解析、GETRANGE 的切片这些命令语义落在存储层 | `store.*` | 6.2、6.3、6.5、6.6 | m02 |
| 6 | 每加一个命令要同时改 `Server`、`Database`、`Store` 三层（变更放大） | `database.*`、`store.*` | 6.2（另见 2.2） | m02（设计步骤用第 11 章"设计两次"） |
| 7 | 透传方法：`Database` 的读方法和 `compact` 原样转发给 `Store`；`Store::get/exists/keys` 原样转发给 `Index` | `database.cpp`、`store.cpp` | 7.1 | m03 |
| 8 | 接口照搬实现：`Index` 的接口几乎就是 `std::unordered_map` 的接口 | `index.*` | 7.4 | m03 |
| 9 | 透传变量：`WriteOptions` 从 `Server` 经 `Database::set/del/incr/append` 和 `Store` 的同名方法一路传到 `LogWriter::append`，只用到 `sync` 一个字段，而且每次调用都传同一个值 | `server.cpp` → `log_writer.cpp` | 7.5 | m03 |
| 10 | 配置参数往上推：`compaction_ratio`、`compaction_min_bytes`、`compaction_check_interval`、`index_reserve` 要使用者调；为此还有 `Options::validate()`、4 个命令行参数和 README 的"调参"一节 | `options.*`、`main.cpp`、`Database::maybeCompact`、README | 8.2（另见 5.9、8.3） | m04 |
| 11 | 重复：每个 `handleXxx` 都自己检查参数个数、键长、自己解析整数、自己 try/catch；重复已经产生了不一致：`handleAppend` 漏了键长检查，`handleGetRange` 用不带位置检查的 `std::stoll`，`12abc` 会被当成 12 | `server.cpp` | 9.3（红旗框在 9.4） | m05 |
| 12 | 通用与专用混杂：通用的切词函数 `Server::tokenize` 里写死了 SET 和 APPEND | `Server::tokenize` | 9.4、9.5 | m05 |
| 13 | 连体方法：`tokenize()` 往成员 `args_`、`rawValue_` 里写，`handleSet()`、`handleAppend()` 从里面读；不看 `tokenize` 就看不懂 `handleSet` 里的 `args_.size() != 2` | `server.*` | 9.7 | m05 |
| 14 | 本可以定义掉的错误：DEL 一个不存在的键报 `ERR no such key` | `Store::del`、`Server::handleDel` | 10.3 | m06 |
| 15 | 本可以定义掉的错误：GETRANGE 越界、反向、键不存在都报错 | `Store::getRange`、`Server::handleGetRange` | 10.3、10.5 | m06 |
| 16 | 异常处理散落：10 个处理函数里共 16 个 catch 子句，大多做同一件事 | `server.cpp` | 10.7（聚合） | m06 |
| 17 | 进程崩溃留下的半条记录（只可能出现在日志末尾）让程序拒绝启动，使用者只能手工截断文件 | `LogReader::next`、`Store::load` | 10.6（屏蔽） | m06 |
| 18 | 日志中间的记录损坏时的策略不清楚：和末尾半条记录走同一条报错路径，信息里没有处理建议 | `Store::load`、`main.cpp` | 10.8（直接崩溃）、10.9 | m06 |
| 19 | 含糊的名字：`Store::total_`、`dead_`、`count()`、`handle()` | `store.*` | 14.3 | m07 |
| 20 | 注释重复代码：`index.h` 的接口注释、`store.cpp` 里的 `// write the record`、`// update total`、成员后面的 `// total`、`// stats` | `index.h`、`store.*` | 13.2 | m07 |
| 21 | 实现细节污染接口注释：`Store::compact()` 的注释在逐步描述 O_TRUNC、rename、重新打开 | `store.h` | 13.5 | m07 |
| 22 | 缺接口注释：`Store` 的公有方法几乎都没有注释（GETRANGE 的 end 是否包含？找不到键时返回什么、抛什么？） | `store.h` | 13.1、13.5 | m07 |
| 23 | （练习）先写注释再实现：新增 `RENAME src dst` | `Store::rename` 等 | 15.2、15.3 | m07 |
| 24 | 不明显的返回值：`std::pair<bool, std::string> Store::get()` / `Database::get()` | `store.*`、`database.*` | 18.2 | m08 |
| 25 | 不明显的参数：`bulk(s, true, true)`、`bulk(x, false, false)` | `Server::bulk` | 18.2 | m08 |
| 26 | 出人意料的副作用：`Store::exists()` 会记 keyspace 命中/未命中，于是一次 GET 命中被记两次，EXISTS 也污染命中率 | `Store::exists`、`Server::handleGet` | 18.2 | m08 |
| 27 | GET 关键路径上的浪费：`exists` 和 `get` 两次查找、值经 `optional` 和 `pair` 拷贝两次、`std::map<std::string>` 计数器、用 `ostringstream` 逐字节格式化回复 | `Server::handleGet` → `Index::get` | 20.2～20.4 | m08 |

## 不是问题的地方

不是所有代码都有毛病，以下几处是有意写"对"的，用来练习"看起来像但其实没问题"的判断：

- `crc32()` 是一个普通函数，没有包成类。
- `Database::maybeCompact()` 里垃圾比例的判断逻辑本身没错；m04 的问题在于这些数该由谁来定。
- `Stats` 用 `std::map` 在功能上没问题；m08 测量之后才发现它在关键路径上有可测的开销。
- 测试只通过 `Server` 的命令接口和重新打开日志来检查行为，所以每个任务都能大胆重组内部。

## 各任务的参考答案

每个 `solutions/mNN/` 都是"基线 + 只做这一个任务"，彼此独立，可以单独用 `diff -ru minikv solutions/mNN` 对照（先在两边 `make clean`）。会改变外部行为的任务：

- **m05**：APPEND 超长键现在报错；`GETRANGE k 0 1x` 现在报错。
- **m06**：DEL 不存在的键回复 `(integer) 0`；GETRANGE 不再报错（负下标从末尾数、越界截断、键不存在当空串）；末尾半条记录会被截掉并在 stderr 警告；中间损坏会打印说明后 `abort()`。替换了 `tests/test_errors.cpp` 和 `tests/test_recovery.cpp`。
- **m07**：新增 `RENAME` 命令和 `tests/test_rename.cpp`。
- **m02、m08**：STATS 里 keyspace 命中/未命中的计数方式有变化（见各自的 DISCUSSION.md）。
