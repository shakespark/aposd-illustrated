// 第 7 章 不同的层，不同的抽象 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch07-flag-01", ch: 7, type: "flag", title: "分层架构里的 Service 层",
  prompt: "<p>团队规范要求\"Controller 只能调 Service，Service 才能调 Repository\"。下面是订单模块的 Service 层（节选，另外还有 9 个同样形式的方法）。</p>",
  code: `class OrderService {
public:
    explicit OrderService(OrderRepository& repo) : repo_(repo) {}

    std::optional<Order> findById(OrderId id) {
        return repo_.findById(id);
    }
    std::vector<Order> findByUser(UserId uid, int limit) {
        return repo_.findByUser(uid, limit);
    }
    void save(const Order& o) {
        repo_.save(o);
    }
    void remove(OrderId id) {
        repo_.remove(id);
    }
private:
    OrderRepository& repo_;
};`,
  choices: ["passthrough", "shallow", "temporal", "none"], answer: ["passthrough", "shallow"], mark: [5, 6, 8, 9, 11, 12, 14, 15],
  explain: `<p>每个方法都只是把参数原样交给 <code>OrderRepository</code> 里同名、同签名的方法，这是典型的<strong>透传方法</strong>。整个类全是透传，它的接口和下层几乎一模一样，却没有增加任何功能，所以它同时也是一个<strong>浅模块</strong>：书中说透传方法会让类变浅，指的就是这种情况。</p>
<p>代价不止是样板代码：<code>OrderRepository::findByUser</code> 一旦加个排序参数，<code>OrderService</code> 也得跟着改。改法有三种：让 Controller 直接用 Repository；把真正属于"业务"的逻辑（校验、事务、权限）挪进 Service，让它真的提供一层不同的抽象；或者干脆合并。分层规范本身不是错，错在这一层没有任何属于自己的职责。</p>`,
},
{
  id: "ch07-flag-02", ch: 7, type: "flag", title: "签名一模一样的路由函数",
  prompt: "<p>一个内部管理服务的请求入口。所有处理函数和入口的签名完全相同。</p>",
  code: `using Handler = void (*)(const Request&, Response&);

// 按顺序匹配规则：先精确路径，再最长前缀；都不匹配返回 404。
// 需要管理员权限的规则在调用处理函数之前统一检查。
void dispatch(const Request& req, Response& resp) {
    const Route* r = routes_.matchExact(req.path());
    if (!r) r = routes_.matchLongestPrefix(req.path());
    if (!r) return resp.notFound();
    if (r->adminOnly && !req.session().isAdmin()) return resp.forbidden();
    r->handler(req, resp);
}`,
  choices: ["passthrough", "shallow", "leakage", "none"], answer: ["none"],
  explain: `<p>签名相同不等于透传。这是一个<strong>分派器</strong>（dispatcher）：它根据参数决定交给谁处理，"选择"本身就是有价值的功能（匹配顺序、最长前缀、统一的权限检查）。调用者不需要知道有哪些路由、按什么顺序匹配。</p>
<p>作者在 7.2 节明确说过：多个方法签名相同没有问题，前提是<strong>每个方法都提供了有用且不同的功能</strong>。书中举的正是 Web 服务器按 URL 规则分派请求的例子。</p>`,
},
{
  id: "ch07-flag-03", ch: 7, type: "flag", title: "给存储加个计数器",
  prompt: "<p>想统计读写次数，有人写了一个装饰器。<code>KvStore</code> 接口共有 9 个虚函数，这里只列出一部分。</p>",
  code: `class CountingKvStore : public KvStore {
public:
    explicit CountingKvStore(std::unique_ptr<KvStore> inner)
        : inner_(std::move(inner)) {}

    std::optional<std::string> get(std::string_view k) override {
        ++reads_;
        return inner_->get(k);
    }
    void put(std::string_view k, std::string_view v) override {
        ++writes_;
        inner_->put(k, v);
    }
    void erase(std::string_view k) override { inner_->erase(k); }
    void flush() override { inner_->flush(); }
    Snapshot snapshot() override { return inner_->snapshot(); }
    size_t approximateSize() const override { return inner_->approximateSize(); }
    // ……另外 3 个方法同样只是转交
private:
    std::unique_ptr<KvStore> inner_;
    std::atomic<uint64_t> reads_{0}, writes_{0};
};`,
  choices: ["passthrough", "overexposure", "temporal", "none"], answer: ["passthrough"], mark: [14, 15, 16, 17],
  explain: `<p>新功能只有两行（<code>++reads_</code>、<code>++writes_</code>），其余 7 个方法全是透传。这正是 7.3 节说的装饰器通病：<strong>为一点点新功能写一大堆样板</strong>，而且 <code>KvStore</code> 每加一个虚函数，这个类都得跟着加一个转交。</p>
<p>写装饰器前先问：计数是不是几乎每个使用者都想要、和存储本身逻辑相关？如果是，直接放进存储实现里（或者放进已有的那个指标/监控层）。如果只有某一个调用方关心，就在那个调用方里计数。</p>`,
},
{
  id: "ch07-flag-04", ch: 7, type: "flag", title: "包一层第三方 SDK",
  prompt: "<p>项目里所有对象存储都通过自己的 <code>BlobStore</code> 接口访问。现在要接入一家云厂商的 C SDK（不能修改它的代码）。</p>",
  code: `// 把 vendor SDK 适配成本项目的 BlobStore 接口。
class VendorBlobStore : public BlobStore {
public:
    std::optional<Bytes> read(std::string_view key) override {
        vd_obj_t* obj = nullptr;
        int rc = vd_get_object(client_, bucket_.c_str(),
                               std::string(key).c_str(), &obj);
        if (rc == VD_ENOTFOUND) return std::nullopt;
        if (rc != VD_OK) throw BlobError(vd_strerror(rc), key);
        Bytes out(vd_obj_data(obj), vd_obj_data(obj) + vd_obj_size(obj));
        vd_obj_free(obj);
        return out;
    }
    void write(std::string_view key, ByteView data) override;  // 类似：转换参数和错误码
private:
    vd_client_t* client_;
    std::string bucket_;
};`,
  choices: ["passthrough", "shallow", "leakage", "none"], answer: ["none"],
  explain: `<p>这是作者在 7.3 节承认的少数合理的"包装器"用法：外部类的接口<strong>改不了</strong>，但系统要求它符合另一个接口，于是用一层包装来<strong>翻译</strong>。这一层做了真正的工作：参数转换、错误码到异常的映射、"不存在"变成 <code>nullopt</code>、内存释放。</p>
<p>它的抽象确实和下层不同：上层看到的是"按键读写字节"，下层是带客户端句柄、桶名、手动释放对象的 C 接口。作者同时提醒，这种情况其实很少见，大多数时候有比包装器更好的办法。</p>`,
},
{
  id: "ch07-flag-05", ch: 7, type: "flag", title: "空闲槽位管理",
  prompt: "<p>一个固定大小对象池用位图记录哪些槽位空闲。下面是它的接口和一处典型的调用代码。</p>",
  code: `class SlotBitmap {
public:
    size_t wordCount() const;
    uint64_t word(size_t i) const;           // 第 i 个 64 位字，1 表示已占用
    void setWord(size_t i, uint64_t w);
};

// 调用方：分配一个槽位
int allocSlot(SlotBitmap& bm) {
    for (size_t i = 0; i < bm.wordCount(); ++i) {
        uint64_t w = bm.word(i);
        if (w != ~0ULL) {
            int bit = __builtin_ctzll(~w);
            bm.setWord(i, w | (1ULL << bit));
            return int(i * 64 + bit);
        }
    }
    return -1;
}`,
  choices: ["shallow", "leakage", "passthrough", "none"], answer: ["shallow", "leakage"], mark: [3, 4, 5, 11, 12, 13],
  explain: `<p>接口直接照搬了内部表示（"一串 64 位字"），所以这个类几乎什么都没藏：它是<strong>浅模块</strong>。7.4 节说的就是这种情况：接口和实现的抽象太像，类就不会深。</p>
<p>后果是"按 64 位分组、1 表示占用、用 ctz 找空位"这些知识跑到了每个调用方里，<strong>信息泄漏</strong>：哪天想换成分层位图或者空闲链表，所有调用方都得改。更深的接口是 <code>std::optional&lt;size_t&gt; allocate()</code> 和 <code>void release(size_t slot)</code>，内部仍然可以是位图。</p>`,
},
{
  id: "ch07-ab-01", ch: 7, type: "ab", title: "只有最底层用得到的配置",
  prompt: "<p>复制服务里，只有最底层的 <code>PeerChannel</code> 需要 TLS 证书路径，但它被创建的位置隔了三层。两种做法：</p>",
  a: { label: "全局单例", code: `// tls_config.h
struct TlsConfig { std::string certPath, keyPath; };
TlsConfig& globalTls();          // main 启动时填好

// peer_channel.cpp
PeerChannel::PeerChannel(Address peer) {
    tls_ = openTls(globalTls().certPath, globalTls().keyPath);
}` },
  b: { label: "context 对象", code: `// 每个服务实例一个；创建后只读
struct ServerContext {
    TlsConfig tls;
    Clock* clock;
    Metrics* metrics;
};

// 主要对象各自保存 const ServerContext&，只在构造时显式传递
PeerChannel::PeerChannel(const ServerContext& ctx, Address peer)
    : ctx_(ctx) {
    tls_ = openTls(ctx_.tls.certPath, ctx_.tls.keyPath);
}` },
  answer: "b",
  explain: `<p>两者都消除了透传变量。区别在于：全局变量让<strong>同一进程里无法跑两个独立的服务实例</strong>。生产环境也许用不到，但测试经常需要，比如在一个进程里起三个副本测试复制协议，各用各的证书和时钟。这是作者在 7.5 节反对全局变量的主要理由。</p>
<p>B 每个实例一个 context，引用存进主要对象里，只在构造函数里出现一次；字段建成后只读，避开了线程安全问题。代价也要清楚：作者承认 context 仍有全局变量的大部分缺点（看不出某个字段为什么在、被谁用），不加约束会变成什么都往里塞的杂物袋。如果整个程序永远只有一个实例、也不需要在测试里替换，A 的代价确实小一些。</p>`,
},
{
  id: "ch07-ab-02", ch: 7, type: "ab", title: "HTTP 客户端的重试与超时",
  prompt: "<p>公司内部几乎所有服务调用都需要超时和重试。两种客户端库设计：</p>",
  a: { label: "", code: `// 默认：5 秒超时，对幂等请求最多重试 2 次（指数退避）
HttpClient client;
auto resp = client.get(url);

// 少数需要不同策略的地方：
HttpClient bulk({.timeout = 60s, .retries = 0});` },
  b: { label: "", code: `auto client =
    std::make_unique<RetryingClient>(
        std::make_unique<TimeoutClient>(
            std::make_unique<RawHttpClient>(), 5s),
        RetryPolicy::exponential(2));
auto resp = client->get(url);   // 四个类都实现同一个 Client 接口` },
  answer: "a",
  explain: `<p>B 是一串装饰器：每一层都实现同一个 <code>Client</code> 接口，每层只加一点功能，其余方法全是透传。每个调用方都必须知道这几层的存在和<strong>叠放顺序</strong>（重试包在超时外面还是里面，行为不一样）。</p>
<p>按 7.3 节的第一个问题：新功能是不是几乎每个使用者都要用、和底层逻辑相关？超时和重试正是如此，所以应该直接做进客户端，作为默认行为。如果某个功能真的只有极少数人需要，又和 HTTP 本身无关（比如某个业务的审计记录），单独的类或放在使用它的地方会更合适。</p>`,
},
{
  id: "ch07-ab-03", ch: 7, type: "ab", title: "CacheManager 要不要留？",
  prompt: "<p><code>CacheManager</code> 有 6 个公开方法，其中 5 个原样转交给内部的 <code>LruCache</code>，只有 <code>warmUp()</code> 有自己的逻辑（启动时从数据库加载热点数据）。现在 <code>LruCache</code> 新增了 <code>resize()</code>。两种处理：</p>",
  a: { label: "再加一个转交", code: `class CacheManager {
public:
    const Value* get(const Key& k)       { return cache_.get(k); }
    void put(const Key& k, Value v)      { cache_.put(k, std::move(v)); }
    void erase(const Key& k)             { cache_.erase(k); }
    size_t size() const                  { return cache_.size(); }
    void clear()                         { cache_.clear(); }
    void resize(size_t cap)              { cache_.resize(cap); }   // 新增
    void warmUp(Database& db);
private:
    LruCache cache_;
};` },
  b: { label: "去掉这一层", code: `// 调用方直接持有 LruCache
LruCache cache(capacity);

// 预热是"从数据库加载数据"这件事的一部分，放在数据加载模块里
void warmUpCache(LruCache& cache, Database& db);` },
  answer: "b",
  explain: `<p>A 里 <code>CacheManager</code> 的职责和 <code>LruCache</code> 几乎完全重叠，<code>LruCache</code> 每加一个方法它就得跟一个透传。按 7.1 节的问法："这两个类<strong>各自</strong>负责哪些功能和抽象？"答不上来，就该重新划分。B 用的是书中三种改法里的两种：让调用者直接使用下层类，并把唯一真正的功能（预热）挪到它逻辑上所属的地方。</p>
<p>什么时候 A 反而合理？如果 <code>CacheManager</code> 将来要做真正不同的事，比如把数据分片到多个 <code>LruCache</code>、按键选择分片，那它就成了一个分派器，签名相同也没关系。</p>`,
},
{
  id: "ch07-judge-01", ch: 7, type: "judge", title: "签名相同，哪个最可疑？",
  prompt: "<p>下面四种情况里，都有方法和另一个方法的签名相同或几乎相同。哪一种<strong>最可能</strong>是设计问题？</p>",
  options: [
    "<code>dispatch(req, resp)</code> 按 URL 规则选出某个处理函数，再以同样的参数调用它",
    "<code>NvmeDevice</code>、<code>RamDisk</code>、<code>NetworkDisk</code> 都实现 <code>BlockDevice::readBlock(n, buf)</code>",
    "<code>UserFacade::rename(id, name)</code> 只是调用 <code>UserStore::rename(id, name)</code>，<code>UserFacade</code> 的其他方法也都如此",
    "<code>JsonCodec::encode(obj)</code> 与 <code>MsgpackCodec::encode(obj)</code> 签名相同，供调用者按格式选用",
  ],
  answer: 2,
  explain: `<p>判断标准不是"签名像不像"，而是<strong>每个方法有没有贡献有用且不同的功能</strong>。分派器的功能是"选择"；多个设备驱动、多种编码器是同一接口的多种实现，它们处在同一层、彼此不调用，学会一个就会用其他的，反而降低了认知负担。</p>
<p>只有 <code>UserFacade</code> 那种情况什么也没加：它和下层签名相同，又只是调用下层。这就是透传方法，说明两个类之间的职责划分不清。</p>`,
},
{
  id: "ch07-judge-02", ch: 7, type: "judge", title: "作者怎么看 context 对象？",
  prompt: "<p>关于用 context 对象消除透传变量，下列哪项最符合作者在 7.5 节的立场？</p>",
  options: [
    "context 对象是理想方案，它彻底解决了全局变量的所有缺点",
    "context 仍然有全局变量的大部分缺点，也可能带来线程安全问题；但作者最常用它，因为还没找到更好的办法",
    "应该把 context 作为每个方法的第一个参数显式传递，这样依赖最清楚",
    "只要用了依赖注入框架，就不再需要 context 对象",
  ],
  answer: 1,
  explain: `<p>作者的态度很克制：context 让同一进程里能有多个系统实例（这是它胜过全局变量的地方），把全局状态集中到一处，测试时也方便改配置；但字段为什么存在、被谁使用依然不明显，不加约束会变成杂物袋，还可能有线程安全问题（最好让字段不可变）。作者说自己还没找到比 context 更好的办法。</p>
<p>至于传递方式，书中的建议恰恰相反：把 context 的引用存在主要对象里，<strong>只在构造函数里</strong>显式传递，而不是让每个方法都多一个参数，否则 context 本身就成了透传变量。依赖注入框架书中没有讨论，那是本站之外的话题。</p>`,
},
{
  id: "ch07-write-01", ch: 7, type: "write", title: "拔掉一个透传变量",
  prompt: `<p>压缩（compaction）的 IO 限速值从命令行读入，只有最底层的 <code>SegmentWriter</code> 用到它，但它出现在了路径上每个函数的签名里。请写出你的改法：给出新增或修改的类型声明、构造函数签名，并说明如果明天再加一个"压缩线程数"配置，需要改哪些地方。</p>`,
  code: `int main(int argc, char** argv) {
    uint64_t ioLimit = parseFlag(argv, "--compaction-io-limit");
    Server server(dataDir);
    server.run(ioLimit);
}
void Server::run(uint64_t ioLimit)                 { engine_.start(ioLimit); }
void Engine::start(uint64_t ioLimit)               { compactor_.loop(ioLimit); }
void Compactor::loop(uint64_t ioLimit)             { /* …… */ mergeSegments(a, b, ioLimit); }
void Compactor::mergeSegments(Seg a, Seg b, uint64_t ioLimit) {
    SegmentWriter w(outPath, ioLimit);   // 只有这里真正用到
    // ……
}`,
  reference: `<pre><code class="lang-cpp">// 每个服务实例一个，main 里建好后只读。
struct StoreContext {
    std::string dataDir;
    uint64_t compactionIoLimit;   // 字节/秒，0 表示不限速
    // 只放真正每个实例共享的状态；建好后只读。它仍有全局变量的大部分缺点（7.5 节），别什么都往里塞
};

int main(int argc, char** argv) {
    StoreContext ctx{dataDir, parseFlag(argv, "--compaction-io-limit")};
    Server server(ctx);
    server.run();
}
Server::Server(const StoreContext&amp; ctx) : ctx_(ctx), engine_(ctx) {}
Engine::Engine(const StoreContext&amp; ctx) : ctx_(ctx), compactor_(ctx) {}
Compactor::Compactor(const StoreContext&amp; ctx) : ctx_(ctx) {}
void Compactor::mergeSegments(Seg a, Seg b) {
    SegmentWriter w(outPath, ctx_.compactionIoLimit);
}</code></pre>
<p>再加"压缩线程数"：只改 <code>StoreContext</code> 的定义、<code>main</code> 里填值的地方，以及真正使用它的 <code>Compactor</code>。中间的 <code>Server</code>、<code>Engine</code> 一行都不用动。</p>`,
  rubric: ["中间层的方法签名里不再出现这个变量", "context 每个实例一个，而不是全局变量（同一进程可以跑两个实例）", "context 只在构造函数里显式传递，引用保存在对象里", "说明了新增配置时只需改 context 定义、赋值处和使用处", "提到了 context 的代价：字段最好只读；不要什么都往里塞"],
  explain: `<p>如果你选了全局变量，想一想：集成测试想在一个进程里起两个 <code>Server</code>，一个限速、一个不限速，还做得到吗？如果你把 <code>StoreContext&amp;</code> 加到了每个方法的参数里，那只是把一个透传变量换成了另一个。</p>`,
},
{
  id: "ch07-write-02", ch: 7, type: "write", title: "接口别照抄存储方式",
  prompt: `<p>网络库的接收缓冲区内部是一串 4KB 的块（<code>std::deque&lt;Chunk&gt;</code>），第一块可能已经被消费了一部分。现在它的接口是这样的，协议解析代码要自己在块之间拼接数据。请重新设计它的公开接口（只写声明和必要的注释），让解析代码不必知道"块"的存在。</p>`,
  code: `class RecvBuffer {
public:
    size_t chunkCount() const;
    Chunk& chunk(size_t i);          // Chunk { char data[4096]; size_t begin, end; }
    void popFrontChunk();
    void appendChunk(Chunk c);
};`,
  reference: `<pre><code class="lang-cpp">// 按字节看待的接收缓冲区。内部分块存储，对调用者透明。
class RecvBuffer {
public:
    size_t size() const;                              // 可读字节数
    // 把从 offset 开始的 n 个字节复制到 out；越界部分不复制，返回实际复制的字节数。
    size_t peek(size_t offset, size_t n, char* out) const;
    // 从头开始找分隔符（如 "\\r\\n"），返回它的偏移；找不到返回 nullopt。
    std::optional&lt;size_t&gt; find(std::string_view delim) const;
    void consume(size_t n);                           // 丢弃前 n 个字节
    size_t readFromSocket(int fd);                    // 追加数据，内部决定分块
};</code></pre>
<p>块的大小、第一块的 begin、跨块的分隔符、空块回收，全部藏在类里面。</p>`,
  rubric: ["公开接口里不再出现 Chunk 或块下标", "提供了按字节偏移的读取或查找", "提供了消费（丢弃已处理数据）的操作", "考虑了跨块的情况由类内部处理（如跨块的分隔符）"],
  explain: `<p>这正是 7.4 节的道理：<strong>接口的抽象和内部表示不同，这个差别本身就是类提供的价值</strong>。书中用编辑器文本类说明同一件事：内部按行存储，接口却按字符和任意范围操作，拆行、合并行的麻烦被收进了类里。</p>`,
},
{ id: "ch07-card-01", ch: 7, type: "card",
  front: "\"不同的层，不同的抽象\"背后更一般的判断标准是什么？",
  back: "<p>每一个设计元素（接口、参数、函数、类、定义）都要让开发者多学一样东西，本身就增加复杂性。它必须消除比自己带来的更多的复杂性，才算<b>净收益</b>，否则不如不要。相邻两层抽象相同（透传方法、浅装饰器、透传变量），往往就是没有挣回自己的成本。</p>" },
{ id: "ch07-card-02", ch: 7, type: "card",
  front: "写一个<b>装饰器</b>之前，应该先问哪几个问题？",
  back: "<p>① 能不能直接加到底层类里？（新功能比较通用、和底层逻辑相关、或大多数使用者都会用时）② 如果只服务某个具体用途，能不能和那个用途的代码放在一起？③ 能不能并入一个已有的装饰器，让一个装饰器更深，而不是多个都浅？④ 它真的需要包住原有对象吗？能不能写成独立的类？</p><p>合理的包装器：外部接口改不了，需要翻译成系统要求的接口（但这很少见）。</p>" },
{ id: "ch07-card-03", ch: 7, type: "card",
  front: "消除<b>透传变量</b>有哪几种办法？各自的代价是什么？",
  back: "<p>① 放进上下两端都能拿到的<b>共享对象</b>：但这个对象自己可能就是透传变量。② <b>全局变量</b>：同一进程里不能有两个独立实例（测试时常需要）。③ <b>context 对象</b>（作者最常用）：每个实例一个，引用存在主要对象里，只在构造函数中传递；但它仍有全局变量的大部分缺点，可能变成杂物袋，还要注意线程安全（字段最好不可变）。</p>" },
);

