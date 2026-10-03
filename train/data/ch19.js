// 第 19 章 软件开发趋势 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch19-flag-01", ch: 19, type: "flag", title: "一棵报表继承树",
  prompt: "<p>报表模块用模板方法组织：父类定义流程，子类填细节。</p>",
  code: `class Report {
public:
    std::string render() {
        rows_ = query();
        total_ = 0;
        for (auto& r : rows_) total_ += r.amount;
        std::string s = header(); s += body(); return s + footer();
    }
protected:
    std::vector<Row> rows_;     // 子类可以直接读写
    double total_ = 0;          // 由 render() 计算
    virtual std::vector<Row> query() = 0;
    virtual std::string header();
    virtual std::string body();
    virtual std::string footer();   // 默认输出 total_
};

class RefundReport : public Report {
protected:
    std::string body() override {
        // 退款要显示为负数：直接改父类的数据，footer 才会算对
        for (auto& r : rows_) r.amount = -r.amount;
        total_ = -total_;
        return Report::body();
    }
};`,
  choices: ["leakage", "passthrough", "repetition", "none"], answer: ["leakage"], mark: [10, 11, 22, 23],
  explain: `<p>第 22、23 行的子类依赖父类的内部细节：<code>total_</code> 在 <code>body()</code> 之前已经算好、<code>footer()</code> 在 <code>body()</code> 之后才读它、<code>rows_</code> 不会再被别处用到。父类只要调整一下调用顺序或缓存方式，退款报表就会悄悄算错，而改父类的人不读每个子类根本发现不了。</p>
<p>这就是 19.1 节说的：父类的成员变量被父类和子类共同访问，造成继承层次内部的<strong>信息泄漏</strong>。改法：让父类完全管理 <code>rows_</code> 和 <code>total_</code>（设为 private），子类只通过窄接口参与，例如提供 <code>virtual double sign() const</code>；或者干脆用组合，把"查询"和"格式化"做成两个独立的对象。</p>`,
},
{
  id: "ch19-flag-02", ch: 19, type: "flag", title: "封装得很规范的账户",
  prompt: "<p>团队规范要求\"成员变量一律私有，通过 getter/setter 访问\"。</p>",
  code: `class Account {
public:
    int64_t getBalance() const      { return balance_; }
    void    setBalance(int64_t v)   { balance_ = v; }
    bool    getFrozen() const       { return frozen_; }
    void    setFrozen(bool f)       { frozen_ = f; }
    int64_t getOverdraft() const    { return overdraft_; }
    void    setOverdraft(int64_t v) { overdraft_ = v; }
private:
    int64_t balance_ = 0, overdraft_ = 0;
    bool frozen_ = false;
};

// 转账服务里：
if (from.getFrozen()) return Err::Frozen;
if (from.getBalance() + from.getOverdraft() < amount) return Err::Insufficient;
from.setBalance(from.getBalance() - amount);
to.setBalance(to.getBalance() + amount);`,
  choices: ["shallow", "passthrough", "leakage", "none"], answer: ["shallow", "leakage"], mark: [3, 4, 5, 6, 7, 8, 15, 16],
  explain: `<p>六个方法都只有一行，接口和实现一样宽：成员变量虽然是 <code>private</code>，但通过 getter/setter 全部暴露了出去，这并不是信息隐藏（第 5 章开头就说过）。真正的知识（"冻结的账户不能出账""透支额度怎么算"）跑到了调用者手里（第 15、16 行），每个用到账户的服务都要再写一遍。</p>
<p>这就是<strong>信息泄漏</strong>（5.2 节）：同一条业务规则散落在转账、扣费、退款等多个调用者里，规则一变（比如冻结账户允许入账但不允许出账、透支要收利息），所有调用者都得一起改，漏改一处就是 bug。</p>
<p>作者在 19.6 节的意见：如果非要暴露变量，getter/setter 比公开字段好；但更好的是不暴露。这里应该给 <code>Account</code> 一个深方法，如 <code>Result withdraw(int64_t amount)</code>，把冻结、透支、余额检查都藏在里面。</p>`,
},
{
  id: "ch19-flag-03", ch: 19, type: "flag", title: "用上了三个设计模式",
  prompt: "<p>项目里只有一种压缩算法（zstd），近期也没有更换的计划。</p>",
  code: `class Compressor {
public:
    virtual ~Compressor() = default;
    virtual Bytes compress(ByteView in) = 0;
};
class CompressorFactory {
public:
    virtual std::unique_ptr<Compressor> create() = 0;
};
class ZstdCompressorFactory : public CompressorFactory {
public:
    std::unique_ptr<Compressor> create() override {
        return std::make_unique<ZstdCompressor>();
    }
};
class CompressionContext {        // 策略模式的"上下文"
public:
    explicit CompressionContext(CompressorFactory& f) : c_(f.create()) {}
    Bytes compress(ByteView in) { return c_->compress(in); }
private:
    std::unique_ptr<Compressor> c_;
};`,
  choices: ["shallow", "passthrough", "special-general", "none"], answer: ["shallow", "passthrough"], mark: [12, 13, 19],
  explain: `<p>工厂类（第 12～13 行）只是 <code>make_unique</code> 的包装，几乎没有隐藏任何东西，是浅模块；<code>CompressionContext::compress</code>（第 19 行）原样转发给 <code>c_-&gt;compress</code>，是透传方法。调用者要认识三个类才能压缩一块数据，而一个 <code>Bytes compress(ByteView)</code> 函数就够了。</p>
<p>这是 19.5 节说的<strong>过度使用</strong>：模式只有在适合时才改善系统；"设计模式是好的"不等于"越多越好"。如果将来真的出现第二种算法，那时再引入一个 <code>Compressor</code> 接口也不迟。</p>`,
},
{
  id: "ch19-flag-04", ch: 19, type: "flag", title: "一个存储后端接口",
  prompt: "<p>对象存储服务的后端接口，有本地磁盘、S3 和内存（测试用）三种实现。</p>",
  code: `// 按 key 存取不可变的 blob。所有实现都必须满足：
//   - put 返回后数据已持久化（内存实现除外，它只用于测试）；
//   - 同一个 key 只会 put 一次，重复 put 返回 AlreadyExists；
//   - 所有方法线程安全。
class BlobBackend {
public:
    virtual ~BlobBackend() = default;
    virtual Status put(std::string_view key, ByteView data) = 0;
    virtual Result<Bytes> get(std::string_view key) = 0;      // 不存在时 NotFound
    virtual Status remove(std::string_view key) = 0;          // 不存在时也返回 Ok
};

class LocalDiskBackend : public BlobBackend { /* ... */ };
class S3Backend        : public BlobBackend { /* ... */ };
class InMemoryBackend  : public BlobBackend { /* ... */ };`,
  choices: ["leakage", "shallow", "passthrough", "none"], answer: ["none"],
  explain: `<p>没有明显问题。这是 19.1 节称赞的<strong>接口继承</strong>：父类只定义签名和契约，不提供实现、没有共享状态，三个实现之间互不依赖。学会用一种后端，就会用所有后端；接口为了容纳磁盘和 S3 两种很不一样的实现，只保留了本质（不可变、持久化、线程安全），这正是抽象。</p>
<p>注意契约写在接口注释里：每个实现都必须满足的语义是接口的一部分。<code>remove</code> 对不存在的 key 返回 Ok，是第 10 章"把错误定义为不存在"的应用。</p>`,
},
{
  id: "ch19-flag-05", ch: 19, type: "flag", title: "一个模板方法",
  prompt: "<p>导出模块用模板方法模式：父类定好流程，子类填几个钩子。下面是父类和一个子类。</p>",
  code: `// 所有导出任务的固定流程
class ExportJob {
public:
    void run() {
        open();
        for (const Row& row : query())
            if (accept(row)) emit(row);
        close();
    }
protected:
    virtual void open() = 0;
    virtual bool accept(const Row& row) = 0;   // 返回 false 跳过这一行
    virtual void emit(const Row& row) = 0;
    virtual void close() = 0;
};
// 导出成带合计行的 CSV，金额统一换算成人民币
class CnyCsvExport : public ExportJob {
    void open() override { out_.open(path_); total_ = 0; }
    bool accept(const Row& r) override {
        cur_ = toCny(r);                     // 换算好的行留给 emit 用
        return cur_.amount != 0;
    }
    void emit(const Row&) override { out_ << toCsv(cur_); total_ += cur_.amount; }
    void close() override { out_ << "合计," << total_ << "\\n"; }
    // 成员：path_、out_、cur_、total_
};`,
  choices: ["conjoined", "leakage", "shallow", "special-general", "none"], answer: ["conjoined"], mark: [7, 20, 23],
  explain: `<p>第 23 行的 <code>emit</code> 根本不看自己的参数，而是读 <code>accept</code> 在第 20 行留下的 <code>cur_</code>。这只有在"父类对同一行先调 <code>accept</code>、紧接着调 <code>emit</code>"时才成立，而这个顺序只写在父类 <code>run()</code> 的实现里（第 7 行）。读子类的人必须去读父类的实现才能确信它是对的；改父类的人（比如改成先对所有行过滤、再批量输出，或者并行处理）会悄悄把子类弄坏。这就是"连体方法"（9.7 节）：不读懂另一个的实现，就看不懂这一个。19.1 节说的也是这个：实现继承让父类和子类互相依赖，理解一个类得看整棵继承树。</p>
<p>它和本章"一棵报表继承树"那道题不同：那里父子类共享成员变量，同一份知识散在几个类里，是信息泄漏；这里父子类没有共享任何成员，也没有同一个格式写在两处，问题出在钩子之间靠调用顺序传数据。改法：让每个钩子自成一体，<code>accept</code> 只做判断、不留状态，<code>emit</code> 自己调 <code>toCny(r)</code>；更进一步用组合代替继承，把"取数、过滤、输出"做成三个独立的对象，由一个函数按顺序调用它们，顺序就写在调用处，一眼可见。</p>`,
},
{
  id: "ch19-ab-01", ch: 19, type: "ab", title: "JSON 格式的日志",
  prompt: "<p>已有一个写文件的 <code>FileLogger</code>，现在需要输出 JSON 格式的日志。</p>",
  a: { label: "组合", code: `// 把一条日志记录格式化成一行文本。
class LogFormatter {
public:
    virtual ~LogFormatter() = default;
    virtual std::string format(const LogRecord& r) = 0;
};
class TextFormatter : public LogFormatter { /* ... */ };
class JsonFormatter : public LogFormatter { /* ... */ };

class FileLogger {
public:
    FileLogger(std::filesystem::path p, std::unique_ptr<LogFormatter> f);
    void log(const LogRecord& r);   // 格式化、加入缓冲、按需刷盘和轮转
};` },
  b: { label: "继承", code: `class FileLogger {
public:
    void log(const LogRecord& r) {
        appendLine(r);
        if (buf_.size() > kFlushBytes) flush();
    }
protected:
    virtual void appendLine(const LogRecord& r);  // 默认输出纯文本
    std::string buf_;          // 子类直接追加
    size_t linesSinceRotate_;  // 子类追加一行后必须加一
};
class JsonFileLogger : public FileLogger {
protected:
    void appendLine(const LogRecord& r) override {
        buf_ += toJson(r) + "\\n";
        ++linesSinceRotate_;
    }
};` },
  answer: "a",
  explain: `<p>B 的子类必须知道父类的两条内部约定：往 <code>buf_</code> 追加，并且要自己维护 <code>linesSinceRotate_</code>（第 10 行的注释就是信息泄漏的自白）。以后父类改了缓冲方式或轮转策略，所有子类都要检查。A 把"格式化"抽成一个窄接口：格式化器只负责把记录变成字符串，缓冲、刷盘、轮转全在 <code>FileLogger</code> 内部。</p>
<p>这就是 19.1 节的建议：先看组合（小的辅助类）能否达到同样效果。B 什么时候可以接受？如果父类把 <code>buf_</code> 和计数器都设为 private，子类只覆写一个"把记录变成字符串"的钩子，那它实际上就是 A 的继承写法，也就是作者说的"让父类完全管理自己的状态"。</p>`,
},
{
  id: "ch19-ab-02", ch: 19, type: "ab", title: "修一个 bug 的顺序",
  prompt: "<p>线上报告：<code>parseDuration(\"1h30m\")</code> 返回 60 分钟，应该是 90 分钟。两种修法：</p>",
  a: { label: "先修，再补测试", code: `// 1. 读代码，发现解析完 "h" 之后没有继续解析，修好它。
// 2. 补一个测试：
TEST(ParseDuration, HoursAndMinutes) {
    EXPECT_EQ(parseDuration("1h30m"), std::chrono::minutes(90));
}
// 3. 运行，通过。提交。` },
  b: { label: "先写测试，再修", code: `// 1. 写测试：
TEST(ParseDuration, HoursAndMinutes) {
    EXPECT_EQ(parseDuration("1h30m"), std::chrono::minutes(90));
}
// 2. 运行，确认它失败，且失败结果正是 60 分钟。
// 3. 修代码。
// 4. 再运行，通过。提交。` },
  answer: "b",
  explain: `<p>两种做法最后的测试代码一模一样，区别只在 B 的第 2 步：<strong>亲眼看到测试因为这个 bug 而失败</strong>。只有这样，后面的"通过"才能证明 bug 真的被修好了。A 的测试也许压根没触发 bug（比如修复前它就能通过，因为你测的路径和线上不同），那它的"通过"什么也说明不了。</p>
<p>这是作者在 19.4 节明确赞成"先写测试"的场合。作者反对用 TDD 的方式开发新功能，但修 bug 时先写测试，是确认真的修好了的最好办法。</p>`,
},
{
  id: "ch19-ab-03", ch: 19, type: "ab", title: "限速配置",
  prompt: "<p>一个下载器需要限速。两种类设计：</p>",
  a: { label: "", code: `// 令牌桶限速器。按字节计费，允许短时突发到 burst 字节。
class Throttle {
public:
    Throttle(Bytes perSecond, Bytes burst);
    // 阻塞直到可以发送 n 字节。n 大于 burst 时分批等待。
    void acquire(Bytes n);
};

// 调用者：
throttle.acquire(chunk.size());
sock.write(chunk);` },
  b: { label: "", code: `class Throttle {
public:
    Bytes getRate() const;        void setRate(Bytes);
    Bytes getBurst() const;       void setBurst(Bytes);
    Bytes getTokens() const;      void setTokens(Bytes);
    TimePoint getLastRefill() const;
    void setLastRefill(TimePoint);
};

// 调用者：
auto now = Clock::now();
auto add = t.getRate() * secondsBetween(t.getLastRefill(), now);
t.setTokens(std::min(t.getBurst(), t.getTokens() + add));
t.setLastRefill(now);
if (t.getTokens() < chunk.size()) sleepFor(/* 自己算 */);
t.setTokens(t.getTokens() - chunk.size());` },
  answer: "a",
  explain: `<p>B 是 getter/setter 的典型滥用：八个一行的浅方法把令牌桶的全部内部状态交了出去，算法本身（补充令牌、上限、等待）留给每个调用者去写，还不是线程安全的。A 只有一个构造函数和一个 <code>acquire</code>，令牌、补充时间、分批等待全部藏在里面。</p>
<p>19.6 节的意见：如果必须暴露变量，getter/setter 比公开字段好；但最好根本不暴露实现数据。B 的作者大概是从"成员要私有、用 getter/setter 访问"这条规范出发的，这正是作者说的风险：大家认定一个模式是好的，就尽可能多地用它。</p>`,
},
{
  id: "ch19-judge-01", ch: 19, type: "judge", title: "作者会怎么评价这个团队？",
  prompt: "<p>一个团队严格执行 TDD：每个新类都是先写一个失败的测试，写刚好让它通过的代码，再写下一个测试，测试全部通过即完成。团队的测试覆盖率接近 100%。作者最可能怎么评价？</p>",
  options: [
    "完全赞同：高覆盖率的测试正是作者提倡的",
    "反对：单元测试本身就是浪费时间，应该交给 QA 团队做系统测试",
    "认为 TDD 只适合小项目，大项目才需要先做设计",
    "赞同他们写了大量单元测试，但不赞同 TDD 的开发方式：它让注意力集中在让下一个测试通过，没有明显的时机做设计，容易一点点长成一团乱麻",
  ],
  answer: 3,
  explain: `<p>作者在 19.4 节明确区分了两件事：作者是单元测试的坚定支持者（测试让重构安全），但不喜欢 TDD，称之为"彻头彻尾的战术编程"。书中的建议是：发现需要一个抽象时，一次设计完整（至少设计出一组足够全面的核心功能），然后再写代码和测试。</p>
<p>你可以不同意作者，例如认为红—绿—重构里的"重构"一步就是设计的时机。但要准确理解作者反对的是什么：不是测试，而是"让设计跟着一个个测试零碎地长出来"。本站的 Clean Code 专题对照了两种立场。</p>`,
},
{
  id: "ch19-judge-02", ch: 19, type: "judge", title: "先写死，以后再抽象？",
  prompt: "<p>这个迭代要做\"导出订单为 CSV\"。同事说：\"按敏捷的做法，先写一个 <code>exportOrdersCsv()</code>，把字段和转义直接写死在里面，等以后真有别的导出需求了再抽象。\"作者最可能怎么回应？</p>",
  options: [
    "现在既然已经需要 CSV 导出了，就花点时间设计一个干净、适度通用的 CSV 写出模块（处理转义、表头、流式写出），订单导出只是它的第一个用户",
    "同意：不要做任何当前功能用不到的设计",
    "现在就应该设计一个支持 CSV、Excel、PDF 的通用导出框架，以免以后返工",
    "这个功能放到下个迭代再做",
  ],
  answer: 0,
  explain: `<p>作者在 19.2 节点名反驳了"先实现专用机制、以后再重构成通用的"这种敏捷建议：它有一定道理，但它反对投资式的做法，鼓励战术编程。原则 15 的两半：抽象可以推迟到功能需要它时（所以不必提前做导出框架）；但一旦需要，就投资把它设计干净、做得适度通用（第 6 章）。</p>
<p>"支持 CSV、Excel、PDF 的框架"走向了另一个极端：为还不存在的需求设计。适度通用的问法是：满足今天需求的最简单、又不绑死在"订单"上的接口是什么？</p>`,
},
{
  id: "ch19-judge-03", ch: 19, type: "judge", title: "同意还是不同意？",
  prompt: "<p>有人说：\"我们的代码全是类、成员全是 private、到处用接口和继承，所以设计肯定没问题。\"下列哪种回应最符合作者在 19.1 节的观点？</p>",
  options: [
    "同意：封装和继承就是好设计的保证",
    "不同意：OOP 的机制能帮助实现干净的设计，但本身不保证好设计；类如果浅、接口复杂、或者允许外部访问内部状态（包括通过 getter/setter），照样复杂",
    "不同意：应该完全放弃 OOP，改用函数式编程",
    "同意，但前提是继承层次不超过三层",
  ],
  answer: 1,
  explain: `<p>19.1 节在肯定 OOP 机制（例如私有成员有助于信息隐藏）之后，明确说这些机制本身不保证好设计。<code>private</code> 加一整套 getter/setter 等于没有隐藏；"到处用继承"如果是共享状态的实现继承，反而会制造父子类之间的信息泄漏。</p>
<p>判断设计好坏的标准始终是复杂性：模块够不够深、信息有没有泄漏、代码是否一目了然。这也是本章结尾给出的方法：用复杂性去质问任何流行的做法。</p>`,
},
{
  id: "ch19-write-01", ch: 19, type: "write", title: "把继承改成组合",
  prompt: "<p>下面是一个缓存的继承树。<code>LruCache</code> 和 <code>TtlCache</code> 都直接操作父类的 <code>map_</code> 和 <code>bytes_</code>。请画出（写出类声明即可）一个用组合代替实现继承的设计，并说明父类原来的状态现在归谁管。</p>",
  code: `class CacheBase {
protected:
    std::unordered_map<Key, Entry> map_;
    size_t bytes_ = 0;                       // 子类增删时必须同步维护
    virtual void onInsert(const Key& k) = 0; // 子类在这里决定淘汰谁
public:
    void put(const Key& k, Value v);
    const Value* get(const Key& k);
};
class LruCache : public CacheBase { std::list<Key> order_; /* 淘汰时 map_.erase、bytes_ -= ... */ };
class TtlCache : public CacheBase { std::multimap<TimePoint, Key> expiry_; /* 同上 */ };`,
  reference: `<pre><code class="lang-cpp">// 淘汰策略：只管"下一个该淘汰谁"，不接触缓存的存储。
class EvictionPolicy {
public:
    virtual ~EvictionPolicy() = default;
    virtual void onInsert(const Key&amp; k) = 0;
    virtual void onAccess(const Key&amp; k) = 0;
    virtual void onRemove(const Key&amp; k) = 0;
    virtual std::optional&lt;Key&gt; victim() = 0;   // 没有可淘汰的返回 nullopt
};
class LruPolicy : public EvictionPolicy { std::list&lt;Key&gt; order_; /* ... */ };
class TtlPolicy : public EvictionPolicy { std::multimap&lt;TimePoint, Key&gt; expiry_; /* ... */ };

class Cache {
public:
    Cache(size_t capacityBytes, std::unique_ptr&lt;EvictionPolicy&gt; policy);
    void put(const Key&amp; k, Value v);   // 超出容量时反复问 policy_-&gt;victim() 并删除
    const Value* get(const Key&amp; k);
private:
    std::unordered_map&lt;Key, Entry&gt; map_;   // 只有 Cache 自己碰
    size_t bytes_ = 0;
    std::unique_ptr&lt;EvictionPolicy&gt; policy_;
};</code></pre>
<p><code>map_</code> 和 <code>bytes_</code> 现在完全归 <code>Cache</code> 管，"增删时同步维护字节数"这条约定只在一处实现。策略只通过一个窄接口参与：被告知发生了什么、回答该淘汰谁。</p>`,
  rubric: [
    "共享的状态（map_、bytes_）只归一个类管理，其他类不能直接访问",
    "差异部分（淘汰策略）被抽成一个窄接口，各策略之间互不依赖",
    "原来\"子类必须同步维护 bytes_\"这类隐式约定消失了",
    "接口里写清了策略需要回答的问题（如 victim 的语义）",
  ],
  explain: `<p>这正是 19.1 节的两条建议：先考虑组合；共享的状态由一个类完全管理。改完后用到了接口继承（<code>EvictionPolicy</code> 有多个实现），而接口继承是作者认为有帮助的那一种。</p>`,
},
{
  id: "ch19-write-02", ch: 19, type: "write", title: "用复杂性审视一个流行做法",
  prompt: "<p>选一个你团队里流行的做法（例如：\"所有依赖都通过 DI 容器注入\"、\"每个类都要有对应的接口类\"、\"微服务一个功能一个服务\"、\"函数不超过 20 行\"），用本书的词汇写一段 5～8 句话的评价：它在哪里减少了复杂性，又在哪里增加了复杂性？什么条件下该用，什么条件下不该用？</p>",
  reference: `<p>示例（"每个类都要有对应的接口类"）：</p>
<p>当一个接口确实有多种实现（例如真实后端和测试替身）时，接口继承提供了杠杆，调用者只依赖本质，属于 19.1 节称赞的情况。但如果大多数接口永远只有一个实现，每个 <code>IFoo</code> 只是把 <code>Foo</code> 的声明再抄一遍，就多出一层浅的抽象，还让"跳转到定义"多了一步，使代码不那么明显（第 18 章）。合理的做法：只在出现第二种实现、或者需要在测试里替换时才引入接口，并在引入时把契约写清楚（原则 15：需要时再抽象，一抽象就做好）。</p>`,
  rubric: [
    "既指出了它减少的复杂性，也指出了它增加的复杂性",
    "用到了本书的具体概念（深/浅、信息泄漏、战术编程、一目了然、变更放大等）",
    "给出了适用和不适用的条件，而不是一概而论",
    "结论落到\"它是否真的减少了系统的复杂性\"上",
  ],
  explain: `<p>这正是 19.7 节的方法：遇到新的开发范式，从复杂性的角度质问它。很多提议表面上听起来不错，深入看却可能让复杂性更糟。这道题没有标准答案，关键是理由要用复杂性来表述，而不是"大公司都这么做"。</p>`,
},
{ id: "ch19-card-01", ch: 19, type: "card",
  front: "<b>接口继承</b>和<b>实现继承</b>各有什么利弊？作者建议怎么用实现继承？",
  back: "<p>接口继承：父类只定义签名，同一个接口服务多种实现，实现越多接口越深，几乎只有好处。实现继承：减少了重复（变更放大），但父子类共享成员变量造成信息泄漏，改一个类要看整棵树。建议：先考虑组合（小的辅助类）；必须用时，让父类完全管理自己的状态，子类只读或只通过父类方法访问。</p>" },
{ id: "ch19-card-02", ch: 19, type: "card",
  front: "原则 15 是什么？它怎样解释作者对<b>敏捷</b>和 <b>TDD</b> 的批评？",
  back: "<p>软件开发的增量应该是抽象，而不是功能。抽象可以推迟到功能需要时，但一旦需要就一次设计干净、适度通用。敏捷容易让人盯着功能、推迟设计；TDD 让抽象随着一个个测试零碎地长出来，没有明显的设计时机。例外：修 bug 时先写一个会失败的测试。</p>" },
);

