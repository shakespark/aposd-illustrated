# minikv

一个很小的键值存储：所有键值都放在内存里，每次修改先追加写到一个日志文件，启动时重放日志恢复数据；日志里的垃圾（被覆盖或删除的旧记录）多了以后自动压缩（compaction）。命令是按行输入的文本，风格类似 Redis。

> 这是《A Philosophy of Software Design》学习站的配套练习代码。它**能用、有测试**，但有意按"赶工期的战术式写法"写成，设计上埋了不少问题。任务说明见站点的 `project/index.html` 和 `project/m01.html` … `m08.html`。

## 构建、运行、测试

需要 Linux（或 WSL）和支持 C++17 的 g++，没有任何第三方依赖。

```sh
make            # 编译出 ./minikv
make test       # 编译并运行全部测试
make bench      # 微基准：GET / SET 每条命令的耗时（任务 m08 用）
make clean
```

交互运行（日志文件不存在时会自动创建）：

```sh
./minikv data.log
minikv> SET user:1 alice
OK
minikv> GET user:1
"alice"
minikv> QUIT
```

也可以从管道喂命令：`printf 'SET a 1\nGET a\n' | ./minikv data.log`。

## 命令

| 命令 | 说明 | 回复示例 |
|---|---|---|
| `SET key value` | 写入；value 是 key 之后的整行剩余部分，可以含空格 | `OK` |
| `GET key` | 读取 | `"alice"`，不存在时 `(nil)` |
| `DEL key` | 删除 | `(integer) 1`；key 不存在时报错 |
| `EXISTS key` | 是否存在 | `(integer) 1` / `(integer) 0` |
| `INCR key [delta]` | 把值当作 64 位整数加上 delta（默认 1）；key 不存在时从 0 开始 | `(integer) 42` |
| `APPEND key suffix` | 追加到值的末尾；key 不存在时等同 SET | `(integer) 新长度` |
| `GETRANGE key start end` | 取子串，下标从 0 开始，**两端都包含** | `"Hello"` |
| `KEYS [prefix]` | 列出以 prefix 开头的键，按字典序 | `1) "user:1"` … 或 `(empty array)` |
| `STATS` | 统计信息，一行 `name=value` | `keys=2 log_bytes=40 …` |
| `COMPACT` | 立即压缩日志 | `OK` |

键最长 256 字节，不能含空白字符。出错时回复 `ERR <原因>`。

## 选项

只有一个选项需要你决定：

| 命令行参数 | `Options` 字段 | 默认值 | 说明 |
|---|---|---|---|
| `--sync` | `sync_writes` | 关 | 每次写都 fsync。打开后，回复了 `OK` 的写在掉电后也不会丢；代价是每次写都要等磁盘刷盘，慢得多。关闭时，minikv 进程崩溃不丢数据，但机器掉电可能丢掉最近的写 |

其余的事情由 minikv 自己决定，不需要调：

- **什么时候压缩日志**：当垃圾（被覆盖或删除的旧记录）至少有 1 MiB，并且不少于有效数据时，自动压缩。这样日志最多约为有效数据的 2 倍，压缩带来的额外写入也不超过命令本身写入量的 1 倍。
- **内存索引的大小**：随键的数量自动增长。

## 文件结构

```
src/
  main.cpp            命令行入口：解析参数，读 stdin，打印回复
  server.h/.cpp       Server：切分命令行、分派到各命令的处理函数、格式化回复
  database.h/.cpp     Database：库的入口，持有 Store，决定什么时候压缩（策略见 maybeCompact）
  options.h           Options（只有 sync_writes）和 WriteOptions（单次写的选项）
  store.h/.cpp        Store：内存索引 + 日志；各命令的读写逻辑、重放、压缩
  index.h/.cpp        Index：键 → 值的内存索引
  stats.h             Stats：STATS 命令输出的计数器
  log_writer.h/.cpp   LogWriter：把记录编码后追加写到日志
  log_reader.h/.cpp   LogReader：从日志里一条条读出原始记录字节
  record_parser.h/.cpp RecordParser：把原始字节解码成 Record，校验 checksum
  record.h            Record 结构和磁盘上的记录格式说明
  file_handle.h/.cpp  FileHandle：POSIX 文件描述符的封装
  byte_buffer.h       ByteWriter / ByteReader：小端整数编解码
  crc32.h/.cpp        CRC-32
tests/
  test.h              迷你测试框架（TEST / CHECK / CHECK_EQ / CHECK_ERR）
  test_main.cpp       运行全部测试
  test_commands.cpp   各命令的行为（黑盒，通过 Server::handle）
  test_persistence.cpp 重启后数据还在、压缩后数据还在
  test_errors.cpp     请求合法但无法满足时的错误回复
  test_recovery.cpp   日志文件损坏时的行为
bench/
  bench.cpp           微基准（make bench）
```

## 日志格式

每条记录 = 13 字节头部 + key + value，整数都是小端：

```
offset 0   uint32  crc32（覆盖本字段之后的全部字节）
offset 4   uint8   类型：1 = Put，2 = Delete
offset 5   uint32  key 长度
offset 9   uint32  value 长度
offset 13  key，然后是 value
```