// —— 以下题目取材于书中给出的读者讨论组（2026-10）。场景和代码均为本站原创。——
window.APOSD_DRILLS.push(
{
  id: "ch07-ab-04", ch: 7, type: "ab", title: "一个只管转交的折扣方法",
  prompt: "<p>代码里很多地方手上拿着\"客户 + 订单号\"，却想对订单做操作，于是有人加了一批辅助方法。评审时有人指出它们是透传方法。两种改法：</p>",
  a: { label: "保留辅助方法，补上注释", code: `class OrderService {
public:
    // 给 customer 名下编号为 orderId 的订单打折。
    void applyDiscount(Customer& customer, OrderId orderId, Percent d) {
        customer.findOrder(orderId).applyDiscount(d);
    }
    // 取消 customer 名下编号为 orderId 的订单。
    void cancel(Customer& customer, OrderId orderId) {
        customer.findOrder(orderId).cancel();
    }
    // …… 还有七八个同样形状的方法
};` },
  b: { label: "在入口处就换成订单对象", code: `// 请求处理的最外层：把"客户 + 订单号"解析成订单，只做一次
Order& resolveOrder(const Request& req) {
    Customer& c = customers_.get(req.customerId());
    return c.findOrder(req.orderId());      // 找不到时抛 NotFound
}

void handleDiscount(const Request& req) {
    Order& order = resolveOrder(req);
    order.applyDiscount(req.percent());
}
void handleCancel(const Request& req) {
    resolveOrder(req).cancel();
}` },
  answer: "b",
  explain: `<p>A 里每个方法做的事只有"按订单号找到订单，再转交"，签名和 <code>Order</code> 上的方法几乎一样，是一排透传方法；注释改变不了这一点。B 没有去修这些方法，而是问：为什么到处都有人拿着两个值却想操作一个订单？在入口处换成 <code>Order</code> 之后，这些方法就没有存在的理由了。</p>
<p>这个思路来自 Ousterhout 在读者讨论组里对一个类似例子的回答：一处别扭，有时最好的修法是改另一处，把整个问题消掉（<a href="https://groups.google.com/g/software-design-book/c/D8tHfkacHq8">2026-03</a>，不在书里）。同一帖里也说，如果这样的调用确实很多、又没法在上层统一转换，留一个浅的辅助方法是可以容忍的。所以 A 不是"错"，只是先该试试 B。</p>`,
},
{
  id: "ch07-judge-03", ch: 7, type: "judge", title: "消除透传变量的代价由谁付",
  prompt: "<p>TLS 证书在 <code>main</code> 里读入，只有调用链最底层的 <code>Transport</code> 用得到，中间隔着 <code>Server</code>、<code>Session</code> 两层。有人提议：不要一层层传参数，改成在 <code>main</code> 里先构造 <code>Transport(cert)</code>，再把它传给 <code>Session</code> 的构造函数，再把 <code>Session</code> 传给 <code>Server</code> 的构造函数。这个方案的主要代价是什么？</p>",
  options: [
    "<code>main</code> 现在必须知道整条调用链谁用谁；哪一层的内部结构变了，<code>main</code> 都得跟着改",
    "三个对象都在 <code>main</code> 里构造，生命周期被拉长到整个进程；证书因此常驻内存，比按需逐层传参更不安全",
    "构造函数参数变多之后，<code>Session</code> 和 <code>Server</code> 的单元测试都必须先造出真实的 <code>Transport</code>，测试因此变慢",
    "没有明显代价：每个类只拿到自己直接用到的对象，证书不再穿过中间层，这是消除透传变量的标准做法",
  ],
  answer: 0,
  explain: `<p>透传参数的毛病是中间层被迫知道一个它们不关心的值。这个方案让中间层解脱了，却把"整条调用链长什么样"这份知识搬到了入口：<code>Server</code> 内部改成先经过一个新的 <code>Router</code>，<code>main</code> 就要改。链越深，入口要知道的越多。Ousterhout 在读者讨论组里就是用这个理由否定它的（<a href="https://groups.google.com/g/software-design-book/c/6Vs1trmcq9k">2022-09</a>，不在书里），并说这个问题大概没有完美解，每种办法都有缺点。</p>
<p>这不等于永远不能这样写。对象图很小、很稳定，或者本来就有一处专门负责装配时，代价可以接受。重点是看清代价落在谁身上，再和 context 等办法比。</p>`,
},
);