// —— 以下题目取材于书中给出的读者讨论组（2026-10）。场景和代码均为本站原创。——
window.APOSD_DRILLS.push(
{
  id: "ch19-judge-04", ch: 19, type: "judge", title: "什么时候真的需要工厂",
  prompt: "<p>下面哪种情形里，用工厂方法（而不是直接调用构造函数）是<strong>最站得住</strong>的？</p>",
  options: [
    "对象的具体类型要在运行时根据数据决定：读到的配置里写的是哪种压缩算法，就创建哪种 <code>Compressor</code> 的子类",
    "构造过程可能中途失败：用工厂把构造包起来，失败时返回空指针，调用者就不会拿到一个只初始化了一半的对象",
    "想保证对象在初始化完成之后不再被修改：把所有设置项都收进工厂，由工厂一次配好再交出去，对象本身不提供修改方法",
    "想让代码更容易测试和替换：所有对象一律通过工厂创建，以后要换实现或插入模拟对象时，只需要改工厂这一处",
  ],
  answer: 0,
  explain: `<p>构造函数必须在调用前就知道具体类型，所以"类型由数据决定"时它做不到，工厂方法是唯一可行的办法。其余几条都有更简单的替代：构造函数抛异常时没有人能拿到半成品；想禁止初始化后再改，可以在类里设一个内部标志，或者把选项设计成随时可改，类的实现复杂一点，使用者简单一点。</p>
<p>这几条理由的取舍出自读者讨论组里 Ousterhout 发起的一次提问（<a href="https://groups.google.com/g/software-design-book/c/46heiunvGug">2021-12 至 2022-06</a>，不在书里），和 19.5 节的态度一致：模式在它解决的那个问题真的出现时才用。"一律通过工厂创建"是把模式当成了目标：为可测试性付出的是每个使用者都要多认识一层。</p>`,
},
{
  id: "ch19-judge-05", ch: 19, type: "judge", title: "两种担心哪个更重",
  prompt: "<p>TDD 的支持者说：先写实现再补测试，写完实现时人会觉得\"已经做完了\"，于是测试写得少。作者一方则担心以单个测试为单位推进，设计做得少。假设两种担心都成真，哪种后果更难挽回，为什么？</p>",
  options: [
    "测试少更难挽回：没有测试就没有人敢重构，设计再差也只能一直凑合下去；而设计差只要测试齐全，随时可以改",
    "一样难挽回：测试和设计互为前提，缺了哪一个另一个都补不上，所以两种担心没有轻重之分，只能两头都做足",
    "都不难挽回：现代工具可以自动生成测试，也可以自动重构，两种欠账都只是时间问题，不必在流程上争论先后",
    "设计差更难挽回：测试不够可以随时回头补；而一个没有认真设计过的系统，已经有大量代码和调用者依赖着它的结构",
  ],
  answer: 3,
  explain: `<p>这是 Ousterhout 在读者讨论组里给出的不对称（<a href="https://groups.google.com/g/software-design-book/c/vE2aqVXi8nw">2025-05</a>，不在书里）。同一帖里还推演了机制：每个新测试都可能打破为前面的测试写的代码，自觉的人会一遍遍重写，很多人则会开始打小补丁。</p>
<p>要公平地读这个结论：它是推演，不是数据；书中 19.4 节也承认自己对 TDD 的判断来自经验。"没有测试就没人敢重构"有一半道理，所以两边都同意的做法是：先想清楚接口，再用你习惯的节奏写测试，并且测试写完之前不算做完。完整的对照见本站专题。</p>`,
},
);
