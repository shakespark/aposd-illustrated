// 第 17 章 一致性 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch17-flag-01", ch: 17, type: "flag", title: "两个 size()",
  prompt: "<p>存储引擎里的两个类，以及一段把一批记录编码进缓冲区的代码。</p>",
  code: `// buffer.h
class ByteBuffer {
public:
    size_t size() const;          // 已写入的字节数
    void reserve(size_t bytes);
};
// record_batch.h
class RecordBatch {
public:
    size_t size() const;          // 批里的记录条数
};

void encode(const RecordBatch& batch, ByteBuffer& out) {
    out.reserve(batch.size());    // 想预留足够的字节
    for (const auto& r : batch) r.encodeTo(out);
}`,
  choices: ["vague-name", "repetition", "shallow", "none"], answer: ["vague-name"], mark: [4, 10, 14],
  explain: `<p>同一个名字 <code>size</code> 在两个类里表示两种单位（第 4 行是字节，第 10 行是条数）。第 14 行的作者按 <code>ByteBuffer</code> 的经验理解了 <code>RecordBatch::size()</code>，预留的空间小了几百倍。代码不会出错，只会悄悄变慢，很难发现。</p>
<p>这是第 14 章说的名字含糊，也是本章 17.3 节警告的"假一致"：<strong>不同的东西用了相同的名字</strong>，读者基于眼熟做出的推断就不再安全。改法：全项目约定 <code>bytes()</code> 只表示字节数、<code>count()</code> 只表示条数，并把约定写进文档。</p>`,
},
{
  id: "ch17-flag-02", ch: 17, type: "flag", title: "每个方法都先连一下",
  prompt: "<p>一个客户端会话类。连接可能还没建立，也可能已经被对端关闭。</p>",
  code: `class Session {
public:
    int send(const Msg& m) {
        if (!conn_ || conn_->closed()) {
            conn_ = Conn::open(addr_);
            if (!conn_) return -ECONNREFUSED;
        }
        return conn_->write(m);
    }
    int ping() {
        if (!conn_ || conn_->closed()) {
            conn_ = Conn::open(addr_);
            if (!conn_) return -ECONNREFUSED;
        }
        return conn_->write(Msg::ping());
    }
    size_t pending() const {
        return conn_ ? conn_->queued() : 0;   // 没检查 closed()
    }
private:
    std::string addr_;
    std::unique_ptr<Conn> conn_;   // 可能为空
};`,
  choices: ["repetition", "conjoined", "shallow", "none"], answer: ["repetition"], mark: [4, 5, 6, 11, 12, 13, 18],
  explain: `<p>第 4～6 行和第 11～13 行是同一段"确保已连接"的逻辑，复制了两遍；第 18 行的作者写了第三种不完全一样的判断（忘了 <code>closed()</code>）。重复的代码在演化中很容易<strong>变得不一致</strong>，这也是第 9 章把"重复"列为红旗的原因。</p>
<p>改法有两层。第一层：抽出 <code>int ensureConnected()</code>，所有方法都调用它。第二层更彻底：想一想能不能建立一条<strong>不变式</strong>（例如由后台重连保证"<code>conn_</code> 非空"），让"连接可能不存在"这个特殊情况从大多数方法里消失。本章 17.1 节说的正是这一点：不变式减少需要考虑的特殊情况。</p>`,
},
{
  id: "ch17-flag-03", ch: 17, type: "flag", title: "不是我最喜欢的写法",
  prompt: "<p>你在一个已有的预写日志（WAL）模块里加了一个函数。你个人更喜欢 <code>std::expected</code>，但还是照着模块原有的写法写了。</p>",
  code: `// wal.h
// 本模块约定：会失败的函数返回 0 或 -errno；
// 输出参数放在最后，名字以 out 开头。
class Wal {
public:
    static int open(const std::string& path, std::unique_ptr<Wal>* out);
    int append(std::string_view rec, uint64_t* outLsn);
    int sync();

    // 新增：读出 lsn 处的记录。lsn 超出已写范围时返回 -ERANGE。
    int read(uint64_t lsn, std::string* outRec);
};`,
  choices: ["leakage", "vague-name", "overexposure", "none"], answer: ["none"],
  explain: `<p>没有明显问题。新函数完全遵守了模块顶部写明的约定：返回 <code>-errno</code>、输出参数放最后并以 <code>out</code> 开头，还说明了一个特有的错误码。读过 <code>append</code> 的人不用任何新知识就能正确调用 <code>read</code>。</p>
<p>这正是"入乡随俗"：<code>std::expected</code> 单独看也许更好，但在这里引入它会让模块出现两种错误约定。作者认为一致性的价值几乎总是大于某种写法本身的优劣。要换，就要过 17.2 节的两个问题，并把整个模块一次改完。</p>`,
},
{
  id: "ch17-ab-01", ch: 17, type: "ab", title: "给 WAL 加一个 truncate",
  prompt: "<p>上一题的 WAL 模块里，所有会失败的函数都返回 0 或 <code>-errno</code>，调用它的十几处代码也都这样检查。现在要加 <code>truncate</code>：</p>",
  a: { label: "沿用模块约定", code: `// 丢弃 lsn 之后的所有记录。成功返回 0，失败返回 -errno；
// lsn 超出已写范围时返回 -ERANGE。
int Wal::truncate(uint64_t lsn);

// 调用者：
if (int rc = wal.truncate(lsn); rc < 0) return rc;` },
  b: { label: "用更现代的写法", code: `enum class WalError { OutOfRange, Io, Corrupted };

// 丢弃 lsn 之后的所有记录。
std::expected<void, WalError> Wal::truncate(uint64_t lsn);

// 调用者：
if (auto r = wal.truncate(lsn); !r) return toErrno(r.error());` },
  answer: "a",
  explain: `<p>单看这一个函数，B 的类型更精确。但放进这个模块，它让读者要记住两套错误约定：哪些函数返回 <code>int</code>、哪些返回 <code>expected</code>，以及两者之间怎么转换（B 的调用者已经需要一个 <code>toErrno</code>）。作者在 17.2 节说得很直接：有一个"更好的主意"，不足以成为制造不一致的理由。</p>
<p>B 什么时候合理？团队认定"有新信息"且"值得把所有旧用法都改掉"，于是把整个 WAL 模块和它的所有调用者一次性迁移到 <code>expected</code>，改完不留 <code>-errno</code> 的痕迹。只改新函数、旧的"以后再说"，是最差的选择。</p>`,
},
{
  id: "ch17-ab-02", ch: 17, type: "ab", title: "所有组件都要有生命周期吗？",
  prompt: "<p>项目约定：服务里的组件都继承 <code>Component</code>，实现 <code>init/start/stop</code>，由框架统一启停。现在需要一个 CRC-32 校验和工具。</p>",
  a: { label: "遵守组件约定", code: `class Crc32Component : public Component {
public:
    int init() override  { table_ = buildTable(); return 0; }
    int start() override { crc_ = 0xFFFFFFFF; return 0; }
    int stop() override  { return 0; }
    void update(std::span<const std::byte> data);
    uint32_t value() const { return ~crc_; }
private:
    Table table_;
    uint32_t crc_ = 0;
};

// 调用者：
Crc32Component c;
c.init(); c.start();
c.update(buf);
uint32_t v = c.value();
c.stop();` },
  b: { label: "一个普通函数", code: `// 计算 data 的 CRC-32（IEEE 802.3 多项式）。
// 可以分块计算：把上一块的结果作为 seed 传入。线程安全。
uint32_t crc32(std::span<const std::byte> data, uint32_t seed = 0);

// 调用者：
uint32_t v = crc32(buf);
uint32_t w = crc32(part2, crc32(part1));` },
  answer: "b",
  explain: `<p>"组件"约定是为有状态、需要启停的服务对象（连接池、调度器、监听器）设计的。CRC 计算没有生命周期，硬套进去之后，<code>stop()</code> 什么都不做，<code>init</code>/<code>start</code> 的拆分毫无意义，调用者却得记住"先 init 再 start、最后 stop"这串不存在的顺序要求。</p>
<p>这就是 17.3 节说的过犹不及：把不同的东西强行用同一种方式做。读者看到 <code>Component</code> 会以为它有资源要管理、有启停顺序要遵守，结果推断全错。一致性只在"看起来是 x 的东西真的是 x"时才有用。A 在什么情况下合理？如果这个对象确实持有需要启停的资源（例如后台线程定期校验文件），那它就真的是一个组件。</p>`,
},
{
  id: "ch17-judge-01", ch: 17, type: "judge", title: "什么时候可以换掉一个约定？",
  prompt: "<p>团队的 RPC 接口一律用 <code>int timeout_ms</code> 表示超时。你认为 <code>std::chrono::milliseconds</code> 更安全（不会把秒误传成毫秒）。按作者在 17.2 节的标准，下列哪种情况才<strong>值得</strong>换？</p>",
  options: [
    "你很确定新写法更好，并且已经在自己负责的两个新接口里用上了",
    "新写法在新接口里更好用，旧接口保持不变，等以后有空再改",
    "团队讨论后认同：最近两次线上事故都是单位传错造成的（定约定时没有这个信息），新写法好到值得把所有旧接口一次改完；改完后不再留 <code>timeout_ms</code> 的写法",
    "新加入团队的同事都更熟悉 <code>std::chrono</code>",
  ],
  answer: 2,
  explain: `<p>作者的门槛有三层：有<strong>当初没有的重要新信息</strong>（事故证明了单位混淆的真实代价）；新做法<strong>好到值得更新所有旧用法</strong>；<strong>组织</strong>认同这两点，而不是你一个人认为。换完之后不应留下旧约定的痕迹。</p>
<p>"自己先在新接口里用上"和"新旧并存、以后再改"都在制造不一致：读者从此要记住哪些接口用哪种单位，这恰恰会制造你想避免的单位错误。"新人更熟悉"不是新信息，也不说明值得全部改完。</p>`,
},
{
  id: "ch17-judge-02", ch: 17, type: "judge", title: "哪一个是\"硬凑的一致\"？",
  prompt: "<p>下面几种做法，哪一种最符合 17.3 节警告的\"过犹不及\"？</p>",
  options: [
    "所有返回错误码的函数都加上 <code>[[nodiscard]]</code>",
    "项目里 <code>loadXxx()</code> 都是读本地文件、几毫秒完成；为了命名统一，把一个从远程配置中心拉取、可能重试数秒的函数也叫 <code>loadConfig()</code>",
    "所有成员变量都以下划线结尾，由 clang-tidy 检查",
    "<code>Compressor</code> 接口的 zstd 和 lz4 实现，错误时都返回同一组错误码",
  ],
  answer: 1,
  explain: `<p>远程拉取和读本地文件是<strong>不同的事</strong>：会阻塞几秒、会因网络失败、可能需要超时。用同样的名字，读者会把它放进启动路径或请求处理路径里，以为它很快。不同的东西应该看起来不同，例如叫 <code>fetchRemoteConfig()</code>，并在接口注释里说明超时和重试行为。</p>
<p>其他几项都是真正相同的东西用相同的方式处理：同一类函数、同一种成员、同一个接口的不同实现。</p>`,
},
{
  id: "ch17-write-01", ch: 17, type: "write", title: "设计一条不变式",
  prompt: `<p>一个手写解析器的词法流，到处都在判断"是不是到头了"，调用者也被迫处理 <code>nullptr</code>。请设计一条<strong>不变式</strong>来消掉这类特殊情况：写出它的声明处注释，并说明 <code>peek</code>、<code>match</code>、<code>next</code> 会怎样变化。</p>`,
  code: `class TokenStream {
public:
    const Token* peek() const {
        return pos_ < toks_.size() ? &toks_[pos_] : nullptr;
    }
    bool match(TokenKind k) {
        if (pos_ < toks_.size() && toks_[pos_].kind == k) { ++pos_; return true; }
        return false;
    }
    Token next() {
        if (pos_ >= toks_.size()) throw ParseError("unexpected end");
        return toks_[pos_++];
    }
private:
    std::vector<Token> toks_;
    size_t pos_ = 0;
};
// 调用者到处这样写：
if (auto* t = ts.peek(); t && t->kind == TokenKind::Comma) { /* ... */ }`,
  reference: `<pre><code class="lang-cpp">private:
    // 不变式：toks_ 的最后一个元素永远是 TokenKind::End，
    // 并且 pos_ 永远不会越过它（pos_ &lt; toks_.size() 恒成立）。
    // 由构造函数在词法分析结束时追加 End 来建立。
    std::vector&lt;Token&gt; toks_;
    size_t pos_ = 0;

public:
    const Token&amp; peek() const { return toks_[pos_]; }        // 永不为空
    bool match(TokenKind k) {
        if (toks_[pos_].kind != k) return false;
        if (k != TokenKind::End) ++pos_;
        return true;
    }
    const Token&amp; next() {                                      // 到头后一直返回 End
        const Token&amp; t = toks_[pos_];
        if (t.kind != TokenKind::End) ++pos_;
        return t;
    }

// 调用者：
if (ts.peek().kind == TokenKind::Comma) { /* ... */ }</code></pre>
<p>"到头了"不再是特殊情况，而是一个普通的 token 种类。语法规则里遇到 <code>End</code> 就像遇到任何不期望的 token 一样报错（"期望 ')'，实际是输入结尾"），错误信息反而更统一。</p>`,
  rubric: [
    "不变式表述成一个永远成立的性质，而不是一条操作说明",
    "写在成员声明处，并说明由谁建立、由谁维持",
    "<code>peek</code> 不再可能返回空，调用者不用判空",
    "考虑了在末尾继续调用 <code>next</code>/<code>match</code> 时的行为",
  ],
  explain: `<p>和"在每个函数里检查边界"相比，不变式把特殊情况集中到建立它的一处（构造函数）。代价是这一处必须正确，所以要在声明旁写清楚。这和第 10 章"把错误定义为不存在"、第 6 章"消除特殊情况"是同一种思路，书中 17.1 节用"每行文本都以换行符结尾"说明的也是这一点。</p>`,
},
{ id: "ch17-card-01", ch: 17, type: "card",
  front: "一致性为什么能降低复杂度？它有哪几个层次？",
  back: "<p>① <b>认知杠杆</b>：在一处学会的做法，能直接用来理解所有同样做法的地方。② <b>减少错误</b>：一致的系统里，基于\"看着眼熟\"的推断是安全的。层次：名字、代码风格、同一接口的多个实现、设计模式、不变式。</p>" },
{ id: "ch17-card-02", ch: 17, type: "card",
  front: "想打破一个已有约定之前，要问哪<b>两个问题</b>？两个都是\"是\"之后还要做什么？",
  back: "<p>① 有没有当初定约定时还没有的重要新信息？② 新做法是否好到值得花时间更新所有旧用法？组织认同两个都是\"是\"，才去升级，而且改完不留旧约定的痕迹。即便如此，别人以后仍可能把旧写法带回来；作者认为重新讨论已有约定很少值得。</p>" },
);

