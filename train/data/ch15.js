// 第 15 章 先写注释 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch15-flag-01", ch: 15, type: "flag", title: "一个什么都能干的发送方法",
  prompt: "<p>消息推送服务里，有人先写了接口注释，准备再写实现。注释写到这里时停了下来。</p>",
  code: `// 发送一条推送。
// mode == 0：立即发送；返回值是消息 id。
// mode == 1：放进批量队列，返回 0；队列满 100 条或过了 5 秒才真正发出。
// mode == 2：只校验 payload 格式，不发送；合法返回 1，否则返回 -1。
// 当 mode == 1 且 retry 为 true 时，失败会重新入队，但最多 3 次；
// 当 mode == 0 时 retry 被忽略，失败直接抛 PushError。
// mode == 2 时 userId 可以为空。
// 注意：必须先调用 connect()，否则 mode 0、1 会抛 PushError，mode 2 不会。
int64_t send(const std::string& userId, const Payload& payload,
             int mode, bool retry);`,
  choices: ["hard-describe", "comment-repeats", "impl-contaminates", "none"], answer: ["hard-describe"], mark: [2, 3, 4, 5, 6, 7, 8],
  explain: `<p>注释写了 7 行，却还没写完（错误码、批量队列丢失怎么办都没提）。要把这个方法<strong>完整地</strong>描述清楚，注释只会更长，这就是"难以描述"：问题不在注释写得不好，而在方法本身把三件事（立即发送、批量发送、格式校验）塞进了一个接口，返回值在三种模式下含义各不相同。</p>
<p>注释里写的都是调用者必须知道的行为，不是实现细节，所以不算"实现细节污染接口注释"；它也没有重复代码。改法是拆开：<code>sendNow()</code>、<code>enqueue()</code>、<code>validate()</code>，每个方法一两行注释就能说完。这正是先写注释的价值：设计问题在动手写实现之前就暴露了。</p>`,
},
{
  id: "ch15-flag-02", ch: 15, type: "flag", title: "一个身兼数职的成员变量",
  prompt: "<p>一个连接对象里的成员变量，注释是后来补的。</p>",
  code: `class Connection {
    // ...
private:
    // >= 0：当前已重试的次数；
    // -1：连接已正常关闭；
    // -2：正在关闭，等待对端确认；
    // -3：因认证失败被关闭，此时不要再重试；
    // 大于 1000 时减去 1000 表示重定向的次数（重定向不计入重试）。
    int status_ = 0;
};`,
  choices: ["hard-describe", "vague-name", "hard-name", "none"], answer: ["hard-describe", "vague-name", "hard-name"], mark: [4, 5, 6, 7, 8, 9],
  explain: `<p>一个 <code>int</code> 同时编码了重试次数、关闭状态、关闭原因和重定向次数。要描述它需要 5 行，而且每加一种状态注释都要再长一截。书中 15.3 节说得很直接：一个变量需要很长的注释才能说清，说明变量的拆分方式可能不对。</p>
<p>名字也有两面的问题。<code>status_</code> 太含糊，读者从名字猜不出它会存重试次数（名字含糊）；而更根本的是，你想换个精确的名字也换不出来，因为它根本不是"一个东西"——这正是 14.3 节"名字难起"红旗说的情况：起不出精确又直观的名字，往往说明变量本身的设计不干净。名字难起和难以描述在这里是同一个病根的两种症状。改法：拆成 <code>retryCount_</code>、<code>redirectCount_</code> 和一个枚举 <code>CloseState state_ { Open, Closing, Closed, AuthFailed }</code>，每个变量一行注释即可。</p>`,
},
{
  id: "ch15-flag-03", ch: 15, type: "flag", title: "三行注释，背后一整套机制",
  prompt: "<p>配置中心客户端里的一个函数，实现大约 60 行。</p>",
  code: `// 把 path 的内容原子地替换成 data：任何时刻，读者要么看到完整的旧内容，
// 要么看到完整的新内容。函数返回时新内容已经落盘，断电也不会丢。
// 失败时抛 IoError，原文件保持不变。
void replaceFileAtomically(const std::filesystem::path& path,
                           std::string_view data);`,
  choices: ["hard-describe", "impl-contaminates", "shallow", "none"], answer: ["none"],
  explain: `<p>注释三行，简短而且<strong>完整</strong>：调用者需要知道的（原子性、持久性、失败时的状态）都有了，没有提"先写临时文件、fsync、rename、再 fsync 目录"这些实现步骤。拿接口注释和实现比一比：注释远比实现短，说明这是个深函数。</p>
<p>这是 15.3 节"拿注释当量尺"的正面例子。注意量尺只在注释完整时才有效：如果注释只写一句"写文件"，它也很短，但那说明的是注释不合格，不是接口简单。</p>`,
},
{
  id: "ch15-ab-01", ch: 15, type: "ab", title: "两份先写出来的类注释",
  prompt: "<p>要给网关写一个限流器。两位同事各自先写了类注释和方法声明（还没写实现）。只看注释，你更看好哪份设计？</p>",
  a: { label: "", code: `// 按 key 限流：每个 key 每秒最多放行 ratePerSec 次，
// 允许短时间内突发到 burst 次。线程安全。
class RateLimiter {
public:
    RateLimiter(double ratePerSec, int burst);
    // 本次请求是否放行。放行时会消耗一次额度。
    bool allow(std::string_view key);
};` },
  b: { label: "", code: `// 令牌桶限流器。调用者为每个 key 创建一个 Bucket，
// 定期调用 refill() 补充令牌，请求到来时先 peek() 看令牌数，
// 大于 0 再调用 take()。多线程使用时调用者自己加锁。
class RateLimiter {
public:
    Bucket* createBucket(std::string_view key, int capacity);
    void refill(Bucket* b, double elapsedSec);
    int  peek(const Bucket* b) const;
    void take(Bucket* b);
};` },
  answer: "a",
  explain: `<p>A 的类注释两行就把抽象说完整了，方法注释一行。B 的类注释读起来像一份<strong>使用说明书</strong>：调用者要知道令牌桶算法、自己管理 Bucket、自己定时 refill、先 peek 再 take（还有竞态）、自己加锁。注释要描述实现的主要机制，说明模块浅。</p>
<p>这就是先写注释的好处：两份设计在写一行实现之前，注释的长短和内容已经把深浅暴露出来了。B 并非一无是处：如果调用方真的需要精细控制（例如要把桶持久化到别处），可以在 A 的基础上再提供一个低层接口，但不该让所有人都从低层用起。</p>`,
},
{
  id: "ch15-ab-02", ch: 15, type: "ab", title: "补出来的注释 vs 先写的注释",
  prompt: "<p>同一个方法的两种注释。一份是代码写完一个月后补的，另一份是写代码之前写的。</p>",
  a: { label: "", code: `// 遍历 entries_，如果 expireAt 小于 now 就 erase，
// 同时 ++n，最后返回 n。
size_t SessionTable::purge(TimePoint now);` },
  b: { label: "", code: `// 删除所有在 now 之前过期的会话，返回删除的个数。
// expireAt 为 TimePoint::max() 的会话（"记住我"登录）永不过期。
// 只在持有 table 锁时调用；调用方负责定期触发（通常每分钟一次）。
size_t SessionTable::purge(TimePoint now);` },
  answer: "b",
  explain: `<p>A 是典型的"事后补注释"：作者看着代码写，于是注释在复述代码（第 13 章的"注释重复代码"），而设计时想清楚的东西（永不过期的特殊值、锁的要求、谁来触发）已经忘了，没写进去。</p>
<p>B 写在实现之前，作者当时只能思考<strong>抽象</strong>：这个方法对调用者承诺什么、有哪些前提。这正是书中 15.1 节说的：事后补的注释往往既重复代码，又漏掉最重要的设计信息。</p>`,
},
{
  id: "ch15-judge-01", ch: 15, type: "judge", title: "\"代码还在变，注释晚点再写\"",
  prompt: "<p>同事说：\"现在写注释，过两周代码一改又得重写，不如等稳定了一起补。\"作者在 15.5 节怎样回应这个理由？</p>",
  options: [
    "同意这个理由，但认为注释对新人太重要，所以值得付出重写的代价",
    "敲代码和注释（含修改）的时间本来就只占开发时间的一小部分，注释更少；推迟只能省下其中一部分。而且先写注释让抽象更早稳定，可能整体反而更快",
    "认为代码不会变，因为好的设计在一开始就能确定",
    "建议用工具从代码自动生成注释，这样就不存在重写的问题",
  ],
  answer: 1,
  explain: `<p>作者做了一个粗略估算：输入代码和注释（包括修改）的时间大约不超过开发总时间的 10%，注释部分不超过约 5%；推迟注释只能省下这 5% 的一部分。另一方面，先写注释会让抽象在写代码前就更稳定，减少写代码时的返工，所以整体可能更快。</p>
<p>作者并没有说代码不会变（第 16 章整章都在讲修改代码），也没有建议自动生成注释：自动生成的东西只能来自代码，恰恰写不出代码里看不出来的信息。</p>`,
},
{
  id: "ch15-judge-02", ch: 15, type: "judge", title: "短注释 = 简单接口？",
  prompt: "<p>一个 400 行的方法，接口注释只有一行：<code>// 处理订单</code>。按照\"注释是复杂性的预警器\"的说法，能不能得出\"这个方法接口很简单、是深方法\"？</p>",
  options: [
    "能：注释越短，说明接口越简单",
    "不能：注释长短和接口复杂度没有关系，要看代码行数",
    "不能：只有完整、清楚的注释才能当量尺。这条注释没提供调用所需的信息，它短只说明注释不合格",
  ],
  answer: 2,
  explain: `<p>书中 15.3 节专门说明了这一点：注释只有在<strong>完整且清楚</strong>时，才能用来衡量复杂性。"处理订单"没有说参数要求、副作用、失败时怎样，调用者读完还是不知道怎么用。</p>
<p>正确的做法是先把注释补完整，再看它有多长：如果补完整需要一大段，那才是真正的信号。至于"看代码行数"，第 4 章已经说过深度是接口和功能之比，不是行数。</p>`,
},
{
  id: "ch15-write-01", ch: 15, type: "write", title: "先写注释：一个解析函数",
  prompt: `<p>你要写一个函数，把配置文件里的时长字符串（如 <code>"1h30m"</code>、<code>"500ms"</code>、<code>"2d"</code>）转成毫秒。<strong>先别想实现</strong>，只写它的接口注释，要让调用者不看实现就能正确使用。写完再想想：哪些问题是你写注释时才第一次想到的？</p>`,
  code: `// ？
int64_t parseDurationMs(std::string_view text);`,
  reference: `<pre><code class="lang-cpp">// 把时长字符串转成毫秒。text 由一个或多个"数字+单位"连写而成，
// 单位为 d、h、m、s、ms（如 "1h30m"、"500ms"），数字为非负整数，不允许空格。
// 同一单位重复出现（"1h2h"）或单位顺序不是从大到小时视为格式错误。
// 格式错误或结果超过 int64 范围时抛 std::invalid_argument，消息里带原始字符串。
int64_t parseDurationMs(std::string_view text);</code></pre>
<p>写注释时多半会第一次碰到这些问题：允许小数吗（"1.5h"）？允许空格吗？"1h2h" 算不算合法？空字符串和 "0" 呢？溢出怎么办？出错是抛异常还是返回特殊值？这些都是<strong>设计决定</strong>，写实现之前就该定下来。</p>`,
  rubric: ["说明了支持哪些单位以及组合方式", "写明了出错时的行为（抛异常 / 返回值），以及什么算出错", "考虑了至少两个边界情况（小数、空格、溢出、空串、重复单位……）", "没有描述实现方法（正则、状态机等）"],
  explain: `<p>这道题的目的不是写出"标准答案"，而是体会 15.3 节说的：写注释逼你回答"这个东西最重要的方面是什么"。如果你发现注释写不完、越写越长（比如还想支持"1 小时 30 分"这种中文写法），那就是该停下来重新划定函数职责的时候。</p>`,
},
{ id: "ch15-card-01", ch: 15, type: "card",
  front: "作者\"先写注释\"的工作顺序是怎样的？",
  back: "<p>① 类的接口注释 → ② 最重要的公开方法的签名和接口注释（方法体留空），反复修改到结构大致满意 → ③ 最重要的成员变量的声明和注释 → ④ 填写方法体，按需加实现注释。写实现时新冒出来的方法和变量，同样先写注释再写代码。结果：代码写完时注释也写完了，没有积压。</p>" },
{ id: "ch15-card-02", ch: 15, type: "card",
  front: "为什么说\"推迟写的注释是差的注释\"？先写注释有哪三个好处？",
  back: "<p>推迟的后果：往往永远不写；就算写，也是在急着收工时匆匆补上，看着代码写所以重复代码，设计时的想法已经忘了。</p><p>先写的三个好处：注释质量更好（设计思路正新鲜）；<b>设计更好</b>（最重要：注释是复杂性的预警器，注释难写说明设计有问题）；写注释更有乐趣（追求用最少的话把设计说完整）。</p>" },
);
