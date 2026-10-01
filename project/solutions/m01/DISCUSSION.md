# m01 参考答案：把"日志文件"做成一个深模块

对应章节：第 4 章（深模块、类炎）、第 5 章（信息隐藏、信息泄漏、按时间顺序分解、过度暴露）。

查看完整改动：`diff -ru --exclude=build minikv solutions/m01`

## 原来的问题

### 1. 按时间顺序分解（第 5.3 节）

日志相关的代码按"什么时候做"切成了三个类：写的时候用 `LogWriter`，读的时候先用 `LogReader` 读出原始字节，再用 `RecordParser` 解码。可这三个阶段用到的是**同一份知识**——记录在磁盘上长什么样。结果这份知识被拆散到三个地方：

- `log_writer.cpp`：按顺序写出 crc、type、两个长度，再回头把 crc 填进前 4 个字节；
- `log_reader.cpp`：为了知道还要读多少字节，必须先解码长度，于是写了 `r.skip(5)`——"跳过 crc 的 4 字节和 type 的 1 字节"；
- `record_parser.cpp`：再把整个头部解一遍，校验 crc。

改格式（比如把长度改成 varint、加一个时间戳字段）要同时改三个文件，而且编译器不会提醒你漏了哪个。这就是书里说的"后门泄漏"（back-door leakage）：三个类的接口上看不出它们共享一个格式，依赖藏在实现里。

### 2. 泄漏到了日志模块之外（第 5.2 节）

`kRecordHeaderSize + key.size() + value.size()` 这个"一条记录占多少字节"的公式，在 `store.cpp` 里出现了 5 次（`set`、`del`、`incr`、`append`、`handle`）。`Store` 本来只关心"这条记录让日志多了多少字节"，却被迫知道头部有 13 字节。

### 3. 类炎（第 4.6 节）

`FileHandle` 的每个方法都只是调一次同名系统调用。它没有替调用者处理任何难点：部分写、`EINTR`，于是 `LogWriter::append` 和 `LogReader::readFully` 各写了一遍重试循环。`ByteWriter`/`ByteReader`、只有一个静态方法的 `RecordParser` 也都是浅类。为了"读写一个日志文件"，读代码的人要先学 5 个类。

### 4. 过度暴露（第 5.7 节）

```cpp
bool LogWriter::open(const std::string& path, int flags, mode_t mode, uint64_t startOffset);
```

最常见的用法只是"打开日志、往后追加"，调用者却必须知道：

- 要传哪几个 `open(2)` 标志（`O_WRONLY | O_CREAT | O_APPEND`）、什么权限位；
- `startOffset` 必须等于文件当前大小，否则 `append()` 返回的偏移是错的——于是 `Store::load()` 要把 `LogReader` 读到的末尾偏移搬给 `LogWriter`；
- 文件不存在时 `LogReader::open` 返回 false 且 `errno == ENOENT`，这种情况要当作"空日志"处理。

另外还有一条没写在任何地方的调用顺序：必须先重放完，再打开写端。这些都是接口的非正式部分（第 4.2 节）。

## 改了什么

五个类（`FileHandle`、`ByteWriter`/`ByteReader`、`LogWriter`、`LogReader`、`RecordParser`）合并成一个 `LogFile`：

```cpp
class LogFile {
public:
    LogFile(const std::string& path, const RecordVisitor& visit);   // 打开（必要时创建）并重放
    uint64_t append(const Record& rec, const WriteOptions& options); // 返回这条记录占的字节数
    void rewrite(const std::function<void(const RecordSink&)>& writeRecords); // 压缩时原子地整体替换
    uint64_t size() const;
};
```

- 记录格式只出现在 `log_file.cpp` 的匿名命名空间里，`record.h` 里不再有 `kRecordHeaderSize`。
- 打开和重放合成一个构造函数：调用者不可能"忘了先重放"，也不用搬运偏移、判断 `ENOENT`。
- `append()` 直接返回记录大小，`Store` 不再自己算。
- 压缩时"写临时文件 → fsync → rename → 重新打开"的整套文件操作也搬进了 `LogFile::rewrite()`，`Store::compact()` 只负责说"新日志里应该有哪些记录"。
- 部分写和 `EINTR` 的重试循环各只写一次。

数字：日志相关代码从 9 个文件 421 行变成 3 个文件 258 行；`store.cpp` 从 205 行变成 151 行。行数少不是重点，重点是**使用者要知道的东西**变少了：

| | 改之前，Store 需要知道 | 改之后 |
|---|---|---|
| 记录格式 | 头部 13 字节，记录大小的计算公式 | 不需要 |
| 打开文件 | 三个 open 标志、权限位、ENOENT 的含义、起始偏移 | 只传路径 |
| 调用顺序 | 先 LogReader 读完，再 LogWriter 打开 | 构造即可 |
| 压缩 | 临时文件名、O_TRUNC、fsync、rename、重新打开、新文件大小 | 交出记录即可 |

## 为什么这样更好

`LogFile` 的接口只有 4 个成员，却藏住了格式、校验、重试、原子替换。将来要做的很多改动都只碰这一个文件：给重放加读缓冲（现在每条记录两次 `read` 调用，大日志启动慢）、换 checksum 算法、给 `rewrite` 加目录 fsync——`Store` 一行都不用改。这就是第 5 章说的信息隐藏的两个好处：接口简单，改动局部。

顺带修了一个原来的小毛病：基线的 `compact()` 先关掉写端再 `rename`，如果 `rename` 失败，`writer_` 已经关了，之后所有写操作都会失败。`rewrite()` 先 rename 成功再切换描述符，失败时旧日志和旧描述符都还在。

## 代价与取舍

- **`LogFile` 比任何一个旧类都大。** 这是有意的：第 4 章的标准是接口相对于功能的比例，不是类的大小。258 行、一个人能读完，没有"太大"的问题。
- **构造函数带回调，不那么常见。** 也可以设计成 `open(path)` + `forEach(visit)` 两步，但那样又把"必须先重放再追加"的顺序约束放回接口里。我们选择让构造函数一次做完；代价是 `Store` 的成员声明顺序变得重要（`log_` 必须最后声明，因为重放时要往 `index_` 里写），所以在声明处留了一句注释。
- **`rewrite` 的参数是"接收一个 sink 的函数"，读起来有点绕。** 另一个设计是 `rewrite(const std::vector<Record>&)`，更直观，但压缩时内存要多一份全部数据的拷贝。我们选了回调；如果你觉得 vector 版更好，在数据量小的项目里也完全说得过去。
- **ByteWriter/ByteReader 这类通用工具没了。** 如果以后出现第二种文件格式（例如快照文件），可能会想把编解码工具重新提出来。那时再提，而且提出来的应该是有实际深度的东西，而不是一个字节一个字节的 push_back。

## 审稿人仍然会指出的问题（留给后面的任务）

- `Store` 的 `set/incr/append/del` 仍然各自重复"组记录 → 追加 → 记垃圾 → 更新索引"（m02）。
- `WriteOptions` 仍然一层层透传到 `LogFile::append`（m03）。
- `Store::compact()` 的注释仍然在描述实现步骤，`total_`、`dead_` 这样的名字仍然含糊（m07）。我们只改了注释里已经不再成立的内容。
- `rewrite()` 只保证"进程崩溃时旧日志完好"。要在掉电时也成立，rename 之后还要 fsync 所在目录——好在现在加这几行只需要改 `log_file.cpp`。
