// 第 22 章 结语 —— 全书综合复习题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch22-flag-01", ch: 22, type: "flag", title: "一个\"处理数据\"的函数",
  prompt: "<p>报表服务里的一个函数。可以选多个。</p>",
  code: `// 处理数据
void Report::process(std::vector<Record>& data, bool flag) {
    // 遍历每条记录
    for (auto& r : data) {
        // 如果 flag 为真，就规范化
        if (flag) r.normalize();
        // 把金额加到合计里
        total_ += r.amount;
    }
}`,
  choices: ["vague-name", "comment-repeats", "hard-describe", "shallow", "none"], answer: ["vague-name", "comment-repeats"], mark: [1, 2, 3, 5, 7],
  explain: `<p><strong>名字含糊</strong>：<code>process</code>、<code>data</code>、<code>flag</code> 几乎什么都没说。读者得读完函数体才知道它在"累加金额"，而 <code>flag</code> 为真时到底意味着什么（输入来自旧系统？）也无从知道。</p>
<p><strong>注释重复代码</strong>：第 3、5、7 行的注释只是把下一行代码翻译成中文，没有提供任何代码之外的信息。第 1 行的注释也和名字一样含糊。</p>
<p>改法：例如 <code>void Report::addToTotal(std::vector&lt;Record&gt;&amp; records, bool normalizeLegacyFormat)</code>，接口注释写清"为什么有些记录需要规范化"（这是代码里看不出来的），删掉逐行注释。更进一步可以问：布尔参数能不能去掉，比如让记录在读入时就规范化（第 10 章、第 8 章的思路）？</p>`,
},
{
  id: "ch22-flag-02", ch: 22, type: "flag", title: "时长解析",
  prompt: "<p>配置库里的一个函数。</p>",
  code: `// 把 "1h30m"、"250ms"、"2d" 这样的时长写法解析成时长。
// 支持的单位：d h m s ms us；可以组合，但必须按从大到小的顺序。
// 写法不合法（未知单位、顺序颠倒、数字溢出）时返回 std::nullopt。
std::optional<std::chrono::nanoseconds> parseDuration(std::string_view text);`,
  choices: ["shallow", "impl-contaminates", "hard-describe", "none"], answer: ["none"],
  explain: `<p>这是一个深函数：接口只有一个参数和一个可选返回值，背后要处理分词、单位表、组合顺序、溢出检查。名字准确，接口注释只写调用者需要知道的东西（支持什么写法、失败时怎样），没有提实现细节。三行注释就说清楚了，所以也谈不上"难以描述"。</p>
<p>它在错误处理上也省了调用者的事：未知单位、顺序颠倒、溢出三种失败都归成同一个结果 <code>std::nullopt</code>，调用者只写一个分支。这接近 10.7 节"异常聚合"的精神（用一处代码处理许多种错误），而不是 10.3 节的"把错误定义掉"：错误依然存在，调用者仍然必须处理 <code>nullopt</code>。</p>`,
},
{
  id: "ch22-flag-03", ch: 22, type: "flag", title: "一段很详细的接口注释",
  code: `// 线程安全的计数器表。
// 内部是 64 个分段，每段一把 std::mutex 和一个 std::unordered_map；
// 键先用 FNV-1a 哈希，取低 6 位选分段。increment 先锁分段，
// 再查表，不存在就插入 0 再加一。分段数是编译期常量，
// 改它需要重新编译。
class CounterTable {
public:
    void increment(std::string_view key, int64_t delta = 1);
    int64_t get(std::string_view key) const;   // 不存在返回 0
};`,
  choices: ["impl-contaminates", "comment-repeats", "leakage", "none"], answer: ["impl-contaminates"], mark: [2, 3, 4, 5],
  explain: `<p>第 2～5 行全是实现细节：分段数、哈希算法、加锁顺序。调用者用这个类只需要知道：线程安全；<code>increment</code> 对不存在的键从 0 开始加；<code>get</code> 不存在时返回 0。这些写进接口注释就够了。实现细节应该放进类的实现注释里，以后换成无锁实现，接口注释一个字都不用改。</p>
<p>它不算"注释重复代码"：这些信息在签名里确实看不到，问题在于它写错了地方、写给了错的读者。</p>`,
},
{
  id: "ch22-flag-04", ch: 22, type: "flag", title: "显示名的八条规则",
  prompt: "<p>用户服务里的一个函数，评论区、通知、后台列表都在调用它。接口注释是完整、准确的。</p>",
  code: `// 返回 id 用户在 viewer 眼中显示的名字：
// - 设置了昵称：返回昵称；
// - 没有昵称但已实名认证：返回姓名，除姓以外的字替换成 *；
// - 都没有：返回手机号，中间四位打码；
// - 老账号没有手机号：返回 "用户" 加 id 的后 6 位；
// - 账号已注销：一律返回 "已注销用户"；
// - viewer 就是本人时，以上打码规则都不生效；
// - 账号被封禁时，在结果后面加 "（已封禁）"，但本人看不到这个后缀。
// 用户不存在时返回空字符串。
std::string displayName(UserId id, UserId viewer);`,
  choices: ["hard-describe", "impl-contaminates", "comment-repeats", "shallow", "none"], answer: ["hard-describe"], mark: [2, 3, 4, 5, 6, 7, 8],
  explain: `<p>注释本身没写错：每一条都是调用者可见的行为，不是实现细节，所以不算"实现细节污染接口注释"；签名里也看不出这些，所以不是"注释重复代码"。问题在于，要把这个函数说完整，就得列出八条规则，其中七条是特殊情况。书中 15.3 节说：一个方法如果没法用简短的注释完整描述，说明它的接口本身就复杂，这是"难以描述"。每个调用者都得记住这八条才能预测结果，比如拿它做排序键或者写进通知正文时，会意外带上"（已封禁）"。</p>
<p>改法是减少特殊情况，而不是写更长的注释。第 10 章的思路：给老账号统一补一个默认昵称，注释第 3～5 行那条回退链就不存在了；打码是展示层针对 viewer 的策略，交给单独的 <code>maskFor(viewer)</code>；注销和封禁是账号状态，由界面显示成标记，而不是拼进名字字符串。剩下的 <code>displayName</code> 一行注释就能说完。</p>`,
},
{
  id: "ch22-ab-01", ch: 22, type: "ab", title: "取消一个不存在的订阅",
  prompt: "<p>消息系统的取消订阅接口。业务方经常在\"不确定是否订阅过\"的情况下调用它（例如用户注销时统一清理）。</p>",
  a: { label: "", code: `// 取消 id 对 topic 的订阅。调用后 id 一定不再收到 topic 的消息；
// 原本就没有订阅时什么也不做。
void unsubscribe(SubscriberId id, TopicId topic);` },
  b: { label: "", code: `// 取消 id 对 topic 的订阅。
// 没有订阅时抛 NotSubscribedError。
void unsubscribe(SubscriberId id, TopicId topic);

// 调用方：
try { bus.unsubscribe(id, topic); }
catch (const NotSubscribedError&) { /* 本来就没订阅，忽略 */ }` },
  answer: "a",
  explain: `<p>A 把错误定义掉了（第 10 章）：把接口的语义从"删除一条已存在的订阅"改成"确保之后不再订阅"，原本就没订阅的情况自然满足这个语义，不再是错误。调用者不用写 <code>try/catch</code>，接口也更简单（深）。</p>
<p>B 的异常几乎所有调用者都会原样忽略，它只是把一个本可以在模块里吸收掉的情况推给了每个调用者。什么时候 B 合理：如果"没订阅"通常意味着调用者有 bug（例如逻辑上不可能出现），并且调用者确实需要知道。这时也可以考虑返回 <code>bool</code> 而不是抛异常。</p>`,
},
{
  id: "ch22-judge-01", ch: 22, type: "judge", title: "这是哪种症状？",
  prompt: "<p>你想把服务调用的默认超时从 3 秒改成 5 秒，结果发现要改 9 个文件里的 14 处常量，有两处还写成了 <code>3000</code>（毫秒）。按第 2 章的框架，这首先是哪种症状？根源是什么？</p>",
  options: [
    "认知负担；根源是模糊",
    "未知的未知；根源是代码太长",
    "变更放大；根源是依赖：同一个设计决定（默认超时）散落在多处，它们彼此依赖却没有被表达出来",
    "不是复杂性问题，只是改的时候要细心",
  ],
  answer: 2,
  explain: `<p>一个看起来很小的改动要动很多地方，这是<strong>变更放大</strong>。根源是<strong>依赖</strong>：14 处常量必须保持一致，但代码里没有任何东西把它们联系起来，这也是一种信息泄漏（第 5 章）。那两处 <code>3000</code> 还带来了<strong>未知的未知</strong>：搜索"3"或"3s"时很可能漏掉它们。</p>
<p>改法：把默认超时定义在一个地方（一个常量或配置项），类型用 <code>std::chrono::duration</code>，单位就不会再写混。</p>`,
},
{
  id: "ch22-judge-02", ch: 22, type: "judge", title: "哪条建议最符合全书的精神？",
  prompt: "<p>新同事读完这本书，在团队里提了四条建议。哪一条最符合作者的立场？</p>",
  options: [
    "规定每个函数不超过 20 行，每个类不超过 200 行",
    "每次改代码时，顺手做一点设计改进，让系统比改之前好一点，而不是只用最小改动把功能塞进去",
    "所有公开方法都必须有逐行注释",
    "所有配置项都要能在运行时修改，越灵活越好",
  ],
  answer: 1,
  explain: `<p>这是第 3 章的战略式编程和第 16 章修改代码时的建议：持续做小投资，每次改动都让设计更好一点。</p>
<p>其他三条都和书中的观点冲突：用长度上限切函数会制造浅方法（第 4、9 章）；逐行注释通常只是重复代码（第 13 章）；把所有东西都做成可配置，是把复杂性往上推给使用者（第 8 章），也是把太多东西当成重要的（第 21 章）。</p>`,
},
{
  id: "ch22-write-01", ch: 22, type: "write", title: "综合改写：名字、接口和注释",
  prompt: `<p>下面是一个用户服务里的函数。请给出改进后的声明（名字、参数、返回值）和接口注释，并说明你用了全书哪几章的想法。</p>`,
  code: `// 检查
int check(std::string s, int type, bool b);
// 返回 0 表示可以；1 表示太短；2 表示有非法字符；3 表示已被占用；
// type = 1 时检查用户名，type = 2 时检查昵称（昵称不检查占用，b 无效）；
// b 为 true 时忽略大小写`,
  reference: `<pre><code class="lang-cpp">enum class NameProblem { TooShort, IllegalChar, Taken };

// ---- 以下是 UserService 的成员函数 ----
// 检查 username 能否注册为新用户名。用户名不区分大小写：
// "Alice" 和 "alice" 视为同一个名字。
// 可以注册时返回 std::nullopt，否则返回第一个发现的问题。
std::optional&lt;NameProblem&gt; checkNewUsername(std::string_view username) const;

// 检查 nickname 能否用作昵称。昵称允许重复，所以不会返回 Taken。
std::optional&lt;NameProblem&gt; checkNickname(std::string_view nickname) const;</code></pre>
<p>用到的想法：名字要精确（第 14 章：<code>check</code>、<code>s</code>、<code>b</code> 都太含糊）；用枚举代替魔法数字，让代码一目了然（第 18 章）；把"用户名还是昵称"这个 <code>type</code> 拆成两个方法，因为两者规则不同，参数 <code>b</code> 在一种情况下还无效，这是通用和专用混在了一起（第 9 章）；把"是否忽略大小写"变成规则的一部分写进注释，而不是让每个调用者决定（第 8 章往下拉、第 21 章：这件事不该由调用者想）；接口注释只写调用者需要知道的东西（第 13 章）。</p>`,
  rubric: ["名字精确地说出了检查的对象和目的", "去掉了魔法数字（用枚举、optional 或类似方式）", "去掉了 type 参数或让两种情况的规则不再混在一起", "处理了大小写参数：变成固定规则，或至少起个清楚的名字", "接口注释说明了成功和失败的表示方式"],
  explain: `<p>这一个小函数里集中了好几个红旗：名字含糊、不明显的代码（魔法数字）、通用和专用混杂、参数之间有只写在注释里的隐含约束（b 在一种情况下无效）。这也是全书的一个规律：红旗很少单独出现，改掉一个，往往会顺带消掉另外几个。</p>`,
},
{ id: "ch22-card-01", ch: 22, type: "card",
  front: "用一段话概括全书：复杂性是什么、从哪来、怎么对付？",
  back: "<p>复杂性是让系统难以理解、难以修改的一切。症状：变更放大、认知负担、未知的未知。根源：依赖和模糊。对付依赖：把模块做深（信息隐藏、通用接口、分层、把复杂性往下拉、把错误定义掉）；对付模糊：好的注释、精确的名字、一致性、一目了然的代码。过程上：战略式编程、设计两次、先写注释、每次修改都做一点投资。贯穿始终的是判断什么重要。</p>" },
);
