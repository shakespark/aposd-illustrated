// 第 12 章 为什么写注释：四个借口 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch12-flag-01", ch: 12, type: "flag", title: "用方法名代替注释",
  prompt: "<p>团队规范是\"注释是失败，能用方法名表达的就不写注释\"。一个调度器的抢占判断被写成了这样：</p>",
  code: `bool Scheduler::shouldPreempt(const Task& running, const Task& incoming) {
    return isHigherPriorityAndNotStarvingAndSliceUsedUp(running, incoming);
}
bool Scheduler::isHigherPriorityAndNotStarvingAndSliceUsedUp(
        const Task& running, const Task& incoming) {
    return incomingHasHigherPriority(running, incoming)
        && !runningIsStarving(running) && sliceUsedUp(running);
}
bool Scheduler::incomingHasHigherPriority(const Task& r, const Task& i) { return i.prio > r.prio; }
bool Scheduler::runningIsStarving(const Task& r) { return r.waitedMs > 500; }
bool Scheduler::sliceUsedUp(const Task& r) { return r.ranMs >= kMinSliceMs; }`,
  choices: ["shallow", "passthrough", "repetition", "none"], answer: ["shallow", "passthrough"], mark: [1, 2, 3, 9, 10, 11],
  explain: `<p>为了不写注释，一个判断被拆成了 5 个方法。后三个各只有一行，接口（名字 + 参数）和实现一样长，是<strong>浅方法</strong>；<code>shouldPreempt</code> 只是把参数原样交给一个签名相同的方法，是<strong>透传方法</strong>（第 7 章）。</p>
<p>更要紧的是，最需要说明的东西反而没地方写：为什么"正在运行的任务等待过久"时不抢占？500 毫秒这个阈值从哪来？最短时间片保护的是什么？长长的方法名只是把条件念了一遍，不能解释原因。书中 12.1 节指出，指望读者"读代码就行"会逼着人把方法切得越来越小，产生大量浅方法；12.6 节则专门批评了用长方法名代替注释的做法。</p>
<p>更好的写法：一个 <code>shouldPreempt</code>，前面一段接口注释说明抢占策略和每个条件的理由，函数体里直接写三个条件。</p>`,
},
{
  id: "ch12-flag-02", ch: 12, type: "flag", title: "注释比代码还长",
  prompt: "<p>有人在评审里说：\"这个函数注释比代码还长，说明代码写得不够清楚。\"</p>",
  code: `// 把 n 向上取整到 align 的整数倍，用于计算 DMA 缓冲区的分配大小。
// align 必须是 2 的幂（设备要求），否则结果没有意义；调用方在
// 读取设备能力时已经检查过。n == 0 时返回 0。
// 结果可能溢出：调用方需保证 n <= SIZE_MAX - align + 1。
inline size_t alignUp(size_t n, size_t align) {
    return (n + align - 1) & ~(align - 1);
}`,
  choices: ["shallow", "passthrough", "none"], answer: ["none"],
  explain: `<p>注释比代码长，不代表代码有问题。这一行位运算背后有三条调用者必须知道的约束：<code>align</code> 必须是 2 的幂、<code>n == 0</code> 的结果、可能溢出的边界。这些<strong>从签名里完全看不出来</strong>，读实现也要停下来算一算才能确认。</p>
<p>它也不是浅函数：调用者只需要知道"向上对齐"，不必理解位运算技巧，接口比实现更好懂。这正是第 12 章的主张：注释提供的是另一种信息，代码表达不了它，所以注释不是"失败"。</p>`,
},
{
  id: "ch12-ab-01", ch: 12, type: "ab", title: "只有声明，够用吗？",
  prompt: "<p>一个事件日志模块对外提供按序号范围读取的函数。两种头文件写法：</p>",
  a: { label: "", code: `std::vector<Event> EventLog::range(uint64_t from, uint64_t to);` },
  b: { label: "", code: `// 返回序号在 [from, to) 内的事件，按序号升序排列。
// from >= to 时返回空数组。范围超出已有事件时，只返回存在的部分；
// 已被压缩删除的旧事件会被跳过，所以返回的序号可能不连续。
// 不会阻塞等待尚未写入的事件。
std::vector<Event> EventLog::range(uint64_t from, uint64_t to);` },
  answer: "b",
  explain: `<p>只看 A 的声明，调用者无法知道：<code>to</code> 包不包括？<code>from &gt; to</code> 会怎样？超出范围时是报错、截断还是阻塞等待？序号会不会有空洞？这些都是正确使用所必需的信息，签名表达不了。</p>
<p>这正是书中 12.1 节的论证：没有注释，一个方法唯一的"抽象"就是它的声明，而声明缺了太多关键信息；如果使用者只能去读实现，那就根本没有抽象。</p>`,
},
{
  id: "ch12-ab-02", ch: 12, type: "ab", title: "长方法名还是一句注释？",
  prompt: "<p>缓存淘汰时跳过某些条目。两种写法：</p>",
  a: { label: "", code: `// 被钉住的条目正被某个读请求使用，不能淘汰；刚访问过的条目
// 给一个宽限期，避免在扫描型负载下把热点数据挤出去。
if (e.pinned || now - e.lastAccess < kGracePeriod) continue;` },
  b: { label: "", code: `if (isPinnedOrAccessedWithinGracePeriod(e, now)) continue;

bool Cache::isPinnedOrAccessedWithinGracePeriod(const Entry& e,
                                                TimePoint now) {
    return e.pinned || now - e.lastAccess < kGracePeriod;
}` },
  answer: "a",
  explain: `<p>B 是"用方法名代替注释"：名字很长，却只是把条件念了一遍，最关键的<strong>为什么</strong>（被钉住意味着正在使用；宽限期是为了抵御扫描型负载）一点都没有传达。每个调用处还得把这串长名字再敲一遍。</p>
<p>A 的条件本身已经很好读，注释补上的正好是代码表达不了的原因。书中 12.6 节对 Clean Code 的这种做法提出了同样的批评：这种名字信息量不如一条好注释，还让开发者在每次调用时重复"文档"。</p>
<p>什么时候 B 的方向合理？如果这个判断在好几处都要用，就值得抽成一个函数，但那时应该起一个表达<strong>概念</strong>的短名字（如 <code>isEvictable</code>），并在函数前写注释说明理由。</p>`,
},
{
  id: "ch12-judge-01", ch: 12, type: "judge", title: "注释能减轻哪种复杂性？",
  prompt: "<p>同事说：\"我们把协议字段的含义都写清楚注释了，以后改字段就不用到处改代码了。\"按书中 12.5 节的分析，这句话的问题在哪？</p>",
  options: [
    "没有问题，好注释能同时缓解变更放大、认知负担和未知的未知",
    "问题在于注释会过期，所以写了也没用",
    "注释主要缓解的是认知负担和未知的未知；改一处要动很多地方（变更放大）是设计问题，靠注释解决不了",
    "注释只能减轻认知负担，对未知的未知没有帮助",
  ],
  answer: 2,
  explain: `<p>作者在 12.5 节明确说，好文档帮助的是第 2 章三种症状里的后两种：它把需要的信息交给开发者、让无关信息可以放心忽略（认知负担），也通过说明系统结构让人知道改动涉及哪些代码（未知的未知）。</p>
<p>但如果一个字段的含义散落在很多模块里，改它仍然要改很多地方，这是信息泄漏造成的变更放大，要靠设计（把知识收进一个模块）解决。注释最多能告诉你"还有哪些地方要改"，不能减少要改的地方。</p>`,
},
{
  id: "ch12-judge-02", ch: 12, type: "judge", title: "对付\"注释会过期\"",
  prompt: "<p>关于\"注释会过期、变得误导人\"这个借口，下面哪一项<strong>不是</strong>书中给出的应对思路？</p>",
  options: [
    "尽量少写注释，需要维护的注释少了，过期的也就少了",
    "避免重复的文档：同一件事只在一个地方写",
    "把文档放在它所描述的代码旁边",
    "在代码审查中检查并修正过期的注释",
  ],
  answer: 0,
  explain: `<p>作者在 12.3 节承认注释确实会过期，但认为这在实践中不是大问题：只有代码大改时文档才需要大改，而改代码本身花的时间更多。应对方法是避免重复、让文档贴近代码（第 16 章展开），再加上代码审查。</p>
<p>"少写注释"恰恰是作者反对的方向：它用丢掉抽象的代价换来一点维护上的省事。</p>`,
},
{
  id: "ch12-write-01", ch: 12, type: "write", title: "让调用者不必读实现",
  prompt: `<p>下面是一个清理旧日志段的函数和它的实现。请只为声明写一段注释，让调用者<strong>不用读实现</strong>就能正确使用它。</p>`,
  code: `size_t trimSegments(const std::filesystem::path& dir, uint64_t keepBytes);

size_t trimSegments(const std::filesystem::path& dir, uint64_t keepBytes) {
    auto segs = listSegments(dir);          // 按段号升序；最后一个是正在写的段
    uint64_t total = 0;
    for (auto& s : segs) total += s.size;
    size_t removed = 0;
    for (size_t i = 0; i + 1 < segs.size() && total > keepBytes; ++i) {
        total -= segs[i].size;
        std::filesystem::remove(segs[i].path);   // 失败抛 filesystem_error
        ++removed;
    }
    return removed;
}`,
  reference: `<pre><code>// 从最旧的段开始删除 dir 下的日志段文件，直到剩余总大小不超过
// keepBytes 字节。正在写入的最新一段永远不会被删除，所以结果
// 仍可能超过 keepBytes（例如只剩这一段时）。
// 返回删除的段数；无需删除时返回 0。
// 删除文件失败时抛 std::filesystem::filesystem_error，此时之前
// 已删除的段不会恢复。</code></pre>`,
  rubric: [
    "说清了删除的顺序（从最旧的开始）和停止条件",
    "keepBytes 写了单位，并指出最新一段不删、结果可能仍超过 keepBytes",
    "说明了返回值的含义",
    "说明了出错时的行为（抛什么、已删除的不恢复）",
  ],
  explain: `<p>这段注释里的每一条，调用者都只能通过读实现才能得到：从哪头删、最新段受保护、返回的是段数不是字节数、出错时的部分完成状态。签名只告诉你"给一个目录和一个数，返回一个数"。</p>
<p>这就是书中 12.1 节说的：注释补全了声明缺失的信息，让声明加注释成为一个可用的抽象，同时把实现藏起来。</p>`,
},
{
  id: "ch12-write-02", ch: 12, type: "write", title: "回应\"好代码自己会说话\"",
  prompt: `<p>同事坚持\"好代码是自解释的\"。请以下面这个声明为例，列出<strong>至少四条</strong>调用者需要知道、但无论把代码写得多好都没法从声明里看出来的信息。</p>`,
  code: `// 把一批写操作复制到副本上。
Status replicate(const Batch& batch, int quorum);`,
  reference: `<ul>
<li><strong>返回语义</strong>：返回 OK 意味着什么？至少 quorum 个副本已经持久化，还是只是收到？</li>
<li><strong>参数约束</strong>：quorum 是否包括本节点？取值范围是什么？大于副本数会怎样？</li>
<li><strong>阻塞与超时</strong>：会等多久？凑不够 quorum 时是阻塞、超时还是立即失败？</li>
<li><strong>失败时的状态</strong>：返回错误时，这批写可能已经在部分副本上生效了吗？调用者能不能直接重试（是否幂等）？</li>
<li><strong>顺序与并发</strong>：多个线程同时调用时，批次之间的顺序有保证吗？</li>
<li><strong>设计理由</strong>：为什么 quorum 由调用者传入，而不是固定为多数派？</li>
</ul>`,
  rubric: [
    "指出了返回值的精确含义（成功到底保证了什么）",
    "指出了参数的取值约束",
    "指出了阻塞、超时或失败后的状态这类行为信息",
    "至少有一条是\"为什么\"（设计理由），而不只是\"是什么\"",
  ],
  explain: `<p>书中 12.1 节说，代码里只能正式表达接口的一小部分（签名）；方法做什么的高层描述、结果的含义、设计决定的理由、在什么条件下调用它合适，这些只能写在注释里。好名字能减少对注释的需要，但替代不了它。</p>`,
},
{ id: "ch12-card-01", ch: 12, type: "card",
  front: "不写注释的<b>四个借口</b>是什么？作者分别怎么回应？",
  back: "<p>① \"好代码是自解释的\"：接口的非正式部分、设计理由等信息代码表达不了，注释是抽象的一部分。② \"没时间\"：敲代码通常不到开发时间的 10%，注释最多再加约 10%，很快就能收回成本。③ \"注释会过期\"：避免重复、贴近代码、靠代码审查，维护成本不高。④ \"见过的注释都没用\"：最有道理的一个，但这是可以学会解决的问题。</p>" },
{ id: "ch12-card-02", ch: 12, type: "card",
  front: "为什么说注释是<b>抽象</b>的基础？",
  back: "<p>抽象是保留关键信息、省略可忽略细节的简化视图。没有注释，一个方法唯一的抽象就是声明（名字、参数和返回类型），它缺少太多关键信息（比如区间端点含不含、非法参数怎么处理）。如果使用者必须读实现才能用，就等于没有抽象。注释补全了声明，使\"只看接口就能用\"成为可能。</p>" },
);

