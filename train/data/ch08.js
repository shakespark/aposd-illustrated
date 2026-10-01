// 第 8 章 把复杂性往下拉 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch08-flag-01", ch: 8, type: "flag", title: "一个\"高度可配置\"的日志写入器",
  prompt: "<p>存储引擎的预写日志（WAL）写入器。它的作者说：\"每个场景的最优值不一样，所以都交给使用者配置。\"</p>",
  code: `struct WalOptions {
    size_t   bufferBytes;        // 写缓冲大小
    uint32_t flushIntervalUs;    // 最长多久必须刷一次
    uint32_t maxBatchRecords;    // 组提交时一批最多多少条
    uint32_t fsyncEveryNFlushes; // 每刷几次做一次 fsync
    size_t   preallocBytes;      // 预分配文件大小
    bool     useODirect;
};
// 所有字段都必须填写，没有默认值
WalWriter::WalWriter(const std::string& path, const WalOptions& opts);`,
  choices: ["overexposure", "passthrough", "temporal", "none"], answer: ["overexposure"], mark: [1, 2, 3, 4, 5, 6, 7, 9],
  explain: `<p>绝大多数使用者只关心一件事："崩溃时最多丢多少数据"。为了这一个问题，他们却被迫先弄懂六个底层参数的含义和相互影响，这就是<strong>过度暴露</strong>。</p>
<p>这也是第 8 章说的"踢皮球"（punting）：写入器的作者不确定该用什么策略，就把决定推给了每一个使用者。缓冲大小、批量、预分配都可以由写入器自己根据观测到的写入速率决定；真正只有使用者知道的，是他们对持久性的要求，这一项应该保留，而且要有合理的默认值。</p>`,
},
{
  id: "ch08-flag-02", ch: 8, type: "flag", title: "任务队列的优先级参数",
  prompt: "<p>一个后台任务调度器的提交接口。</p>",
  code: `enum class Priority { Low, Normal, Urgent };

// 提交一个后台任务。Urgent 任务会插到所有 Normal/Low 任务之前执行，
// 用于用户正在等待结果的场景；不要用于批处理。
TaskHandle submit(std::function<void()> task,
                  Priority prio = Priority::Normal);`,
  choices: ["overexposure", "leakage", "shallow", "none"], answer: ["none"],
  explain: `<p>这个参数通过了 8.2 节的检验："使用者能不能比模块自己定出更好的值？"能。调度器不知道哪个任务有用户在等，提交任务的人知道。书中也正是拿请求优先级当作配置参数的合理例子。</p>
<p>而且它有默认值，大多数调用者根本不用想它；注释说清了什么时候该用 <code>Urgent</code>。这是暴露参数的正确姿势。</p>`,
},
{
  id: "ch08-flag-03", ch: 8, type: "flag", title: "把业务逻辑\"往下拉\"进 HTTP 客户端",
  prompt: "<p>公司的通用 HTTP 客户端库最近新增了几个方法。提交者的理由是：\"把复杂性往下拉，调用方就简单了。\"</p>",
  code: `class HttpClient {
public:
    Response get(const Url& url, const RequestOptions& opts = {});
    Response post(const Url& url, Body body, const RequestOptions& opts = {});

    // 新增：个人主页用。头像服务偶尔超时，失败时重试 3 次，
    // 仍失败就返回默认头像的 URL。
    std::string fetchAvatarUrlForProfilePage(UserId uid);
    // 新增：结算页用。金额超过 10000 时额外带上风控头。
    Response postCheckout(const Order& order);
};`,
  choices: ["leakage", "passthrough", "overexposure", "none"], answer: ["leakage"], mark: [6, 7, 8, 9, 10],
  explain: `<p>这是 8.3 节说的"做过头"：往下拉的复杂性和 HTTP 客户端的核心功能<strong>毫无关系</strong>（头像、结算、风控是业务知识），而且也没让调用方简单多少（本来就是一处调用）。结果是业务知识泄漏进了通用库：结算规则一改，HTTP 库也得发版，这就是<strong>信息泄漏</strong>。</p>
<p>书中对应的例子是编辑器文本类里的退格键方法：看似把复杂性往下拉，其实只是让文本类知道了界面的事。这些方法应该留在个人主页和结算模块里。</p>
<p>第 9 章会给这种情况一个专门的名字：<strong>通用与专用混杂</strong>（special-general mixture），即通用机制里混进了只服务于某个特定用途的代码。</p>`,
},
{
  id: "ch08-ab-01", ch: 8, type: "ab", title: "RPC 超时重传的间隔",
  prompt: "<p>内部 RPC 库在请求无响应时要重发。重发等待多久？两种设计：</p>",
  a: { label: "让使用者配置", code: `struct RpcOptions {
    // 多久没收到响应就重发。默认 200ms。
    std::chrono::milliseconds retryAfter{200};
};
RpcClient client(addr, RpcOptions{.retryAfter = 500ms});` },
  b: { label: "库自己算", code: `// 重发间隔由库根据最近成功请求的往返时间自动估计
// （平滑平均值的若干倍，限制在 [20ms, 5s] 之间），使用者不必设置。
RpcClient client(addr);

// 内部，每次成功收到响应时：
void RpcClient::onResponse(Duration rtt) {
    srtt_ = srtt_ * 7 / 8 + rtt / 8;
    retryAfter_ = std::clamp(srtt_ * 4, 20ms, 5000ms);
}` },
  answer: "b",
  explain: `<p>8.2 节检验配置参数的问题："使用者能不能定出比模块更好的值？"在这里答案是否定的：使用者不知道网络的往返时间，而且它还会变（换机房、高峰期）。A 的 500ms 今天合适，半年后可能就过时了。</p>
<p>B 把复杂性拉进了库里：多几行实现，换来所有使用者都不用操心，而且能随运行条件自动调整。书中正是用网络协议根据成功请求的响应时间计算重传间隔来说明这一点。A 并非一无是处：如果某个调用者有特殊的延迟要求，可以保留一个可选的上限参数，但不应该让每个人都必须设置。</p>`,
},
{
  id: "ch08-ab-02", ch: 8, type: "ab", title: "配置文件里缺了一个键",
  prompt: "<p>一个配置库在读取 <code>log.level</code> 这类键时，键可能不存在。两种设计：</p>",
  a: { label: "", code: `// 键不存在时返回 def。值无法解析时抛 ConfigError（带文件名和行号）。
std::string level = cfg.get("log.level", "info");` },
  b: { label: "", code: `// 键不存在时抛 KeyNotFound；调用方自己决定怎么办。
std::string level;
try {
    level = cfg.get("log.level");
} catch (const KeyNotFound&) {
    level = "info";
}` },
  answer: "a",
  explain: `<p>B 是作者在本章开头点名的那种"踢皮球"：拿不准怎么处理，就抛个异常让调用方处理。结果是<strong>每个</strong>调用方都要写一遍同样的 try/catch，复杂性被放大到了所有使用者身上。</p>
<p>A 把最常见的处理（用默认值）收进了库里。注意 A 并没有吞掉所有错误：值写错了（比如 <code>port = abc</code>）仍然报错，因为那时调用方确实需要知道。第 10 章会系统地讨论怎样减少需要抛出的异常。</p>`,
},
{
  id: "ch08-judge-01", ch: 8, type: "judge", title: "哪个值得做成配置？",
  prompt: "<p>你在写一个多租户的对象存储服务。下面哪一项<strong>最适合</strong>暴露成配置参数？</p>",
  options: [
    "内部哈希表的初始桶数",
    "后台压缩线程每次处理的文件个数",
    "每个租户的存储配额",
    "读缓冲区的大小",
  ],
  answer: 2,
  explain: `<p>按 8.2 节的问题逐项检验：使用者能不能比模块自己定出更好的值？哈希表桶数可以随负载自动扩容；压缩批量可以根据积压程度自动调整；读缓冲大小可以根据访问模式自适应或选一个对绝大多数情况都好的值。这三项使用者通常并不比模块更清楚。</p>
<p>租户配额不一样：它是业务决策（谁付了多少钱、合同怎么签），模块不可能自己算出来。这类参数应该暴露，同时最好给一个合理的默认值。</p>`,
},
{
  id: "ch08-judge-02", ch: 8, type: "judge", title: "哪一次\"往下拉\"最合理？",
  prompt: "<p>四个提议都自称是\"把复杂性往下拉\"。哪一个最符合 8.3 节给出的条件？</p>",
  options: [
    "数据库客户端的查询结果迭代器在内部按游标自动翻页，调用方只需逐行遍历",
    "日志库新增 <code>logCheckoutFailure(const Order&amp;)</code>，替结算模块格式化订单信息",
    "既然复杂性越往下越好，把整个应用的业务规则都放进存储层",
    "通用 JSON 库新增一个选项：序列化订单时自动隐藏信用卡号",
  ],
  answer: 0,
  explain: `<p>8.3 节说，往下拉最有道理的情况是：被拉下去的复杂性和这个类<strong>已有的功能密切相关</strong>；拉下去之后<strong>别处的代码变简单</strong>；而且<strong>这个类的接口也变简单</strong>。自动翻页三条都满足：翻页本来就是"取查询结果"的一部分，每个调用方都省掉了翻页循环，接口从"查询 + 游标管理"变成"遍历"。</p>
<p>另外三个都和所在模块的核心功能无关（订单、信用卡是业务知识），属于信息泄漏；"全部往下放"更是作者明确说的极端做法。目标始终是<strong>整个系统</strong>的复杂性最低。</p>`,
},
{
  id: "ch08-write-01", ch: 8, type: "write", title: "给一堆配置参数做减法",
  prompt: `<p>后台压缩器（compactor）的构造函数如下，每个参数都要求使用者填写。请逐个决定：删掉（模块自己算）、保留但给默认值、还是保留为必填？写出新的声明，并为每个决定写一句理由。</p>`,
  code: `Compactor(size_t triggerFileCount,   // 文件数达到多少触发压缩
          double sizeRatio,           // 相邻层大小比例
          int    threads,             // 压缩线程数
          size_t ioBytesPerSec,       // 压缩的 IO 限速
          bool   verifyChecksums);    // 压缩时是否校验数据`,
  reference: `<pre><code class="lang-cpp">struct CompactorOptions {
    // 压缩可占用的磁盘带宽上限（字节/秒）。0 表示不限。
    // 与在线请求共用磁盘时建议设置；只有部署方知道磁盘还要承担什么。
    size_t ioBytesPerSec = 0;
};
explicit Compactor(const CompactorOptions&amp; opts = {});</code></pre>
<ul>
<li><code>triggerFileCount</code>、<code>sizeRatio</code>：删掉。模块可以根据读放大、写放大的观测值自己决定，使用者通常不知道该填多少。</li>
<li><code>threads</code>：删掉，按 CPU 核数和积压程度自动决定。</li>
<li><code>ioBytesPerSec</code>：保留，给默认值。磁盘上还跑着什么，只有部署方知道。</li>
<li><code>verifyChecksums</code>：删掉，总是校验。正确性不该是一个可以关掉的选项；如果实测太慢，那是实现要优化的问题。</li>
</ul>`,
  rubric: ["对每个参数都用了同一个检验问题：使用者能否比模块定出更好的值", "至少删掉了 2 个参数，并说明了模块如何自己决定", "保留的参数有合理的默认值", "没有简单地\"全删\"或\"全留\""],
  explain: `<p>不同团队可能做出不同选择，比如保留 <code>threads</code> 给容器环境用。关键在于每个决定都经过了那个问题的检验，而不是"以防万一都留着"。每多一个必填参数，每个部署的每个管理员都要学一遍。</p>`,
},
{
  id: "ch08-write-02", ch: 8, type: "write", title: "别把\"缓存满了\"推给调用方",
  prompt: `<p>下面这个缓存在满了的时候抛异常，要求调用方自己挑一个键删掉再重试。请重新设计接口（写出声明和注释），让调用方不必处理\"满了\"这件事。</p>`,
  code: `class BlobCache {
public:
    explicit BlobCache(size_t maxBytes);
    // 空间不足时抛 CacheFull，调用方应调用 evict() 后重试
    void put(const std::string& key, Bytes value);
    std::optional<Bytes> get(const std::string& key);
    void evict(const std::string& key);
    std::vector<std::string> keys() const;   // 供调用方挑选要淘汰的键
};`,
  reference: `<pre><code class="lang-cpp">// 按字节数限容的缓存。空间不足时自动淘汰最久未使用的项。
class BlobCache {
public:
    explicit BlobCache(size_t maxBytes);
    // 存入 key。必要时先淘汰旧项腾出空间；value 本身超过 maxBytes 时不缓存。
    void put(const std::string&amp; key, Bytes value);
    std::optional&lt;Bytes&gt; get(const std::string&amp; key);   // 命中会刷新"最近使用"
    void erase(const std::string&amp; key);                   // 主动失效（如源数据已变）
};</code></pre>
<p>淘汰策略、空间计算、"太大的值放不进"这个边界情况都收进了类里。<code>keys()</code> 不再需要公开。</p>`,
  rubric: ["put 不再因为空间不足而失败", "淘汰策略由缓存内部决定（并在注释中说明）", "处理了单个值比总容量还大的情况", "删掉了只为让调用方自己淘汰而存在的接口（如 keys）"],
  explain: `<p>原设计里，缓存的作者把最难的部分（满了怎么办）推给了每一个调用方，每个调用方都要写一套淘汰逻辑，而且写法各不相同。淘汰本来就和"缓存"的核心功能密切相关，拉下来之后调用方变简单、接口也变小，正好满足 8.3 节的三个条件。</p>`,
},
{ id: "ch08-card-01", ch: 8, type: "card",
  front: "什么情况下\"把复杂性往下拉\"最有道理？（8.3 节的三个条件）",
  back: "<p>① 被拉下去的复杂性和这个类<b>已有的功能密切相关</b>；② 拉下去之后，系统<b>其他地方的代码变简单</b>；③ 这个类的<b>接口变简单</b>。目标是整个系统的复杂性最低，而不是把所有东西都塞进一个类。不满足这些条件时，往下拉往往只是信息泄漏（书中的例子：文本类里的退格键方法）。</p>" },
);
