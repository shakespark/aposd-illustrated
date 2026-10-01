// 第 13 章 注释应描述代码里看不出来的东西 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch13-flag-01", ch: 13, type: "flag", title: "一行一注释",
  prompt: "<p>一个会话对象的空闲超时处理。作者很认真，每一行都写了注释。</p>",
  code: `void Session::onIdleTimer() {
    // 获取当前时间
    auto now = Clock::now();
    // 如果距离上次活动超过了 idleLimit_
    if (now - lastActive_ > idleLimit_) {
        // 关闭连接
        conn_.close();
        // 把状态设为 Closed
        state_ = State::Closed;
        return;
    }
    // 以上次活动时刻为基准重新计时，而不是 now：
    // 否则每次定时器提前触发，空闲时间都会被重新从零算起。
    timer_.reset(lastActive_ + idleLimit_);
}`,
  choices: ["comment-repeats", "impl-contaminates", "shallow", "none"], answer: ["comment-repeats"], mark: [2, 4, 6, 8],
  explain: `<p>第 2、4、6、8 行的注释和它下面那行代码处在<strong>同一个细节层次</strong>：不懂这段代码的人，只看代码也能一字不差地写出这些注释。它们不提供任何新信息，反而让真正有用的那条注释被淹没。</p>
<p>第 12～13 行是好注释：它解释了<strong>为什么</strong>用 <code>lastActive_</code> 而不是 <code>now</code>，这一点光看代码猜不出来（很多人会"顺手"改成 <code>now + idleLimit_</code>，从而引入 bug）。书中 13.2 节那段研究论文里的代码也是这样：一整列逐行注释里只有一条有用。</p>
<p>改法：删掉逐行注释；如果这个方法需要说明，就在方法前写一句接口注释（"空闲超过 idleLimit_ 时关闭会话；否则重新安排下一次检查"）。</p>`,
},
{
  id: "ch13-flag-02", ch: 13, type: "flag", title: "注释用的是名字里的词",
  prompt: "<p>一个对象存储上传模块的头文件片段。</p>",
  code: `class UploadSession {
public:
    // 返回请求的规范 bucket 路径。
    static std::string canonicalBucketPath(const Request& req);

    // 把分片加入分片列表。
    void addPart(int partNumber, std::string etag);

private:
    // 分片大小。
    size_t partSize_ = 8 << 20;
    // 最大重试次数。
    int maxRetries_ = 3;
};`,
  choices: ["comment-repeats", "impl-contaminates", "shallow", "none"], answer: ["comment-repeats"], mark: [3, 6, 10, 12],
  explain: `<p>四条注释都只是把名字里的词重新排成一句话（"canonical bucket path" → "规范 bucket 路径"，"part size" → "分片大小"）。只看声明就能写出它们，所以它们没有价值。</p>
<p>真正缺的信息恰恰是读者最想知道的：</p>
<ul>
<li>"规范"是什么意思？去掉多余的斜杠？统一大小写？做 URL 解码？</li>
<li><code>partNumber</code> 从 0 还是从 1 开始？同一个编号加两次会怎样？<code>etag</code> 是什么，从哪来？</li>
<li><code>partSize_</code> 的单位是字节吧？最后一个分片可以更小吗？</li>
<li><code>maxRetries_</code> 是每个分片的重试次数还是整个上传的？包不包括第一次尝试？</li>
</ul>
<p>写注释的第一步：<strong>换一组和名字不同的词</strong>，去解释名字没说出来的东西。</p>`,
},
{
  id: "ch13-flag-03", ch: 13, type: "flag", title: "一个线程安全缓存的 get",
  prompt: "<p>这是公共头文件里给调用者看的接口注释。</p>",
  code: `class ShardedCache {
public:
    // 先用 key 的哈希值对 kShardCount（=16）取模选出分片，
    // 对该分片的 std::shared_mutex 加读锁，在分片内部的
    // std::unordered_map 中查找。命中时需要把节点移到分片 LRU
    // 链表的头部，所以会放开读锁、改加写锁。未命中返回 std::nullopt。
    std::optional<Blob> get(const std::string& key);
};`,
  choices: ["comment-repeats", "impl-contaminates", "leakage", "none"], answer: ["impl-contaminates"], mark: [3, 4, 5, 6],
  explain: `<p>调用者需要的信息只有三条，却埋在一堆实现细节里：未命中返回 <code>std::nullopt</code>；可以从多个线程同时调用；命中会让这一项变成"最近使用"，从而影响淘汰顺序（这是一个副作用，调用者可能关心）。</p>
<p>分片数、<code>shared_mutex</code>、<code>unordered_map</code>、加锁方式都是实现。写进接口注释后，调用者会被迫读这些、还可能开始依赖它们（"反正有 16 个分片，我按分片批量……"），以后想换实现也不敢换。这是书中 13.5 节说的最常见的接口注释错误。</p>
<p>更好的写法：</p>
<pre><code>// 查找 key 对应的值；不存在或已被淘汰时返回 std::nullopt。
// 命中会让这一项变成最近使用的，因此更晚被淘汰。线程安全。</code></pre>
<p>加锁方式这类细节如果值得记录，写到函数体里的实现注释中。</p>`,
},
{
  id: "ch13-flag-04", ch: 13, type: "flag", title: "批量写入器",
  prompt: "<p>一个把日志记录攒批写盘的类。</p>",
  code: `// 内部维护一个 pending_ 向量，add() 只是把记录 push_back 进去。
// 调用者必须在 pending_.size() 达到 64 之前调用 flush()，
// 否则下一次 add() 会触发断言。flush() 先把 pending_ 和一个
// 空向量交换，再逐条 write() 到 fd_。
class BatchWriter {
public:
    void add(Record r);
    void flush();
    size_t pendingCount() const;   // 返回 pending_.size()
};`,
  choices: ["comment-repeats", "impl-contaminates", "shallow", "none"], answer: ["impl-contaminates", "shallow"], mark: [1, 2, 3, 4],
  explain: `<p>接口注释里全是实现：<code>pending_</code>、<code>push_back</code>、交换向量、<code>fd_</code>。但这里的问题比"注释写坏了"更深：你很难把这些内容删掉，因为调用者<strong>确实</strong>需要知道"攒满 64 条之前必须 flush"，而这个约束本来就是实现泄漏出来的。</p>
<p>书中 13.5 节说：如果接口注释不得不描述实现，说明这个类或方法是<strong>浅</strong>的。<code>BatchWriter</code> 把"什么时候该写盘"这个决定推给了每个调用者。更深的设计是让 <code>add()</code> 在攒满时自动写盘，<code>flush()</code> 只用于"我现在就要它落盘"的场景。改完以后，接口注释自然就干净了。写注释时觉得别扭，常常就是设计在报警（第 15 章会展开）。</p>`,
},
{
  id: "ch13-flag-05", ch: 13, type: "flag", title: "三个成员变量",
  prompt: "<p>一个重试策略类的私有成员。注释比变量本身长得多，有人说\"注释太啰嗦\"。</p>",
  code: `class RetryPolicy {
    // 第一次重试前等待的时间；之后每次翻倍，直到 maxDelay_。
    std::chrono::milliseconds baseDelay_{100};

    // 单次等待时间的上限（可以等于它）。
    std::chrono::milliseconds maxDelay_{10'000};

    // 总尝试次数上限，包括第一次正常请求；0 表示不限次数。
    // 例如 3 表示最多 1 次正常请求 + 2 次重试。
    int maxAttempts_ = 3;
};`,
  choices: ["comment-repeats", "impl-contaminates", "shallow", "none"], answer: ["none"],
  explain: `<p>每一条都补充了声明里看不出来的东西：<code>baseDelay_</code> 之后是翻倍增长的；<code>maxDelay_</code> 是含边界的上限；<code>maxAttempts_</code> 包括第一次请求，而且 0 有特殊含义。这些正是书中 13.3 节列出的"精确性"问题：边界含不含、特殊值是什么意思、计数从哪算起。</p>
<p>注意注释没有写单位：<code>std::chrono::milliseconds</code> 已经把单位放进了类型里，这是 C++ 能帮注释减负的地方。注释长不等于啰嗦，判断标准是<strong>有没有重复代码</strong>，而不是字数。</p>`,
},
{
  id: "ch13-flag-06", ch: 13, type: "flag", title: "提到了\"并行\"的接口注释",
  prompt: "<p>一个多副本存储客户端的方法。注释里提到它会向每个副本发请求，这算不算把实现写进了接口？</p>",
  code: `// 从所有副本读取 key，返回最先到达的、版本号不低于 minVersion 的结果。
// 适合对尾延迟敏感的读路径。代价：每次调用会向每个副本各发一个请求，
// 网络流量约为普通 get() 的 N 倍（N 为副本数）。
// 所有副本都失败，或到 deadline 仍未拿到合格结果时，抛 ReadError。
Value hedgedGet(const Key& key, uint64_t minVersion, Deadline deadline);`,
  choices: ["comment-repeats", "impl-contaminates", "shallow", "none"], answer: ["none"],
  explain: `<p>"向每个副本各发一个请求"听起来像实现，但它直接决定了调用者<strong>能不能用、该不该用</strong>这个方法：流量放大 N 倍，换来更低的尾延迟。这是调用者做决策需要的信息，所以属于接口。</p>
<p>书中 13.9 节回答"要不要说明是否并发地向多个服务器发请求"时，给的答案是"可能需要"：如果模块用了特殊手段提升性能，接口文档应该在<strong>高层</strong>上说明，因为使用者可能关心性能。这条注释正是这样做的：没有提线程池、请求格式、取消机制，只说了调用者能感知到的行为和代价。</p>`,
},
{
  id: "ch13-flag-07", ch: 13, type: "flag", title: "设置超时",
  code: `// 设置超时时间
void HttpClient::setTimeout(std::chrono::milliseconds t) {
    // 调用 transport_ 的 setTimeout
    transport_->setTimeout(t);
}`,
  choices: ["comment-repeats", "passthrough", "impl-contaminates", "none"], answer: ["comment-repeats", "passthrough"], mark: [1, 3],
  explain: `<p>两条注释都是把代码翻译成中文，属于"注释重复代码"。真正该说的它都没说：这个超时是连接超时、单次请求超时还是整个调用（含重试）的超时？对已经发出的请求有没有影响？0 是什么意思？</p>
<p>方法本身还是一个<strong>透传方法</strong>（第 7 章）：签名和 <code>transport_->setTimeout</code> 几乎一样，只是原样转交。认真给它写接口注释时你会发现，能写的东西全都在描述 <code>transport_</code> 的行为，这也说明这一层没有贡献新的抽象。</p>`,
},
{
  id: "ch13-ab-01", ch: 13, type: "ab", title: "日志写入器的两个成员",
  prompt: "<p>同一个类的成员注释，两种写法：</p>",
  a: { label: "", code: `// 当前写入位置
uint64_t pos_;
// 文件
FILE* fp_;` },
  b: { label: "", code: `// 下一条记录的写入偏移（字节）。[0, pos_) 内都是完整记录；
// 崩溃后文件末尾可能多出一条不完整的记录，由 recover() 截掉。
uint64_t pos_;
// 当前活跃的段文件，由本对象拥有：rotate() 和析构时关闭。
// 构造成功后永不为 nullptr。
FILE* fp_;` },
  answer: "b",
  explain: `<p>A 的"当前"是最常见的含糊词：当前是指已写入的末尾，还是已经落盘的末尾，还是正在读的位置？"文件"则只是把类型重说了一遍。</p>
<p>B 逐项回答了书中 13.3 节的精确性清单：<strong>单位</strong>（字节）、<strong>边界</strong>（半开区间 <code>[0, pos_)</code>）、<strong>不变量</strong>（区间内都是完整记录）、<strong>资源归属</strong>（谁关闭 <code>fp_</code>）、<strong>空值</strong>（永不为空）。维护者改这个类时，不用翻遍所有用到这两个变量的代码去猜。</p>
<p>本站补充：如果把 <code>FILE*</code> 换成 <code>std::unique_ptr&lt;FILE, Closer&gt;</code>，"由本对象拥有"这一条就由类型表达了，注释可以更短。</p>`,
},
{
  id: "ch13-ab-02", ch: 13, type: "ab", title: "租约标志：描述它是什么，还是描述谁在改它？",
  prompt: "<p>一个主从复制系统里，主节点用一个原子布尔量表示自己是否还持有租约。</p>",
  a: { label: "", code: `// true 表示本节点当前持有主节点租约，可以接受写请求；
// false 时必须拒绝写请求。由租约线程写，请求处理线程读。
std::atomic<bool> leaseHeld_{false};` },
  b: { label: "", code: `// 在 onLeaseRenewed() 里设为 true；
// checkLease() 发现租约过期时设为 false；
// handleWrite() 会先读它，如果是 false 就返回 NotLeader。
std::atomic<bool> leaseHeld_{false};` },
  answer: "a",
  explain: `<p>B 描述的是<strong>动作</strong>：哪几个函数怎么改它、怎么读它。这等于把代码结构抄了一遍，函数改名或者新增一个写入点，注释就过期了；而且读完 B 你还得自己归纳"它到底代表什么"。</p>
<p>A 描述的是<strong>名词</strong>：这个变量代表什么状态。有了这个定义，读者自己就能推出"续约成功时应该设为 true、过期时设为 false、处理写请求前要检查它"。这正是书中 13.3 节"想名词，不要想动词"的意思。A 保留了一条有用的结构信息（哪个线程写、哪个线程读），因为它关系到并发正确性。</p>`,
},
{
  id: "ch13-ab-03", ch: 13, type: "ab", title: "循环前的注释",
  prompt: "<p>连接池定期回收空闲连接的代码。循环体完全相同，只有前面的注释不同：</p>",
  a: { label: "", code: `// 遍历 conns_，如果 c->state == Idle 并且
// now - c->lastUsed > idleTimeout_ 并且 conns_.size() > minIdle_，
// 就 close 并 erase。
for (auto it = conns_.begin(); it != conns_.end();) {
    Conn* c = it->get();
    if (c->state == Idle && now - c->lastUsed > idleTimeout_
        && conns_.size() > minIdle_) {
        c->close();
        it = conns_.erase(it);
    } else {
        ++it;
    }
}` },
  b: { label: "", code: `// 关闭空闲太久的连接，但池里至少保留 minIdle_ 个，
// 免得下一波请求到来时每个都要重新握手。
for (auto it = conns_.begin(); it != conns_.end();) {
    Conn* c = it->get();
    if (c->state == Idle && now - c->lastUsed > idleTimeout_
        && conns_.size() > minIdle_) {
        c->close();
        it = conns_.erase(it);
    } else {
        ++it;
    }
}` },
  answer: "b",
  explain: `<p>A 的注释和代码处在同一层，几乎是把 <code>if</code> 条件念了一遍，读者看代码就够了。</p>
<p>B 站得更高：先说<strong>这段代码要做什么</strong>（回收空闲连接），再说一个光看代码看不出来的<strong>为什么</strong>（保留最小数量是为了避免重新握手）。有了这个框架，读者能自己解释每个条件的作用，还能据此<strong>判断代码对不对</strong>：比如会发现 <code>conns_.size() &gt; minIdle_</code> 放在循环里逐次检查是合理的，因为每次 erase 都会让它变小。书中 13.4 节说，高层注释比低层注释难写，因为你得先想清楚"这段代码最重要的是什么"。</p>`,
},
{
  id: "ch13-ab-04", ch: 13, type: "ab", title: "改文件格式版本号时要做什么？",
  prompt: "<p>一个存储引擎的磁盘格式版本号。升级格式时，编码器、解码器、兼容性测试数据、离线升级工具都要跟着改，它们在四个不同的目录里。两种记录方式：</p>",
  a: { label: "在大家一定会来的地方写清单", code: `// 磁盘格式版本号，写在每个段文件的文件头里。
// 修改格式时必须同时：
//  1. 把这个值加 1；旧值加进 kReadableVersions，除非决定不再兼容；
//  2. 在 codec/encoder.cpp 里按新格式写；
//  3. 在 codec/decoder.cpp 里为新版本加分支，旧分支保留；
//  4. 用旧版本生成一份样例文件放进 tests/compat/data/；
//  5. 更新 tools/upgrade 里的转换逻辑。
constexpr uint32_t kFormatVersion = 7;` },
  b: { label: "在相关文件里互相提醒", code: `// codec/decoder.cpp 文件头：
// 注意：改了这里的解析逻辑，记得同步修改 encoder.cpp。

// tools/upgrade/main.cpp 文件头：
// 注意：格式变化时需要更新这里。

constexpr uint32_t kFormatVersion = 7;   // 格式版本` },
  answer: "a",
  explain: `<p>跨模块的设计决定，最难的不是写说明，而是<strong>把说明放在开发者一定会看到的地方</strong>。任何人要升级格式，第一步必然是去改 <code>kFormatVersion</code>，所以在它旁边放一份完整清单最可靠。</p>
<p>B 的提醒分散在各处、互相不完整：从 decoder 出发的人不知道还有测试数据和升级工具；从版本号出发的人什么提示都看不到。书中 13.7 节用一个状态码枚举说明了同样的做法。</p>
<p>B 在什么时候勉强可以接受？当确实不存在一个"大家必经"的中心位置时。那时更好的做法是写一份集中的设计说明文档（书中叫 designNotes），在每处相关代码里留一行"见设计说明里的某某节"。</p>`,
},
{
  id: "ch13-judge-01", ch: 13, type: "judge", title: "哪个局部变量值得写注释？",
  prompt: "<p>一个大约 60 行的 Raft 风格日志提交方法里有下面几个局部变量。按书中 13.6 节的建议，哪一个最值得加注释？</p>",
  options: [
    "<code>i</code>：遍历 peers 的循环下标，只在 3 行之内使用",
    "<code>n = entries.size()</code>：紧接着的下一行就用掉了",
    "<code>commitCandidate</code>：在方法开头算出，到方法末尾才用来更新 <code>commitIndex_</code>；它表示\"已经被多数节点确认、并且属于当前任期的最大日志下标\"",
    "<code>buf</code>：序列化用的临时缓冲区，两行之后就交给 <code>send()</code>",
  ],
  answer: 2,
  explain: `<p>书中的标准：大多数局部变量起好名字就够了；如果一个变量的所有用法都在几行之内，读者看代码就能明白。但如果变量跨越很长一段代码，含义又不明显，就该写注释，并且描述它<strong>代表什么</strong>，而不是它怎么被修改。</p>
<p><code>commitCandidate</code> 跨越了整个方法，含义里还藏着两个容易漏掉的条件（"多数节点确认"和"属于当前任期"），后者正是 Raft 里一个著名的正确性要点。其他三个都是用完即走的变量。</p>`,
},
{
  id: "ch13-judge-02", ch: 13, type: "judge", title: "审查者说\"看不懂\"",
  prompt: "<p>你提交了下面的代码，审查者留言：\"为什么 stable_partition 之后还要 stable_sort？看不懂。\" 你觉得这很明显。最符合本章建议的做法是？</p>",
  code: `auto mid = std::stable_partition(tasks.begin(), tasks.end(),
                                 [](const Task& t) { return t.urgent; });
std::stable_sort(tasks.begin(), mid, byDeadline);`,
  options: [
    "接受\"不明显\"这个判断：弄清楚对方卡在哪，再用注释（例如说明紧急任务按截止时间排、其余保持提交顺序的原因）或更清楚的代码解决它",
    "回复说明 <code>std::stable_partition</code> 和 <code>std::stable_sort</code> 的语义，请对方读一下 cppreference",
    "在每一行后面加注释，逐行解释这三行代码分别做了什么",
    "保持原样：代码已经正确，注释写多了反而会过期",
  ],
  answer: 0,
  explain: `<p>书中 13.8 节说得很直接："明显"是从<strong>第一次读这段代码的人</strong>的角度判断的，不是从作者的角度。审查者说不明显，那它就是不明显，不要争论。</p>
<p>对方卡住的很可能不是库函数的语义，而是<strong>为什么要这样做</strong>：只给紧急任务排序、其他任务保持原有顺序，背后是什么需求？这正是代码表达不了、注释该补上的东西。逐行注释（第三个选项）只会重复代码，解决不了对方的困惑。</p>`,
},
{
  id: "ch13-judge-03", ch: 13, type: "judge", title: "哪一条属于类的接口注释？",
  prompt: "<p><code>MultipartUploader</code> 把一个大文件分片并发上传到对象存储。下面哪条信息<strong>应该</strong>写进它的类接口注释？</p>",
  options: [
    "每个分片请求里用到的 HTTP 头名称",
    "内部线程池的大小常量 <code>kWorkers = 4</code>",
    "分片失败时重试的退避算法是\"指数退避加随机抖动\"",
    "上传中途失败时，已经上传的分片会留在存储端继续计费，调用者需要调用 <code>abort()</code> 清理",
  ],
  answer: 3,
  explain: `<p>判断标准只有一个：<strong>使用者不知道这条信息，会不会用错？</strong></p>
<ul>
<li>HTTP 头名称：协议细节，应该藏在类里。</li>
<li>线程池大小：私有配置，只有维护者关心（如果真的影响使用，应该在高层说明"会并发上传"，而不是给出常量名）。</li>
<li>退避算法：调用者感知不到具体算法，重试本身对它是透明的。</li>
<li>残留分片：这是调用者<strong>看得见</strong>的后果（会产生费用），而且需要调用者采取行动，所以必须写。</li>
</ul>
<p>书中 13.5 节用一个分布式索引查询类做了同样的练习，答案在 13.9 节。注意其中"服务器崩溃"那一题的思路：如果故障对使用者不可见就不提；如果可见，只描述它<strong>表现为什么</strong>，不描述恢复机制。</p>`,
},
{
  id: "ch13-write-01", ch: 13, type: "write", title: "为 append 写接口注释",
  prompt: `<p>下面是一个追加写日志的 <code>append</code> 方法及其实现。请为它写一段<strong>接口注释</strong>（放在头文件的声明前，Doxygen 风格或纯文字都行），让调用者不用读实现就能正确使用它。</p>`,
  code: `class SegmentLog {
public:
    // ???
    uint64_t append(std::string_view payload, bool sync);
};

uint64_t SegmentLog::append(std::string_view payload, bool sync) {
    if (closed_) throw std::logic_error("append after close");
    if (payload.size() > kMaxRecord) throw RecordTooLarge(payload.size());  // kMaxRecord = 1 MiB
    if (activeBytes_ + kHeader + payload.size() > kSegmentBytes)
        rollSegment();                    // 关闭当前段，在目录里新建下一个段文件
    uint64_t lsn = nextLsn_++;
    writeHeader(lsn, crc32(payload), payload.size());
    writeAll(fd_, payload);               // 失败抛 IoError
    activeBytes_ += kHeader + payload.size();
    if (sync) fsyncOrThrow(fd_);          // 失败抛 IoError
    return lsn;
}`,
  reference: `<pre><code>/**
 * 在日志末尾追加一条记录，返回它的序号（LSN）。
 *
 * @param payload  记录内容，可以为空，长度不超过 1 MiB。
 * @param sync     true：返回前这条记录已经落盘，进程或机器崩溃都不会丢；
 *                 false：返回时记录可能还在操作系统缓存里，机器崩溃时可能丢失。
 *                 之后 sync 为 true 的调用只保证它自己那一条，
 *                 不保证把更早的未同步记录一起刷下去。
 * @return  这条记录的 LSN。同一个日志里 LSN 严格递增、不会重复，
 *          可以交给 read() 读回这条记录。
 *
 * 副作用：当前段文件写满时，会关闭它并在日志目录里新建一个段文件。
 *
 * @throws RecordTooLarge  payload 超过 1 MiB；日志不受影响，可以继续追加。
 * @throws IoError         写盘或 fsync 失败。这条记录可能只写了一部分，
 *                         也可能完整写入但没有落盘。抛出之后这个对象
 *                         不能再 append：调用者应 close() 并重新打开日志，
 *                         恢复流程会丢弃不完整的记录。
 * 前置条件：没有调用过 close()（否则抛 std::logic_error），
 *           也没有抛出过 IoError。
 */</code></pre>
<p>没有写进去的：<code>kHeader</code> 的大小、CRC 算法、<code>activeBytes_</code> 怎么累加、段文件的具体大小。这些是实现。</p>
<p>为什么 IoError 之后不能继续追加？看实现：<code>nextLsn_</code> 已经加过 1，<code>activeBytes_</code> 却没更新，文件里可能停着半条记录，下一条会接在它后面写。这种"失败后对象处于什么状态"的信息调用者无从猜测，必须写进接口注释（本站补充：更稳妥的设计是让对象在 IoError 后自己进入失败状态，之后的 append 直接抛错）。</p>`,
  rubric: [
    "开头一两句话说清调用者感知到的行为（追加一条记录、返回序号）",
    "每个参数都说得精确：payload 的长度上限和能否为空；sync 两种取值分别意味着什么（持久性保证）",
    "返回值的含义和性质（递增、唯一、能拿来做什么）",
    "写出了副作用（可能新建段文件）、两种异常各自在什么情况下抛出，以及抛出 IoError 之后日志的状态（这条记录的下落、还能不能继续 append）",
    "写出了前置条件（未 close），并且没有写 CRC、头部格式、内部计数器之类的实现细节",
  ],
  explain: `<p>对照书中 13.5 节的方法接口注释清单：一两句话的整体行为；每个参数和返回值都要精确（约束、参数之间的依赖）；副作用；异常；前置条件。你会发现 <code>sync</code> 那一条最难写也最重要：它定义了这个方法的持久性语义，而签名里只有一个 <code>bool</code>。</p>
<p>本站补充：<code>bool sync</code> 本身就是一个信息量很低的签名（调用处只能看到 <code>append(p, true)</code>），换成 <code>enum class Durability { Buffered, Synced }</code> 会让调用处也一目了然，第 14 章讲命名时会再遇到这类问题。</p>`,
},
{
  id: "ch13-write-02", ch: 13, type: "write", title: "把含糊的成员注释写精确",
  prompt: `<p>一个分段下载器的成员变量。请按"精确性清单"（单位、边界含不含、空值的含义、资源由谁释放、不变量）重写每条注释。必要时可以顺便改类型。</p>`,
  code: `class RangeDownloader {
    // 超时
    int timeout_;
    // 缓冲区
    char* buf_;
    // 范围
    uint64_t begin_, end_;
    // 回调
    std::function<void(Status)> onDone_;
};`,
  reference: `<pre><code>class RangeDownloader {
    // 单次 HTTP 请求的超时（不含重试），毫秒；0 表示不设超时。
    int timeout_;                     // 或者直接用 std::chrono::milliseconds
    // 接收数据的缓冲区，长度 kBufSize，由本对象分配和释放。
    char* buf_;                       // 或者 std::unique_ptr&lt;char[]&gt;
    // 要下载的字节范围 [begin_, end_)，左闭右开；
    // end_ == 0 表示一直下载到文件末尾。始终有 end_ == 0 或 begin_ &lt; end_。
    uint64_t begin_, end_;
    // 下载结束（成功、失败或被取消）时调用，且只调用一次，
    // 在下载线程上执行；可以为空，表示调用者不关心结果。
    std::function&lt;void(Status)&gt; onDone_;
};</code></pre>`,
  rubric: [
    "timeout_ 写了单位，以及作用范围（单次请求还是整个下载）或 0 的含义",
    "buf_ 写清了长度和由谁释放（或改成 unique_ptr 让类型表达归属）",
    "begin_/end_ 写清了边界含不含，以及 begin_ 与 end_ 之间的不变量或特殊值",
    "onDone_ 写清了何时调用、调用几次、在哪个线程，以及为空时的含义",
  ],
  explain: `<p>原来的四条注释都只是把类型或名字重说了一遍。书中 13.3 节指出，变量注释最常见的问题就是<strong>太含糊</strong>。这里的每个答案都本可以通过翻遍所有使用这些变量的代码推出来，但那样费时又容易出错；声明处的注释应该让这种翻找变得不必要。</p>
<p>本站补充：C++ 的类型能承担一部分精确性：<code>std::chrono</code> 表达单位，<code>std::unique_ptr</code> 表达归属，<code>std::optional</code> 表达"可能没有"。能放进类型的就放进类型，剩下的（区间边界、不变量、回调的线程与次数）仍然只能靠注释。</p>`,
},
{
  id: "ch13-write-03", ch: 13, type: "write", title: "把\"怎么做\"改成\"做什么、为什么\"",
  prompt: `<p>下面这段代码维护一组按时间排序的指标采样。它前面的注释只是把代码念了一遍。请重写这条注释，说清这段代码<strong>要做什么</strong>和<strong>为什么</strong>要这样做。</p>`,
  code: `// 用 std::lower_bound 在 samples_ 里二分查找第一个时间 >= cutoff 的位置 it，
// 如果 it 不是 begin() 就往前退一个，然后把 [begin(), it) 全部 erase。
auto it = std::lower_bound(samples_.begin(), samples_.end(), cutoff, byTime);
if (it != samples_.begin()) --it;
samples_.erase(samples_.begin(), it);`,
  reference: `<pre><code>// 丢掉 cutoff 之前的旧采样，但保留紧挨在 cutoff 之前的那一个：
// 计算 cutoff 时刻的值需要用它和下一个采样做插值。</code></pre>
<p>第一句是"做什么"（高一层的描述），第二句是"为什么"：解释了那行最让人困惑的 <code>--it</code>。有了这两句，读者自己就能看懂 <code>lower_bound</code> 和 <code>erase</code> 是怎么实现这个意图的。</p>`,
  rubric: [
    "没有复述 lower_bound / erase 的具体步骤",
    "用一句话说清了整体意图（清理旧采样）",
    "解释了为什么要多保留一个（插值或其他合理的原因）",
  ],
  explain: `<p>书中 13.6 节：实现注释的主要目标是帮读者理解代码<strong>在做什么</strong>，而不是<strong>怎么做</strong>；知道了要做什么，看懂怎么做通常就不难了。另一个重要用途是解释<strong>为什么</strong>，尤其是那些看起来多余、删掉却会出 bug 的代码（这里的 <code>--it</code>）。</p>`,
},
{
  id: "ch13-write-04", ch: 13, type: "write", title: "重写一个被污染的类注释",
  prompt: `<p>下面是一个限流器的类注释。请重写它：只保留使用者需要知道的东西，补上缺失的重要信息。如果某条信息更适合放在构造函数或方法的注释里，就挪过去。</p>`,
  code: `// RateLimiter 类。内部用令牌桶算法实现：tokens_ 是 double，
// 每次调用 tryAcquire() 时，根据 lastRefill_ 与 steady_clock::now()
// 的差值乘以 ratePerSec_ 补充令牌，但不超过 burst_。用 std::mutex 保护。
// 构造时 burst 超过 kMaxBurst（10000，定义在 config.h 里）会被截成 kMaxBurst。
// 使用时需要 #include "rate_limiter.h"。
class RateLimiter {
public:
    RateLimiter(double ratePerSec, uint32_t burst);
    // 尝试取得 n 个配额；成功返回 true。
    bool tryAcquire(uint32_t n = 1);
};`,
  reference: `<pre><code>// 限制某类操作的速率：长期平均不超过每秒 ratePerSec 次，
// 但允许在一段空闲之后一次性放行最多 burst 次（应对短时突发）。
// 每个实例是一份独立的额度，例如"某个租户的写请求"。
//
// tryAcquire() 从不阻塞：额度不够时立即返回 false，由调用者决定
// 丢弃请求还是稍后再试。可以从多个线程同时调用。
//
// 限制：额度只在本进程内有效；多进程部署时每个进程各算各的，
// 整体速率是单进程的 N 倍。
class RateLimiter {
public:
    // burst：一次最多能放行的次数，取值上限 10000（config.h 中的
    // kMaxBurst），传入更大的值按 10000 处理。
    RateLimiter(double ratePerSec, uint32_t burst);
    // 尝试取得 n 个配额，成功返回 true；从不阻塞。n 大于 burst
    // （按上限截断后的值）时永远返回 false。
    bool tryAcquire(uint32_t n = 1);
};</code></pre>
<p><code>kMaxBurst</code> 不能跟着实现细节一起删：它限制了构造参数 <code>burst</code> 的取值，调用者传 50000 却只得到 10000，不写出来就是埋雷。它属于参数约束（书中 13.5 节要求方法注释写明参数取值的约束），应该挪到构造函数的注释里，而不是留在类注释里和令牌桶的细节混在一起。</p>`,
  rubric: [
    "删掉了 tokens_、lastRefill_、mutex 等实现细节和\"要 include 头文件\"这种显而易见的话",
    "kMaxBurst 没有简单删掉，而是作为 burst 参数的取值约束（上限及超出时的处理）写进了构造函数的注释",
    "说清了这个类提供的整体能力（平均速率 + 突发）以及一个实例代表什么",
    "写出了调用者关心的行为：不阻塞、线程安全",
    "写出了至少一条使用限制（如只在单进程内有效）",
  ],
  explain: `<p>书中 13.5 节给类接口注释的要求是：说明类提供的整体能力、每个实例代表什么、以及类的局限。原注释的问题和书中那个分布式索引查询类的初稿一样：大半篇幅在讲实现，还告诉 C++ 程序员要 include 头文件，唯一一条调用者真正需要的约束（burst 的上限）却以常量名的形式混在实现细节里；同时真正重要的东西（会不会阻塞、能否多线程用、多进程下的语义）一句都没有。</p>
<p>"令牌桶"这个词能不能出现？如果使用者需要靠它来理解突发行为，提一句无妨；但不能让它取代对行为本身的描述。</p>`,
},
{
  id: "ch13-write-05", ch: 13, type: "write", title: "一个跨模块的约定该写在哪？",
  prompt: `<p>客户端和服务端分别在两个目录里实现了同一种帧格式：4 字节长度（大端，计入类型字节和负载）、1 字节类型、负载；整帧不超过 16 MiB。现在这些规则只存在于两边的代码里。</p><p>请决定：这份说明应该放在哪里？写出说明本身，以及你会在两边代码里留下的指引注释。</p>`,
  code: `// client/codec.cpp
void encodeFrame(Buffer& out, uint8_t type, std::span<const std::byte> payload) {
    putU32BE(out, static_cast<uint32_t>(1 + payload.size()));
    out.push_back(type);
    out.append(payload);
}

// server/frame_reader.cpp
std::optional<Frame> FrameReader::next() {
    if (buf_.size() < 4) return std::nullopt;
    uint32_t len = getU32BE(buf_.data());
    if (len == 0 || len > (16u << 20) - 4) throw ProtocolError("bad length");
    ...
}`,
  reference: `<p><strong>首选：给它一个两边都要用的中心位置。</strong>新建 <code>common/frame.h</code>，把常量和格式说明放在这里，两边都 include 它：</p>
<pre><code>// 线上帧格式（客户端与服务端共用，修改时两边同时生效）：
//   [len: u32 大端][type: u8][payload: len - 1 字节]
// len 计入 type 和 payload，不计入它自己的 4 字节，因此 len &gt;= 1。
// 整帧（含 len 字段）不超过 kMaxFrameBytes。
// 新增 type 时：在 FrameType 里加枚举值，并在 server/dispatch.cpp 注册处理函数。
constexpr uint32_t kMaxFrameBytes = 16u &lt;&lt; 20;
enum class FrameType : uint8_t { ... };</code></pre>
<p>两边代码里的指引：<code>// 帧格式见 common/frame.h</code>。</p>
<p><strong>如果没法共用头文件</strong>（例如两边是不同语言、不同仓库），就写进一份集中的设计说明文档的"帧格式"一节，两边各留一行"见设计说明《帧格式》"。</p>`,
  rubric: [
    "说明只有一份，放在两边开发者都会经过的地方（共享头文件或集中的设计说明）",
    "说清了 len 计入哪些字节、字节序、上限这些容易两边理解不一致的细节",
    "在两边代码里都留了指向说明的注释",
    "（加分）意识到把常量和格式收进共享头文件，也顺带减少了第 5 章说的信息泄漏",
  ],
  explain: `<p>书中 13.7 节：跨模块的设计决定往往复杂、微妙，是很多 bug 的来源；写这类文档最大的挑战是<strong>找一个开发者自然会看到的地方</strong>。有天然中心位置时就放那里；没有时，作者在尝试用一个集中的 designNotes 文件，按主题分节，代码里只留一行指引。它的代价是文档离代码远，更难保持同步。</p>
<p>这道题里还有一个更好的选项：协议格式本来就是被两边共享的知识（第 5 章的信息泄漏），把它收进一个共享头文件，既减少了泄漏，也自然得到了文档的中心位置。</p>`,
},
{ id: "ch13-card-01", ch: 13, type: "card",
  front: "给变量写注释时，要检查哪几项<b>精确性</b>问题？",
  back: "<p>① 单位是什么？② 边界含还是不含？③ 允许空值时，空值代表什么？④ 如果它引用了需要释放或关闭的资源，谁负责？⑤ 有没有始终成立的性质（不变量）？另外：想<b>名词</b>（它代表什么），不要想<b>动词</b>（它在哪被怎么改）。</p>" },
{ id: "ch13-card-02", ch: 13, type: "card",
  front: "一个<b>方法的接口注释</b>应该包含什么？",
  back: "<p>① 开头一两句：调用者感知到的行为（高层抽象）；② 每个参数和返回值，要精确，包括取值约束和参数之间的依赖；③ 副作用（影响系统之后行为、但不在返回值里的后果）；④ 可能抛出的异常；⑤ 前置条件（尽量少，但留下的必须写）。不写：实现方式。</p>" },
{ id: "ch13-card-03", ch: 13, type: "card",
  front: "怎么判断一条注释是在<b>重复代码</b>？好注释和代码是什么关系？",
  back: "<p>检验问题：一个从没见过这段代码的人，只看注释旁边的代码，能不能写出这条注释？能，就是重复。好注释和代码处在<b>不同的细节层次</b>：低一层的注释补充<b>精确性</b>（单位、边界、含义），高一层的注释提供<b>直觉</b>（意图、为什么、整体框架）。和代码同一层的注释多半是在重复。</p>" },
);