// —— 取材于读者讨论组的第二批题目（2026-10，B 档讨论串）。场景和代码均为本站原创。——
window.APOSD_DRILLS.push(
{
  id: "ch17-judge-03", ch: 17, type: "judge", title: "新约定明显更好，但改不完",
  prompt: "<p>代码库里的错误处理一律用返回整数错误码的旧约定，三百多个函数。你想在新模块里改用带类型的结果对象，确实更安全，但没有人力把旧代码一次迁完。按第 16、17 两章合起来的思路，哪种判断最合理？</p>",
  options: [
    "新约定只是\"更好\"还不够，要好到值得忍受一段新旧并存的日子；值得就把并存写成规则，不值得就维持旧约定",
    "第 17 章说得很清楚：不要改动已有的约定。新约定再好也不该引入，一致性的价值永远高于任何单个约定的优劣",
    "第 16 章说得很清楚：每次修改都应当让设计更好。新模块直接用新约定，旧代码不必管，两种写法并存一段时间不会有任何成本",
    "折中：新模块对外仍用旧的整数错误码，内部用结果对象，在边界上转换；这样既不破坏约定，又得到了新约定的全部好处",
  ],
  answer: 0,
  explain: `<p>两章的建议在这里确实冲突。Ousterhout 在读者讨论组里承认了这一点，给的是成本收益的判断（<a href="https://groups.google.com/g/software-design-book/c/fO0RtWYZ9ko">2019-05</a>，不在书里）：约定混用有实在的成本，读的人会困惑，新人可能把旧写法继续扩散；所以新约定必须<strong>好得多</strong>，而不只是更好。如果它还掉的是一笔大的技术债，新旧并存的代码库可以好过一个统一但债更多的代码库。</p>
<p>"把并存写成规则"是本站补充：混用最大的成本是没人知道哪种才对，写下来就能去掉大半。边界上转换的折中并非不可行，但它没有"全部好处"：调用新模块的人拿到的还是整数错误码，类型带来的安全只留在了模块内部，还多了一层转换代码要维护。</p>`,
},
);
