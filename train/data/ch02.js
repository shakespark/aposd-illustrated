// 第 2 章 复杂性的本质 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch02-judge-01", ch: 2, type: "judge", title: "加一个日志级别",
  prompt: "<p>项目要新增日志级别 <code>TRACE</code>。需要改五处：枚举定义、<code>logger.cpp</code> 里的级别名字符串表、配置解析的 <code>switch</code>、命令行帮助文本、控制台输出的级别配色表。好在枚举定义上方有一段注释，把这五处的文件和函数名都列出来了。这里最主要的复杂性症状是哪一种？</p>",
  code: `// 新增级别时，同时修改：
//   1. logger.cpp      kLevelNames[]
//   2. config.cpp      parseLevel() 的 switch
//   3. cli.cpp         kHelpText
//   4. console_sink.cpp kLevelColors[]
enum class Level { Debug, Info, Warn, Error };`,
  options: [
    "变更放大（change amplification）",
    "认知负担（cognitive load）",
    "未知的未知（unknown unknowns）",
    "没有复杂性问题：有注释就够了",
  ],
  answer: 0,
  explain: `<p>一个看起来很简单的改动要动五处，这是<strong>变更放大</strong>。因为注释把五处都列清楚了，开发者知道该改哪里，所以它\"只是烦人\"：改完了系统就能正常工作。作者在 2.2 节正是这样区分的：变更放大和认知负担只要清楚该改什么、该读什么，改动仍然可能是对的。</p>
<p>把那段注释删掉，情况就变了：如果配色表漏了一项、程序悄悄用默认颜色，开发者很可能发现不了，这就成了<strong>未知的未知</strong>。注释把一个未知的未知降级成了变更放大，但根本的改法是减少依赖，例如用一张表同时描述每个级别的名字、配色和解析关键字，新增级别只改一处。</p>`,
},
{
  id: "ch02-judge-02", ch: 2, type: "judge", title: "超时改了却没生效",
  prompt: "<p>线上请求常被 3 秒截断，你把 <code>config.h</code> 里的 <code>kRequestTimeoutMs</code> 从 3000 改成 10000，单元测试全部通过。上线后请求<strong>依然</strong>在 3 秒多一点被截断。查了两天才发现：网关侧的健康检查代码在另一个仓库里，把\"后端超时 + 500 毫秒\"写死成了 <code>3500</code>，超过它就判定后端不健康并断开连接。这件事暴露的主要症状是？</p>",
  options: [
    "认知负担：开发者需要知道的东西太多",
    "变更放大：一个改动要改两处",
    "未知的未知：不知道还有哪些代码要改，甚至不知道存在这个问题",
    "这不是设计问题，是测试覆盖不足",
  ],
  answer: 2,
  explain: `<p>关键在于<strong>你没有办法事先知道</strong>那个 <code>3500</code> 的存在：它和 <code>kRequestTimeoutMs</code> 之间的依赖既没有名字可搜，也没有编译器检查，只能等出了 bug 才发现。这是作者说的三种症状中最糟的一种：要知道某件事，却没有办法查出它是什么，甚至不知道有问题。</p>
<p>它的成因是\"依赖 + 模糊\"：存在依赖（网关的值由后端超时推导而来），而且依赖不明显。改法是让依赖显式化：网关从同一个配置源读取后端超时再加余量，或者至少在两边用同一个具名常量。测试覆盖也许能更早暴露问题，但跨仓库的隐式依赖很难靠测试兜住。</p>`,
},
{
  id: "ch02-judge-03", ch: 2, type: "judge", title: "返回静态缓冲区的函数",
  prompt: "<p>下面这个函数的头文件注释写得很清楚。调用者用它时，主要承受的是哪种复杂性症状？</p>",
  code: `// 把地址格式化成 "1.2.3.4:80" 或 "[::1]:80"。
// 返回值指向函数内部的静态缓冲区：下一次调用会覆盖它，
// 多线程同时调用不安全；需要保存结果请自己拷贝。
const char* formatAddr(const struct sockaddr* sa);`,
  options: [
    "变更放大",
    "认知负担：每个调用者都要记住返回值的有效期和线程限制，忘了就是 bug",
    "未知的未知",
    "没有问题：注释已经说清楚了",
  ],
  answer: 1,
  explain: `<p>注释写清楚了，所以不是未知的未知；但每个调用者都必须<strong>知道并记住</strong>两条规则：结果在下一次调用前有效、不能多线程用。比如 <code>printf("%s -&gt; %s", formatAddr(a), formatAddr(b))</code> 就会打印出两个相同的地址。这是<strong>认知负担</strong>：完成任务需要知道的东西变多了，漏掉一条就出错。</p>
<p>书中 2.2 节用\"C 函数分配内存、让调用者释放\"说明同一件事。改法也类似：让模块自己承担这份负担，例如返回 <code>std::string</code>，或者让调用者传入缓冲区，这样有效期就成了调用者自己能看见的事。</p>`,
},
{
  id: "ch02-judge-04", ch: 2, type: "judge", title: "一个叫 timeout 的字段",
  prompt: "<p>连接配置里有个字段，没有注释。代码里有的地方把它当毫秒传给 <code>poll()</code>，有的地方把它乘以 1000 再存进去。这种问题的成因主要是什么？</p>",
  code: `struct ConnConfig {
    std::string host;
    int port;
    int timeout;
};`,
  options: [
    "模糊（obscurity）：重要的信息（单位）不明显，用法还不一致",
    "依赖（dependency）：这个字段被太多地方使用",
    "都不是：只是命名风格问题，团队约定好就行",
  ],
  answer: 0,
  explain: `<p>作者给模糊下的定义是<strong>重要的信息不明显</strong>，举的第一类例子就是名字太泛、文档没写单位，只能翻遍使用处才知道。这里更糟：用法本身<strong>不一致</strong>，作者把不一致列为模糊的主要来源之一。</p>
<p>它当然也有依赖（所有使用处都依赖同一个单位约定），但依赖本身不是问题，问题是这个依赖看不见。最好的改法是让信息变得明显、并交给编译器检查：<code>std::chrono::milliseconds timeout;</code>。作者在 2.3 节也说，减少模糊最好的办法是简化设计，而不只是补文档。</p>`,
},
{
  id: "ch02-judge-05", ch: 2, type: "judge", title: "这一季度该先改哪里？",
  prompt: "<p>按 2.1 节的粗略刻画，系统复杂度 <em>C</em> = Σ<sub>p</sub> <em>c<sub>p</sub></em> · <em>t<sub>p</sub></em>（每个部分的复杂度，乘以开发者花在这个部分上的时间比例，再求和）。团队估算了两个部分：</p><ul><li>自研加密库：复杂度 9（满分 10），一年里大约只有 1% 的开发时间会碰它；</li><li>订单处理逻辑：复杂度 5，大约 40% 的开发时间花在这里。</li></ul><p>只能做一件事，哪件对整体复杂度帮助更大？</p>",
  options: [
    "把加密库的复杂度从 9 降到 3：它是全系统最复杂的部分",
    "两者差不多：都是降低复杂度",
    "无法判断：这个公式只看代码行数",
    "把订单处理的复杂度从 5 降到 4",
  ],
  answer: 3,
  explain: `<p>按公式算：加密库 (9−3) × 0.01 = 0.06；订单处理 (5−4) × 0.40 = 0.40，大了六倍多。复杂度由<strong>最常见的活动</strong>决定：一个很复杂但几乎没人碰的部分，对整体影响很小。作者由此得出一个重要推论：把复杂性隔离在一个永远不会被看到的地方，几乎和消除它一样好。</p>
<p>当然数字是粗估，公式也只是粗略的刻画。它的价值在于提醒你：判断\"复杂\"要看开发者实际在哪里花时间，而不是看哪段代码最吓人。另外要注意 <em>t<sub>p</sub></em> 不是固定的：如果加密库的接口设计得不好，逼着业务代码经常去读它的实现，它的时间比例就会上升。</p>`,
},
{
  id: "ch02-judge-06", ch: 2, type: "judge", title: "我觉得很清楚啊",
  prompt: "<p>你写了一个调度模块，自己读起来非常顺。新加入的两位同事都说\"看不懂，不敢改\"。按作者的观点，最恰当的反应是？</p>",
  options: [
    "他们经验不足，熟悉代码库之后自然就懂了",
    "跑一下圈复杂度工具，数值不高就说明代码不复杂",
    "它就是复杂的；值得去问清楚他们卡在哪里，这种分歧里通常有值得学的东西",
    "加更多注释，把每一行都解释一遍",
  ],
  answer: 2,
  explain: `<p>作者在 2.1 节的说法很直接：复杂性对读者比对作者更明显；你觉得简单、别人觉得复杂，那它就是复杂的。开发者的工作不只是写出自己用着顺手的代码，还要让别人也用得顺手。</p>
<p>\"逐行加注释\"看似积极，但通常治标不治本（第 13 章会讲，重复代码的注释没有价值），而且作者在 2.3 节提醒过：需要大量文档本身往往说明设计有问题。先弄清楚别人卡在哪里：是某个隐含约定？某个名字误导？还是模块之间的依赖太绕？</p>`,
},
{
  id: "ch02-ab-01", ch: 2, type: "ab", title: "更短就更简单吗？",
  prompt: "<p>给 HTTP 路由注册\"需要登录、缓存 30 秒、每分钟限流 100 次\"。两种框架写法：</p>",
  a: { label: "", code: `router.get("/users/:id", handleGetUser)
      .requireAuth()
      .cacheFor(std::chrono::seconds(30))
      .rateLimit(100 /* 每分钟请求数 */);` },
  b: { label: "", code: `ROUTE(G, "/users/:id", handleGetUser, A | C(30) | R(100));
// G/A/C/R 是框架定义的宏；
// A 必须写在 C 前面，否则缓存会跳过鉴权；R 的单位见 rate.h` },
  answer: "a",
  explain: `<p>B 只有一行，但想写对这一行，你得知道四个宏各是什么、标志的<strong>顺序</strong>有安全含义、限流的单位在另一个文件里。这些都是认知负担，而且\"A 必须在 C 前面\"如果没被注释，就成了未知的未知。</p>
<p>A 多了几行，但每一行说的是什么一目了然，顺序问题也可以由框架内部处理掉。这正是作者在 2.2 节反驳的观点：复杂度不能用代码行数衡量，有时行数更多的方案反而更简单，因为它降低了认知负担。</p>
<p>B 什么时候可以接受？如果团队每天都在用这套宏、它们早已是共同知识，认知负担就小得多。但新成员和偶尔改一次的人仍然要付这笔账。</p>`,
},
{
  id: "ch02-ab-02", ch: 2, type: "ab", title: "订阅一个事件",
  prompt: "<p>订单支付成功后，积分模块要收到通知。两种事件总线接口：</p>",
  a: { label: "按字符串订阅", code: `// 订单模块
bus.publish("order_paid", Json{{"id", order.id}, {"amount", order.cents}});

// 积分模块
bus.subscribe("order.paid", [](const Json& e) {
    addPoints(e["id"].get<int64_t>(), e["amount_cents"].get<int64_t>());
});` },
  b: { label: "按类型订阅", code: `// events.h
struct OrderPaid { int64_t orderId; int64_t amountCents; };

// 订单模块
bus.publish(OrderPaid{order.id, order.cents});

// 积分模块
bus.subscribe<OrderPaid>([](const OrderPaid& e) {
    addPoints(e.orderId, e.amountCents);
});` },
  answer: "b",
  explain: `<p>两种写法都有依赖：积分模块依赖订单模块发出的事件。区别在于依赖<strong>是否明显</strong>。A 里的依赖藏在字符串里：事件名一个用下划线、一个用点，字段名一个叫 <code>amount</code>、一个叫 <code>amount_cents</code>，编译能过、测试可能也过，积分就是不涨。想知道谁订阅了这个事件，也只能全文搜各种可能的拼法。</p>
<p>B 把依赖变成了一个有名字的类型：搜 <code>OrderPaid</code> 就能找到所有发布者和订阅者，改字段名编译器会报错。这和书中 2.3 节网站横幅颜色的例子是同一个道理：依赖消除不了，但可以用一个简单、明显的依赖替换一个隐蔽、难管理的依赖。</p>
<p>A 什么时候合理？跨进程、跨语言或插件边界上，双方没法共享 C++ 类型。那时也应该把事件名和字段定义集中在一份 schema 里，而不是散落在各处的字面量。</p>`,
},
{
  id: "ch02-ab-03", ch: 2, type: "ab", title: "超时参数",
  prompt: "<p>同一个函数，两种签名：</p>",
  a: { label: "", code: `void setReadTimeout(int timeout);

// 调用处
conn.setReadTimeout(5);` },
  b: { label: "", code: `void setReadTimeout(std::chrono::milliseconds timeout);

// 调用处
conn.setReadTimeout(std::chrono::seconds(5));` },
  answer: "b",
  explain: `<p>A 的调用处 <code>5</code> 是秒还是毫秒？只能去查文档或实现，这是<strong>模糊</strong>：重要信息不明显。如果实现按毫秒解释，这里就是一个 5 毫秒的超时，而且不会有任何报错。</p>
<p>B 让单位成为类型的一部分：调用处一眼可见，传 <code>seconds</code> 会被自动换算，传一个裸整数则编译失败。信息从\"要去找\"变成了\"写在脸上、编译器帮你查\"。代价是多写几个字符，换来的是一类 bug 不再可能出现。</p>`,
},
{
  id: "ch02-write-01", ch: 2, type: "write", title: "给一段代码做\"复杂性诊断\"",
  prompt: `<p>下面是一个连接池的几个片段（分布在三个文件里）。请找出至少三处复杂性问题，对每一处写明：<strong>哪种症状</strong>（变更放大 / 认知负担 / 未知的未知）、<strong>哪种成因</strong>（依赖 / 模糊），以及一句话的改法。</p>`,
  code: `// pool.h
extern int g_max;                 // 最大连接数
Conn* acquire();                  // 用完记得 release，否则池会耗尽

// pool.cpp
int g_max = 64;
static Conn* slots[64];           // 和 g_max 一致
Conn* acquire() { /* 在 slots 里找空位，找不到返回 nullptr */ }

// monitor.cpp
void report() {
    printf("usage: %d/%d\\n", inUse(), 64);
    if (inUse() > 64 * 0.9) alert("pool almost full");
}`,
  reference: `<ol>
<li><strong>数字 64 出现在四个地方</strong>（<code>g_max</code>、数组长度、监控里的两处）。症状：变更放大；而 monitor.cpp 里的两个 64 与 <code>g_max</code> 的关系没有任何标记，改了 <code>g_max</code> 的人很可能不知道它们存在：未知的未知。成因：依赖 + 模糊。改法：数组大小和监控都从同一个具名常量（或 <code>pool.capacity()</code>）取值。</li>
<li><strong>改 <code>g_max</code> 而不改数组会越界</strong>：\"和 g_max 一致\"这条约束只写在注释里，编译器不检查。症状：未知的未知（运行时才炸）。成因：依赖 + 模糊。改法：<code>constexpr int kMaxConns = 64; static Conn* slots[kMaxConns];</code>，或用 <code>std::vector</code> 按 <code>g_max</code> 分配。</li>
<li><strong><code>acquire</code> 要求调用者记得 <code>release</code></strong>。症状：认知负担（忘了就泄漏，池会耗尽）。成因：依赖（调用者和池之间的协议）。改法：返回一个 RAII 句柄，析构时自动归还。</li>
<li>（加分）<code>g_max</code> 是全局可写变量，任何地方都可能改它，读代码的人很难确定它在运行时的值：认知负担。名字 <code>g_max</code> 也太泛（最大什么？）：模糊。</li>
</ol>`,
  rubric: [
    "找出了 64 散落多处的问题，并区分出\"有标注的\"和\"没人知道的\"两种情况",
    "指出注释里的\"和 g_max 一致\"是编译器查不到的隐式依赖",
    "指出 acquire/release 带来的认知负担，并给出 RAII 之类的改法",
    "每处都同时写了症状和成因，而不只是\"不好\"",
  ],
  explain: `<p>注意一处问题常常同时对应多种症状：变更放大和未知的未知的区别在于<strong>你能不能知道要改哪里</strong>。练习的目的不是背分类，而是让\"这段代码让我不舒服\"变成能说清楚、能讨论的诊断。</p>`,
},
{
  id: "ch02-write-02", ch: 2, type: "write", title: "估算你自己的系统",
  prompt: `<p>挑一个你熟悉的系统（工作项目、开源项目或课程作业），列出 4～6 个主要部分。对每一部分估计两个数：复杂度 <em>c</em>（1～10）和过去三个月里开发时间落在它上面的比例 <em>t</em>。算出 <em>c × t</em>，然后回答：</p>
<ol><li>贡献最大的是哪一部分？它是你心目中\"最复杂\"的那一部分吗？</li><li>有没有哪部分很复杂、但几乎没人碰？它为什么能做到没人碰？</li><li>如果只能改进一处，你会选哪里？</li></ol>`,
  reference: `<p>一个示例（某内部订单系统）：</p>
<div class="table-wrap"><table>
<tr><th>部分</th><th>c</th><th>t</th><th>c × t</th></tr>
<tr><td>促销规则引擎</td><td>8</td><td>35%</td><td>2.80</td></tr>
<tr><td>订单状态机</td><td>6</td><td>25%</td><td>1.50</td></tr>
<tr><td>报表导出</td><td>4</td><td>20%</td><td>0.80</td></tr>
<tr><td>支付网关适配</td><td>9</td><td>5%</td><td>0.45</td></tr>
<tr><td>数据库访问层</td><td>7</td><td>15%</td><td>1.05</td></tr>
</table></div>
<p>结论：支付网关适配\"最吓人\"，但它藏在一个接口稳定的模块后面，很少有人需要打开它，贡献反而最小。促销规则引擎又复杂又天天改，是最值得投入的地方。数据库访问层的 <em>t</em> 偏高，说明它的接口可能没把细节藏住，业务代码经常要钻进去看实现。</p>`,
  rubric: [
    "列出了具体的部分，并给出了 c 和 t 的估计",
    "算出了 c × t，并指出贡献最大的部分",
    "讨论了\"复杂但很少碰\"的部分，以及它为什么能少被碰到（接口？稳定性？）",
    "意识到 t 不是天生的：接口设计不好的模块会迫使人更频繁地打开它",
  ],
  explain: `<p>这个练习的要点是两个反直觉的地方：最复杂的部分不一定最值得改；而\"很少被碰到\"往往不是运气，而是好设计的结果。第 4 章的深模块，本质上就是让复杂部分的 <em>t</em> 变小。</p>`,
},
{ id: "ch02-card-01", ch: 2, type: "card",
  front: "复杂性的<b>三种症状</b>是什么？哪一种最糟，为什么？",
  back: "<p>① <b>变更放大</b>：看似简单的改动要改很多地方。② <b>认知负担</b>：完成任务需要知道的东西太多。③ <b>未知的未知</b>：不知道该改哪些代码、需要哪些信息。第三种最糟：你甚至不知道有问题，只能等改完出 bug 才发现；前两种只要清楚该改什么、该读什么，改动仍然可以是正确的。</p>" },
{ id: "ch02-card-02", ch: 2, type: "card",
  front: "复杂性的<b>两个成因</b>是什么？它们分别导致哪些症状？",
  back: "<p><b>依赖</b>：一段代码无法被孤立地理解和修改。导致变更放大和认知负担。<br><b>模糊</b>：重要的信息不明显（名字太泛、单位没写、用法不一致、依赖看不见）。导致未知的未知，也加重认知负担。<br>依赖无法完全消除，目标是更少、更明显。</p>" },
{ id: "ch02-card-03", ch: 2, type: "card",
  front: "2.1 节怎样<b>粗略地刻画</b>系统的整体复杂度？它推出了什么结论？",
  back: "<p><i>C</i> = Σ<sub>p</sub> <i>c<sub>p</sub></i> · <i>t<sub>p</sub></i>：每个部分的复杂度，按开发者花在该部分上的时间比例加权求和。结论：复杂度由最常见的活动决定；把复杂性隔离在几乎没人会看到的地方，几乎和消除它一样好。</p>" },
);
