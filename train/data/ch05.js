// 第 5 章 信息隐藏（与泄漏）—— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch05-flag-01", ch: 5, type: "flag", title: "CSV 导入：先切行，再切字段",
  prompt: "<p>一个数据导入工具，按\"先把文件切成行、再把每行切成字段\"拆成两个类。下面是两个类的核心代码。</p>",
  code: `class CsvLineSplitter {          // 第一步：切行
public:
    std::vector<std::string> split(std::string_view text) {
        std::vector<std::string> rows; std::string cur; bool inQuote = false;
        for (char c : text) {
            if (c == '"') inQuote = !inQuote;            // 引号里的换行不算行尾
            if (c == '\\n' && !inQuote) { rows.push_back(cur); cur.clear(); }
            else cur += c;
        }
        if (!cur.empty()) rows.push_back(cur);   return rows;
    }
};
class CsvFieldParser {           // 第二步：切字段
public:
    std::vector<std::string> parse(std::string_view row);   // 处理引号、"" 转义、逗号
};

auto rows = CsvLineSplitter().split(text);
for (auto& r : rows) table.push_back(CsvFieldParser().parse(r));`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["temporal", "leakage"], mark: [6, 7, 15],
  explain: `<p>这是按时间顺序分解：先切行、后切字段，于是成了两个类。可切行不懂引号规则就会切错（引号里的换行不是行尾），所以第 6～7 行不得不重新实现一遍引号识别，而第 15 行的 <code>CsvFieldParser</code> 里还有完整的一份。<strong>引号规则这一个设计决定，住进了两个类</strong>，这是信息泄漏，而且是接口上看不出来的后门泄漏。</p>
<p>后果很具体：哪天要支持 <code>\\"</code> 这种反斜杠转义，或者换一种引号字符，两处都得改，漏改一处就会把某些行切错。更好的设计是一个 <code>CsvReader</code>，提供 <code>std::optional&lt;Row&gt; next()</code>，一次读出一条完整记录。书中 5.5 节学生把 HTTP 请求的"读取"和"解析"拆成两个类，是同一个问题：不解析就读不完整。</p>`,
},
{
  id: "ch05-flag-02", ch: 5, type: "flag", title: "缓存键",
  prompt: "<p>用户资料走 Redis 缓存。下面两段代码分别在两个服务里，由两个小组维护。</p>",
  code: `// profile_service.cpp（写缓存）
void ProfileService::cacheProfile(const Profile& p) {
    std::string key = "user:" + std::to_string(p.id) + ":profile:v2";
    redis_.setex(key, 3600, serialize(p));
}

// account_service.cpp（改密码后让缓存失效）
void AccountService::onPasswordChanged(UserId id) {
    redis_.del("user:" + std::to_string(id) + ":profile:v2");
}`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["leakage"], mark: [3, 9],
  explain: `<p>缓存键的格式（前缀、分隔符、版本后缀 <code>v2</code>）是一个设计决定，现在出现在两个服务里，而且两边的接口都没有提到它。这是<strong>后门泄漏</strong>。</p>
<p>它的危险在于"静默"：资料结构升级到 <code>v3</code> 时，如果只改了写缓存的一方，失效代码删的是一个不存在的键，不报错，用户改完密码后，旧资料还会在缓存里留一个小时。修法是让键格式只有一个家，例如 <code>ProfileCache</code> 类提供 <code>put(profile)</code> 和 <code>invalidate(userId)</code>，两个服务都只调用它。</p>`,
},
{
  id: "ch05-flag-03", ch: 5, type: "flag", title: "压缩一段数据",
  prompt: "<p>团队封装的压缩库只提供这一个入口。99% 的调用方只想\"用默认设置把这段数据压一下\"。</p>",
  code: `// 压缩 input。所有参数必须显式给出：
//   level      0..9      压缩级别
//   windowBits 9..15     滑动窗口大小（2 的幂）
//   memLevel   1..9      内部状态占用的内存
//   strategy   Default / Filtered / HuffmanOnly / Rle
//   dict       预置字典，可以为空
std::vector<uint8_t> compress(std::span<const uint8_t> input,
                              int level, int windowBits, int memLevel,
                              Strategy strategy, std::span<const uint8_t> dict);

auto out = compress(data, 6, 15, 8, Strategy::Default, {});  // 每个调用方都这样抄一遍`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["overexposure", "leakage"], mark: [8, 9, 11],
  explain: `<p>想做最常见的事（用默认设置压缩），却必须先弄懂窗口大小、内存级别、压缩策略、预置字典，这就是<strong>过度暴露</strong>。第 11 行那串魔法数字会被复制到每个调用方，谁也说不清它们为什么是这些值——这同时是<strong>信息泄漏</strong>：本该由库自己决定的默认值，变成了每个调用方都知道的知识，哪天库想换默认窗口大小就得改所有调用点（书中 5.7 节说，让调用方指定本该有默认值的参数，往往就会造成泄漏）。</p>
<p>它不是浅模块：压缩算法本身藏了大量实现。问题只在于罕用的调优参数挡在了常用路径上。改法：<code>compress(input)</code> 一个参数就够；需要调优的少数人用 <code>compress(input, CompressOptions{...})</code>，选项结构里每个字段都有默认值。</p>`,
},
{
  id: "ch05-flag-04", ch: 5, type: "flag", title: "会话管理器",
  prompt: "<p>会话管理器负责创建会话和刷新活跃时间。为了让监控和清理任务\"灵活\"，它把会话表开放了出来。</p>",
  code: `class SessionManager {
public:
    SessionId create(UserId u);                  // 生成安全随机 id、写审计日志……
    void touch(SessionId id);                    // 刷新 lastSeen
    const std::unordered_map<SessionId, Session>& sessions() const { return sessions_; }
private:
    std::unordered_map<SessionId, Session> sessions_;
};

// metrics.cpp
for (auto& [id, s] : mgr.sessions())
    if (now - s.lastSeen < std::chrono::minutes(30)) ++active;
// janitor.cpp
for (auto& [id, s] : mgr.sessions())
    if (now - s.lastSeen >= std::chrono::minutes(30)) toRemove.push_back(id);`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["leakage"], mark: [5, 12, 15],
  explain: `<p>两个设计决定漏了出去。第 5 行把内部表示（一个 <code>unordered_map</code>，以及 <code>Session</code> 的字段）通过接口交给了调用者；第 12、15 行则说明"会话 30 分钟不活跃就算过期"这条规则被调用者各自实现了一遍。哪天过期时间改成可配置，或者改成"绝对过期 + 滑动过期"两种规则，metrics 和 janitor 都得改。</p>
<p><code>sessions_</code> 是 <code>private</code> 的，但这不等于信息被隐藏了。更好的接口是 <code>size_t activeCount(TimePoint now) const</code> 和 <code>void expireIdle(TimePoint now)</code>：过期规则只在 <code>SessionManager</code> 里出现。不选"浅模块"，是因为这个类有 <code>create</code> 这样真正藏住复杂性的方法，问题出在那个开放表示的 getter。</p>`,
},
{
  id: "ch05-flag-05", ch: 5, type: "flag", title: "缩略图流水线",
  prompt: "<p>一个后台任务：下载用户上传的原图、生成三种尺寸的缩略图、上传到对象存储。按步骤拆成了三个类。</p>",
  code: `// 下载：重试、超时、断点续传、校验 Content-Length
class ImageFetcher   { public: Bytes fetch(const Url& src); };

// 解码 JPEG/PNG/WebP，处理 EXIF 方向，按长边缩放，重新编码
class ThumbnailMaker { public: std::vector<Thumbnail> make(const Bytes& original); };

// 分片上传、失败重传、生成带签名的访问 URL
class ObjectUploader { public: Url upload(const std::string& name, const Bytes& data); };

auto raw   = fetcher.fetch(job.src);
auto thumbs = maker.make(raw);
for (auto& t : thumbs) urls.push_back(uploader.upload(t.name, t.bytes));`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["none"],
  explain: `<p>它确实是按执行顺序切成了三个类，但三个阶段用到的知识<strong>完全不同</strong>：HTTP 下载的重试与续传、图像格式与缩放、对象存储的分片与签名。没有哪份知识同时出现在两个类里，两类之间传的只是"一串字节"。书中 5.3 节明确留了这个口子：如果各个阶段使用的信息完全不同，按阶段划分模块可以和信息隐藏一致。</p>
<p>判断按时间顺序分解，不要看"像不像流水线"，要看<strong>有没有同一份知识被复制进多个阶段</strong>。对比 flag-01 的 CSV：那里切行和切字段都必须懂引号规则。</p>`,
},
{
  id: "ch05-flag-06", ch: 5, type: "flag", title: "日志库的选项",
  prompt: "<p>一个内部日志库的公开接口。</p>",
  code: `struct LogOptions {
    Level  minLevel   = Level::Info;
    bool   buffered   = true;               // 默认带缓冲，进程退出时自动刷盘
    size_t rotateSize = 256 << 20;          // 默认 256 MB 轮转
    int    keepFiles  = 7;
};
class Logger {
public:
    static Logger open(const std::string& path, LogOptions opt = {});
    void log(Level lv, std::string_view msg);
    // 少数场景（如崩溃处理器）需要立刻落盘：
    void flushNow();
};

auto log = Logger::open("/var/log/app.log");   // 绝大多数调用方只写这一行`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["none"],
  explain: `<p>选项不少，但它们都有合理的默认值，最常见的用法只需要一个路径（第 15 行）。缓冲、轮转、保留文件数这些信息只有少数调用者需要，而且走单独的结构体字段或单独的方法，正是书中说的<strong>部分隐藏</strong>（partial information hiding）：常用路径上看不见，所以几乎不产生依赖。</p>
<p>过度暴露指的是"常用功能的 API 逼你先了解罕用功能"。这里不需要了解任何罕用选项就能用，所以不是过度暴露。缓冲默认打开也符合"默认就做对的事"：书中 5.7 节批评的正是缓冲需要显式要求的 I/O 库。</p>`,
},
{
  id: "ch05-flag-07", ch: 5, type: "flag", title: "重试策略类",
  prompt: "<p>为了\"统一\"各处的重试行为，有人写了一个重试策略类。下面是它和两处典型用法。</p>",
  code: `class RetryPolicy {
public:
    int maxAttempts() const    { return maxAttempts_; }
    Duration baseDelay() const { return baseDelay_; }
    double multiplier() const  { return multiplier_; }
    double jitter() const      { return jitter_; }
private:
    int maxAttempts_ = 5; Duration baseDelay_ = 100ms; double multiplier_ = 2.0, jitter_ = 0.2;
};

// payment_client.cpp
for (int i = 0; i < policy.maxAttempts(); ++i) {
    if (tryCharge()) break;
    auto d = policy.baseDelay() * std::pow(policy.multiplier(), i);
    sleepFor(d * (1.0 + policy.jitter() * randUnit()));
}
// inventory_client.cpp 里有一段几乎一样的循环，只是 jitter 用的是 (randUnit() - 0.5)`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["shallow", "leakage"], mark: [3, 4, 5, 6, 14, 15],
  explain: `<p><strong>浅</strong>：<code>RetryPolicy</code> 只是四个字段的 getter，接口和实现一样长，它没有替任何人藏住任何东西。<strong>泄漏</strong>：退避公式（指数增长、抖动怎么加）本该是这个类的核心知识，却在每个调用方各写了一遍，而且已经写出了不一致（第 17 行注释）。</p>
<p>把公式收回类里：<code>bool retry(const std::function&lt;bool()&gt;&amp; op)</code>，或者至少 <code>Duration delayFor(int attempt)</code>。这样参数仍可配置，但"怎么用这些参数"只有一个家。字段是私有的这一点救不了它：私有变量通过 getter 暴露出去，和公开变量差不多。</p>
<p>第 17 行那段"几乎一样的循环"，第 9 章会给它一个专门的名字：<strong>重复</strong>（repetition），同一段逻辑一遍遍出现，说明还没找到正确的抽象。把公式收回 <code>RetryPolicy</code>，泄漏和重复一起消失。</p>`,
},
{
  id: "ch05-flag-08", ch: 5, type: "flag", title: "字幕时间轴整体平移",
  prompt: "<p>一个小工具把 SRT 字幕的时间轴整体前移或后移，按\"读 → 改 → 写\"拆成了三个类。</p>",
  code: `struct Cue { int index; Millis start, end; std::vector<std::string> lines; };

class SrtReader {        // 第一步：解析
public:
    // 每条字幕 = 序号行 + "00:01:02,345 --> 00:01:04,000" + 若干文本行 + 空行
    std::vector<Cue> read(std::istream& in);   // 内部用 parseTime("HH:MM:SS,mmm")
};
class CueShifter {       // 第二步：平移；结果小于 0 的截成 0
public:
    void shift(std::vector<Cue>& cues, Millis delta);
};
class SrtWriter {        // 第三步：写回
public:
    void write(std::ostream& out, const std::vector<Cue>& cues) {
        for (auto& c : cues) {
            out << c.index << '\\n'
                << fmtTime(c.start) << " --> " << fmtTime(c.end) << '\\n';  // "HH:MM:SS,mmm"
            for (auto& l : c.lines) out << l << '\\n';
            out << '\\n';                                                  // 条目之间空一行
        }
    }
};`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["temporal", "leakage"], mark: [5, 6, 16, 17, 19],
  explain: `<p>按执行顺序切成了三个类，而读和写这两个时刻用的是<strong>同一份知识</strong>：SRT 的格式（第 5～6 行解析的条目结构和时间写法，第 16～19 行又原样写了一遍）。这是按时间顺序分解，结果就是格式这一个设计决定住进了两个类。两个类互不引用，谁的接口都没表明"我和对方必须对格式保持一致"，这是后门泄漏。</p>
<p>后果很具体：要支持 WebVTT（毫秒前用点号、文件开头要有 <code>WEBVTT</code>），或者要求写回时保留原文件的换行符和 BOM，读写两边都得改；保留换行符还得让 <code>Cue</code> 多带一个与平移毫无关系的字段，格式细节就从后门泄漏变成了接口泄漏。更好的设计是一个 <code>SubtitleFile</code> 类，<code>load</code> 和 <code>save</code> 放在一起，格式只有一个家。注意 <code>CueShifter</code> 没有问题：它只懂时间，不懂格式，作为单独一步是合理的。</p>`,
},
{
  id: "ch05-ab-01", ch: 5, type: "ab", title: "RPC 回复要带什么",
  prompt: "<p>一个内部 RPC 框架。每个回复必须带上与请求一致的协议版本、请求关联 id 和编码方式（JSON 或 protobuf）。两种处理函数写法：</p>",
  a: { label: "调用者自己填", code: `void handleGetUser(const Request& req, Connection& conn) {
    User u = db.load(req.param<int64_t>("id"));
    Reply r(req.protocolVersion(), req.correlationId(), req.codec());
    r.setStatus(Status::Ok);
    r.setBody(u);
    r.setHeader("Date", httpDate(Clock::now()));
    conn.send(r);
}` },
  b: { label: "框架从请求里推出来", code: `void handleGetUser(const Request& req, Responder& resp) {
    User u = db.load(req.param<int64_t>("id"));
    resp.ok(u);    // 版本、关联 id、编码、Date 头都由框架按 req 自动填
}
// 极少数需要覆盖的场景：
resp.withHeader("Cache-Control", "no-store").ok(u);` },
  answer: "b",
  explain: `<p>版本、关联 id、编码方式都<strong>必须</strong>和请求一致，而请求本来就在框架手里。A 让几百个处理函数各自抄一遍第 3 行：调用者多半不知道为什么要填这些，抄错一个（比如把 codec 写死成 JSON）就是线上故障。这是不充分的默认值，也是框架和调用者之间的信息泄漏。</p>
<p>B 让常见用法只剩一行，罕见的覆盖走单独的方法（部分隐藏）。书中 5.7 节学生的 HTTP 响应要求调用者显式指定协议版本，说的就是这件事；Date 头也应该有默认值。</p>`,
},
{
  id: "ch05-ab-02", ch: 5, type: "ab", title: "读改写配置文件，保留注释", flags: ["temporal"],
  prompt: "<p>一个运维工具需要修改 INI 配置文件中的个别值，要求保留原文件的注释和顺序。两种设计：</p>",
  a: { label: "", code: `class IniDocument {
public:
    static IniDocument load(const std::string& path);
    std::optional<std::string> get(std::string_view key) const;
    void set(std::string_view key, std::string_view value);   // 保留注释与原有顺序
    void save(const std::string& path) const;
};

auto doc = IniDocument::load(path);
doc.set("server.port", "9090");
doc.save(path);` },
  b: { label: "", code: `class IniReader { public: IniMap read(const std::string& path); };
class IniWriter { public: void write(const std::string& path, const IniMap& m); };

// IniMap 里除了键值，还要带上注释行和每个键的原始位置，
// 这样 IniWriter 才能按原样写回去
auto m = IniReader().read(path);
m.set("server.port", "9090");
IniWriter().write(path, m);` },
  answer: "a",
  explain: `<p>B 是按时间顺序分解：先读、后写。可"保留注释和顺序"要求读写双方对同一份信息（注释放在哪、空行怎么记、键的原始位置）有一致的理解，于是这些格式细节要么泄漏进 <code>IniMap</code> 的接口，要么在两个类里各写一遍。</p>
<p>A 让同一个类在"读"和"写"两个时刻都被用到，格式知识只有一个家，调用者也只学一个类。如果读和写真的毫无共享知识（比如读 INI、写 JSON），拆开就没有这个问题。</p>`,
},
{
  id: "ch05-ab-03", ch: 5, type: "ab", title: "令牌桶限流",
  prompt: "<p>一个令牌桶限流器，两种接口：</p>",
  a: { label: "", code: `class TokenBucket {
public:
    TokenBucket(double ratePerSec, double burst);
    // 有足够令牌就扣掉并返回 true；否则返回 false，不阻塞。线程安全。
    bool tryAcquire(double n = 1);
};

if (!limiter.tryAcquire()) return Status::TooManyRequests;` },
  b: { label: "", code: `class TokenBucket {
public:
    double tokens() const;           void setTokens(double t);
    TimePoint lastRefill() const;    void setLastRefill(TimePoint t);
    double rate() const;             double burst() const;
};

auto now = Clock::now();
double t = std::min(limiter.burst(),
    limiter.tokens() + limiter.rate() * secondsBetween(limiter.lastRefill(), now));
if (t < 1) return Status::TooManyRequests;
limiter.setTokens(t - 1); limiter.setLastRefill(now);` },
  answer: "a",
  explain: `<p>B 的成员变量也许都是私有的，但令牌桶算法（按时间补充、封顶、扣减）完整地暴露给了每个调用者，私有在这里没有起到隐藏作用。更糟的是，"读、算、写回"分成了三次调用，多线程下根本无法正确使用，除非调用者自己再加锁。</p>
<p>A 把算法、时间计算和并发控制都藏了起来，接口只有一个问题："现在能不能过？"以后要换成滑动窗口算法，调用方一行都不用改。</p>`,
},
{
  id: "ch05-ab-04", ch: 5, type: "ab", title: "块缓存的容量",
  prompt: "<p>一个存储引擎的块缓存（block cache）。同一个库既跑在 512 MB 内存的边缘设备上，也跑在 256 GB 内存的服务器上。两种设计：</p>",
  a: { label: "全部藏起来", code: `class BlockCache {
public:
    BlockCache();      // 内部固定 1 GB，接口最简单
    std::shared_ptr<const Block> get(BlockId id);
    void put(BlockId id, std::shared_ptr<const Block> b);
};` },
  b: { label: "暴露容量，带默认值", code: `class BlockCache {
public:
    struct Options {
        size_t capacityBytes = 1ull << 30;  // 1 GB；内存小的设备请调低
    };
    explicit BlockCache(Options opt = {});
    std::shared_ptr<const Block> get(BlockId id);
    void put(BlockId id, std::shared_ptr<const Block> b);
};` },
  answer: "b",
  explain: `<p>这是 5.9 节"做过头"的情况：容量是模块外<strong>确实需要</strong>的信息，不同部署的合理取值差了几百倍，模块自己也无法可靠地推断出来。A 把它藏起来，在边缘设备上会直接内存不足，而使用者连调的地方都没有。</p>
<p>B 依然让常见用法很简单（默认构造），同时给了必要的旋钮。作者认为最好的情况是模块能自己调整，例如按可用内存的比例自动定容量；如果能做到，就比 B 更好。但做不到时，必须暴露。</p>`,
},
{
  id: "ch05-judge-01", ch: 5, type: "judge", title: "什么算信息隐藏？",
  prompt: "<p>下面哪一种说法最准确地描述了书中的\"信息隐藏\"？</p>",
  options: [
    "把所有成员变量声明为 <code>private</code>，通过 getter/setter 访问",
    "尽量少写注释，避免把实现细节泄漏给读者",
    "让每个模块把少数几个设计决定（数据结构、算法、格式、关于使用场景的假设等）封装在实现里，接口不反映它们",
    "把代码拆成尽可能多的小类，每个类只知道一点点东西",
  ],
  answer: 2,
  explain: `<p>信息隐藏的对象是<strong>设计决定</strong>（知识），不是变量本身。<code>private</code> 是帮你做到这一点的工具，但 getter/setter 往往把变量的本质原样交了出去。注释与信息隐藏不冲突：接口注释描述的是抽象，不是实现。至于拆成很多小类，第 4 章已经说过，这往往会让接口总量膨胀，反而引发泄漏。</p>
<p>书中还特别指出，被隐藏的不只是底层细节（如页大小），也可以是高层假设，例如"大多数文件都很小"。</p>`,
},
{
  id: "ch05-judge-02", ch: 5, type: "judge", title: "顺序不能决定结构吗？",
  prompt: "<p>一个编译器分成词法分析、语法分析、语义检查、代码生成四个模块，正好按执行顺序排列。按本章的观点，下列哪个判断最合理？</p>",
  options: [
    "要看各阶段用到的知识是否基本互不重叠；如果是，按阶段划分与信息隐藏是一致的",
    "这是典型的按时间顺序分解，应该合并成一个模块",
    "只要每个模块的接口都很小，就一定没有泄漏",
    "按执行顺序划分总是对的，因为顺序必须体现在代码里",
  ],
  answer: 0,
  explain: `<p>作者反对的是<strong>让执行顺序决定模块结构</strong>，因为大多数知识会在多个时刻用到。但作者明确留了例外：如果不同阶段使用的信息完全不同，按阶段划分就和信息隐藏一致。词法规则、文法、类型系统、目标机器指令确实是相当独立的知识，所以经典编译器的分阶段结构大体合理。</p>
<p>"接口小就没有泄漏"不对：后门泄漏恰恰不出现在接口上。"顺序必须体现在代码里"是对的，但它可以体现在一个驱动函数里，不必体现在模块边界上。</p>`,
},
{
  id: "ch05-judge-03", ch: 5, type: "judge", title: "怎么修这个泄漏",
  prompt: "<p>你发现 <code>OrderExporter</code> 和 <code>OrderImporter</code> 都懂订单导出文件的格式（列顺序、转义规则、日期格式），两个类都不大，而且几乎只做这件事。最直接的修法是？</p>",
  options: [
    "在两个类的头文件里加注释，说明它们共享格式",
    "抽出一个 <code>OrderFileFormat</code> 类，提供 <code>columnIndex(name)</code>、<code>escapeChar()</code>、<code>dateFormat()</code> 给两边用",
    "把格式定义放进一个全局常量头文件",
    "把两个类合并成一个 <code>OrderFile</code>，提供 <code>write(orders)</code> 和 <code>read()</code>",
  ],
  answer: 3,
  explain: `<p>书中给出的第一种修法：如果受影响的类都比较小、又和泄漏的知识紧密相关，就合并它们。合并后格式只有一个家。</p>
<p>抽出 <code>OrderFileFormat</code> 也是一种思路，但这里它的接口把格式细节一条条公开了，两边仍然要懂格式，只是把后门泄漏换成了接口泄漏，作者专门提醒过这种情况。全局常量头文件同理，只能统一几个数值，管不了转义和解析的逻辑。加注释能降低"未知的未知"，但依赖本身还在。</p>`,
},
{
  id: "ch05-judge-04", ch: 5, type: "judge", title: "类内部的信息隐藏",
  prompt: "<p>一个 1500 行的 <code>Connection</code> 类里，成员变量 <code>state_</code>（连接状态枚举）被 37 个方法直接读写。按书中 5.8 节的建议，最值得做的是？</p>",
  options: [
    "把 <code>state_</code> 改成 <code>protected</code>，方便子类使用",
    "减少直接使用 <code>state_</code> 的地方：把状态转换收进少数几个私有方法（如 <code>transitionTo()</code>），其他方法通过它们访问",
    "给 <code>state_</code> 加一对 getter/setter，所有方法都通过它们访问",
    "没有问题：类内部的变量本来就可以随便用",
  ],
  answer: 1,
  explain: `<p>作者建议在类内部同样应用信息隐藏：让私有方法各自封装一点知识，并<strong>尽量减少每个成员变量被用到的地方</strong>。<code>state_</code> 被 37 处直接改写，意味着"哪些状态转换是合法的"这份知识散落在 37 处。收进 <code>transitionTo()</code> 之后，合法性检查和日志都只有一个家。</p>
<p>换成 getter/setter 只是换了一种写法，37 处依赖一个不少。</p>`,
},
{
  id: "ch05-write-01", ch: 5, type: "write", title: "把格式收进一个类",
  prompt: `<p>一个监控代理把采样点写进本地的二进制文件，另一个上报进程读出来发给服务端。现在两边各自实现了格式（见下）。请设计一个类，让格式只有一个家：写出类声明和一两行接口注释，并说明它藏住了哪些设计决定。</p>`,
  code: `// agent/sample_writer.cpp
void SampleWriter::write(const Sample& s) {
    putU16(out_, 0xA55A);                 // 魔数
    putU64(out_, s.unixMicros);
    putU32(out_, s.metricId);
    putF64(out_, s.value);
}
// uploader/sample_reader.cpp
bool SampleReader::next(Sample& s) {
    if (getU16(in_) != 0xA55A) return resync();   // 跳到下一个魔数
    s.unixMicros = getU64(in_); s.metricId = getU32(in_); s.value = getF64(in_);
    return true;
}`,
  reference: `<pre><code class="lang-cpp">// 采样点的本地缓冲文件。写入方追加，读取方按顺序消费；
// 遇到损坏的片段会自动跳过（并计数），不会抛给调用者。
class SampleFile {
public:
    static SampleFile openForAppend(const std::string&amp; path);
    static SampleFile openForRead(const std::string&amp; path);
    void append(const Sample&amp; s);
    std::optional&lt;Sample&gt; next();       // 读到末尾返回 nullopt
    uint64_t skippedCorruptBytes() const;
};</code></pre>
<p>藏住的设计决定：魔数和记录布局、字段宽度与字节序、时间戳精度（微秒）、损坏后如何重新同步。以后要加 CRC、加版本号、换成变长编码，只改这一个类；agent 和 uploader 都不用动。</p>`,
  rubric: ["读和写放在同一个类（或同一个模块）里，而不是两个各懂格式的类", "接口里没有出现魔数、字段偏移、字节序这类格式细节", "说清了损坏数据的处理方式（属于接口的非正式部分）", "列出了至少三个被隐藏的设计决定"],
  explain: `<p>注意第 10 行的 <code>resync()</code>：读方"怎么从损坏中恢复"依赖写方"魔数放在哪"，这是两边耦合得最紧、也最容易改出 bug 的地方。合进一个类后，这对互相依赖的逻辑挨在一起，一个往返测试就能覆盖。</p>`,
},
{
  id: "ch05-write-02", ch: 5, type: "write", title: "给邮件发送接口加上默认值",
  prompt: `<p>下面是一个邮件发送函数。业务方 95% 的调用只是"给某人发一封 UTF-8 的通知邮件"，SMTP 服务器全公司只有一套。请重新设计接口，让常见用法尽可能简单，同时不丢掉少数场景需要的能力。</p>`,
  code: `void sendMail(const std::string& smtpHost, int port, bool startTls,
              const std::string& heloName, const std::string& from,
              const std::vector<std::string>& to, const std::string& subject,
              const std::string& body, const std::string& charset,
              int timeoutMs, int retries);`,
  reference: `<pre><code class="lang-cpp">struct Mail {
    std::vector&lt;std::string&gt; to;
    std::string subject, body;
    std::string charset = \"UTF-8\";           // 绝大多数调用方不用管
    std::string from = "noreply@example.com";
};
class Mailer {
public:
    // 从部署配置读取 SMTP 地址、TLS、超时与重试策略。
    static Mailer&amp; instance();
    void send(const Mail&amp; m);                // 失败时按内置策略重试，最终失败抛 MailError
    // 少数场景：测试环境指向本地 SMTP，或特殊的超时要求
    explicit Mailer(SmtpConfig cfg);
};

Mailer::instance().send({.to = {user.email}, .subject = "订单已发货", .body = text});</code></pre>`,
  rubric: ["常见调用只需要收件人、标题、正文", "SMTP 主机、端口、TLS、HELO 名等全局一致的信息不再由每个调用方传入", "字符集、超时、重试有合理的默认值，需要时仍可覆盖（单独的构造函数、选项或方法）", "说明了失败时的行为"],
  explain: `<p>原接口有 11 个参数，其中至少 6 个对所有调用方都相同。每个调用方都抄一遍，就是一种信息泄漏：哪天 SMTP 服务器迁移，要改几百处。把它们移进配置并提供默认值，既让常见用法简单（第 4 章的原则），也是部分隐藏：只有需要覆盖的人才会知道这些选项。</p>`,
},
{ id: "ch05-card-01", ch: 5, type: "card",
  front: "<b>信息隐藏</b>指什么？它从哪两个方面降低复杂性？",
  back: "<p>每个模块把少数几个设计决定（数据结构、算法、格式、底层常量、关于使用场景的假设）封装在实现里，接口不反映它们。① 接口更简单，使用者的认知负担更低；② 这些决定只被一个模块依赖，改它只动一处，系统更容易演进。</p>" },
{ id: "ch05-card-02", ch: 5, type: "card",
  front: "什么是<b>后门泄漏</b>？为什么比通过接口泄漏更糟？",
  back: "<p>两个模块依赖同一个设计决定，但谁的接口里都没体现（例如一个读、一个写同一种文件格式）。接口上的泄漏至少看得见；后门泄漏只能靠记忆或全文搜索去发现，改的时候很容易漏掉一处。</p>" },
{ id: "ch05-card-03", ch: 5, type: "card",
  front: "发现信息泄漏后，书中建议的两种修法是什么？第二种有什么前提？",
  back: "<p>① 如果受影响的类都小、又和泄漏的知识紧密相关，把它们<b>合并</b>成一个类。② 把这份知识<b>抽出来</b>放进一个新类。前提：新类能给出一个远比知识本身简单的接口；否则只是把后门泄漏换成了接口泄漏。</p>" },
);
