// 第 20 章 为性能而设计 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch20-flag-01", ch: 20, type: "flag", title: "三层入队路径",
  prompt: "<p>一个消息队列的入队路径，每条消息都会经过。性能分析显示它是热点之一。</p>",
  code: `bool MessageQueue::push(const Message& m) {
    if (closed_) return false;
    return pushInternal(m);
}

bool MessageQueue::pushInternal(const Message& m) {
    if (closed_) return false;
    if (ring_.full()) return false;
    return ring_.push(m);
}

bool RingBuffer::push(const Message& m) {
    if (full()) return false;
    slots_[tail_] = m;
    tail_ = (tail_ + 1) % capacity_;
    ++count_;
    return true;
}`,
  choices: ["passthrough", "repetition", "special-general", "none"], answer: ["passthrough"], mark: [6, 7, 8, 9],
  explain: `<p><code>pushInternal</code> 和 <code>push</code> 签名完全相同，唯一的"贡献"是把 <code>closed_</code> 再查一遍、把 <code>full()</code> 提前查一遍，几乎是透传方法。结果关键路径上穿过三层、做了四次判断，其中两次是重复的：<code>closed_</code> 查了两次，<code>full()</code> 在第 8 行和第 13 行各查一次。</p>
<p>但这不是"重复"红旗：重复的只是 <code>if (closed_)</code>、<code>full()</code> 这样一行的判断。那个红旗说的是<strong>不算简单</strong>的代码在多处反复出现、说明缺了一个抽象；9.3 节也说，只有一两行的片段，抽成方法往往得不偿失。这里缺的不是抽象，而是多了一层：去掉 <code>pushInternal</code>，重复的判断自然就消失了。</p>
<p>这和书中 20.4 节 Buffer 的原始代码是同一类问题：几层签名相同的浅方法，特殊情况被逐层、重复地检查。改法是把路径收进一个方法：开头一次判断（例如让关闭的队列容量视为 0，<code>closed_</code> 和 <code>full()</code> 就合成一次检查），然后直接写入。代码更短，也更快。</p>`,
},
{
  id: "ch20-flag-02", ch: 20, type: "flag", title: "ASCII 快路径",
  prompt: "<p>一个文本处理库里的函数，调用量很大。</p>",
  code: `// 把 UTF-8 文本转成小写。线上绝大多数输入是纯 ASCII：
// 先确认这一点，确认后走不需要解码的快路径。
std::string toLowerUtf8(std::string_view s) {
    if (isAllAscii(s)) {                    // 唯一的分流判断
        std::string out(s);
        for (char& c : out)
            if (c >= 'A' && c <= 'Z') c += 'a' - 'A';
        return out;
    }
    return toLowerUtf8Slow(s);  // 多字节字符、特殊映射（如 İ 转小写后变成两个码点）
}`,
  choices: ["special-general", "nonobvious", "conjoined", "none"], answer: ["none"],
  explain: `<p>这正是本章推荐的结构：常见情况（纯 ASCII）用一次判断分流，之后的关键路径没有任何额外检查；所有特殊情况都去 <code>toLowerUtf8Slow</code> 里处理，那里可以按简单而不是按快来写。</p>
<p>它也不算"通用与专用混杂"：快路径和慢路径做的是同一件事，结果一致，只是实现方式不同；注释说清了为什么要分流，所以也不是"不明显的代码"。唯一要确认的是：确实有测量表明这个函数是热点，并且 ASCII 输入占绝大多数。</p>`,
},
{
  id: "ch20-flag-03", ch: 20, type: "flag", title: "塞进字段里的标志位",
  prompt: "<p>为了让索引项更小、查找更快，有人这样设计了内存索引。</p>",
  code: `struct IndexEntry {
    uint64_t off;   // 日志文件中的偏移
    int32_t  len;
};

const char* Store::get(const std::string& key) {
    auto it = index_.find(key);
    if (it == index_.end()) return nullptr;
    const IndexEntry& e = it->second;
    if (e.len < 0) return nullptr;
    if (e.off & (1ull << 63))
        return cache_ + (e.off & ~(1ull << 63));
    return readFromLog(e.off, e.len);
}`,
  choices: ["nonobvious", "leakage", "vague-name", "none"], answer: ["nonobvious"], mark: [10, 11, 12],
  explain: `<p>第 10～12 行快速读一遍看不懂："长度为负"是什么意思（已删除？），偏移的最高位又是什么（数据在内存缓存里？），结构体注释里一个字都没提。这是不明显的代码。为了性能而压缩表示并不一定错，但读者需要的信息必须写出来。</p>
<p>改法：用命名的辅助函数（<code>isDeleted()</code>、<code>inCache()</code>、<code>cacheOffset()</code>）把编码收进 <code>IndexEntry</code> 内部，并在结构体上写清编码规则。这些函数会被内联，不花任何性能。另外值得问一句：这个压缩真的测过吗？这里其实连空间都没省：<code>IndexEntry</code> 本来就因对齐填充占 16 字节，加一个 1 字节的状态枚举正好放进填充里，大小不变。用独立的状态字段更直白。</p>`,
},
{
  id: "ch20-flag-04", ch: 20, type: "flag", title: "通用缓存里的捷径",
  prompt: "<p>一个多个服务共用的 LRU 缓存模板。订单服务的同事为了一个热点加了几行。</p>",
  code: `template <class K, class V>
const V* LruCache<K, V>::get(const K& key) {
    if constexpr (std::is_same_v<K, std::string>) {
        // 订单服务的热点：以 "order:" 开头的键命中率最高，
        // 跳过 LRU 链表调整以加速
        if (key.rfind("order:", 0) == 0) {
            auto it = map_.find(key);
            return it == map_.end() ? nullptr : &it->second.value;
        }
    }
    auto it = map_.find(key);
    if (it == map_.end()) return nullptr;
    touch(it);                       // 移到链表头
    return &it->second.value;
}`,
  choices: ["special-general", "passthrough", "repetition", "none"], answer: ["special-general"], mark: [3, 4, 5, 6, 7, 8, 9],
  explain: `<p>一个通用机制里混进了只为某一个使用者服务的代码：缓存现在"知道"订单服务的键长什么样。这会悄悄改变语义（以 <code>order:</code> 开头的键永远不会被视为"最近使用"，可能被提前淘汰），其他使用者完全想不到。这也是一种信息泄漏。</p>
<p>如果测量确实表明链表调整是瓶颈，该做的是<strong>根本性修复</strong>，而且对所有使用者都成立：例如换成近似 LRU（CLOCK 算法、按采样淘汰），让命中路径不必移动链表节点。专用的需求要么放在订单服务自己的代码里，要么变成一个通用的选项。</p>`,
},
{
  id: "ch20-flag-05", ch: 20, type: "flag", title: "省一次拷贝",
  prompt: "<p>为了在回放日志时避免拷贝，读取器直接把内部块交给调用者解析。下面的解析代码在 replay、compact、dump 工具三处各有一份。</p>",
  code: `// 返回下一条记录在内部块中的位置，不拷贝
struct RawRecord { const char* block; size_t pos; };
RawRecord LogReader::nextRaw();

// 调用者：
RawRecord r = reader.nextRaw();
uint32_t klen, vlen;
std::memcpy(&klen, r.block + r.pos, 4);
std::memcpy(&vlen, r.block + r.pos + 4, 4);
std::string_view key(r.block + r.pos + 8, klen);
std::string_view val(r.block + r.pos + 8 + klen, vlen);`,
  choices: ["leakage", "repetition", "overexposure", "none"], answer: ["leakage", "repetition"], mark: [7, 8, 9, 10, 11],
  explain: `<p>记录格式（4 字节键长、4 字节值长、然后是键和值）本该只有 <code>LogReader</code> 知道，现在三个调用者都知道，这是信息泄漏；同一段解析在三处各写一遍，这是重复。格式一改，三处必须同时改。</p>
<p>省拷贝的目标完全可以不靠泄漏达到：让 <code>LogReader::next()</code> 返回 <code>struct Record { std::string_view key, value; }</code>，视图直接指向内部块，同样零拷贝，格式却藏回了模块里（注释写明视图在下一次 <code>next()</code> 之前有效）。性能不是泄漏的理由，往往存在一个同样快、但更深的接口。</p>`,
},
{
  id: "ch20-ab-01", ch: 20, type: "ab", title: "订单列表里的买家昵称",
  prompt: "<p>渲染订单列表页，每页 50 个订单，每个订单要显示买家昵称。用户资料在另一个服务里（同一数据中心）。</p>",
  a: { label: "逐个查", code: `for (const Order& o : orders) {
    UserProfile u = userService.getProfile(o.buyerId);   // 一次 RPC
    rows.push_back(renderRow(o, u.nickname));
}` },
  b: { label: "一次批量查", code: `std::vector<UserId> ids;
for (const Order& o : orders) ids.push_back(o.buyerId);
auto profiles = userService.getProfiles(ids);   // 一次 RPC，返回 id → 资料
for (const Order& o : orders)
    rows.push_back(renderRow(o, profiles.at(o.buyerId).nickname));` },
  answer: "b",
  explain: `<p>按书中给的数量级，数据中心内一次往返就要 10–50 µs，是数万条指令的时间。A 一页要 50 次往返，光等网络就是 0.5～2.5 ms；如果用户服务跨地域，每次 10–100 ms，一页就要 0.5～5 秒。B 只有一次往返，而代码几乎一样简单。这就是"天然高效"的设计：不多付复杂度，只是选了便宜的那个。</p>
<p>A 什么时候可以接受：列表永远只有一两项；或者客户端库在内部自动合并同一时刻的请求（这其实是更深的设计，把批量藏进了模块里）。另外注意 B 里的 <code>at</code> 在资料缺失时会抛异常，真实代码要想清楚缺失时显示什么。</p>`,
},
{
  id: "ch20-ab-02", ch: 20, type: "ab", title: "会话表用什么容器",
  prompt: "<p>网关为每个请求按会话 id 查会话对象，同时在线约 50 万个会话。代码里从不按 id 顺序遍历会话。</p>",
  a: { label: "", code: `std::unordered_map<SessionId, Session> sessions_;

Session* find(SessionId id) {
    auto it = sessions_.find(id);
    return it == sessions_.end() ? nullptr : &it->second;
}` },
  b: { label: "", code: `std::map<SessionId, Session> sessions_;

Session* find(SessionId id) {
    auto it = sessions_.find(id);
    return it == sessions_.end() ? nullptr : &it->second;
}` },
  answer: "a",
  explain: `<p>两种写法一样简单，但哈希表通常快得多。书中说哈希表很容易快 5～10 倍，数据量大时差距可能更大：有序树每往下一层都可能是一次缓存未命中。本站的微基准在 100 万个键时测出将近 20 倍。不需要顺序，就没有理由付这个代价。</p>
<p>B 什么时候更合适：需要按键的顺序遍历、做范围查询（例如"id 在某区间的会话"）、或者需要稳定的迭代顺序来生成可复现的输出。另外两者在插入后元素地址都稳定（都是节点式容器），这一点上没有区别。</p>`,
},
{
  id: "ch20-ab-03", ch: 20, type: "ab", title: "启动时解析配置",
  prompt: "<p>服务启动时解析一次约 200 行的配置文件，目前耗时 2 ms。一位同事提议改写解析器。</p>",
  a: { label: "现在的写法", code: `// 解析失败时抛 ConfigError，带行号。
Config Config::parse(const std::string& text);

std::string Config::getString(std::string_view key) const;` },
  b: { label: "提议的写法", code: `// 零拷贝解析：返回的 string_view 指向 text 内部，
// text 必须在 Config 的整个生命周期内保持有效且不被修改。
// arena 用于存放转义后的值，必须比 Config 活得更久。
Config Config::parse(std::string_view text, Arena& arena);

std::string_view Config::getString(std::string_view key) const;` },
  answer: "a",
  explain: `<p>B 也许快几倍，但它把复杂度推到了接口上：调用者要管理两个对象的生命周期，用错就是悬空指针。而这段代码只在启动时跑一次，2 ms 对谁都没有影响。按书中的分级规则：会让接口变复杂的优化，应该先用简单方案，真出了性能问题再说。</p>
<p>B 在什么条件下合理：解析发生在请求路径上（例如每个请求都要解析一段配置或报文），并且测量表明它确实是热点。即便如此，也应该先试试能不能把零拷贝藏在接口后面（例如 <code>Config</code> 自己持有文本），而不是把生命周期规则交给调用者。</p>`,
},
{
  id: "ch20-judge-01", ch: 20, type: "judge", title: "慢了，第一步做什么",
  prompt: "<p>线上一个查询接口的 p99 延迟是 80 ms，目标是 30 ms。团队里有人已经开始讨论把所有 <code>std::map</code> 换成哈希表。按本章的建议，第一步应该是？</p>",
  options: [
    "先把 <code>std::map</code> 都换掉，反正哈希表更快，不会有坏处",
    "给请求链路的各个阶段加计时，找出时间具体花在哪几个位置，并把当前数字记下来作为基线",
    "先把日志全部关掉，看看能快多少",
    "改用 <code>-O3</code> 和链接时优化重新编译",
  ],
  answer: 1,
  explain: `<p>作者说程序员对性能的直觉不可靠，老手也一样。凭直觉改，很可能在不影响性能的地方浪费时间，还让系统更复杂。只看顶层的 80 ms 也不够：它告诉你慢，但没告诉你为什么。要往下测到少数几个具体位置，同时留下基线，改完才能验证是否真的变快。</p>
<p>"换哈希表"本身未必是坏主意，但如果这 80 ms 里 60 ms 在等数据库，换容器毫无意义。关日志和换编译选项也一样：先测量，再决定。</p>`,
},
{
  id: "ch20-judge-02", ch: 20, type: "judge", title: "哪个是\"根本性修复\"",
  prompt: "<p>测量发现，商品详情接口里有 70% 的时间花在反复向库存服务查询同一批热门商品的库存上。下列哪个改动最接近作者说的\"根本性修复\"？</p>",
  options: [
    "把查询函数里的三个 <code>if</code> 合并成一个",
    "把查询函数标成 <code>inline</code>",
    "在库存查询前加一层短时缓存（几秒过期），热门商品的大部分请求不再发起远程调用",
    "把查询结果的结构体字段重新排序，减少填充字节",
  ],
  answer: 2,
  explain: `<p>作者认为，提升性能最好的办法是"根本性"的改变，例如加缓存、换算法（平衡树代替链表）、换架构（RAMCloud 绕过内核联网）。这里的瓶颈是远程往返，一次往返就是数万条指令的时间，再怎么抠本地代码也省不出几次往返；缓存则直接把大部分往返去掉了。</p>
<p>合并判断、内联、调整字段这类改写代码的做法，只在找不到根本性修复、而测量又表明这段代码本身是瓶颈时才值得做，而且应该围绕关键路径来做。注意缓存也带来新问题（过期时间、一致性），要按前面各章的方法把它做成一个干净的模块。</p>`,
},
{
  id: "ch20-write-01", ch: 20, type: "write", title: "让发送路径只判断一次",
  prompt: `<p>测量表明下面的 <code>send</code> 是热点。绝大多数调用时：连接已打开、没有积压、未被限流、TLS 握手已完成。请改写它，使常见情况<strong>只做一次判断</strong>，并列出：你引入的新状态必须在哪些地方更新？</p>`,
  code: `// 每条消息都会调用
bool Connection::send(const Message& m) {
    if (state_ != State::Open) return false;
    if (!pending_.empty()) { pending_.push_back(m); return true; }  // 保序：有积压就排队
    if (throttled_)        { pending_.push_back(m); return true; }
    if (tlsHandshaking_)   { pending_.push_back(m); return true; }
    return writeNow(m);
}`,
  reference: `<pre><code class="lang-cpp">// directOk_ 为真，当且仅当：连接已打开、没有积压、未被限流、TLS 握手已完成。
// 上述任一状态变化时都必须调用 updateDirectOk()。
bool Connection::send(const Message&amp; m) {
    if (directOk_) return writeNow(m);      // 关键路径：一次判断
    return sendSlow(m);
}

// 关键路径之外，按最直白的方式写
bool Connection::sendSlow(const Message&amp; m) {
    if (state_ != State::Open) return false;
    pending_.push_back(m);
    return true;
}

void Connection::updateDirectOk() {
    directOk_ = state_ == State::Open &amp;&amp; pending_.empty() &amp;&amp; !throttled_ &amp;&amp; !tlsHandshaking_;
}</code></pre>
<p>必须调用 <code>updateDirectOk()</code> 的地方：状态迁移（打开、关闭、出错）；积压队列从空变非空、从非空变空（入队和排空时）；限流开启和解除；TLS 握手开始和完成。最好把这些修改都收进少数几个私有方法里，避免有人直接改字段而忘了更新。</p>`,
  rubric: ["常见情况只有一次判断，之后直接写出", "特殊情况的语义没变：未打开返回 false，其余情况排队", "写出了新状态的不变量（什么时候为真）", "列全了需要更新的地方（状态、积压、限流、握手）", "意识到代价：多了一个必须同步维护的状态"],
  explain: `<p>这是书中 20.3 节的方法：先写出理想代码（"能直接写就直接写"），再引入一个把多个条件合在一起的变量，让一次判断挡住所有特殊情况。Buffer 的 <code>availableAppendBytes</code> 用的是同一招。</p>
<p>要诚实地说：四个布尔字段的判断本身非常便宜，这个改写在绝对时间上未必省多少。只有测量表明这里确实是热点时才值得做。不过它还有一个附带好处：关键路径一眼就能看懂。</p>`,
},
{
  id: "ch20-write-02", ch: 20, type: "write", title: "写出\"理想代码\"",
  prompt: `<p>价格查询是热点，几乎所有调用都满足：数据已加载、缓存命中。请先写出这个常见情况下的<strong>理想代码</strong>（无视现有的类结构），再给出一个尽量接近它、结构又干净的设计（类声明加关键函数即可）。</p>`,
  code: `double PriceService::priceOf(const std::string& sku) {
    return repo_.find(sku).price();
}

Product ProductRepo::find(const std::string& sku) {
    if (!loaded_) load();
    std::string key = normalize(sku);          // 去空格、转大写
    if (auto p = cache_.get(key)) return *p;   // 返回拷贝：Product 有 20 个字段
    Product p = db_.query(key);
    cache_.put(key, p);
    return p;
}`,
  reference: `<p><strong>理想代码</strong>：键已经是规范形式，一次哈希查找，直接拿到价格。</p>
<pre><code class="lang-cpp">auto it = prices.find(sku);    // sku 已规范化
if (it != prices.end()) return it-&gt;second;</code></pre>
<p><strong>接近理想的干净设计</strong>：</p>
<pre><code class="lang-cpp">// 规范化在构造时完成一次，之后的 Sku 都是规范形式。
class Sku {
public:
    explicit Sku(std::string_view raw);   // 去空格、转大写
    const std::string&amp; str() const;
};

// 构造时加载全部商品；未命中时回源数据库并写入缓存。
class ProductCatalog {
public:
    explicit ProductCatalog(Db&amp; db);
    double priceOf(const Sku&amp; sku);       // 常见情况：一次哈希查找
    const Product&amp; product(const Sku&amp; sku);
private:
    std::unordered_map&lt;std::string, Product&gt; products_;
};</code></pre>
<p>和原来相比去掉的东西：每次调用的 <code>loaded_</code> 判断（挪到构造时）、每次调用的规范化和字符串分配（挪到 <code>Sku</code> 构造时，也就是输入的边界）、20 个字段的整体拷贝（只取价格或返回引用）、<code>PriceService</code> 到 <code>ProductRepo</code> 那一层几乎透传的调用。</p>`,
  rubric: ["理想代码只包含一次查找和返回", "去掉了常见路径上的\"是否已加载\"判断", "把规范化移出了每次查找", "避免了整个对象的拷贝", "说明了未命中（特殊情况）在哪里、怎么处理"],
  explain: `<p>作者的建议是：先不管现有结构，写出常见情况下最少要执行的代码，再找最接近它的干净设计。为了干净的抽象，在理想代码上多一层对通用哈希表的调用完全可以。这个练习常常顺带改善了设计本身：<code>Sku</code> 类型让"规范化"这个知识只出现在一个地方。</p>`,
},
{ id: "ch20-card-01", ch: 20, type: "card",
  front: "书中给出的几类<b>昂贵操作</b>，大致是什么数量级？",
  back: "<p>数据中心内网络往返 10–50 µs（数万条指令的时间），广域网往返 10–100 ms；磁盘 I/O 5–10 ms（数百万条指令的时间），闪存 10–100 µs，新型非易失内存可能快到约 1 µs（仍约 2000 条指令的时间）；动态内存分配有明显开销（书中没给数字）；缓存未命中要几百条指令的时间。了解它们最好的办法是自己写微基准。</p>" },
{ id: "ch20-card-02", ch: 20, type: "card",
  front: "<b>围绕关键路径重新设计</b>的步骤是什么？它在什么时候用？",
  back: "<p>① 无视现有结构，想象常见情况下最少要执行的代码（理想代码），数据结构怎么方便怎么来；② 找一个尽量接近理想、结构又干净的设计；③ 把特殊情况移出关键路径：开头一次判断检测全部特殊情况，命中就去路径之外处理。这是最后手段：先测量，先找根本性修复（缓存、换算法），都不行才这样改。</p>" },
);
