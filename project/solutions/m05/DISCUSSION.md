# m05 参考答案：该合的合，该分的分

对应章节：第 9 章（合在一起还是分开）。重复（9.3 节、红旗见 9.4 节）、通用与专用混杂（9.4～9.5 节）、连体方法（9.7 节），以及 9.7～9.8 节关于"什么时候该拆方法"的讨论。

查看完整改动：`diff -ru --exclude=build minikv solutions/m05`

## 原来的问题

### 1. 重复：每个处理函数都抄了一遍参数检查

基线 `server.cpp` 的 10 个 `handleXxx()`，开头几乎一模一样：

```cpp
if (args_.size() != 2) return "ERR wrong number of arguments for 'get'";
const std::string& key = args_[1];
if (key.size() > kMaxKeyLength) return "ERR key too long";
```

"参数个数不对"这句话写了 10 遍，键长检查写了 6 遍，整数解析写了 4 遍（`server.cpp` 里 3 处 `std::stoll`，`store.cpp` 里 1 处 `strtoll`）。重复的代价不只是行数，**副本之间已经开始走样**：

- `handleAppend()` 忘了检查键长：APPEND 一个 300 字节的键会成功，而 SET 同一个键会报错；
- `handleIncr()` 解析 delta 时检查了 `pos`，拒绝 `12abc`；`handleGetRange()` 用 `std::stoll` 时没检查，`GETRANGE k 0 1x` 会被当成 `0 1`；
- `Store::incr()` 第三次手写 `strtoll` + `errno` + `endp` 的判断。

这就是书里说的：同样的代码出现在多处，说明还没找到正确的抽象。改一条规则（比如键长上限）要改 6 个地方，漏一个就是一个 bug，而且已经漏了。

### 2. 通用与专用混杂：切词函数知道 SET 和 APPEND

`Server::tokenize()` 本来是一个通用机制：按空白切分一行。但里面写着

```cpp
if (cmd == "SET" || cmd == "APPEND") { ... rawValue_ = line.substr(i); return; }
```

通用机制里掺进了只服务两个具体命令的代码。以后再加一个值里能带空格的命令（比如 `SETNX`），就得回来改这个切词函数——而看命令列表的人根本想不到要去那里改。

### 3. 连体方法：tokenize() 和 handleSet() 必须一起读

`tokenize()` 把结果写进成员 `args_` 和 `rawValue_`，处理函数再从成员里读。单看 `handleSet()`：

```cpp
if (args_.size() != 2 || rawValue_.empty()) return "ERR wrong number of arguments for 'set'";
```

SET 有键和值两个参数，为什么检查的是 `!= 2`？`rawValue_` 是什么、什么时候是空的？不去读 `tokenize()` 的特殊分支，这两行是看不懂的；反过来，不读 `handleSet()`，也不知道 `tokenize()` 为什么要在第二个词之后停下。两个方法通过成员变量偷偷共享状态，接口上一点都看不出来。

## 改了什么

1. **一张命令表描述每个命令的参数规则**，`handle()` 统一检查：

   ```cpp
   struct Command {
       Handler handler;
       size_t minArgs;
       size_t maxArgs;
       bool firstIsKey;   // args[0] is a key and must be at most kMaxKeyLength bytes
       bool restOfLine;   // the last argument is the rest of the line, spaces included
   };
   commands_["SET"]    = {&Server::handleSet,    2, 2, true, true};
   commands_["APPEND"] = {&Server::handleAppend, 2, 2, true, true};
   ```

   "参数个数"和"键长"的检查各只写一次。处理函数可以假定参数已经合法，SET 的处理函数缩成了一行调用加错误处理。

2. **切词函数变回通用的**：`splitWords(text, maxWords)`，行为类似很多语言里带 `maxsplit` 参数的 split——"最多切成 maxWords 段，最后一段保留原样"。它不知道任何命令名；"值里能带空格"这件专用的事，由命令表里的 `restOfLine` 声明，`handle()` 据此决定传多大的 `maxWords`。

3. **处理函数的参数显式传入**：`std::string handleSet(const Args& args)`。`args_` 和 `rawValue_` 两个成员删掉了，连体关系随之消失：每个处理函数现在可以单独读懂。

4. **一个严格的整数解析函数** `parseInt64()`（`parse_int.h/.cpp`），INCR 的 delta、GETRANGE 的 start/end、`Store::incr()` 里的旧值都用它。它值得成为一个独立函数，是因为它藏住了真正容易写错的东西：`strtoll` 会接受前导空白、会在第一个非数字处悄悄停下、溢出要看 `errno`——基线的三份副本恰好各自写错了不同的部分。

数字：`server.cpp` 232 → 211 行，`server.h` 49 → 58 行，新增 `parse_int.*` 35 行；diff 为 +139 / −123。"参数个数不对"的回复 10 处 → 1 处，键长检查 6 处 → 1 处，整数解析 4 处 → 1 处。测试一行未改，全部通过。

## 行为变化（请注意）

修掉重复的同时，修掉了副本走样造成的两个不一致，因此**有两种输入的回复变了**：

| 输入 | 基线 | m05 |
|---|---|---|
| `APPEND <超过 256 字节的键> x` | `(integer) 1`（漏了检查） | `ERR key too long`，和 SET 一致 |
| `GETRANGE k 0 1x` | 当成 `0 1` 执行 | `ERR start and end must be integers`，和 INCR 一致 |

现有测试没有覆盖这两种输入，所以测试不需要改。如果你的方案保留了旧行为，也说得过去，但要能说明为什么 APPEND 应该和 SET 不一样。

## 代价与取舍

- **抽出公共代码，只有在接口保持简单时才划算（9.3 节）。** 命令表每行 5 个字段，`Command` 结构体的注释要解释每个字段，这本身也是要学的接口。它划算，是因为它替换掉了 10 份副本，而且字段都是命令本来就有的属性（几个参数、第一个是不是键）。反过来，如果为了"消灭重复"把每个处理函数里那两三行 `try/catch` 也抽成一个带 4 个参数的辅助函数，签名会比被替换的代码还复杂，那就不值了。
- **没有把处理函数拆得更碎（9.7～9.8 节）。** 有人会想继续拆：`validateKey()`、`checkArity()`、`formatInteger()`……每个两三行。那会得到一堆浅函数，读一个命令要在五六个小函数之间跳。现在的切分只在一个地方：`handle()` 负责"这一行是不是一个合法的命令调用"，处理函数负责"这个命令做什么"。两边都能单独读懂，这才是拆分的标准，而不是行数。
- **`splitWords` 多了一个参数。** 它比原来"只切词"的版本多了一个 `maxWords`。这是把专用知识从切词函数里拿出来的代价，但这个参数本身是通用的（不管哪个命令都按同样的规则理解），所以接口仍然简单。
- **每个处理函数里的 `try/catch` 仍然是重复的。** 我们有意没动：怎么处理异常是 m06（第 10 章）的题目——把异常聚合到 `handle()` 里一处处理，正是那里要做的事。

## 审稿人仍然会指出的问题（留给其他任务）

- 每个处理函数都有一份几乎相同的 `try/catch`，DEL、GETRANGE 的有些错误本可以不存在（m06）。
- `handleGet()` 先 `exists()` 再 `get()`，`bulk(s, true, true)` 的两个 bool 看不出含义（m08）。
- `Store` 的 `set/incr/append` 仍然各自重复写日志和更新索引的代码（m02）——这是另一种重复，解决办法是更通用的接口，而不是抽一个辅助函数。
