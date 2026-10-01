// 第 9 章 合在一起还是分开？ —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch09-flag-01", ch: 9, type: "flag", title: "三个调用下游服务的函数",
  prompt: "<p>一个网关服务里有三个函数分别调用用户、订单、库存服务。下面列出其中两个，第三个长得一样。</p>",
  code: `std::optional<User> fetchUser(UserId id) {
    for (int attempt = 0; attempt < 3; ++attempt) {
        auto resp = http_.get(userUrl(id), 2s);
        if (resp.ok()) return User::fromJson(resp.body());
        if (resp.status() < 500 && resp.status() != 429) return std::nullopt;
        metrics_.inc("upstream_retry", {{"svc", "user"}});
        std::this_thread::sleep_for(100ms * (1 << attempt));
    }
    return std::nullopt;
}

std::optional<Order> fetchOrder(OrderId id) {
    for (int attempt = 0; attempt < 3; ++attempt) {
        auto resp = http_.get(orderUrl(id), 2s);
        if (resp.ok()) return Order::fromJson(resp.body());
        if (resp.status() < 500 && resp.status() != 429) return std::nullopt;
        metrics_.inc("upstream_retry", {{"svc", "order"}});
        std::this_thread::sleep_for(100ms * (1 << attempt));
    }
    return std::nullopt;
}`,
  choices: ["repetition", "conjoined", "passthrough", "none"], answer: ["repetition"], mark: [2, 3, 5, 6, 7, 13, 14, 16, 17, 18],
  explain: `<p>"重试几次、哪些状态码值得重试、退避多久、怎么计数"这一整套逻辑出现了三遍，只有 URL 和反序列化不同。这是<strong>重复</strong>：说明还缺一个抽象，比如 <code>std::optional&lt;Response&gt; getWithRetry(std::string_view svc, const Url&amp; url)</code>。</p>
<p>这次抽取很划算：被重复的片段有好几行，而新函数的签名很简单（两个参数）。书中 9.3 节说，消除重复最有效的情况正是"片段长、签名简单"。以后改退避策略也只需改一处。</p>`,
},
{
  id: "ch09-flag-02", ch: 9, type: "flag", title: "按\"每个函数不超过 10 行\"拆出来的解析器",
  prompt: "<p>原本是一个 40 行的 <code>parseLine</code>，为了满足行数规范拆成了下面几个私有方法，它们通过成员变量交换状态。</p>",
  code: `void LogParser::parseLine(std::string_view line) {
    line_ = line; pos_ = 0;
    readTimestamp();
    readLevel();
    readMessage();
}
void LogParser::readTimestamp() {
    ts_ = parseTs(line_.substr(pos_, 23));
    pos_ += 24;                       // 跳过时间戳和后面的空格
}
void LogParser::readLevel() {
    auto end = line_.find(']', pos_);   // 假设 pos_ 正好停在 '[' 上
    level_ = toLevel(line_.substr(pos_ + 1, end - pos_ - 1));
    pos_ = end + 2;
}
void LogParser::readMessage() {
    msg_ = line_.substr(pos_);        // 依赖前两步把 pos_ 推到了正确位置
}`,
  choices: ["conjoined", "repetition", "shallow", "none"], answer: ["conjoined"], mark: [2, 9, 12, 14, 17],
  explain: `<p>每个小函数单独看都"很短"，但没有一个能独立读懂：<code>readLevel</code> 假设 <code>pos_</code> 恰好停在 <code>'['</code> 上，这取决于 <code>readTimestamp</code> 里的 <code>+= 24</code>；<code>readMessage</code> 又依赖前两步。读的人只能在几个函数之间来回翻。这是<strong>连体方法</strong>。</p>
<p>它们之间真正的接口是"<code>pos_</code> 在每一步之后停在哪"，而这个接口哪里都没写。合回一个 40 行的函数，局部变量 <code>pos</code> 的变化一眼就能看全。如果某一段确实通用（比如解析时间戳），可以把它单独抽出来，但它应该只接收参数、返回结果，不碰共享状态。</p>
<p>为什么是"连体方法"而不是"浅模块"：9.7 节区分了两种拆法。这里是第一种：父方法 <code>parseLine</code> 接口不变，内部调用抽出来的子任务；这种拆法出问题时的症状，正是父子之间来回翻才能看懂，书中把它叫作连体方法。"浅"的风险对应第二种拆法：把功能拆成几个<strong>由调用者分别调用</strong>的方法，调用者得在它们之间来回传状态。这里外部只看得到 <code>parseLine</code>，几个私有方法也没有暴露给调用者，所以答案是连体方法。</p>`,
},
{
  id: "ch09-flag-03", ch: 9, type: "flag", title: "通用缓存里的一个 if",
  prompt: "<p>一个全公司共用的带过期时间的缓存，被十几个服务使用。最近为登录会话加了一段逻辑。</p>",
  code: `const std::string* TtlCache::get(std::string_view key) {
    auto it = map_.find(key);
    if (it == map_.end() || it->second.expiresAt < clock_.now())
        return nullptr;
    // 登录会话每次访问续期 30 分钟（管理员会话除外）
    if (key.starts_with("sess:") &&
        it->second.value.find("\\"role\\":\\"admin\\"") == std::string::npos)
        it->second.expiresAt = clock_.now() + 30min;
    return &it->second.value;
}`,
  choices: ["special-general", "passthrough", "temporal", "none"], answer: ["special-general"], mark: [5, 6, 7, 8],
  explain: `<p>缓存是一个通用机制，第 5～8 行却只服务于"登录会话"这一个用途，还认得会话的键前缀和 JSON 里的角色字段。这是<strong>通用与专用混杂</strong>：通用机制变复杂了，而且会话规则一改（比如续期改成 15 分钟、新增"只读会话"），就得去改这个十几个服务共用的缓存。</p>
<p>改法：缓存只提供通用能力，例如 <code>bool extend(std::string_view key, Duration ttl)</code>；"哪些会话续期、续多久"写在会话模块里，由它在查到会话后决定是否调用 <code>extend</code>。</p>`,
},
{
  id: "ch09-flag-04", ch: 9, type: "flag", title: "一个 90 行的函数",
  prompt: "<p>下面是一个 90 行函数的结构（每段的具体代码省略）。团队规范要求函数不超过 30 行，有人提议拆成 5 个函数。</p>",
  code: `// 生成每日对账报告。成功返回报告路径；任何一步失败抛 ReconcileError，
// 不会留下半成品文件。
std::filesystem::path buildDailyReconciliation(Date day) {
    // 1. 拉取当天的支付流水（约 15 行）
    // 2. 拉取当天的银行回单（约 15 行）
    // 3. 按交易号配对，找出单边账和金额不一致（约 25 行）
    // 4. 生成 CSV 到临时文件（约 20 行）
    // 5. 原子地重命名为最终文件名（约 10 行）
    ...
}`,
  choices: ["conjoined", "shallow", "temporal", "none"], answer: ["none"],
  explain: `<p>签名很简单（一个日期进，一个路径出），注释说清了失败语义，五段按顺序执行、各自相对独立，读的时候可以一段一段看。按书中 9.7 节的看法，这样的函数是<strong>深</strong>的，长一点没关系；只因为长度就拆成 5 个，只会多出 5 个接口，而且第 3、4 段要共享中间数据。</p>
<p>如果其中某一段是干净可分的通用子任务（例如"按交易号配对两组记录"可能在别处也用得上），可以把<strong>那一段</strong>抽出去。要拆，理由应该是"更干净的抽象"，而不是"超过 30 行"。</p>`,
},
{
  id: "ch09-flag-05", ch: 9, type: "flag", title: "每个方法开头都一样",
  prompt: "<p>一个线程安全的计数表，每个公开方法的第一行都相同。</p>",
  code: `class CounterTable {
public:
    void inc(const std::string& name, int64_t d = 1) {
        std::lock_guard lk(mu_);
        counters_[name] += d;
    }
    int64_t get(const std::string& name) const {
        std::lock_guard lk(mu_);
        auto it = counters_.find(name);
        return it == counters_.end() ? 0 : it->second;
    }
    std::map<std::string, int64_t> snapshot() const {
        std::lock_guard lk(mu_);
        return counters_;
    }
private:
    mutable std::mutex mu_;
    std::map<std::string, int64_t> counters_;
};`,
  choices: ["repetition", "conjoined", "shallow", "none"], answer: ["none"],
  explain: `<p><code>std::lock_guard lk(mu_);</code> 确实出现了三次，但它只有一行，本身就已经是一个抽象（RAII 守卫）。书中 9.3 节说过：如果重复的片段只有一两行，换成一次方法调用没什么好处。为了"消除重复"去做一个 <code>withLock(lambda)</code> 包装，反而让每个方法更难读。</p>
<p>"重复"这面红旗针对的是<strong>不算简单</strong>的代码反复出现，说明背后缺了一个抽象。一行惯用写法不属于这种情况。</p>`,
},
{
  id: "ch09-flag-06", ch: 9, type: "flag", title: "专门的错误报告类",
  prompt: "<p>复制模块里，检测到错误的地方都调用一个专门的报告类。这个类定义在同一个源文件末尾。</p>",
  code: `// 调用处（全文件只有这一处调用 followerTimeout）
if (elapsed > cfg_.heartbeatTimeout) {
    ReplicaErrors::followerTimeout(peer, term_, elapsed);
    markSuspect(peer);
}

struct ReplicaErrors {
    // 报告 follower 心跳超时。
    //   peer     超时的副本
    //   term     当前任期
    //   elapsed  距上次收到心跳的时间
    static void followerTimeout(const PeerId& peer, Term term, Duration elapsed) {
        LOG_WARN("follower {} timed out in term {} after {}ms", peer, term, ms(elapsed));
    }
    // ……还有 6 个同样只有一行 LOG 的静态方法，每个只在一处被调用
};`,
  choices: ["shallow", "conjoined", "repetition", "none"], answer: ["shallow", "conjoined"], mark: [3, 12, 13],
  explain: `<p>每个报告方法只有一行，却配了好几行参数说明，而且只在一个地方被调用：接口几乎和实现一样大，是<strong>浅</strong>方法。更麻烦的是它和调用处分不开：读调用处的人会翻过去确认到底记了什么，读报告方法的人又得翻回来才知道它在什么情况下被调用。这就是<strong>连体</strong>。</p>
<p>书中 9.6 节有一个几乎同构的学生项目例子，作者的结论是：删掉这些方法，把日志语句直接写在发现错误的地方。代码更好读，也少了一组接口。</p>`,
},
{
  id: "ch09-flag-07", ch: 9, type: "flag", title: "导出和导入",
  prompt: "<p>报表模块能把表格导出成 CSV，另一个团队写了导入功能。两段代码在不同的文件里。</p>",
  code: `// export.cpp
std::string toCsvField(std::string_view s) {
    bool quote = s.find_first_of(",\\"\\n") != std::string_view::npos;
    std::string out = quote ? "\\"" : "";
    for (char c : s) { if (c == '"') out += '"'; out += c; }  // 引号写两次
    if (quote) out += '"';
    return out;
}

// import.cpp
std::vector<std::string> splitCsvLine(std::string_view line) {
    // 按逗号切分；以引号开头的字段一直读到单独的引号为止，
    // 连续两个引号还原成一个。（不支持字段内换行）
    ...
}`,
  choices: ["leakage", "repetition", "conjoined", "none"], answer: ["leakage"], mark: [3, 5, 12, 13],
  explain: `<p>"哪些字符需要加引号、引号怎么转义、字段里能不能有换行"是同一个设计决定，却分别体现在两个文件里，而且已经不一致了：导出会给含换行的字段加引号，导入却不支持字段内换行。这是第 5 章说的<strong>信息泄漏</strong>，也正是 9.1 节"共享信息就放在一起"要解决的问题。</p>
<p>这两段代码不算"重复"（一个编码、一个解码，代码并不相同），但它们依赖同一份知识。把它们合进一个 CSV 模块，同一个文件里放读和写，规则只定义一次。</p>`,
},
{
  id: "ch09-ab-01", ch: 9, type: "ab", title: "日志记录的格式",
  prompt: "<p>预写日志（WAL）的每条记录是：4 字节长度 + 4 字节 CRC + 1 字节类型 + 数据。写入和崩溃恢复是两个模块。</p>",
  a: { label: "一个 RecordCodec", code: `// wal_record.h —— 记录格式只在这里定义
struct WalRecord { RecordType type; Bytes payload; };
Bytes encodeRecord(const WalRecord& r);
// 从 buf 开头解码一条记录；数据不完整或 CRC 不符返回 nullopt
std::optional<std::pair<WalRecord, size_t>> decodeRecord(ByteView buf);

// writer.cpp:   file_.append(encodeRecord(rec));
// recovery.cpp: while (auto r = decodeRecord(rest)) { ... }` },
  b: { label: "各写各的", code: `// writer.cpp
uint32_t len = payload.size();
uint32_t crc = crc32c(payload);
file_.append(&len, 4); file_.append(&crc, 4);
file_.append(&type, 1); file_.append(payload);

// recovery.cpp
uint32_t len, crc; uint8_t type;
memcpy(&len, p, 4); memcpy(&crc, p + 4, 4); type = p[8];
if (crc32c({p + 9, len}) != crc) break;` },
  answer: "a",
  explain: `<p>编码和解码<strong>共享同一份信息</strong>：字段顺序、长度、CRC 覆盖哪些字节。B 把这份知识拆到了两个文件里，以后加一个字段（比如序列号），两边必须同步改，漏改一边要到崩溃恢复时才暴露。A 把它们放在一起，格式只定义一次，接口也更简单：两边只看到"记录"，看不到字节布局。</p>
<p>这和书中 9.1 节 HTTP 请求"读取"和"解析"合并的道理一样。</p>`,
},
{
  id: "ch09-ab-02", ch: 9, type: "ab", title: "把重复的统计代码抽出来",
  prompt: "<p>三个地方都有一段约 6 行、更新滑动统计（计数、总和、最小、最大、最后时间）的代码。两种消除重复的方式：</p>",
  a: { label: "抽成函数", code: `void updateStats(int64_t& count, double& sum, double& minV,
                 double& maxV, TimePoint& last,
                 double v, TimePoint ts);

updateStats(latCount, latSum, latMin, latMax, latLast, v, now);` },
  b: { label: "抽成类型", code: `struct RunningStats {
    void add(double v, TimePoint ts);
    double mean() const;
    double min() const;
    double max() const;
    int64_t count() const;
    TimePoint last() const;
};

latency.add(v, now);` },
  answer: "b",
  explain: `<p>A 确实消除了重复，但这段代码和环境纠缠得太紧（要读写 5 个局部变量），抽出来的函数需要 5 个引用参数，调用处也不比原来好读多少，参数顺序还容易写错。书中 9.3 节专门提醒过：片段若访问大量局部变量，替代方法的签名会很复杂，价值就打了折扣。</p>
<p>B 意识到这 5 个变量本来就是一个东西，把它们变成一个类型，接口一下就简单了。重复往往说明缺了一个<strong>抽象</strong>，而不只是缺了一个函数。</p>`,
},
{
  id: "ch09-ab-03", ch: 9, type: "ab", title: "一个方法两种返回",
  prompt: "<p>数据库客户端的查询接口。绝大多数调用者只想要结果；少数调试工具想看执行计划。</p>",
  a: { label: "", code: `// explainOnly 为 true 时不执行，result.rows 为空，result.plan 有值；
// 否则 result.plan 为空。
QueryResult query(std::string_view sql, const Params& params,
                  bool explainOnly = false);` },
  b: { label: "", code: `RowSet query(std::string_view sql, const Params& params);
QueryPlan explain(std::string_view sql, const Params& params);` },
  answer: "b",
  explain: `<p>A 的一个方法在做两件不太相关的事，返回值里哪部分有效取决于一个布尔参数，每个调用者都得理解这层关系。这正是 9.7 节说的第二种合理拆分（把一个方法拆成调用者可见的两个）：拆完后<strong>每个方法的接口都比原来简单</strong>，而且大多数调用者只需要用其中一个。</p>
<p>作者也提醒，这种拆法并不常见。如果调用者经常要<strong>两个都调</strong>、还得在它们之间传状态，那就不该拆。</p>`,
},
{
  id: "ch09-ab-04", ch: 9, type: "ab", flags: ["conjoined", "shallow"], title: "导入接口",
  prompt: "<p>批量导入商品的模块，两种接口：</p>",
  a: { label: "", code: `// 导入 path 里的商品，返回成功/失败条数。
// 整个文件在一个事务里：任何一条写库失败都会整体回滚。
ImportResult importProducts(const std::filesystem::path& path);` },
  b: { label: "", code: `ImportJob job = beginImport(path);       // 打开文件、开事务
while (readNextBatch(job)) {             // 读 500 行到 job.batch
    validateBatch(job);                  // 把坏行移到 job.rejected
    writeBatch(job);                     // 写库；失败时设置 job.failed
}
finishImport(job);                       // 根据 job.failed 提交或回滚` },
  answer: "a",
  explain: `<p>B 把一个操作拆成了五个调用者可见的方法，而调用者<strong>必须全部按顺序调用</strong>，还要通过 <code>job</code> 在它们之间来回传状态。这是 9.7 节警告的情况：拆完得到一组浅方法，复杂性推给了调用者。这几个方法还是<strong>连体</strong>的：不读 <code>writeBatch</code> 的实现，就不知道 <code>finishImport</code> 凭什么决定回滚（它依赖 <code>writeBatch</code> 设置的 <code>job.failed</code>）；<code>validateBatch</code> 也只有在知道 <code>readNextBatch</code> 往 <code>job.batch</code> 里放了什么之后才看得懂。</p>
<p>A 是一个深方法：分批、校验、事务、回滚全藏在里面。什么时候 B 有道理？如果调用者真的需要在批次之间插入自己的逻辑（比如显示进度、允许中途取消），可以考虑给 A 加一个进度回调，而不是把整个流程摊开。</p>`,
},
{
  id: "ch09-ab-05", ch: 9, type: "ab", title: "表格打印工具",
  prompt: "<p>一个命令行工具库里有个把数据画成对齐表格的类。财务模块要打印带合计行的发票表。</p>",
  a: { label: "", code: `class TextTable {
public:
    void addRow(std::vector<std::string> cells);
    void setAlign(size_t col, Align a);
    // 发票专用：最后加一行"合计"，金额列右对齐并带千分位
    void addInvoiceTotal(const std::vector<LineItem>& items);
    std::string render() const;
};` },
  b: { label: "", code: `class TextTable {
public:
    void addRow(std::vector<std::string> cells);
    void setAlign(size_t col, Align a);
    void addSeparator();
    std::string render() const;
};

// invoice_printer.cpp
table.setAlign(2, Align::Right);
for (auto& it : items) table.addRow({it.name, qty(it), money(it.amount)});
table.addSeparator();
table.addRow({"合计", "", money(total(items))});` },
  answer: "b",
  explain: `<p>A 让通用的表格类认识了"发票"和"金额格式"，是<strong>通用与专用混杂</strong>：发票格式一变就得改表格库，表格库也被迫依赖 <code>LineItem</code>。B 让表格类只提供通用机制（行、对齐、分隔线），发票相关的知识留在发票模块里。</p>
<p>注意 B 顺便给表格加了一个<strong>通用</strong>的 <code>addSeparator()</code>：专用需求可以启发通用功能，但进入通用模块的应该是通用的那部分。</p>`,
},
{
  id: "ch09-judge-01", ch: 9, type: "judge", title: "总是一起用，就该合并？",
  prompt: "<p>系统里每个 <code>RateLimiter</code> 内部都用一个 <code>MonotonicClock</code> 取时间。有人提议：既然限流器总是要用时钟，就把时钟的代码并进 <code>RateLimiter</code>。你怎么看？</p>",
  options: [
    "不该合并：\"一起使用\"只有在双向成立时才是有力的理由；时钟在很多和限流无关的地方都会用到",
    "应该合并：两者总是一起使用，这是相关的明确迹象",
    "应该合并，因为合并后的类更深",
    "取决于两个类的代码行数",
  ],
  answer: 0,
  explain: `<p>书中列出的"两段代码相关"的迹象之一是"一起使用"，但作者特别强调<strong>这种关系必须是双向的</strong>才有说服力。书中的例子是磁盘块缓存和哈希表：块缓存几乎总要用哈希表，但哈希表在很多与块缓存无关的场合都会用到，所以应该分开。</p>
<p>这里同理：用限流器就要用时钟，用时钟却不一定用限流器。把时钟并进去，别的模块就没法单独用它了。</p>`,
},
{
  id: "ch09-judge-02", ch: 9, type: "judge", flags: ["conjoined"], title: "拆出子方法的条件",
  prompt: "<p>你想从一个长方法里抽出一段作为子方法（父方法调用它，父方法的接口不变）。按 9.7 节，下面哪一条最能说明这次拆分是好的？</p>",
  options: [
    "拆完后父方法和子方法都不超过 20 行",
    "子方法是私有的，外部看不到，所以不增加接口",
    "读子方法的人不需要知道父方法的任何事，读父方法的人也不需要理解子方法的实现；子方法甚至可能被别处复用",
    "子方法的名字能完整描述它做的每一步",
  ],
  answer: 2,
  explain: `<p>抽出子任务是作者认为<strong>最好</strong>的拆法，前提是子任务能被干净地分开：两边可以各自独立读懂。这通常意味着子方法相对通用。如果拆完后你发现得在父子之间来回翻才能看懂，那就是"连体方法"，说明这次拆分多半是个错误。</p>
<p>行数不是标准；私有方法同样有接口（参数、返回值、对状态的假设），读的人一样得学。</p>`,
},
{
  id: "ch09-judge-03", ch: 9, type: "judge", flags: ["conjoined"], title: "作者和 Clean Code 分歧在哪里",
  prompt: "<p>关于函数长度，下列哪种说法最符合作者在 9.8 节的立场？</p>",
  options: [
    "函数越长越好，因为相关代码都在一处",
    "短函数一般更容易理解；但缩到几十行以内后，再缩短对可读性帮助不大。更重要的是拆分是否降低了系统整体的复杂性，先追求深，再考虑短",
    "函数应该尽量短，10 行都嫌长",
    "长度无所谓，只要有单元测试",
  ],
  answer: 1,
  explain: `<p>作者并不反对短函数，也同意短的通常更好读。作者反对的是<strong>只按长度拆</strong>：函数太小就失去了独立性，变成必须放在一起读的连体函数，同时多出一堆需要文档和学习的接口。书中的排序是"深度比长度重要"。</p>
<p>"10 行都嫌长"是 Clean Code 的主张，也是作者明确反驳的对象。完整的对照见本站专题。</p>`,
},
{
  id: "ch09-write-01", ch: 9, type: "write", title: "消除分页参数的重复",
  prompt: `<p>三个 HTTP 处理函数都有下面这段代码（只是默认值和上限略有不同）。请设计一个抽象来消除重复：写出声明、关键注释和一个调用示例，并说明你为什么认为它的签名足够简单。</p>`,
  code: `int page = 1, size = 20;
if (auto p = req.query("page")) {
    if (!parseInt(*p, page) || page < 1) return resp.badRequest("bad page");
}
if (auto s = req.query("size")) {
    if (!parseInt(*s, size) || size < 1) return resp.badRequest("bad size");
    size = std::min(size, 100);
}
auto offset = (page - 1) * size;`,
  reference: `<pre><code class="lang-cpp">struct Page { int number; int size; int64_t offset() const; };

// 从查询参数 page / size 解析分页。缺省为第 1 页、defaultSize 条；
// size 超过 maxSize 时截断为 maxSize。格式错误时返回 nullopt，
// 并已在 resp 中写好 400 响应。
std::optional&lt;Page&gt; parsePaging(const Request&amp; req, Response&amp; resp,
                                int defaultSize = 20, int maxSize = 100);

// 调用处
auto pg = parsePaging(req, resp);
if (!pg) return;
auto rows = repo.list(pg-&gt;offset(), pg-&gt;size);</code></pre>
<p>签名简单：输入是请求和两个有默认值的数字，输出是一个小结构；调用处从 9 行变成 2 行，不需要访问调用者的任何局部变量。</p>`,
  rubric: ["抽出的函数/类型签名简单，调用者不必传一串引用参数", "默认值和上限可以按调用处定制，且有合理默认", "错误处理有明确约定（返回值或已写好响应）", "调用处明显变短、变清楚"],
  explain: `<p>如果你的设计需要把 <code>page</code>、<code>size</code>、<code>resp</code> 都按引用传进去再传出来，想想能不能像参考答案那样用一个小类型把结果打包。消除重复的价值取决于新接口有多简单（9.3 节）。</p>`,
},
{
  id: "ch09-write-02", ch: 9, type: "write", title: "把专用逻辑请出通用队列",
  prompt: `<p>一个通用的后台任务队列，被很多模块使用。下面是它的 <code>enqueue</code>。请重新设计：写出通用队列应该提供的接口，以及邮件相关逻辑应该放在哪里、长什么样（伪代码即可）。</p>`,
  code: `void JobQueue::enqueue(Job job) {
    if (job.type == "email") {
        // 同一收件人 10 分钟内只发一封
        if (recentRecipients_.contains(job.args["to"])) return;
        recentRecipients_.insert(job.args["to"], 10min);
        // 晚上 22 点到早上 8 点不发营销邮件，推迟到 8 点
        if (job.args["kind"] == "marketing" && inQuietHours(now()))
            job.runAt = nextMorning8am();
    }
    pending_.push(std::move(job));
}`,
  reference: `<pre><code class="lang-cpp">// 通用队列：只认识"任务、何时运行、去重键"
struct Job {
    std::string type;
    Args args;
    TimePoint runAt = {};                   // 默认立即运行
    std::optional&lt;std::string&gt; dedupKey;    // 同键任务在 dedupWindow 内只保留一个
    Duration dedupWindow = {};
};
class JobQueue {
public:
    void enqueue(Job job);
};

// email_jobs.cpp：邮件规则都在这里
void sendEmailLater(JobQueue&amp; q, const Email&amp; m) {
    Job j{"email", m.toArgs()};
    j.dedupKey = "email:" + m.to;
    j.dedupWindow = 10min;
    if (m.kind == EmailKind::Marketing &amp;&amp; inQuietHours(now()))
        j.runAt = nextMorning8am();
    q.enqueue(std::move(j));
}</code></pre>
<p>队列里不再出现 "email"、"marketing"、收件人这些词；它提供的"延迟运行"和"按键去重"是通用能力，其他任务类型也能用。</p>`,
  rubric: ["通用队列的代码里不再出现任何邮件专用的词", "把专用需求提炼成通用能力（延迟运行、去重等）", "邮件规则集中放在邮件相关模块", "说明了改邮件规则时不再需要改队列"],
  explain: `<p>这就是 9.4 节的规则：一个通用机制只应该提供那一个通用机制，专用代码放到与具体用途相关的模块里。混在一起时，每次改邮件规则都要动全公司共用的队列，这就是"通用与专用混杂"带来的信息泄漏。</p>`,
},
{ id: "ch09-card-01", ch: 9, type: "card",
  front: "把系统切得更细，会带来哪些<b>额外的复杂性</b>？",
  back: "<p>① 组件数量本身：越多越难找、越难全部记住，而且每多一个组件通常多一个接口。② 管理组件的额外代码：原来用一个对象，现在要协调好几个。③ 分离：相关的代码被放到不同的类、不同的文件里，看不到彼此，甚至不知道依赖存在。④ 重复：原来只需一份的代码，现在每个组件里都要一份。</p><p>组件真正独立时，分离是好事；有依赖时，分离是坏事。</p>" },
{ id: "ch09-card-02", ch: 9, type: "card",
  front: "哪些迹象说明两段代码<b>相关</b>、可能该放在一起？",
  back: "<p>① 共享信息（例如都依赖同一种文档格式）。② 一起使用：用了一个几乎一定会用另一个；<b>只有双向成立才有说服力</b>（块缓存总用哈希表，但哈希表不一定和块缓存一起用，所以分开）。③ 概念上重叠：能归入一个简单的上层类别。④ 不看另一段就很难看懂这一段。</p>" },
{ id: "ch09-card-03", ch: 9, type: "card",
  front: "什么时候<b>拆分</b>一个方法是合理的？什么时候该<b>合并</b>方法？",
  back: "<p>拆分：① 抽出一个能干净分开的子任务（最好的方式）：父、子各自能独立读懂，子方法往往比较通用。② 原方法做了几件不太相关的事、接口过于复杂，拆成调用者可见的几个方法，每个接口都更简单，且多数调用者只需其一（不常见）。</p><p>合并：把两个浅方法变成一个深方法；消除重复；消除方法之间的依赖或中间数据结构；把分散的知识收到一处；得到更简单的接口。</p>" },
);
