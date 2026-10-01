// 第 21 章 判断什么是重要的 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch21-flag-01", ch: 21, type: "flag", title: "站内通知接口",
  prompt: "<p>一个发站内通知的函数，以及它在仓库里最典型的调用方式。</p>",
  code: `// 发送一条站内通知
void notify(UserId to, const std::string& text,
            int priority, bool dedupe, std::chrono::seconds dedupeWindow,
            const std::string& templateEngine, bool trackOpen,
            const RetryPolicy& retry);

// 全仓库 214 处调用里，209 处长这样：
notify(uid, msg, 0, false, 0s, "", false, RetryPolicy::defaults());`,
  choices: ["overexposure", "shallow", "passthrough", "none"], answer: ["overexposure"], mark: [3, 4, 5, 8],
  explain: `<p>对绝大多数调用者来说，重要的只有"发给谁、说什么"。其余六个参数几乎所有人都填同一组"无所谓"的值，却必须先弄懂它们才敢填。这是过度暴露，也正是 21.4 节说的第一种错误：把太多东西当成重要的，参数和大多数调用者无关。</p>
<p>改法：<code>notify(UserId to, std::string_view text)</code> 覆盖常见情况；少数需要去重、追踪的调用者用 <code>notify(to, text, const NotifyOptions&amp;)</code>，选项全部有默认值。还可以顺便问一句：<code>templateEngine</code> 真的应该由调用者决定吗？</p>`,
},
{
  id: "ch21-flag-02", ch: 21, type: "flag", title: "转账接口里的必填参数",
  prompt: "<p>支付服务对内提供的转账接口。有人抱怨\"每次都要传 key，太啰嗦\"。</p>",
  code: `// 从 from 向 to 转账 amount。
// key 由调用者生成并在重试时原样复用：同一个 key 的请求最多执行一次，
// 重复请求返回第一次的结果。网络超时后请用同一个 key 重试，不会重复扣款。
TransferResult transfer(AccountId from, AccountId to, Money amount,
                        const IdempotencyKey& key);`,
  choices: ["overexposure", "leakage", "nonobvious", "none"], answer: ["none"],
  explain: `<p>幂等键对<strong>每一个</strong>调用者都重要：网络超时后重试是常态，不用幂等键就可能重复扣款。把它做成没有默认值的必填参数，并在注释里写清用法，是"突出重要的东西"的正确做法（显眼：出现在高频方法的参数里）。</p>
<p>过度暴露指的是让调用者被迫了解<strong>大多数人不需要</strong>的东西，这里不是。如果为了"简洁"把 key 改成可选、默认随机生成，就会落进第二种错误：重要的东西被藏了起来，调用者以为重试安全，其实不安全。</p>`,
},
{
  id: "ch21-flag-03", ch: 21, type: "flag", title: "一个想不出名字的变量",
  prompt: "<p>RPC 客户端的重试函数。作者在评审里说：\"第 3 行的变量我列了好几个候选词，都不太对，先叫 <code>t</code> 吧。\"</p>",
  code: `// 调用 req；遇到可重试的失败，最多重试 5 次。
Status Client::callWithRetry(const Request& req, Response* out) {
    auto t = 200ms;   // 试过 timeout、delay、backoff、interval，都不太对
    for (int attempt = 0; attempt < 5; ++attempt) {
        Status st = transport_.call(req, out, /*timeout=*/t);
        if (st.ok() || !st.retryable()) return st;
        std::this_thread::sleep_for(t);
        t *= 2;
    }
    return Status::Unavailable("retries exhausted");
}`,
  choices: ["hard-name", "vague-name", "nonobvious", "comment-repeats", "none"], answer: ["hard-name", "vague-name"], mark: [3, 5, 7, 8],
  explain: `<p>作者做的正是 21.1 节建议的事：列出和这个变量相关的词，挑最能传达信息的几个。但没有一个词胜出，因为 <code>t</code> 身兼两职：第 5 行它是<strong>单次调用的超时</strong>，第 7 行它是<strong>两次重试之间的等待</strong>。<code>timeout</code> 只说对了一半，<code>backoff</code> 只说对了另一半。这是"名字难起"：找不到哪个词最重要，是因为这里根本不是一个东西。最后落到的 <code>t</code> 自然也是一个含糊的名字。</p>
<p>起名的困难暴露了一个真实的设计问题：超时和退避本来是两项独立的策略，现在被第 8 行绑在一起翻倍，服务端变慢时每次调用等得更久、两次之间也停得更久。改法：拆成 <code>attemptTimeout</code>（固定值，或按剩余截止时间算）和 <code>backoff</code>（指数增长、加抖动），两个名字都不用想。代码本身并不难读，问题不在"不明显"；那行注释记录的是起名的过程，也没有复述代码。</p>`,
},
{
  id: "ch21-ab-01", ch: 21, type: "ab", title: "时区在哪里起作用",
  prompt: "<p>一个订单系统需要支持多个时区的商家。两种设计：</p>",
  a: { label: "时区一路传下去", code: `Order  loadOrder(OrderId id, const TimeZone& tz);
bool   isOverdue(const Order& o, const TimeZone& tz);
Report buildDailyReport(Date day, const TimeZone& tz);
std::string formatOrder(const Order& o, const TimeZone& tz);
// ……另有 30 多个函数带 tz 参数` },
  b: { label: "只在边界处理时区", code: `// 系统内部一律使用 UTC 时间点。
Order  loadOrder(OrderId id);
bool   isOverdue(const Order& o, TimePoint now);
Report buildDailyReport(TimeRange utcRange);

// 只有展示和输入层知道时区：
std::string formatOrder(const Order& o, const TimeZone& viewerTz);
TimeRange   localDayToUtc(Date day, const TimeZone& tz);` },
  answer: "b",
  explain: `<p>时区确实重要，但它只在"把时间展示给人看"和"把人输入的日期换成时间点"这两处真正起作用。A 让它在几十个函数里都"重要"，每个函数都可能用错、漏传。B 做的是 21.2 节说的：对确实重要的东西，<strong>减少它起作用的地方</strong>。内部逻辑只处理 UTC，不需要关心时区。</p>
<p>A 在什么情况下有道理：业务规则本身依赖当地日历，例如"当地时间午夜前未发货就算逾期"。这时时区在 <code>isOverdue</code> 里确实重要，必须显式出现。但即便如此，也应该只让这几个函数带上它，而不是一路传遍全系统。</p>`,
},
{
  id: "ch21-judge-01", ch: 21, type: "judge", title: "这是哪种错误？",
  prompt: "<p>一个内部键值库的 <code>put</code> 注释只写着\"保存键值对\"。实际上数据先写内存，后台每秒刷一次盘。半年后你发现，五个团队各自写了一个包装函数：每次 <code>put</code> 之后立刻调用 <code>flushAll()</code>，\"为了保险\"。这说明库的设计犯了哪种错误？</p>",
  options: [
    "把太多东西当成重要的：不该让调用者知道有刷盘这回事",
    "没认出真正重要的东西：持久化时机对调用者很重要却被藏起来了，大家只好各自补",
    "没有错误：刷盘时机属于实现细节，各团队的包装是他们自己的选择",
    "只是重复代码的问题，把五个包装函数合并就好",
  ],
  answer: 1,
  explain: `<p>21.4 节说第二种错误的后果是：重要信息被藏起来，或者重要功能缺失，开发者只好一遍遍自己重造。这里五个团队各写一个包装，就是"反复重造"的信号。真正的"未知的未知"（2.2 节）是<strong>数据什么时候才算落盘</strong>：注释只写"保存键值对"，调用者甚至意识不到该问这个问题，往往要等丢过一次数据才知道。各团队补上的 <code>flushAll()</code> 还带来附带代价：每次写都全量刷盘，性能可能被拖垮。</p>
<p>更好的设计：在接口注释里写明持久化时机，并提供明确的选项（例如 <code>put(k, v, Durability::Sync)</code> 或单独的 <code>sync()</code>）。合并五个包装只治标：真正的问题在库的接口上。</p>`,
},
{
  id: "ch21-judge-02", ch: 21, type: "judge", title: "最\"居中\"的是哪个",
  prompt: "<p>在一个支持多种存储后端的数据库代理里，下列哪一项最符合\"居中\"（centrality）这种突出方式？</p>",
  options: [
    "日志里打印的版本号字符串",
    "一个被调用很多次的工具函数 <code>trim()</code>",
    "管理后台的配色方案",
    "存储后端接口：已有的二十多个后端插件都实现它，代理的请求处理流程也围绕它设计",
  ],
  answer: 3,
  explain: `<p>居中指的是：重要的东西位于系统核心，决定周围的结构。书中的例子是操作系统的设备驱动接口，成百上千个驱动依赖它。这里的存储后端接口是同一个角色：插件的结构、请求流程都由它决定。</p>
<p>反过来也说明：这种接口最值得投入设计精力，因为一旦定下来，改它的代价最大。<code>trim()</code> 被调用得多，但它不决定任何东西的结构。</p>`,
},
{
  id: "ch21-judge-03", ch: 21, type: "judge", title: "拿不准的时候",
  prompt: "<p>你在设计一个新的报表导出模块，不确定最重要的是\"导出速度\"还是\"导出格式的可扩展性\"，两者在设计上会把你推向不同方向。按作者的建议，比较好的做法是？</p>",
  options: [
    "两者都做成可配置项，让使用者自己选",
    "先不做设计，等需求更明确再说",
    "明确地选一个作为假设（例如\"我认为可扩展性最重要\"），按它去建；之后复盘它为什么对或错、当初有哪些线索",
    "两个方向各做一半，折中",
  ],
  answer: 2,
  explain: `<p>作者对拿不准的情况（尤其是经验还不多的时候）给出的建议就是立假设、投入去做、事后复盘。猜错也没关系，重要的是想清楚当初有哪些线索本可以帮你避免这个选择，下一次判断就会更好。</p>
<p>"都做成可配置"看起来稳妥，其实是第一种错误：把决定推给每个使用者，所有东西都变重要了。各做一半则往往两头都做不好。</p>`,
},
{
  id: "ch21-write-01", ch: 21, type: "write", title: "让重要的东西尽量少",
  prompt: `<p>下面是一个分片缓存的构造函数。大多数使用者其实只想说清楚一件事：<strong>这个缓存最多能用多少内存</strong>。请重新设计它的构造接口，并说明其余参数去了哪里。</p>`,
  code: `ShardedCache(size_t shardCount,
             size_t entriesPerShard,
             double maxLoadFactor,
             size_t evictionBatchSize,
             bool   enableStats,
             std::chrono::milliseconds statsFlushInterval);`,
  reference: `<pre><code class="lang-cpp">// 内存占用不超过 memoryBudgetBytes（键、值和内部结构合计）。
// 超出时按近似 LRU 淘汰。线程安全。
explicit ShardedCache(size_t memoryBudgetBytes);

// 统计信息总是开启（每个分片几个计数器，在分片锁内更新，开销可以忽略），需要时读取：
CacheStats stats() const;</code></pre>
<p>其余参数的去向：</p>
<ul>
<li><code>shardCount</code>：按硬件线程数自动选（例如向上取到 2 的幂）。</li>
<li><code>entriesPerShard</code>：由内存预算和实际条目大小推出来，而不是按条数限制。</li>
<li><code>maxLoadFactor</code>、<code>evictionBatchSize</code>：纯内部实现参数，使用者不该知道。</li>
<li><code>enableStats</code>、<code>statsFlushInterval</code>：统计按分片计数（不用全局原子计数器，避免多线程争用同一缓存行），便宜到可以一直开着；由使用者主动读取，不需要后台刷新。</li>
</ul>`,
  rubric: ["构造只要求使用者给出真正在意的那一项（内存预算）", "说明了每个被去掉的参数是自动计算、设为内部常量，还是改成别的方式", "接口注释写出了重要的保证（上限含什么、满了怎么办、是否线程安全）", "如果保留了调优入口，它不挡在常用路径上"],
  explain: `<p>21.2 节的建议：尽量让少的东西变得重要，例如减少构造对象时必须给出的参数，或者提供反映最常见用法的默认值；能根据系统行为自动算出来的配置，就不再需要人去管。这和第 8 章"把复杂性往下拉"是同一个方向：缓存的实现会更复杂，但每个使用者都轻松了。</p>`,
},
{
  id: "ch21-write-02", ch: 21, type: "write", title: "综合题：一个定时任务调度库",
  prompt: `<p>团队要写一个内部用的定时任务调度库。业务方注册任务（例如"每天凌晨 3 点生成报表"、"每 5 分钟同步一次库存"），库负责按时触发。服务部署在多台机器上，机器可能随时重启。</p>
<p>请写出：① 对使用者来说<strong>重要</strong>的 3～4 件事；② <strong>不重要</strong>、应该藏起来的 3～4 件事；③ 设计上怎样体现这个区分（接口长什么样、哪些东西放在核心）。</p>`,
  reference: `<p><strong>重要（要突出）</strong>：</p>
<ul>
<li><strong>执行次数语义</strong>：多机部署下，一个任务在一次触发中是至多执行一次，还是至少执行一次（可能重复）？这决定业务代码是否必须幂等。</li>
<li><strong>错过触发怎么办</strong>：所有机器都宕了一小时，恢复后是补跑错过的那几次、只补最后一次，还是跳过？</li>
<li><strong>"每天 3 点"按哪个时区</strong>，夏令时切换那天怎么算。</li>
<li>任务失败后会不会重试，任务执行超时怎么处理。</li>
</ul>
<p><strong>不重要（藏起来）</strong>：内部线程池大小、轮询或时间轮的实现方式、任务状态存在哪种数据库、机器间心跳和选主的细节、锁的租约时长。</p>
<p><strong>设计上的体现</strong>：</p>
<pre><code class="lang-cpp">// 至少执行一次：机器故障时同一次触发可能执行两次，fn 必须幂等。
// （这是整个库的核心语义，选主、租约、状态存储都围绕它设计。）
void schedule(std::string_view name, const Schedule&amp; when,
              MissedRuns missed,            // 必填：Skip / RunOnce / RunAll
              std::function&lt;void()&gt; fn);

// 时区写在 Schedule 的类型里，不能省略：
Schedule::dailyAt(3h, TimeZone("Asia/Shanghai"));
Schedule::every(5min);</code></pre>
<p>执行次数语义选定一种并放在核心（居中），写在接口注释第一句（显眼）；错过触发的策略和时区是必填的，没有默认值；其余全部由库内部决定。</p>`,
  rubric: ["识别出多机下的执行次数语义（至多一次/至少一次、幂等要求）", "识别出错过触发后的补跑策略", "识别出时区或夏令时的语义", "把线程池、存储、选主等实现细节列为不重要并隐藏", "说明了至少一种突出方式（必填参数、接口注释、作为核心语义决定其余结构）"],
  explain: `<p>这道题没有唯一答案。检验你的答案可以问两个问题：如果某件"重要"的事被藏了起来，业务方会不会在线上踩坑（第二种错误）？如果某件"不重要"的事被暴露出来，是不是大多数业务方都只会填默认值（第一种错误）？</p>
<p>注意执行次数语义的处理方式：它不只是一个参数，而是被放在了系统的中心，选主、租约、状态存储都要为它服务。这就是 21.3 节说的"居中"。</p>`,
},
{ id: "ch21-card-01", ch: 21, type: "card",
  front: "突出重要的东西有哪<b>三种方式</b>？判断什么重要时会犯哪<b>两种错误</b>？",
  back: "<p>三种方式：<b>显眼</b>（放在接口文档、名字、常用方法的参数里）、<b>重复</b>（关键概念反复出现）、<b>居中</b>（位于系统核心，决定周围的结构）。反过来，到处看得见、反复出现、影响结构的东西就是重要的。</p><p>两种错误：把太多东西当成重要的（杂乱、认知负担、浅类）；没认出真正重要的东西（信息被藏、功能缺失只好反复重造、未知的未知）。能区分重要与不重要，就是\"好品味\"。</p>" },
);