// —— 以下题目取材于书中给出的读者讨论组（2026-10）。场景和代码均为本站原创。——
window.APOSD_DRILLS.push(
{
  id: "ch12-judge-03", ch: 12, type: "judge", title: "\"测试就是文档\"",
  prompt: "<p>同事说：\"<code>substr(pos, len)</code> 不用写接口注释。越界怎么处理、<code>len</code> 超出末尾怎么办，测试里都有例子，而且测试不会过时。\"哪种回应最公允？</p>",
  code: `TEST(Substr, ClampsLenToEnd)      { EXPECT_EQ(substr("apple", 3, 10), "le"); }
TEST(Substr, PosAtEndGivesEmpty)  { EXPECT_EQ(substr("apple", 5, 2), ""); }
TEST(Substr, PosPastEndThrows)    { EXPECT_THROW(substr("apple", 6, 1), std::out_of_range); }`,
  options: [
    "同事是对的：这三个测试已经覆盖了全部边界情况，注释只会重复它们，而且注释迟早会和实现脱节，测试不会",
    "同事是错的：测试验证的是实现，不是接口；从测试里读不出任何关于接口的可靠信息，接口只能用注释来描述",
    "应当改用形式化的前置、后置条件来描述接口：它和测试一样精确、不会过时，又比一组测试用例更完整、更好读",
    "测试刻画边界可能比文字更精确，也不会悄悄过时；但使用者得自己从例子里归纳规则。注释写规则，测试列例子",
  ],
  answer: 3,
  explain: `<p>这是对本章"接口的非形式部分只能靠注释"最强的一个反驳。Ousterhout 在读者讨论组里被问到时让了两步：也许有注释以外的方式，但它必须完整、好找、好懂；好的单元测试对接口的刻画可能比注释更精确。坚持的是另一半：测试难读得多，使用者从一段文字里拿到所需信息通常更快；并把形式化规约归为同一类，精确但难用（<a href="https://groups.google.com/g/software-design-book/c/iS2GVCApGoo">2023-12</a>，不在书里）。</p>
<p>上面三个测试能告诉你三个点上的行为，却没有说出规则："<code>pos</code> 等于长度时返回空串，大于长度时抛异常；<code>len</code> 超出末尾时截到末尾。"这句话就是接口注释该写的，而测试保证它不说谎。</p>`,
},
);
