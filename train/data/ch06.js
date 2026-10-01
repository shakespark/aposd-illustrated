// 第 6 章 通用的模块更深 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch06-flag-01", ch: 6, type: "flag", title: "一个页面一个查询方法",
  prompt: "<p>电商后台的订单仓储类。每做一个新页面，就在这里加一个方法。</p>",
  code: `class OrderRepository {
public:
    // 发票页：某用户第 page 页，每页 20 条，只要已支付的
    std::vector<Order> findOrdersForInvoicePage(UserId u, int page);
    // 退款弹窗：某用户 30 天内、未退款的订单
    std::vector<Order> findOrdersForRefundDialog(UserId u);
    // 月度导出：某月全部订单，按金额降序
    std::vector<Order> findOrdersForCsvExport(YearMonth m);
    // 首页小部件：最近 3 条
    std::vector<Order> findOrdersForHomeWidget(UserId u);
};`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["shallow", "leakage"], mark: [4, 6, 8, 10],
  explain: `<p>每个方法只服务一个界面、只在一处被调用，各自只是一条稍有不同的查询，这是一组<strong>浅</strong>方法：使用者要学的方法越来越多，每个方法替使用者藏住的东西却很少。</p>
<p>同时，"发票页每页 20 条""退款只看 30 天内""首页显示 3 条"这些<strong>界面层的决定泄漏进了数据层</strong>：产品改一下退款期限，改的却是仓储类。更通用的接口是一个能表达条件、排序和分页的查询，例如 <code>find(const OrderQuery&amp; q)</code>，30 天、20 条这些数字留在各自的页面代码里。书中 6.2 节编辑器文本类里那组和按键一一对应的方法，是同一个问题。</p>`,
},
{
  id: "ch06-flag-02", ch: 6, type: "flag", title: "对象存储客户端",
  prompt: "<p>一个对象存储客户端，目前被头像上传、每日备份、日志归档三个功能使用。</p>",
  code: `// 对象存储。key 是任意 UTF-8 字符串；写入是原子的（要么全部可见，要么不可见）。
class BlobStore {
public:
    void put(std::string_view key, std::span<const std::byte> data);
    std::optional<std::vector<std::byte>> get(std::string_view key) const;
    // 按字典序列出以 prefix 开头的 key，最多 limit 个，从 after 之后开始
    std::vector<std::string> list(std::string_view prefix, size_t limit,
                                  std::string_view after = "") const;
    bool remove(std::string_view key);    // 不存在时返回 false
};`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["none"],
  explain: `<p>这是"有点通用"的样子：四个方法只讲 key 和字节，不知道头像、备份、日志是什么；三个功能都能直接用，新功能（比如存导出文件）也不用改它。接口背后藏着分片上传、重试、签名、一致性保证，是深的。</p>
<p><code>list</code> 带三个参数，但每个都有明确含义，而且是分页列举这件事本身必需的信息，不算过度暴露。对比 flag-01：那里的每个方法都绑定了一个具体页面。</p>`,
},
{
  id: "ch06-flag-03", ch: 6, type: "flag", title: "通用任务调度器",
  prompt: "<p>一个后台任务调度器，负责排队、重试、记录结果。各业务把任务提交给它。</p>",
  code: `void Scheduler::onJobFailed(Job& job, const Error& err) {
    if (job.type == "send_email" && err.code == SmtpErr::ConnectionLost) {
        smtpPool_.reconnectAll();             // 邮件任务失败时顺便重连 SMTP
        job.retryAt = now() + 5s;
    } else if (job.type == "charge_card" && err.code == PayErr::InsufficientFunds) {
        job.state = JobState::Abandoned;      // 余额不足的扣款不要重试
        notifyBilling(job.userId);
    } else {
        job.retryAt = now() + backoff(job.attempts);
    }
}`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["leakage"], mark: [2, 3, 5, 6, 7],
  explain: `<p>"排队、到点重试"是通用机制，但第 2～7 行里写着邮件和扣款两个业务的专用知识：SMTP 连接池、哪种支付错误不该重试、要通知计费系统。这些设计决定本该只属于各自的业务模块，现在调度器也知道它们，这是信息泄漏。调度器还因此依赖了 <code>smtpPool_</code> 和计费系统，每加一种任务都可能要改它。</p>
<p>按书中 6.7 节的拆法：调度器只管机制；每种任务自己决定失败后怎么办，例如任务对象提供 <code>RetryDecision onFailure(const Error&amp;)</code>；重试次数上限这类策略由组装代码配置。第 9 章会把这种情况正式命名为"通用与专用混杂"。</p>`,
},
{
  id: "ch06-flag-04", ch: 6, type: "flag", title: "块设备接口",
  prompt: "<p>一个嵌入式存储引擎，要同时支持 SPI NOR 闪存、SD 卡和测试用的内存盘。</p>",
  code: `// 以固定大小的块为单位读写的设备。块号从 0 开始；越界抛 DeviceError。
class BlockDevice {
public:
    virtual ~BlockDevice() = default;
    virtual size_t blockSize() const = 0;
    virtual uint64_t blockCount() const = 0;
    virtual void read(uint64_t block, std::span<std::byte> out) = 0;
    virtual void write(uint64_t block, std::span<const std::byte> data) = 0;
    virtual void flush() = 0;    // 返回时，之前写入的块已持久化
};

class SpiNorFlash : public BlockDevice { /* 擦除再写、页编程、状态寄存器轮询…… */ };
class SdCard      : public BlockDevice { /* CMD17/CMD24、CRC、卡初始化序列…… */ };
class RamDisk     : public BlockDevice { /* 一块 std::vector<std::byte> */ };`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["none"],
  explain: `<p>这是把专用代码<strong>往下推</strong>：每种设备千差万别的命令集（闪存的先擦后写、SD 卡的命令序列）都压进各自的实现类，存储引擎的核心只认识通用的"读块、写块、刷盘"。加一种新设备，只要实现这五个方法，核心代码不用改。书中 6.6 节用操作系统的设备驱动说明的就是这件事。</p>
<p><code>RamDisk</code> 的实现可能只有几行，但这不是浅模块的问题：它是同一个接口的一种实现，接口的价值体现在让引擎核心与设备无关。</p>`,
},
{
  id: "ch06-flag-05", ch: 6, type: "flag", title: "把三个导出方法合成一个",
  prompt: "<p>报表模块原来有 <code>exportCsv</code>、<code>exportJson</code>、<code>exportForEmail</code> 三个方法。为了\"减少方法数、更通用\"，合成了下面这一个。</p>",
  code: `// json: 输出 JSON 而不是 CSV
// gzip: 压缩输出
// forEmail: 截断到 10 MB 并加上邮件附件头（要求 gzip == true）
// legacyColumns: 使用 2019 年以前的列名（只对 CSV 生效）
// indent: JSON 缩进空格数（只对 JSON 生效，-1 表示单行）
std::string exportReport(const Report& r, bool json, bool gzip,
                         bool forEmail, bool legacyColumns, int indent);

auto out = exportReport(r, false, false, false, false, -1);   // 最常见：普通 CSV`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["overexposure"], mark: [6, 7, 9],
  explain: `<p>方法数确实从 3 变成了 1，但最常见的用法（导出普通 CSV）必须先弄懂五个参数和它们之间的约束（第 3～5 行的"只对……生效""要求……"），这就是<strong>过度暴露</strong>。第 9 行一串 <code>false</code> 谁也读不懂。</p>
<p>书中 6.5 节专门提醒：减少方法数只有在每个方法保持简单时才算简化；靠加一堆参数把方法合并，往往并没有简化。更好的通用核心是"把报表写成某种格式"：<code>void write(const Report&amp;, Format&amp; fmt, Sink&amp; out)</code>，CSV/JSON 是两个 <code>Format</code> 实现，压缩和邮件截断属于上层的 <code>Sink</code> 或调用方逻辑。</p>`,
},
{
  id: "ch06-flag-06", ch: 6, type: "flag", title: "公共 HTTP 客户端库",
  prompt: "<p>公司的公共 HTTP 客户端库，被几十个服务使用。支付组为了方便，往里面加了一个方法。</p>",
  code: `class HttpClient {
public:
    Response send(const Request& req, const SendOptions& opt = {});

    // 调用支付网关：自动加签名头 X-Pay-Sign（HMAC-SHA256，密钥取自 PAY_SECRET），
    // 超时 3 秒，遇到 502/503 重试 2 次，响应里的 "code" 不是 "0000" 时抛 PayError。
    nlohmann::json postToPaymentGateway(const std::string& path, const nlohmann::json& body);
};`,
  choices: ["shallow", "leakage", "temporal", "overexposure", "none"], answer: ["leakage"], mark: [5, 6, 7],
  explain: `<p>通用的 HTTP 客户端里出现了支付网关的专用知识：签名算法、密钥来源、重试规则、业务错误码 <code>"0000"</code>。这些设计决定现在同时存在于支付服务和公共库里，支付网关改个签名规则，要去改一个被几十个服务依赖的库并重新发布。这是信息泄漏，也是书中 6.5 节说的"为某一种特定用途设计的方法"。第 9 章会把这种情况正式命名为"通用与专用混杂"。</p>
<p>按 6.6 节，把专用代码<strong>往上推</strong>：支付服务里写一个 <code>PaymentGatewayClient</code>，内部用 <code>HttpClient::send</code>；公共库保持通用，如果有好几个服务需要"请求签名"，可以提供一个通用的钩子（比如 <code>SendOptions::signer</code>），而不是支付专用的方法。</p>`,
},
{
  id: "ch06-ab-01", ch: 6, type: "ab", title: "埋点指标接口",
  prompt: "<p>一个服务的监控模块，两种接口：</p>",
  a: { label: "", code: `class Metrics {
public:
    void recordLoginLatency(double ms);
    void recordCheckoutLatency(double ms);
    void recordSearchLatency(double ms, bool cacheHit);
    void incrementFailedLogins();
    void incrementOrdersPlaced(Region r);
    // ……每个功能上线都会再加几个
};` },
  b: { label: "", code: `class Metrics {
public:
    // 同名同标签的指标只创建一次；返回的引用在进程生命期内有效，线程安全。
    Histogram& histogram(std::string_view name, Labels labels = {});
    Counter&   counter(std::string_view name, Labels labels = {});
};

metrics.histogram("search.latency_ms", {{"cache", hit ? "hit" : "miss"}}).observe(ms);
metrics.counter("orders.placed", {{"region", toString(r)}}).inc();` },
  answer: "b",
  explain: `<p>A 的每个方法只服务一个功能，监控模块因此知道了"登录""结账""搜索有没有命中缓存"这些业务概念；每加一个功能都要改它，负责监控的人和负责业务的人被绑在了一起。</p>
<p>B 只提供两种通用的度量类型，业务把自己的名字和标签留在业务代码里。接口更小，实现也更少（不再有几十个大同小异的方法），而且能服务今天还没想到的指标。指标名写错的风险可以用常量或一个薄薄的业务封装来缓解，那层封装属于业务模块，不属于 <code>Metrics</code>。</p>`,
},
{
  id: "ch06-ab-02", ch: 6, type: "ab", title: "日志段文件的读接口",
  prompt: "<p>一个日志结构存储需要从段文件里读记录（每条记录几十字节到几兆字节）。两种读接口：</p>",
  a: { label: "按范围读", code: `class SegmentFile {
public:
    // 从 offset 开始读 out.size() 字节；越过文件末尾时抛 OutOfRange。
    void read(uint64_t offset, std::span<std::byte> out) const;
    uint64_t size() const;
};

std::array<std::byte, 8> hdr;
seg.read(off, hdr);
std::vector<std::byte> payload(decodeLen(hdr));
seg.read(off + 8, payload);` },
  b: { label: "最小、最通用", code: `class SegmentFile {
public:
    std::byte byteAt(uint64_t offset) const;   // 越界时抛 OutOfRange
    uint64_t size() const;
};

std::array<std::byte, 8> hdr;
for (int i = 0; i < 8; ++i) hdr[i] = seg.byteAt(off + i);
std::vector<std::byte> payload(decodeLen(hdr));
for (size_t i = 0; i < payload.size(); ++i)
    payload[i] = seg.byteAt(off + 8 + i);` },
  answer: "a",
  explain: `<p>B 更"通用"，接口也更小，但它通用过了头：今天的每个用法都要写循环（第三个自问："为了当前需求，要写很多额外代码吗？"），而且每读一个字节都要走一次边界检查、可能还有一次系统调用或缓存查找，几兆字节的记录会慢得离谱。</p>
<p>A 同样通用（不知道记录格式），又直接支持今天真正需要的"读一段"。书中 6.5 节对只支持单字符操作的文本类给出的结论一样：应该内建对一段范围的操作。</p>`,
},
{
  id: "ch06-ab-03", ch: 6, type: "ab", title: "分页游标",
  prompt: "<p>一个分页拉取接口。两种设计下的调用方代码：</p>",
  a: { label: "没有游标是特殊情况", code: `std::optional<Cursor> cur;          // 空表示"从头开始"
do {
    Page p = cur ? api.nextPage(*cur) : api.firstPage();
    for (auto& item : p.items) handle(item);
    cur = p.hasMore ? std::optional<Cursor>(p.next) : std::nullopt;
} while (cur);
// 断点续传、并行分片、重试的代码里，也都要先判断 cur 有没有值` },
  b: { label: "起点也是一个游标", code: `Cursor cur = Cursor::start();       // 起点也是一个普通的游标
for (;;) {
    Page p = api.fetch(cur);
    for (auto& item : p.items) handle(item);
    if (p.next.isEnd()) break;
    cur = p.next;
}` },
  answer: "b",
  explain: `<p>A 把"还没有游标"当成特殊情况：接口为它多了一个 <code>firstPage()</code>，调用方每一处都要分两条路走。B 让"从头开始"也成为一个普通的游标值，<code>fetch</code> 只有一条路径，断点续传就是把保存的游标传进去，不用再区分"是不是第一次"。</p>
<p>这就是书中 6.8 节的做法：重新设计正常情况，让它自然覆盖边界条件（书里用"空选区"代替"没有选区"）。代价是服务端要能把"起点"编码成一个合法的游标，这通常很容易。</p>`,
},
{
  id: "ch06-ab-04", ch: 6, type: "ab", title: "重试工具",
  prompt: "<p>团队想要一个统一的重试工具。两种实现：</p>",
  a: { label: "", code: `// 反复调用 op，直到成功、retriable 判定不可重试，或用完 policy 允许的次数。
template <class Op>
auto retry(Op op, const Backoff& policy,
           std::function<bool(const Error&)> retriable) -> decltype(op());

// 数据库模块里：
retry([&] { return db.exec(sql); }, cfg.dbBackoff,
      [](const Error& e) { return e.is<DbDeadlock>(); });` },
  b: { label: "", code: `template <class Op>
auto retry(Op op) -> decltype(op()) {
    for (int i = 0; ; ++i) {
        try { return op(); }
        catch (const DbDeadlock&) { if (i >= 3) throw; sleepFor(50ms); }
        catch (const HttpError& e) {
            if (e.status() != 429 || i >= 5) throw;
            sleepFor(parseRetryAfter(e.header("Retry-After")));
        }
    }
}` },
  answer: "a",
  explain: `<p>B 看起来用起来更省事，但通用的重试机制里写满了专用知识：数据库死锁该重试几次、HTTP 429 要读 <code>Retry-After</code> 头。重试工具因此依赖数据库和 HTTP 两个模块，每多一种可重试的错误就要改它。</p>
<p>A 是书中 6.7 节的三分法：<code>retry</code> 只管通用机制（循环、计次、等待）；"哪些错误可重试"这类具体细节由各模块传进来；退避参数这类策略来自配置。调用方多写一个 lambda，但这条知识本来就该在数据库模块里。</p>`,
},
{
  id: "ch06-judge-01", ch: 6, type: "judge", title: "\"有点通用\"该怎么做",
  prompt: "<p>你要为财务部门写一个\"按月导出对账单为 CSV\"的功能。下面哪种做法最符合书中\"有点通用\"的意思？</p>",
  options: [
    "做一个可插拔的报表引擎，支持 CSV、Excel、PDF、自定义模板和定时任务，以备将来之需",
    "只实现 CSV 导出这一项功能，但接口写成\"把一组记录按给定的列写到一个输出流\"，不出现\"财务\"\"对账单\"\"按月\"这些概念",
    "写一个 <code>exportFinanceMonthlyStatementCsv(int year, int month)</code>，等有第二个需求再说",
    "只提供 <code>writeCell(row, col, text)</code>，让财务模块自己拼",
  ],
  answer: 1,
  explain: `<p>"有点通用"：<strong>功能</strong>只反映当前需求（只做 CSV），<strong>接口</strong>不反映（不绑定财务、月份）。这样今天用起来方便，以后别的部门要导出别的数据也能直接用，而且实现不会比专用版本多。</p>
<p>第一个选项实现了大量用不到的功能，是作者说的"别得意忘形"；第三个是专用接口；第四个通用过了头，财务模块要写一堆额外代码，过不了第三个自问。</p>`,
},
{
  id: "ch06-judge-02", ch: 6, type: "judge", title: "哪个自问能发现问题？",
  prompt: "<p>一个配置库只提供 <code>getRawLine(int lineNo)</code> 和 <code>lineCount()</code>。它非常通用：任何文本格式都能读。但每个使用它的模块都写了二三十行代码来跳过注释、拆键值、转类型。书中三个自问里，哪一个最直接地暴露了这个问题？</p>",
  options: [
    "覆盖当前全部需求的最简单接口是什么？",
    "这个方法会在多少种场合被用到？",
    "这个 API 用来满足我当前的需求方便吗？",
    "这个模块会不会被别的项目复用？",
  ],
  answer: 2,
  explain: `<p>第三个自问专门用来发现"通用过头"：如果为了当前的用途要在调用方写很多额外代码，说明接口没有提供合适的功能。这里每个调用方都在重复解析逻辑，正是这种情况。</p>
<p>第二个自问发现的是相反的毛病（方法只为一种用途设计，太专用）。"会不会被复用"不在三个自问里：作者认为通用接口即使不被复用也更好，复用不是判断标准。</p>`,
},
{
  id: "ch06-judge-03", ch: 6, type: "judge", title: "撤销代码放哪里",
  prompt: "<p>一个 JSON 文档编辑库：通用的撤销/重做机制在单独的 <code>History</code> 模块里（只管命令列表和前后移动）；<code>JsonDocument</code> 类提供 <code>setField</code>、<code>removeField</code> 等编辑操作。\"撤销一次 setField\"的代码（记住旧值、需要时写回）应该放在哪里？</p>",
  options: [
    "<code>JsonDocument</code> 模块里：它是撤销机制的专用部分，但和文档的编辑操作关系紧密",
    "<code>History</code> 模块里：所有撤销相关的代码都应该放在一起",
    "调用 <code>setField</code> 的界面代码里：谁触发编辑谁负责撤销",
    "单独建一个 <code>JsonUndo</code> 模块，同时依赖 <code>History</code> 和 <code>JsonDocument</code> 的内部结构",
  ],
  answer: 0,
  explain: `<p>书中 6.7 节结尾的 Note 说的正是这个：把通用代码和专用代码分开，是针对<strong>同一个机制</strong>而言的。"撤销 setField"对撤销机制来说是专用代码，不该放进通用的 <code>History</code>；但它和文档的编辑操作关系紧密，放在 <code>JsonDocument</code> 里是合理的（书里的对应例子是文本类自己实现文本插入的撤销对象）。</p>
<p>放进界面代码会让每个调用方都要懂文档内部；单独的 <code>JsonUndo</code> 要依赖文档内部结构，制造新的泄漏。</p>`,
},
{
  id: "ch06-judge-04", ch: 6, type: "judge", title: "该藏还是该亮出来？",
  prompt: "<p>邮箱服务有一个 <code>Mailbox::archiveOld()</code>，内部把\"超过 30 天的已读邮件\"移进归档。界面上需要显示提示\"超过 30 天的已读邮件会被自动归档\"，界面组的同事为了确认规则，去读了 <code>archiveOld</code> 的实现。最合适的改进是？</p>",
  options: [
    "在界面代码里也写一个常量 30，保持一致即可",
    "把规则藏得更深，界面上不再显示具体天数",
    "给 <code>archiveOld</code> 加更详细的实现注释",
    "让规则成为显式的信息，例如 <code>archiveReadOlderThan(Duration age)</code>，天数由上层决定并同时用于提示文案",
  ],
  answer: 3,
  explain: `<p>书中 6.4 节说，设计里最重要的事情之一是想清楚<strong>谁需要知道什么、在什么时候</strong>。界面确实需要知道归档规则，<code>archiveOld()</code> 却假装把它藏了起来，这是虚假的抽象，界面开发者只好去读实现。把规则变成显式参数，天数就只在上层出现一次，同时服务归档和提示文案。</p>
<p>在界面里再写一个 30 是典型的信息泄漏（第 5 章）：两处必须同步修改，却没有任何东西把它们绑在一起。</p>`,
},
{
  id: "ch06-write-01", ch: 6, type: "write", title: "通知服务的通用接口",
  prompt: `<p>通知模块现在长这样，每个新业务都会再加一个方法。请设计一个"有点通用"的接口（类声明 + 必要注释），并说明原来那些业务细节（模板、渠道选择）放到了哪里。</p>`,
  code: `class Notifier {
public:
    void sendPasswordResetEmail(const User& u, const std::string& token);
    void sendWeeklyDigestEmail(const User& u, const std::vector<Article>& items);
    void sendOrderShippedSms(const User& u, const Order& o);
    void sendLoginAlertPush(const User& u, const Device& d);
};`,
  reference: `<pre><code class="lang-cpp">enum class Channel { Email, Sms, Push };

struct Message {
    std::string subject;      // 短信和推送忽略
    std::string body;         // 已渲染好的正文
};

// 把一条消息发给一个用户的指定渠道。用户没有该渠道的地址（如未绑定手机）时
// 返回 false，不抛异常；发送失败会在内部按固定策略重试，最终失败记日志。
class Notifier {
public:
    bool send(const User&amp; to, Channel ch, const Message&amp; m);
};

// 业务模块里（例如 auth/password_reset.cpp）：
notifier.send(u, Channel::Email, renderPasswordReset(u, token));</code></pre>
<p>"重置密码邮件长什么样""发货通知走短信"这些细节回到了各自的业务模块（往上推）；<code>Notifier</code> 只懂渠道、地址、重试和发送限额。</p>`,
  rubric: ["接口里不再出现具体业务概念（密码重置、周报、订单……）", "方法数少，但能覆盖原来所有用法", "模板渲染、渠道选择放回了业务模块", "说明了地址缺失、发送失败等情况的行为"],
  explain: `<p>用三个自问检查你的答案：方法数是否减少了而能力没减少？<code>send</code> 是否在很多场合都能用？业务方用它是否仍然方便（如果每个业务都要写二三十行才能发一条通知，就是通用过头了，可以考虑给常用模板提供辅助函数，但放在业务那一侧）。</p>`,
},
{
  id: "ch06-write-02", ch: 6, type: "write", title: "导入任务的回滚：机制、细节、策略",
  prompt: `<p>一个数据导入任务依次执行：在数据库里插入行、把附件上传到对象存储、调用下游的 webhook 登记。任何一步失败，都要把<strong>已经完成</strong>的步骤按相反顺序撤销掉。另外，同一个导入任务里的若干步可以组成一个"阶段"，失败时只回滚当前阶段。</p>
<p>请按书中 6.7 节的三分法设计：① 通用机制的接口（类声明）；② 具体细节由谁、在哪里实现；③ 组合策略由谁决定。</p>`,
  reference: `<pre><code class="lang-cpp">// ① 通用机制：记录"如何撤销"，失败时按相反顺序执行。不知道每一步是什么。
class Compensator {
public:
    using Undo = std::function&lt;void()&gt;;
    void push(Undo u);              // 某一步成功后登记它的撤销方式
    void beginStage();              // 之后 push 的步骤属于新阶段
    void rollbackStage();           // 逆序执行当前阶段的撤销，并清空它
    void rollbackAll();
    void commit();                  // 全部成功：丢弃撤销记录
};

// ② 具体细节：各模块自己知道怎么撤销自己的操作
auto id = db.insertRows(rows);
comp.push([&amp;db, id] { db.deleteRows(id); });
auto key = blobs.put(name, data);
comp.push([&amp;blobs, key] { blobs.remove(key); });

// ③ 组合策略：导入任务的顶层代码决定在哪里分阶段、失败时回滚多少
comp.beginStage();  /* 插行 + 上传附件 */
comp.beginStage();  /* webhook 登记 */</code></pre>`,
  rubric: ["通用机制里没有出现数据库、对象存储、webhook 等具体概念", "每种操作的撤销方式由最了解它的模块提供", "阶段的划分（分组策略）由上层决定，而不是写死在机制里", "考虑了撤销本身失败、或撤销顺序的问题（加分项）"],
  explain: `<p>结构上它和书中编辑器的 <code>History</code> 很像：通用的列表管理、各模块提供的具体动作、上层决定的分组（书里叫 fence）。三部分可以各自理解：<code>Compensator</code> 可以拿到任何需要"失败就回滚"的场合；新增一种步骤（比如发消息队列）只需在那一步登记撤销方式，不用改 <code>Compensator</code>。</p>`,
},
{ id: "ch06-card-01", ch: 6, type: "card",
  front: "什么是<b>\"有点通用\"</b>（somewhat general-purpose）的模块？",
  back: "<p>模块的<b>功能</b>反映当前需求，<b>接口</b>不反映：接口足够通用、能支持多种用法，同时今天用起来也方便。\"有点\"很重要：不要通用到满足今天的需求反而费劲。作者发现，这样的接口即使从未被复用，也比专用接口更简单、更深、实现代码更少。</p>" },
{ id: "ch06-card-02", ch: 6, type: "card",
  front: "书中 6.5 节帮你把握通用程度的<b>三个自问</b>是什么？",
  back: "<p>① 能覆盖我当前全部需求的最简单接口是什么？（减少方法数而不减少能力；但别靠堆参数）② 这个方法会在多少种场合用到？（只为一种用途设计是太专用的信号）③ 用它满足我当前的需求方便吗？（调用方要写很多额外代码，是通用过头的信号）</p>" },
{ id: "ch06-card-03", ch: 6, type: "card",
  front: "专用代码<b>往上推</b>和<b>往下推</b>各指什么？",
  back: "<p>往上推：具体功能的专用代码留在应用顶层，下层类只提供通用操作（编辑器的按键行为留在界面层）。往下推：把千差万别的专用细节压到底层实现里，核心只面对一个通用接口（操作系统的设备驱动）。两者目的相同：让专用代码和通用代码干净地分开。</p>" },
{ id: "ch06-card-04", ch: 6, type: "card",
  front: "书中撤销机制的例子把功能拆成了哪<b>三部分</b>？分开的单位是什么？",
  back: "<p>① 通用机制：管理动作列表、分组、调用撤销/重做（History 类）；② 具体细节：每种动作怎么撤销，由各自最相关的模块实现；③ 组合策略：哪些动作归为一组，由上层界面代码决定。分开是针对<b>同一个机制</b>说的：撤销文本插入的专用代码可以放在通用的文本类里，因为它和文本操作关系紧密。</p>" },
);
