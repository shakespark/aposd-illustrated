// 第 18 章 代码应该一目了然 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch18-flag-01", ch: 18, type: "flag", title: "一行看不懂的调用",
  prompt: "<p>评审时你在 diff 里看到下面几行（声明在别的文件里，diff 里没有）。</p>",
  code: `void Cache::evict(const Key& k, bool force, bool notify);
void Store::flush(bool sync, bool compact);

// ---- diff 中的新代码 ----
void Server::onShutdown() {
    cache_.evict(sessionKey_, true, false);
    store_.flush(true, false);
}`,
  choices: ["nonobvious", "vague-name", "shallow", "none"], answer: ["nonobvious"], mark: [6, 7],
  explain: `<p>第 6、7 行在调用处不带任何含义：<code>true, false</code> 分别是什么，读者只能跳到声明去查；两个 <code>bool</code> 写反了，编译器也不会发现。这就是"代码不明显"：快速读一遍弄不懂行为。</p>
<p>改法：用枚举（<code>Durability::Fsync</code>）、具名选项结构体（C++20 的指定初始化 <code>{.force = true}</code>），或者干脆拆成两个名字不同的函数。<code>flush</code> 的第二个参数尤其可疑：压缩是一件独立的事，应该是 <code>compact()</code>。</p>`,
},
{
  id: "ch18-flag-02", ch: 18, type: "flag", title: "解析一个 Range 头",
  prompt: "<p>HTTP 服务里解析 <code>Range: bytes=…</code> 请求头的函数，以及它的一个调用者。</p>",
  code: `// 解析 Range 头。失败返回 std::nullopt。
std::optional<std::pair<uint64_t, uint64_t>>
parseRange(std::string_view header, uint64_t fileSize);

// 调用者：
auto r = parseRange(req.header("Range"), file.size());
if (!r) return reply(416);
sendFile(file, r->first, r->second - r->first);`,
  choices: ["nonobvious", "leakage", "overexposure", "none"], answer: ["nonobvious"], mark: [2, 8],
  explain: `<p><code>pair</code> 的两个元素是 (起点, 终点) 还是 (起点, 长度)？终点是含还是不含？HTTP 的 <code>bytes=0-499</code> 是闭区间，第 8 行却按半开区间算长度，很可能差了一个字节。读者从 <code>first</code>、<code>second</code> 里得不到任何线索，只能去读实现。</p>
<p>作者在 18.2 节的建议：不要用通用容器，定义一个专门的结构体，例如 <code>struct ByteRange { uint64_t offset; uint64_t length; };</code>，并在声明处写清单位和边界。写的人多花两分钟，每个读者都省事。</p>`,
},
{
  id: "ch18-flag-03", ch: 18, type: "flag", title: "谁会调用 onPaid？",
  prompt: "<p>订单服务的一部分。<code>start()</code> 在文件开头，<code>onPaid</code> 在三百行之后。</p>",
  code: `void OrderService::start() {
    bus_.subscribe("payment.succeeded", [this](const Event& e) { onPaid(e); });
    bus_.subscribe("payment.refunded",  [this](const Event& e) { onRefund(e); });
}

// …… 三百行之后 ……

void OrderService::onPaid(const Event& e) {
    auto& order = orders_.at(e.orderId());
    order.status = Status::Paid;
    order.paidAt = e.time();
    inventory_.reserve(order.items());
}`,
  choices: ["nonobvious", "temporal", "passthrough", "none"], answer: ["nonobvious"], mark: [8],
  explain: `<p>读到 <code>onPaid</code> 时，读者最关心的问题都没有答案：它在哪个线程被调用？会和 <code>onRefund</code> 并发吗（第 9～12 行没加锁）？同一笔支付会不会投递两次（那样库存会被预留两次）？事件会不会比"创建订单"先到（那样 <code>at()</code> 会抛异常）？</p>
<p>事件驱动让控制流难以追踪，这是 18.2 节的第一个例子。作者没有说别用它，而是要求用处理函数的<strong>接口注释</strong>写明它何时、由谁调用。这里至少要写：由 bus 的哪个线程调用、是否可能重复投递、是否保证顺序。</p>`,
},
{
  id: "ch18-flag-04", ch: 18, type: "flag", title: "一个临时目录",
  prompt: "<p>一个命令行打包工具的主流程。</p>",
  code: `int main(int argc, char** argv) {
    Options opt = parseArgs(argc, argv);
    TempDir work("pack-");            // 创建临时目录，析构时删除

    extractSources(opt.input, "src");
    runBuild("src", "out");
    writeArchive("out", opt.output);
    return 0;
}

// tempdir.cc
TempDir::TempDir(std::string_view prefix) {
    path_ = makeUniqueDir(prefix);
    prevCwd_ = std::filesystem::current_path();
    std::filesystem::current_path(path_);   // 切换进程工作目录
}`,
  choices: ["nonobvious", "leakage", "shallow", "none"], answer: ["nonobvious"], mark: [3, 15],
  explain: `<p>只读 <code>main</code>，没人会想到第 5～7 行的相对路径都是相对于临时目录的；更隐蔽的是 <code>opt.output</code> 如果是相对路径，压缩包会被写进临时目录，然后随析构一起被删掉。原因藏在第 15 行：构造函数改变了<strong>整个进程</strong>的工作目录。</p>
<p>这是 18.2 节说的"违反读者预期的代码"：读者预期构造函数只初始化对象本身。改法：不要在构造函数里切目录，让调用处显式地用 <code>work.path() / "src"</code> 拼路径；如果确实要切，至少在 <code>TempDir</code> 的接口注释和 <code>main</code> 里写明。</p>`,
},
{
  id: "ch18-flag-05", ch: 18, type: "flag", title: "一行无分支代码",
  prompt: "<p>一个页缓存里更新脏标记的代码。作者说这样写\"没有分支，更快\"。</p>",
  code: `void Page::setDirty(bool dirty) {
    flags_ ^= (-static_cast<uint32_t>(dirty) ^ flags_) & kDirtyBit;
}`,
  choices: ["nonobvious", "comment-repeats", "shallow", "none"], answer: ["nonobvious"], mark: [2],
  explain: `<p>这是一个"按条件置位或清位"的位运算技巧。熟悉它的人能认出来，大多数读者要在纸上推一遍才能确认它是对的。书中的红旗定义是：快速读一遍弄不懂含义和行为。</p>
<p>更重要的是：这个"更快"几乎肯定没被测量过，编译器对 <code>if (dirty) flags_ |= kDirtyBit; else flags_ &amp;= ~kDirtyBit;</code> 往往也会生成无分支代码。先写明显的版本；如果测量证明这里是瓶颈、必须用技巧，就加一行注释说明它在做什么（第 20 章会讲怎样判断性能值不值得这样的代价）。</p>`,
},
{
  id: "ch18-flag-06", ch: 18, type: "flag", title: "一个回调，带着注释",
  prompt: "<p>复制模块里处理从节点确认消息的函数。注册它的代码在 <code>start()</code> 里，相隔很远。</p>",
  code: `// 处理从节点发来的复制确认。
// 由 RPC 层在网络线程里调用，同一个从节点的确认按发送顺序到达，
// 但可能重复（从节点超时重发）；不同从节点的确认可能并发到达，
// 所以这里只在持有 mu_ 时修改 matchIndex_。不得阻塞。
void Replicator::onAck(const AckMsg& m) {
    std::lock_guard lk(mu_);
    auto& idx = matchIndex_[m.follower];
    idx = std::max(idx, m.lastIndex);       // 重复或过期的确认不会让它倒退
    maybeAdvanceCommit();
}`,
  choices: ["nonobvious", "comment-repeats", "conjoined", "none"], answer: ["none"],
  explain: `<p>没有明显问题。这同样是一个间接调用的处理函数，但接口注释补上了读者需要的所有信息：被谁调用、在哪个线程、顺序保证、可能重复、并发情况、不得阻塞。第 8 行的 <code>max</code> 和它的行尾注释，正好回应了"可能重复"这一条。</p>
<p>这正是 18.2 节对事件驱动代码的建议：用不明显的写法时，用文档补偿。注释也没有重复代码：它写的全是从函数体里看不出来的东西。</p>`,
},
{
  id: "ch18-flag-07", ch: 18, type: "flag", title: "倒着走的循环",
  prompt: "<p>事件总线里的一个方法。乍一看，循环为什么要倒着写？</p>",
  code: `// 关机前通知所有监听者。监听者可以在 onShutdown() 里注销自己。
void EventBus::notifyShutdown() {
    // 倒序遍历：注销会删掉当前元素，只会挪动它后面那些已经通知过的，
    // 所以一个也不会漏。
    for (size_t i = listeners_.size(); i-- > 0; )
        listeners_[i]->onShutdown();
}`,
  choices: ["nonobvious", "comment-repeats", "hard-describe", "none"], answer: ["none"], mark: [3, 4, 5],
  explain: `<p>没有明显问题。倒序循环确实不寻常，读者第一反应是"为什么"；但第 3、4 行用一句话回答了这个问题，接口注释（第 1 行）又告诉写监听者的人"可以在回调里注销自己"。读者不用去翻监听者的代码，也不用自己推演下标会怎样变化。这正是 18.1 节的做法：好名字和一致的写法优先；实在要写得不寻常时，用注释把读者缺的那条信息补上。</p>
<p>注释没有复述代码：代码只说明"倒着走"，没说明"为什么必须倒着走"。<code>i-- &gt; 0</code> 是无符号下标倒序遍历的常见写法，熟悉的读者一眼认得（18.3 节说的"利用读者已有的信息"）。另一种同样明显的写法是先复制一份 <code>listeners_</code> 再遍历副本，代价是多一次拷贝，而且已经注销的监听者仍会收到这次通知；两者都可以，关键是选了哪种就写明原因。</p>`,
},
{
  id: "ch18-ab-01", ch: 18, type: "ab", title: "限流器的返回值",
  prompt: "<p>一个令牌桶限流器，调用者需要知道是否放行，以及被拒绝时建议多久后重试。</p>",
  a: { label: "", code: `std::pair<bool, std::chrono::milliseconds>
RateLimiter::tryAcquire(const ClientId& id);

// 调用者：
auto r = limiter.tryAcquire(id);
if (!r.first) {
    resp.setHeader("Retry-After", toSeconds(r.second));
    return reply(429);
}` },
  b: { label: "", code: `struct Admission {
    bool allowed;
    // 被拒绝时：再过多久桶里会有足够的令牌。allowed 为 true 时为 0。
    std::chrono::milliseconds retryAfter;
};
Admission RateLimiter::tryAcquire(const ClientId& id);

// 调用者：
Admission a = limiter.tryAcquire(id);
if (!a.allowed) {
    resp.setHeader("Retry-After", toSeconds(a.retryAfter));
    return reply(429);
}` },
  answer: "b",
  explain: `<p>A 写起来省事，但 <code>r.first</code> 是"放行"还是"被限流"？<code>r.second</code> 在放行时有没有意义？读者只能去查实现。B 的字段名在调用处就说明了含义，声明处还有地方写"放行时为 0"这样的约定，这在 <code>pair</code> 上做不到。</p>
<p>这是第 14 条原则最直接的应用：为易读而设计，而不是为易写而设计。B 的代价只是一个五行的结构体。</p>`,
},
{
  id: "ch18-ab-02", ch: 18, type: "ab", title: "声明成什么类型？",
  prompt: "<p>任务分发器里的队列。<code>submit</code> 会在多个工作线程里并发调用，代码没有加锁。</p>",
  a: { label: "声明具体类型", code: `class Dispatcher {
    // 多生产者、单消费者的无锁队列：submit 可以在任意线程调用，
    // 只有 run() 所在的线程会 pop。
    MpscQueue<Task> queue_;
};

void Dispatcher::submit(Task t) {
    queue_.push(std::move(t));
}` },
  b: { label: "声明接口类型", code: `class Dispatcher {
    std::unique_ptr<TaskQueue> queue_;
};

Dispatcher::Dispatcher()
    : queue_(std::make_unique<MpscQueue<Task>>()) {}

void Dispatcher::submit(Task t) {
    queue_->push(std::move(t));
}` },
  answer: "a",
  explain: `<p><code>submit</code> 不加锁能工作，靠的是具体实现"多生产者安全"这一性质。B 的声明只写了 <code>TaskQueue</code>，读者看到它会以为只依赖接口；如果 <code>TaskQueue</code> 的接口并不保证线程安全，以后有人换一个实现，就会出现难查的并发 bug。这正是 18.2 节说的声明类型和实际类型不一致：读者只看到声明时会被误导。</p>
<p>B 什么时候合理？如果确实需要在运行时换实现（例如测试时注入假队列），并且把"push 必须多生产者安全"写进 <code>TaskQueue</code> 的接口约定，让所有实现都必须满足，那么声明接口类型就没有误导：代码依赖的东西都在接口里了。</p>`,
},
{
  id: "ch18-ab-03", ch: 18, type: "ab", title: "构造时就连数据库？",
  prompt: "<p>一个用户仓储类需要数据库连接。两种接口：</p>",
  a: { label: "", code: `class UserRepo {
public:
    explicit UserRepo(const std::string& dsn);   // 连接数据库
    std::optional<User> find(UserId id);
};

// 调用者：
UserRepo repo(cfg.dsn());` },
  b: { label: "", code: `class UserRepo {
public:
    // 建立连接；超过 timeout 仍未连上时抛 DbError。
    static UserRepo connect(const std::string& dsn,
                            std::chrono::seconds timeout);
    std::optional<User> find(UserId id);
};

// 调用者：
auto repo = UserRepo::connect(cfg.dsn(), std::chrono::seconds(5));` },
  answer: "b",
  explain: `<p>在 A 的调用处，<code>UserRepo repo(...)</code> 看起来只是建一个对象，读者不会想到这里可能阻塞几十秒、可能因网络失败而抛异常。B 的名字 <code>connect</code> 和显式的超时参数，让"这里有网络操作"在调用处一目了然。</p>
<p>A 并非一无是处：C++ 里 <code>std::ifstream f(path)</code> 在构造时打开文件，这是读者普遍熟悉的约定，不违反预期。区别在于代价和意外程度：打开本地文件快且常见，连接远程数据库慢且可能失败。如果团队里所有资源类都约定"构造即连接"并写进了文档，A 也可以接受（这就是第 17 章的一致性）。</p>`,
},
{
  id: "ch18-judge-01", ch: 18, type: "judge", title: "评审者说看不懂",
  prompt: "<p>你写了一段解析二进制协议的代码，自己觉得很清楚。评审者留言：\"第 40～55 行我读了三遍还是不确定在做什么。\"按作者的观点，最合适的回应是？</p>",
  options: [
    "在评审回复里详细解释这段代码的思路，评审者看懂后就可以合入",
    "承认这段代码不明显；弄清楚评审者卡在哪里，改代码或在代码里补上缺失的信息",
    "评审者不熟悉这个协议，应该先去读协议文档",
    "请另一位熟悉协议的同事再评审一次，如果对方能看懂就说明代码没问题",
  ],
  answer: 1,
  explain: `<p>作者说"明显"存在于读者心里：看出别人的代码不明显，比看出自己的容易。所以评审者说不明显，那就是不明显，不管你自己觉得多清楚。弄清楚是什么让对方困惑，你也学会了以后怎么写得更好。</p>
<p>在评审回复里解释，信息就留在了评审系统里，下一个读代码的人仍然看不到；找一个"能看懂的人"只是换了一个已经拥有那条信息的读者。</p>`,
},
{
  id: "ch18-judge-02", ch: 18, type: "judge", title: "哪种改法最好？",
  prompt: "<p>调用处 <code>retry(op, 3, 200, 2.0, true)</code> 让人看不懂。下面几种改法都能让它更明显，按 18.3 节的排序，哪一种<strong>最好</strong>？</p>",
  options: [
    "在调用处给每个参数加行内注释：<code>retry(op, /*maxAttempts=*/3, /*baseMs=*/200, /*factor=*/2.0, /*jitter=*/true)</code>",
    "在 <code>retry</code> 的声明处写一段详细的参数说明",
    "改成 <code>retry(op)</code>：重试次数、退避和抖动由库按团队统一的默认策略决定，极少数特殊场景才传入一个 <code>RetryPolicy</code>",
    "改成和团队里另一个库一样的参数顺序，大家已经背熟了",
  ],
  answer: 2,
  explain: `<p>作者给出的三种方式中，最好的是<strong>减少读者需要的信息</strong>：大多数调用者根本不需要知道那五个参数，读者也就不会误解它们。这也是第 4 章"让常见用法最简单"和第 8 章"把复杂性往下拉"的思路。</p>
<p>与另一个库保持一致属于第二种（利用读者已有的知识）；行内注释和声明处说明属于第三种（把信息写进代码）。它们都有用，但都要求读者去读、去记。</p>`,
},
{
  id: "ch18-write-01", ch: 18, type: "write", title: "让调用处自己说话",
  prompt: "<p>缓存的 <code>put</code> 接口和一个典型的调用如下。请重新设计接口，让调用处不看声明也能读懂，并说明你的设计让读者少了哪些需要猜的东西。</p>",
  code: `// overwrite: 键已存在时是否覆盖
// pin:       是否禁止被淘汰
// ttl:       过期秒数，0 表示永不过期
void Cache::put(const Key& k, Value v, bool overwrite, bool pin, int ttl);

// 典型调用：
cache.put(k, v, true, false, 0);
cache.put(sessionKey, s, false, true, 1800);`,
  reference: `<pre><code class="lang-cpp">struct PutOptions {
    bool keepExisting = false;              // 键已存在时保留旧值（默认覆盖）
    bool pinned = false;                    // 为 true 时不会被淘汰
    std::chrono::seconds ttl{0};            // 0 表示永不过期
};
void Cache::put(const Key&amp; k, Value v, PutOptions opt = {});

// 调用处：
cache.put(k, v);                                          // 最常见的用法，不用知道任何选项
cache.put(sessionKey, s, {.keepExisting = true, .pinned = true,
                          .ttl = std::chrono::minutes(30)});</code></pre>
<p>读者不用再猜：每个 <code>true</code> 是什么、<code>1800</code> 的单位是秒还是毫秒、参数顺序是否写反。最常见的调用连选项都不用写。</p>`,
  rubric: [
    "调用处能看出每个值的含义（具名选项、枚举或拆分函数）",
    "时间用带单位的类型（如 <code>std::chrono</code>），而不是裸 <code>int</code>",
    "最常见的用法可以不传任何选项",
    "默认值选的是大多数调用者想要的行为",
  ],
  explain: `<p>这道题综合了本章的"不明显的调用处"和第 4 章的"让常见用法最简单"。用 C++20 的指定初始化写选项结构体是一种常见做法；拆成 <code>put</code>/<code>putIfAbsent</code> 等几个名字清楚的函数也可以，取决于选项之间是否独立。</p>`,
},
{
  id: "ch18-write-02", ch: 18, type: "write", title: "给回调写接口注释",
  prompt: `<p>下面的处理函数在 <code>start()</code> 里通过 <code>timer_.every(…)</code> 注册，相隔几百行。你了解到以下事实：它由定时器线程每 10 秒调用一次；和处理请求的工作线程并发；上一次没执行完时下一次会被跳过；<code>BlobId</code> 不会复用；里面的磁盘删除可能耗时数秒。请为它写接口注释。</p>`,
  code: `void BlobStore::collectGarbage() {
    std::vector<BlobId> candidates;
    {
        std::shared_lock lk(mu_);
        for (auto& [id, b] : blobs_) if (b.refs == 0) candidates.push_back(id);
    }
    std::vector<BlobId> dead;
    {
        std::unique_lock lk(mu_);
        for (auto id : candidates) {
            auto it = blobs_.find(id);
            if (it != blobs_.end() && it->second.refs == 0) {
                blobs_.erase(it);
                dead.push_back(id);
            }
        }
    }
    for (auto id : dead) removeFromDisk(id);   // 慢
}`,
  reference: `<pre><code class="lang-cpp">// 删除引用计数为 0 的 blob，回收磁盘空间。
// 由定时器线程每 10 秒调用一次（见 start()）；上一次还没结束时，
// 这一次会被跳过，所以不会和自己并发。但它和处理请求的工作线程并发：
// 两次加锁之间可能出现新引用，所以写锁下要再检查一次 refs；
// blob 一旦从 blobs_ 摘掉就没人能再拿到它（BlobId 不复用），
// 所以耗时的磁盘删除可以放在解锁之后，不阻塞请求。
// 一次调用可能耗时数秒，不要在请求路径上直接调用它。
void BlobStore::collectGarbage();</code></pre>`,
  rubric: [
    "写明了由谁、多久、在哪个线程调用（并指向注册的地方）",
    "写明了与自己、与工作线程的并发关系",
    "解释了为什么写锁下要再检查一次 refs、为什么磁盘删除可以放到解锁之后（代码里看不出来的原因）",
    "提醒了耗时，告诉读者不要在什么地方调用它",
    "没有逐行复述代码在做什么",
  ],
  explain: `<p>18.2 节对事件驱动代码的建议，就是在处理函数的接口注释里写明它何时被调用。对并发代码来说，"何时"自然包括"和谁并发"。第 13 章的标准同样适用：只写代码里看不出来的东西。</p>`,
},
{ id: "ch18-card-01", ch: 18, type: "card",
  front: "18.3 节：让读者拿到所需信息有哪<b>三种方式</b>？哪种最好？",
  back: "<p>① <b>减少需要的信息</b>（抽象、消除特殊情况），最好；② <b>利用读者已有的信息</b>（遵守约定、符合预期）；③ <b>在代码里呈现信息</b>（好名字、有针对性的注释）。</p>" },
{ id: "ch18-card-02", ch: 18, type: "card",
  front: "18.2 节列出了哪几种让代码<b>不明显</b>的写法？它们引出了哪条设计原则？",
  back: "<p>事件驱动（控制流难追踪）、通用容器（<code>std::pair</code> 的元素名不带含义）、声明类型与实际类型不一致、违反读者预期的代码（如构造函数有意外的副作用）。原则 14：软件应该为易读而设计，而不是为易写而设计。</p>" },
);
