// 第 14 章 起名字 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch14-flag-01", ch: 14, type: "flag", title: "同一个词，两种位置",
  prompt: "<p>日志存储的重放功能。客户端拿着一个游标来请求\"从这里开始重放\"。这段代码偶尔会读出乱码。</p>",
  code: `struct IndexEntry {
    uint64_t offset;   // 记录在日志文件中的起始字节位置
    uint32_t len;      // 记录的字节数
};

// 从第 offset 条记录开始，把之后的记录逐条交给 sink。
void Replayer::replayFrom(uint64_t offset, RecordSink& sink) {
    for (uint64_t k = offset; k < index_.size(); ++k) {
        const IndexEntry& e = index_[k];
        std::string raw = readAt(fd_, offset, e.len);
        sink.accept(decode(raw));
    }
}`,
  choices: ["vague-name", "hard-name", "comment-repeats", "none"], answer: ["vague-name"], mark: [2, 7, 10],
  explain: `<p>第 10 行应该读 <code>e.offset</code>（字节位置），却读成了参数 <code>offset</code>（记录序号）。两个东西都叫 <code>offset</code>，读代码的人看到 <code>readAt(fd_, offset, ...)</code> 会下意识认为它就是字节位置，于是 bug 很难被看出来。</p>
<p>这违反了一致性的第三条要求：同名的变量应该表现一致。书中 14.1 节讲了作者花半年追查的一个文件系统 bug，原因如出一辙。改法：参数改叫 <code>firstSeq</code>（记录序号），结构体字段改叫 <code>byteOffset</code>。更进一步，给两者定义不同的类型（如 <code>struct RecordSeq { uint64_t v; }</code>），让编译器拒绝混用。</p>`,
},
{
  id: "ch14-flag-02", ch: 14, type: "flag", title: "下单限额检查",
  prompt: "<p>电商服务里一个检查每月下单限额的类。</p>",
  code: `class OrderService {
public:
    int check(const Order& o);     // 0 通过，1 超出月度限额，2 用户在黑名单
    void update(const Order& o);   // 下单成功后调用
private:
    std::unordered_map<std::string, int> data_;   // 用户 id → 本月已下单数
    int max_ = 20;
};

void OrderService::update(const Order& o) { data_[o.userId]++; }`,
  choices: ["vague-name", "comment-repeats", "shallow", "none"], answer: ["vague-name"], mark: [3, 4, 6, 7],
  explain: `<p><code>check</code>、<code>update</code>、<code>data_</code>、<code>max_</code> 都太宽泛：调用处看到 <code>svc.update(o)</code>，没人猜得到它是在给月度计数加一；<code>data_</code> 可以指任何数据；<code>max_</code> 是什么的上限？读者只能靠注释或读实现才知道含义。</p>
<p>更精确的名字：<code>checkMonthlyLimit</code>（返回值最好也改成枚举）、<code>recordPlacedOrder</code>、<code>ordersThisMonth_</code>、<code>maxOrdersPerMonth_</code>。注释没有重复代码，它们在补名字的不足；名字改好后，第 6 行的注释可以缩短。</p>`,
},
{
  id: "ch14-flag-03", ch: 14, type: "flag", title: "单字母变量",
  prompt: "<p>代码评审中有人说\"<code>i</code>、<code>j</code>、<code>a</code>、<code>b</code> 不符合'名字要精确'的原则\"。你怎么看？</p>",
  code: `// 返回两个升序数组中共同元素的个数（重复元素按出现次数计）。
size_t countCommon(const std::vector<int>& a, const std::vector<int>& b) {
    size_t i = 0, j = 0, count = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] < b[j]) ++i;
        else if (a[i] > b[j]) ++j;
        else { ++count; ++i; ++j; }
    }
    return count;
}`,
  choices: ["vague-name", "hard-name", "comment-repeats", "none"], answer: ["none"],
  explain: `<p>没有明显问题。整个函数一屏就能看完，<code>i</code>、<code>j</code> 的全部用法都在眼前，含义一目了然；<code>a</code>、<code>b</code> 在这里是对称的两个输入，起更长的名字（<code>first</code>/<code>second</code>）也不会多提供信息。</p>
<p>书中 14.3 节明确把这当作"名字要精确"的例外：循环只跨几行时用 <code>i</code>、<code>j</code> 没问题。14.6 节引用的规则也是同一个道理：声明和使用离得越远，名字才需要越长。注意 <code>count</code> 比 <code>n</code> 好一点：它直接说明了这个变量在数什么。</p>`,
},
{
  id: "ch14-flag-04", ch: 14, type: "flag", title: "一个起不好名字的函数",
  prompt: "<p>任务调度器里的一个函数。作者说\"名字是长了点，但很准确\"。</p>",
  code: `// 返回值 >= 0：任务还要等这么多毫秒才能执行；
//        -1：任务已经完成；
//        -2：任务的凭据过期，需要用户重新登录。
// 顺便：如果任务已完成，会把它从 pending_ 里移除。
int64_t checkStateAndGetWaitMsOrRemove(Job& job);`,
  choices: ["hard-name", "vague-name", "shallow", "none"], answer: ["hard-name"], mark: [1, 2, 3, 4, 5],
  explain: `<p>名字长成这样，正是因为它<strong>不是一件事</strong>：查询等待时间、报告任务状态、清理已完成任务，三件事被塞进了一个函数，返回值还用特殊数字区分含义。无论怎么起名，都很难给读者一个清晰的印象。</p>
<p>书中 14.3 节的红旗说的就是这种情况：起不出简单、清晰的名字，往往说明被命名的东西设计得不干净。改法不是继续琢磨名字，而是拆开：<code>JobState state(const Job&amp;)</code>、<code>Duration waitTime(const Job&amp;)</code>，清理挪到任务完成的地方去做。拆开后每个名字都很好起。</p>`,
},
{
  id: "ch14-flag-05", ch: 14, type: "flag", title: "一层很薄的\"管理器\"",
  code: `class DataManager {
public:
    explicit DataManager(Processor* p) : processor_(p) {}
    // 处理数据
    void handle(const Data& d) { processor_->handle(d); }
    // 处理一批数据
    void handleAll(const std::vector<Data>& ds) { processor_->handleAll(ds); }
private:
    Processor* processor_;
};`,
  choices: ["passthrough", "vague-name", "comment-repeats", "special-general", "none"], answer: ["passthrough", "vague-name", "comment-repeats"], mark: [4, 5, 6, 7],
  explain: `<p>三个问题叠在一起：</p>
<ul><li><strong>透传方法</strong>：<code>handle</code>、<code>handleAll</code> 把参数原样转交给签名相同的方法，<code>DataManager</code> 自己什么也没做（第 7 章）。</li>
<li><strong>名字含糊</strong>：<code>DataManager</code>、<code>Data</code>、<code>handle</code> 几乎可以指任何东西。"Manager""Data""handle""process"这类词是含糊名字的常客。</li>
<li><strong>注释重复代码</strong>："处理数据"只是把 <code>handle</code> 翻译了一遍。</li></ul>
<p>往往是同一个根源：类的职责本来就不清楚，所以名字只能起得很泛，注释也只能复述名字。先问"这一层到底提供了什么"，答不上来就把它删掉。</p>`,
},
{
  id: "ch14-flag-06", ch: 14, type: "flag", title: "fd、buf、len、n",
  prompt: "<p>一个 POSIX 封装函数，团队里所有 I/O 封装都用同样的几个短名字。</p>",
  code: `// 把 buf 的前 len 字节全部写入 fd，自动处理部分写入和 EINTR。
// 出错时抛 IoError（带 errno）。
void writeAll(int fd, const char* buf, size_t len) {
    while (len > 0) {
        ssize_t n = ::write(fd, buf, len);
        if (n < 0) {
            if (errno == EINTR) continue;
            throw IoError(errno);
        }
        buf += n;
        len -= static_cast<size_t>(n);
    }
}`,
  choices: ["vague-name", "comment-repeats", "shallow", "none"], answer: ["none"],
  explain: `<p>没有明显问题。<code>fd</code>、<code>buf</code>、<code>len</code> 是 POSIX 程序员的通用词汇，在整个代码库里一贯地只表示这几样东西；函数很短，<code>n</code> 的声明和使用相隔一两行。</p>
<p>书中 14.6 节作者虽然不赞成 Go 社区偏爱极短名字的风格，但也承认：如果像 <code>n</code> 这样的短名字在整个系统里<strong>一贯</strong>只表示计数，其他开发者多半能看懂。关键在于一致和距离，而不是字母数。这个函数的接口注释也没有重复代码：部分写入、EINTR、异常类型，都是只看签名看不出来的。</p>`,
},
{
  id: "ch14-ab-01", ch: 14, type: "ab", title: "布尔成员变量",
  prompt: "<p>日志写入器里控制落盘策略的一个布尔变量，两种命名：</p>",
  a: { label: "", code: `// 刷盘模式：true 表示每次写入后立即 fsync，
// false 表示交给后台线程每秒刷一次。
bool flushMode_ = false;

if (flushMode_) ::fsync(fd_);` },
  b: { label: "", code: `// 为 true 时每次写入后立即 fsync；否则由后台线程每秒刷一次。
bool syncEveryWrite_ = false;

if (syncEveryWrite_) ::fsync(fd_);` },
  answer: "b",
  explain: `<p>布尔变量的名字应该是一个<strong>谓词</strong>：读者看到名字就能猜出 true 表示什么。<code>flushMode_</code> 只说明它和"刷盘模式"有关，true 是哪种模式只能查注释；<code>if (flushMode_)</code> 读起来也不通。<code>syncEveryWrite_</code> 读作"是否每次写入都同步"，<code>if (syncEveryWrite_) fsync</code> 自然成句。</p>
<p>如果将来模式不止两种（比如加一个"每 N 条刷一次"），那就不该用布尔，而应该换成枚举 <code>SyncPolicy</code>，这时"Mode"一类的名字反而合适。</p>`,
},
{
  id: "ch14-ab-02", ch: 14, type: "ab", title: "同一个概念，几种叫法",
  prompt: "<p>两个服务的代码片段，看看它们怎么称呼\"用户\"。（在这两个系统里，账单账户和用户是不同的概念：一个企业账单账户下有多个用户。）</p>",
  a: { label: "", code: `User loadUser(UserId userId);
void banUser(UserId userId, std::string_view reason);
Invoice lastInvoice(AccountId accountId);
std::vector<UserId> usersOf(AccountId accountId);` },
  b: { label: "", code: `User loadUser(UserId uid);
void banUser(UserId accountId, std::string_view reason);
Invoice lastInvoice(AccountId acct);
std::vector<UserId> usersOf(AccountId id);` },
  answer: "a",
  explain: `<p>书中 14.4 节对一致性提了三条要求：同一用途始终用同一个名字；这个名字不用于别的用途；用途要窄到所有同名变量行为一致。A 三条都满足：<code>userId</code> 永远指用户，<code>accountId</code> 永远指账单账户。</p>
<p>B 里同一个用户 id 叫了 <code>uid</code> 和 <code>accountId</code>，而 <code>accountId</code> 在别处又指账单账户。读者在一处学到的"<code>accountId</code> 是账单账户"，到 <code>banUser</code> 里就会导致误解（类型 <code>UserId</code> 能挡住一部分错误，但读代码的人仍会被名字误导）。一致的命名和复用同一个类一样，能让读者把在一处学到的知识直接用到另一处。</p>`,
},
{
  id: "ch14-ab-03", ch: 14, type: "ab", title: "通用重试函数的参数名",
  prompt: "<p>一个通用的重试工具函数，最初是为了上传文件写的，现在有好几个模块在用。两种参数命名：</p>",
  a: { label: "", code: `// 反复调用 upload 直到成功或尝试 maxUploadAttempts 次，
// 两次尝试之间按指数退避等待。返回最后一次的状态。
Status retryWithBackoff(const std::function<Status()>& upload,
                        int maxUploadAttempts);` },
  b: { label: "", code: `// 反复调用 op 直到成功或尝试 maxAttempts 次，
// 两次尝试之间按指数退避等待。返回最后一次的状态。
Status retryWithBackoff(const std::function<Status()>& op,
                        int maxAttempts);` },
  answer: "b",
  explain: `<p>名字也可能<strong>太具体</strong>。A 的参数名暗示这个函数只能用来重试上传，其他模块的人看到会犹豫"我拿它重试数据库连接合适吗"。函数本身对任何操作都适用，参数名应该和函数的抽象一样通用。</p>
<p>书中 14.3 节有一个同类的例子：删除任意一段文本的方法，参数却叫"当前选中的文本"。反过来，如果这是一个只服务上传的专用函数（比如还会处理断点续传），具体的名字就是对的：名字的具体程度应该和它所命名的抽象一致。</p>`,
},
{
  id: "ch14-ab-04", ch: 14, type: "ab", title: "名字长度放在哪里",
  prompt: "<p>一个 600 行的连接池类，两种命名风格：</p>",
  a: { label: "", code: `class ConnPool {
    size_t maxIdle_;                 // 允许保留的空闲连接上限
    std::deque<Conn> idle_;          // 空闲连接，最近归还的在队尾
    size_t checkedOut_ = 0;          // 当前被借出的连接数
    // ...
    void trimIdle() {
        while (idle_.size() > maxIdle_) idle_.pop_front();
    }
};` },
  b: { label: "", code: `class ConnPool {
    size_t m_;                       // 允许保留的空闲连接上限
    std::deque<Conn> q_;             // 空闲连接，最近归还的在队尾
    size_t n_ = 0;                   // 当前被借出的连接数
    // ...
    void trimIdle() {
        while (q_.size() > m_) q_.pop_front();
    }
};` },
  answer: "a",
  explain: `<p>成员变量会在 600 行里的几十处被使用，离声明处很远，读者在第 400 行看到 <code>n_</code> 时，早就不记得它指什么了。名字的长度应该随声明和使用之间的距离增长：成员变量、全局变量要有说明性的名字，几行之内用完的局部变量可以很短。</p>
<p>这条规则来自书中 14.6 节引用的 Go 社区的观点，作者对此表示赞同。A 的名字也不长：两三个词就够了，没有多余的 <code>Count</code>、<code>Deque</code> 之类的类型信息。</p>`,
},
{
  id: "ch14-judge-01", ch: 14, type: "judge", title: "作者对 Go 短名字风格的态度",
  prompt: "<p>关于书中 14.6 节，下列哪一项最准确地概括了作者的立场？</p>",
  options: [
    "完全反对短名字：任何变量都应该用完整的英文单词",
    "完全赞同 Go 风格：名字越短越好，长名字会遮蔽代码在做什么",
    "不赞成普遍使用极短的名字，也反对用同一个短名字表示几种不同的东西；但赞同\"声明和使用离得越远，名字越长\"的规则，并认为可读性应由读者而不是作者来判断",
    "认为名字长短无所谓，只要有注释就行",
  ],
  answer: 2,
  explain: `<p>作者的态度比"反对短名字"微妙得多：作者觉得长名字版本并不更难读，而且 <code>count</code> 比 <code>n</code> 更能说明含义；但也承认，如果一个短名字在全系统一贯只表示一种东西，别人多半能看懂。作者真正担心的是同一个短名字被用来指几种不同的东西（这正是 14.1 节那个 bug 的成因）。</p>
<p>最终标准是读者：如果读你代码的人觉得清楚，那就没问题；如果开始有人抱怨看不懂，就该考虑换长名字。作者说自己也同样接受这个标准。</p>`,
},
{
  id: "ch14-judge-02", ch: 14, type: "judge", title: "多余的词",
  prompt: "<p>下面这个类的成员变量，按书中 14.5 节的建议，哪种改法最合适？</p>",
  code: `class Order {
    double orderTotalAmountDouble_;
    std::vector<Item> orderItemList_;
    TimePoint orderCreatedTimePoint_;
    double shippingFee_;
};`,
  options: [
    "保持不变：名字里信息越多越好",
    "改成 <code>total_</code>、<code>items_</code>、<code>createdAt_</code>：去掉重复的类名和类型信息；但如果类里有两种\"总额\"（如商品总额和含运费的应付总额），要保留能区分它们的词",
    "改成 <code>t_</code>、<code>i_</code>、<code>c_</code>：反正在类里，上下文足够清楚",
    "改成匈牙利命名 <code>dTotal_</code>、<code>vecItems_</code>，类型一目了然",
  ],
  answer: 1,
  explain: `<p>名字里每个词都应该提供有用的信息。<code>order</code> 前缀重复了类名，在 <code>Order</code> 类里不言自明；<code>Double</code>、<code>List</code>、<code>TimePoint</code> 是类型信息，IDE 一点就能看到。作者说自己以前也在名字里放过类型信息，但现在不再推荐。</p>
<p>注意书中的例外：如果类里有多个同类的东西，区分它们的词就不是多余的。这里有 <code>shippingFee_</code>，如果再加一个含运费的总额，<code>total_</code> 就不够精确了，应该叫 <code>itemsTotal_</code> 和 <code>amountDue_</code>。单字母则走向另一个极端：成员变量离使用处很远，太短的名字传达不了任何信息。</p>`,
},
{
  id: "ch14-judge-03", ch: 14, type: "judge", flags: ["hard-name"], title: "名字怎么也起不好",
  prompt: "<p>你在写一个心跳检测模块，有一个变量：收到心跳时存心跳的时间戳；连接出错时，又被用来存出错的时间，供后面算退避时间。你想了半天，只想出 <code>lastEventTime</code>、<code>lastTs</code> 这类名字，都觉得不对劲。最好的做法是：</p>",
  options: [
    "把变量拆成两个：<code>lastHeartbeatAt</code> 和 <code>lastErrorAt</code>，每个都很好起名",
    "用 <code>lastHeartbeatOrErrorTime</code>，名字长但精确",
    "随便用 <code>lastTs</code>，然后写一段详细的注释解释两种用法",
    "用 <code>t</code>，反正怎么起都不准",
  ],
  answer: 0,
  explain: `<p>名字难起本身就是信号（红旗"名字难起"）：这个变量没有清晰的定义，因为它<strong>同时代表两件事</strong>。书中 14.3 节给出的建议正是：考虑换一种拆分，比如把一个身兼数职的变量拆成几个，每个变量的定义都会更简单。</p>
<p>"名字长但精确"只是把问题写进了名字，读者还是要处理两种含义；写详细注释也一样，第 15 章会说：一个变量需要长注释才能说清，同样是设计问题的信号。起名字的过程能帮你发现设计的弱点，这是这一章最有价值的一点。</p>`,
},
{
  id: "ch14-write-01", ch: 14, type: "write", title: "给一段代码改名",
  prompt: `<p>下面是一个限流中间件里的函数，逻辑正确，但名字很糟。请为每个标了 <code>?</code> 的名字提出更好的名字，并用一句话说明理由。</p>`,
  code: `// 清理过期的请求记录，然后判断这个客户端还能不能再发请求。
bool proc(const std::string& s, TimePoint t) {        // ? proc  ? s  ? t
    auto& lst = m_[s];                                 // ? lst   ? m_
    while (!lst.empty() && t - lst.front() > win_)     // ? win_
        lst.pop_front();
    bool flag = lst.size() < lim_;                     // ? flag  ? lim_
    if (flag) lst.push_back(t);
    return flag;
}`,
  reference: `<pre><code class="lang-cpp">bool tryAcquire(const std::string&amp; clientId, TimePoint now) {
    auto&amp; recentRequests = requestTimes_[clientId];
    while (!recentRequests.empty() &amp;&amp; now - recentRequests.front() &gt; window_)
        recentRequests.pop_front();
    bool allowed = recentRequests.size() &lt; maxRequestsPerWindow_;
    if (allowed) recentRequests.push_back(now);
    return allowed;
}</code></pre>
<ul>
<li><code>proc</code> → <code>tryAcquire</code>（或 <code>allowRequest</code>）：调用处 <code>if (limiter.tryAcquire(id, now))</code> 一看就懂，"try"还暗示失败时没有调用者能感知的副作用。严格说，被拒绝时函数仍会清掉过期的时间戳、给新客户端建一条空记录，但这些是限流器内部的簿记，不改变调用者看到的行为。</li>
<li><code>s</code> → <code>clientId</code>、<code>t</code> → <code>now</code>：<code>now</code> 比 <code>time</code> 更精确，说明它是"当前时刻"而不是任意时间点。</li>
<li><code>m_</code> → <code>requestTimes_</code>：成员变量离使用处远，要有说明性的名字。</li>
<li><code>lst</code> → <code>recentRequests</code>：说明它装的是什么，而不是它是什么容器。</li>
<li><code>flag</code> → <code>allowed</code>：布尔变量用谓词，true 的含义不言自明。</li>
<li><code>lim_</code> → <code>maxRequestsPerWindow_</code>、<code>win_</code> → <code>window_</code>：上限是"每个窗口内的请求数"，把单位说清楚。</li>
</ul>`,
  rubric: ["函数名说明了它做什么，而且调用处读起来通顺", "布尔变量改成了谓词式的名字", "成员变量的名字比局部变量更有说明性", "名字描述\"装的是什么\"而不是\"是什么类型\"（没有用 list、map 之类的词）", "没有把名字起得过长（大多 1～3 个词）"],
  explain: `<p>改完之后，函数开头那行注释几乎可以删掉：名字已经说清了大部分信息。但别误会成"好名字可以代替注释"：比如\"窗口是滑动窗口还是固定窗口\"\"<code>now</code> 必须单调递增\"这类信息，仍然需要写在接口注释里；"每个见过的客户端都会留下一条记录"这种实现上的事实，如果关系到内存增长，也该在实现注释里交代。</p>`,
},
{
  id: "ch14-write-02", ch: 14, type: "write", title: "把布尔变量改成谓词",
  prompt: `<p>为下面几个布尔变量各起一个谓词式的名字，让读者不看注释也能猜出 true 表示什么。</p>`,
  code: `bool status;      // true 表示已经给这个用户发过欢迎邮件
bool check;       // true 表示这笔订单需要人工审核
bool mode;        // true 表示以只读方式打开数据库
bool state_;      // true 表示连接正在关闭，此时不再接受新请求
bool email;       // true 表示用户的邮箱已经验证过`,
  reference: `<pre><code class="lang-cpp">bool welcomeEmailSent;
bool needsManualReview;
bool readOnly;
bool closing_;
bool emailVerified;</code></pre>
<p>共同点：每个名字都能直接放进 <code>if (...)</code> 里读成一句话，比如 <code>if (needsManualReview)</code>、<code>if (closing_) return Busy;</code>。<code>status</code>、<code>state</code>、<code>mode</code>、<code>check</code> 这些词对布尔值来说太含糊：它们说明变量和什么有关，却不说 true 是哪一边。</p>`,
  rubric: ["每个名字都是谓词（能回答\"是不是/有没有\"）", "true 的含义能从名字直接看出来", "没有出现 status、state、flag、mode 这类含糊的词", "名字没有超过三四个词"],
  explain: `<p>一个小陷阱：否定形式的名字（<code>notVerified</code>、<code>disableCache</code>）在 <code>if (!notVerified)</code> 里会变成双重否定，一般优先用肯定形式。<code>mode</code> 改成 <code>readOnly</code> 时也要留意：如果打开方式将来可能不止两种，就该改用枚举，而不是硬塞进布尔。</p>`,
},
{
  id: "ch14-write-03", ch: 14, type: "write", title: "三个太像的结构体",
  prompt: `<p>一个用户系统里有三个结构体，新人经常搞混。请为它们起更好的名字，让人一眼能区分，而且能看出它们之间的关系。</p>`,
  code: `struct UserInfo   { UserId id; std::string passwordHash; std::string salt; };
struct UserData   { UserId id; std::string nickname; std::string avatarUrl; };
struct UserDetail { UserData data; int postCount; TimePoint lastLoginAt;
                    std::vector<std::string> loginIps; };
// UserInfo：只在认证模块里用
// UserData：对外展示，任何人都能看到
// UserDetail：只有管理后台能看到，包含 UserData`,
  reference: `<pre><code class="lang-cpp">struct Credentials  { UserId id; std::string passwordHash; std::string salt; };
struct PublicProfile { UserId id; std::string nickname; std::string avatarUrl; };
struct AdminUserView { PublicProfile profile; int postCount; TimePoint lastLoginAt;
                       std::vector&lt;std::string&gt; loginIps; };</code></pre>
<p>理由：Info、Data、Detail 都是含糊的词，三个名字之间的区别只能死记。新名字各自说明了<strong>用途和可见范围</strong>：<code>Credentials</code> 是认证凭据，<code>PublicProfile</code> 是公开资料，<code>AdminUserView</code> 是管理后台看到的视图；"View 里包含一个 Profile"的关系也从名字里看得出来。</p>`,
  rubric: ["三个名字之间的区别不靠死记就能看出来", "名字体现了用途或可见范围，而不是 Info/Data/Detail 这类泛词", "能看出第三个结构体包含第二个", "没有在名字里加入类型信息（Struct、Obj 之类）"],
  explain: `<p>书中 14.3 节用 Linux 内核里两个名字几乎一样的网络结构体说明了同样的问题：名字太像，就很难记住哪个是哪个。好名字既要能区分，也要能说明它们之间的关系。</p>`,
},
{
  id: "ch14-write-04", ch: 14, type: "write", flags: ["hard-name"], title: "名字难起，那就改设计",
  prompt: `<p>同事写了下面的函数，请你帮忙起个好名字。试一试，如果你发现怎么都起不好，说明原因，并给出你会怎样改设计。</p>`,
  code: `// 如果缓存里有 key 就返回它；没有就从数据库读，
// 读到了就放进缓存并返回；数据库里也没有时，
// 如果 createIfMissing 为真就插入一条默认记录并返回，否则返回 nullopt。
// 另外每调用 100 次会打印一次缓存命中率。
std::optional<Profile> ???(UserId key, bool createIfMissing);`,
  reference: `<p>很难起：<code>getOrLoadOrCreateAndLogStats</code> 之类的名字既长又说不全。原因是函数做了三件不同层次的事：</p>
<ul>
<li>带缓存的读取：这是一个干净的抽象，可以叫 <code>ProfileStore::find(UserId)</code>，缓存是它的实现细节，名字里根本不必提。</li>
<li>"不存在就创建"：这是调用方的业务决定，应当是单独的方法 <code>findOrCreate(UserId)</code>，或者让调用方自己处理。用布尔参数切换两种语义，会让名字只能描述其中一种。</li>
<li>打印命中率：与读取无关的监控逻辑，应该挪到统计模块（如 <code>CacheStats</code>），由它自己决定何时输出。</li>
</ul>
<p>拆开后：<code>std::optional&lt;Profile&gt; find(UserId id);</code> 和 <code>Profile findOrCreate(UserId id);</code>，名字都很好起，注释也各自一两行就够。</p>`,
  rubric: ["指出了起名困难的原因：函数做了不止一件事", "把\"不存在就创建\"从布尔参数中分离出来", "把统计/日志逻辑移出读取函数", "拆分后的每个名字简短、能让人一眼看懂"],
  explain: `<p>这是本章最值得养成的反射：<strong>名字起不好的时候，先怀疑设计，再怀疑词汇量</strong>。书中说起名字的过程能帮你发现设计的弱点，第 15 章的\"难以描述\"红旗和它是一对：一个从名字发现问题，一个从注释发现问题。</p>`,
},
{ id: "ch14-card-01", ch: 14, type: "card",
  front: "检验一个名字好不好，书中建议问自己什么问题？",
  back: "<p>如果有人<b>孤立地</b>看到这个名字（看不到声明、文档和用法），能多准确地猜出它指什么？有没有别的名字能让印象更清晰？好名字既告诉读者它是什么，也告诉读者它<b>不是</b>什么。名字一般不超过两三个词，所以要挑出最重要的方面。</p>" },
{ id: "ch14-card-02", ch: 14, type: "card",
  front: "名字一致性（consistency）的三条要求是什么？",
  back: "<p>① 某个用途一律用同一个通用名字；② 这个名字绝不用于其他用途；③ 用途要定得足够窄，保证所有叫这个名字的变量行为一致。需要多个同类变量时，在通用名字前加区分前缀（如 src/dst）。</p>" },
{ id: "ch14-card-03", ch: 14, type: "card",
  front: "什么时候短而泛的名字（如 <code>i</code>、<code>n</code>）是可以接受的？",
  back: "<p>① 变量的全部用法一眼就能看完（如几行的循环）；② 声明和使用离得很近：距离越远，名字应该越长；③ 短名字在全系统里一贯只表示一种东西。最终标准是读者是否觉得清楚，而不是作者自己觉得清楚。</p>" },
);
