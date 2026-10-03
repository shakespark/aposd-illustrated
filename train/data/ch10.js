// 第 10 章 把错误定义为不存在 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch10-flag-01", ch: 10, type: "flag", title: "每个命令处理函数都这样开头",
  prompt: "<p>一个文本协议服务器的命令处理函数。<code>req.arg(i)</code> 在第 i 个参数不存在时抛 <code>MissingArg</code>。</p>",
  code: `Reply cmdSetTtl(const Request& req) {
    std::string key;
    try {
        key = req.arg(1);
    } catch (const MissingArg&) {
        return Reply::error("SETTTL: missing key");
    }
    int64_t seconds;
    try {
        seconds = std::stoll(req.arg(2));
    } catch (const MissingArg&) {
        return Reply::error("SETTTL: missing seconds");
    } catch (const std::exception&) {
        return Reply::error("SETTTL: seconds must be an integer");
    }
    store_.setTtl(key, std::chrono::seconds(seconds));
    return Reply::ok();
}
// cmdGet、cmdPut、cmdIncr……另外 14 个处理函数里都有同样形状的 try/catch`,
  choices: ["repetition", "shallow", "passthrough", "none"], answer: ["repetition"], mark: [3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15],
  explain: `<p>真正干活的只有第 16、17 行，其余全是异常处理，而且同样的形状在十几个函数里各写一遍。这些 catch 做的事情几乎一样：拼一条错误信息，回一个错误响应。这是<strong>重复</strong>，缺的抽象是"中止当前请求"。</p>
<p>改法是<strong>异常聚合</strong>：让 <code>arg()</code> 和新增的 <code>intArg()</code> 在出错时抛一个 <code>RequestError</code>，错误信息在抛出处生成（"SETTTL: missing seconds" 这种话只有解析参数的地方最清楚）；分发器里只放一个 catch，把信息塞进错误响应。处理函数缩成三行，新加的命令自动获得同样的错误处理。书中 10.7 节 Web 服务器 <code>getParameter</code> 的例子说的是同一件事。</p>`,
},
{
  id: "ch10-flag-02", ch: 10, type: "flag", title: "缓存的异常列表",
  prompt: "<p>一个用户资料缓存，底下用本地 SQLite 文件做二级存储。</p>",
  code: `// 用户资料缓存：先查内存，未命中再查本地 SQLite 文件。
class ProfileCache {
public:
    // 可能抛出 SqliteBusy（数据库被另一个连接锁住）、
    // SqliteCorrupt（文件损坏）、SqliteIoErr。
    Profile get(UserId id);
};

// 调用方（三个不同的服务里都有类似的代码）：
try {
    auto p = cache.get(uid);
    render(p);
} catch (const SqliteBusy&) {
    std::this_thread::sleep_for(10ms);   // 等一下再试一次
    render(cache.get(uid));
} catch (const SqliteCorrupt&) {
    render(Profile::placeholder());
}`,
  choices: ["leakage", "repetition", "overexposure", "none"], answer: ["leakage", "repetition"], mark: [4, 5, 13, 14, 16],
  explain: `<p><strong>信息泄漏</strong>：第 4、5 行的异常把"底下用的是 SQLite"这个实现决定写进了接口。哪天换成 RocksDB，三个服务的 catch 全得改。<strong>重复</strong>：同一段"忙就等一下重试、坏了就用占位"的逻辑在三个服务里各抄一份。</p>
<p>这些异常大多可以在缓存内部消化掉。<code>SqliteBusy</code> 是暂时的，应该在缓存里<strong>屏蔽</strong>（设置忙等超时或内部重试）。至于 <code>SqliteCorrupt</code>，缓存本来就不是数据的权威来源，文件坏了可以当作"未命中"，丢掉文件重建，这就把错误<strong>定义掉</strong>了：对缓存来说，未命中是正常行为。顺带一提，第 15 行在 catch 里再次调用 <code>get</code>，它自己也可能抛异常，这就是书中 10.1 节说的"处理异常的代码又制造出新的异常"。</p>`,
},
{
  id: "ch10-flag-03", ch: 10, type: "flag", title: "一个写满为止的函数",
  code: `// 把 buf 的 n 个字节全部写入 fd。被信号打断（EINTR）或只写了一部分时
// 自动继续写，调用者看不到这两种情况。真正的错误（对端关闭、磁盘满……）
// 抛出 IoError，其中带 errno 和已写入的字节数。
void writeAll(int fd, const char* buf, size_t n) {
    size_t done = 0;
    while (done < n) {
        ssize_t r = ::write(fd, buf + done, n - done);
        if (r >= 0) { done += static_cast<size_t>(r); continue; }
        if (errno == EINTR) continue;
        throw IoError(errno, done);
    }
}`,
  choices: ["shallow", "passthrough", "special-general", "none"], answer: ["none"],
  explain: `<p>这是一个很好的<strong>异常屏蔽</strong>（exception masking）：<code>write(2)</code> 的两种"非正常但无害"的情况（被信号打断、部分写入）在最底层就地处理掉，上面成百上千个调用者都不用再写那个循环。它不是透传方法：签名和 <code>write</code> 相近，但语义不同（"全部写完"对比"写了多少算多少"），而且藏起了一段每个人都容易写错的逻辑。</p>
<p>同样重要的是它<strong>没有屏蔽过头</strong>：对端关闭、磁盘满这类调用者必须知道的错误照样抛出，还带上了已写入的字节数。屏蔽只该针对调用者不需要知道的情况（10.9 节）。</p>`,
},
{
  id: "ch10-flag-04", ch: 10, type: "flag", title: "通用重试工具",
  prompt: "<p>基础库里的一个重试辅助函数，全公司的服务都在用。</p>",
  code: `// 通用重试工具：对可重试的失败做指数退避。
template <class F>
auto withRetry(F&& op, int maxAttempts = 5) {
    for (int i = 1;; ++i) {
        try {
            return op();
        } catch (const PaymentDeclined& e) {
            // 支付被拒不能重试，但要先通知风控
            riskService().report(e.orderId());
            throw;
        } catch (const TransientError&) {
            if (i == maxAttempts) throw;
            std::this_thread::sleep_for(backoff(i));
        }
    }
}`,
  choices: ["special-general", "repetition", "conjoined", "none"], answer: ["special-general"], mark: [7, 8, 9, 10],
  explain: `<p>重试本身是一种合理的屏蔽机制，第 11～14 行也只对暂时性错误重试，没有问题。问题在第 7～10 行：一个通用机制里混进了只属于支付业务的特殊处理，于是基础库要依赖支付的异常类型和风控服务，<strong>通用与专用混杂</strong>。按第 9 章的说法，这种混杂同时在机制和具体用途之间造成了信息泄漏：风控规则一变，基础库就得跟着改。这里只有一段 catch，没有在多处重复出现。</p>
<p>改法：把这段 catch 移回支付代码里（在调用 <code>withRetry</code> 的地方，或者支付模块自己的边界上）。<code>withRetry</code> 只需要知道"哪些异常可以重试"。</p>`,
},
{
  id: "ch10-flag-05", ch: 10, type: "flag", title: "分发器里的一个 catch",
  code: `// 处理一条请求的过程中，任何地方都可以抛 RequestError 来中止这条请求；
// what() 是给客户端看的错误信息，在抛出处生成。
struct RequestError : std::runtime_error { using runtime_error::runtime_error; };

void Server::handle(Connection& conn, const Request& req) {
    try {
        auto it = handlers_.find(req.command());
        if (it == handlers_.end())
            throw RequestError("unknown command '" + req.command() + "'");
        conn.send(it->second(req));
    } catch (const RequestError& e) {
        conn.send(Reply::error(e.what()));   // 这条请求失败，连接和服务器照常运行
    }
    // 其他异常（std::bad_alloc、内部不变量被破坏……）不在这里捕获：
    // 它们说明的不是"这条请求有问题"，而是整个进程有问题。
}`,
  choices: ["repetition", "passthrough", "special-general", "none"], answer: ["none"],
  explain: `<p>这就是书中 10.7 节总结的"中止当前请求"模式：在请求循环顶部放<strong>一个</strong>处理器，处理所有"这条请求做不下去了"的情况。分发器只知道错误响应长什么样，不知道具体有哪些错误；抛出处知道错误的含义，但不知道响应格式。两份知识各在各的地方，新命令只要抛 <code>RequestError</code>（或它的子类）就能自动接入。</p>
<p>第 14、15 行的注释也很关键：作者强调这类异常要和"整个系统都完了"的异常<strong>明确区分开</strong>。如果在这里用 <code>catch (...)</code> 把一切都吞成一条错误响应，内部状态坏了的进程就会继续带病运行。</p>`,
},
{
  id: "ch10-flag-06", ch: 10, type: "flag", title: "给异常换个名字",
  prompt: "<p>分层架构里的仓储层（repository），据说是为了\"不让 DAO 的异常泄漏到上层\"。</p>",
  code: `class OrderRepository {
public:
    Order load(OrderId id) {
        try {
            return dao_.load(id);
        } catch (const DaoError& e) {
            throw RepositoryError(e.what());
        }
    }
    void save(const Order& o) {
        try {
            dao_.save(o);
        } catch (const DaoError& e) {
            throw RepositoryError(e.what());
        }
    }
    // remove、exists、listByUser 也都是这个样子
private:
    OrderDao dao_;
};`,
  choices: ["passthrough", "leakage", "overexposure", "none"], answer: ["passthrough"], mark: [3, 4, 5, 6, 7, 8],
  explain: `<p>每个方法都只是把调用原样转给 <code>dao_</code>，再把异常换个名字，这是<strong>透传方法</strong>。改名确实让上层看不到 <code>DaoError</code> 这个类型名，但该处理的情况一个都没少：上层还是要在同样多的地方处理 <code>RepositoryError</code>，信息也一模一样。</p>
<p>如果这一层要存在，就该让它真的承担一些异常处理：比如在内部重试暂时性的数据库错误（屏蔽），或者把"订单不存在"变成 <code>std::optional&lt;Order&gt;</code> 这种正常返回值。否则不如让上层直接用 DAO。</p>`,
},
{
  id: "ch10-ab-01", ch: 10, type: "ab", title: "删除一个可能不存在的键",
  prompt: "<p>会话存储的删除接口，以及登出时的清理代码：</p>",
  a: { label: "删不到就报错", code: `// 删除 key。key 不存在时抛 KeyNotFound。
void SessionStore::erase(const std::string& key);

// 登出：清理这个会话可能写过的所有键
for (const auto& k : {tokenKey(sid), cartKey(sid), csrfKey(sid)}) {
    try { store.erase(k); } catch (const KeyNotFound&) { /* 本来就可能没有 */ }
}` },
  b: { label: "确保它不存在", code: `// 确保 key 不再存在。返回调用前它是否存在（大多数调用者可以忽略）。
bool SessionStore::erase(const std::string& key);

// 登出：清理这个会话可能写过的所有键
for (const auto& k : {tokenKey(sid), cartKey(sid), csrfKey(sid)})
    store.erase(k);` },
  answer: "b",
  explain: `<p>清理代码往往不知道之前到底写了哪些键（尤其是上一步中途失败的时候），最省事的做法就是"可能存在的都删一遍"。A 让这种最常见的用法每次都得包一层 try/catch。B 只是把语义从"删除一个键"换成了"确保这个键不存在"，键本来就不存在时，活已经干完了，错误情况也就不存在了。这和书中 10.3 节 Tcl <code>unset</code> 的例子是同一个思路。</p>
<p>B 的返回值也值得注意：少数调用者确实关心"之前在不在"，它们可以看返回值，不需要靠异常。这正是 10.9 节说的：定义掉错误的前提是，真正需要这个信息的少数调用者另有办法拿到它。</p>`,
},
{
  id: "ch10-ab-02", ch: 10, type: "ab", title: "取一段子串",
  prompt: "<p>日志预览功能要取正文的前 80 个字节。两种 <code>slice</code>：</p>",
  a: { label: "", code: `// 返回 s 中下标落在 [begin, end) 内的字符；超出范围的部分直接忽略，
// begin >= end 时返回空串。不会失败。
std::string_view slice(std::string_view s, ptrdiff_t begin, ptrdiff_t end);

auto preview = slice(body, 0, 80);   // body 不足 80 字节也没关系` },
  b: { label: "", code: `// 返回 s[begin, end)。begin > end 或 end > s.size() 时抛 std::out_of_range。
std::string_view slice(std::string_view s, size_t begin, size_t end);

auto preview = slice(body, 0, std::min<size_t>(80, body.size()));` },
  answer: "a",
  explain: `<p>A 把"下标越界"这个错误定义掉了：它的定义本来就是"落在这个区间里的那些字符"，区间超出字符串时，答案自然就是重叠的那一部分。接口没变复杂，功能反而更多（负数、反向区间都有了明确含义），方法更深。B 让每个调用者都自己去夹紧下标，而且总会有人忘。书中 10.5 节 Java <code>substring</code> 的例子说的就是这件事，Python 的切片也是 A 的做法。C++ 自己的 <code>std::string::substr(pos, count)</code> 只做了一半：<code>count</code> 超长会自动截断，<code>pos &gt; size()</code> 却仍然抛异常。</p>
<p>B 在什么时候更合理？下标越界几乎一定意味着<strong>数据坏了</strong>的时候。例如解析一个带长度前缀的二进制记录，声明的长度超出缓冲区，说明输入损坏，这时悄悄截断会把损坏藏起来。区别在于：越界这件事对调用者是不是重要信息。</p>`,
},
{
  id: "ch10-ab-03", ch: 10, type: "ab", title: "内存分配失败",
  prompt: "<p>一个命令行索引工具（C 语言），里面有几百处动态分配。</p>",
  a: { label: "每处都检查", code: `char* buf = malloc(len + 1);
if (!buf) { log_error("out of memory"); return -ENOMEM; }
Entry* e = malloc(sizeof *e);
if (!e) { free(buf); log_error("out of memory"); return -ENOMEM; }
// 调用链上的每一层也都要检查 -ENOMEM，再继续往上返回……` },
  b: { label: "失败就退出", code: `// 分配失败时打印诊断信息并 abort()。在这个程序里内存耗尽几乎一定是 bug
// （比如泄漏），不值得、也很难恢复。
void* xmalloc(size_t n) {
    void* p = malloc(n);
    if (!p && n != 0) { fprintf(stderr, "xmalloc(%zu) failed\\n", n); abort(); }
    return p;
}

char* buf = xmalloc(len + 1);
Entry* e = xmalloc(sizeof *e);` },
  answer: "b",
  explain: `<p>对这个程序来说，内存耗尽时几乎没有可做的恢复：真有能释放的内存，早就该释放了。A 的检查要在几百处各写一遍，再沿调用链层层上传，而且总会漏掉几处，漏掉的地方会在别处解引用空指针，崩溃现场反而掩盖了真正的原因。B 把这类错误集中到一个包装函数里，直接崩溃并给出清楚的信息。这就是书中 10.8 节 <code>ckalloc</code> 的思路。</p>
<p>A 在哪些情况下合理？<strong>库</strong>通常不该替应用决定 abort；内存固定、必须降级运行的嵌入式系统；还有一种常见情形：分配的大小来自不可信的输入（客户端声明"我要发 4GB"），这时分配失败应该变成"拒绝这条请求"，而不是让整个服务器退出。能不能直接崩溃，要看具体应用。</p>`,
},
{
  id: "ch10-ab-04", ch: 10, type: "ab", title: "消息队列客户端遇到断线",
  prompt: "<p>一个消息队列客户端库的发布接口。网络偶尔会断，几秒后恢复。</p>",
  a: { label: "", code: `// 发布一条消息。连接断开时自动重连并重发；每条消息带客户端生成的唯一 id，
// 服务端据此去重，所以重发不会造成重复投递。
// 只有到 deadline 仍无法送达时才返回错误。
Status Publisher::publish(const Message& m, Deadline d);` },
  b: { label: "", code: `// 发布一条消息。连接断开时抛 ConnectionLost，调用者可以自行决定
// 是否调用 reconnect() 后重试。
void Publisher::publish(const Message& m);
void Publisher::reconnect();` },
  answer: "a",
  explain: `<p>短暂断线对几乎所有调用者来说都是同一个处理办法：重连、重发。A 在库里统一做掉（<strong>屏蔽</strong>），就像 TCP 在内部重传丢掉的包（10.6 节）。B 的"调用者可以自行决定"听起来很灵活，但作者在 10.2 节专门反驳过这种理由：库自己都想不清楚怎么办的事，调用者多半也想不清楚，结果是每个调用者各写一份重试，写法还各不相同。</p>
<p>A 还处理了一个容易漏掉的<strong>次生异常</strong>：消息可能其实已经送到、只是确认丢了，盲目重发会造成重复投递（书中 10.1 节重发网络包的例子）。唯一 id 加服务端去重就是为它准备的。A 也没有屏蔽过头：超过 deadline 仍然会报错，调用者需要的信息没有丢。</p>`,
},
{
  id: "ch10-ab-05", ch: 10, type: "ab", title: "日志落盘失败",
  prompt: "<p>一个键值存储的预写日志（WAL）。客户端收到 \"OK\" 就认为写入已经持久化了。</p>",
  a: { label: "不让上层操心", code: `// 把缓冲区里的记录写入日志文件并 fsync。
void Wal::flush() {
    if (!writeFully(fd_, buf_) || ::fsync(fd_) < 0) {
        log_warn("wal flush failed: %s", strerror(errno));   // 记一笔，继续
    }
    buf_.clear();
}
// 调用者：wal.flush(); reply(client, "OK");` },
  b: { label: "失败要让上层知道", code: `// 把缓冲区里的记录写入日志文件并 fsync。失败时抛 WalError：
// 这批记录不能视为已持久化，调用者不能向客户端确认它们。
void Wal::flush() {
    if (!writeFully(fd_, buf_) || ::fsync(fd_) < 0)
        throw WalError(errno);
    buf_.clear();
}
// 调用者：wal.flush(); reply(client, "OK");   // 抛出时由分发器回复错误` },
  answer: "b",
  explain: `<p>A 把异常屏蔽过头了。对存储系统来说，"数据有没有真正落盘"正是它对用户承诺的核心价值，客户端靠它决定能不能把一笔写入当作完成。A 让调用者对失败毫不知情，照样回 "OK"。书中 10.9 节学生团队把所有网络错误都吞掉的例子，和这里是同一类错误：只有调用者不需要的异常信息才能藏起来。</p>
<p>本站补充：落盘失败在真实系统里比看起来更棘手。Linux 上 <code>fsync</code> 报错之后，内核可能已经丢掉了那些脏页，再调用一次 <code>fsync</code> 可能"成功"，数据却没写进去。PostgreSQL 在 2018 年发现这个问题后，改成 <code>fsync</code> 失败就直接让数据库崩溃，重启后从日志恢复。这正好是 10.8 节"直接崩溃"和 10.7 节"错误提升"的真实案例。</p>`,
},
{
  id: "ch10-judge-01", ch: 10, type: "judge", title: "索引坏了",
  prompt: "<p>命令行工具 <code>logpack</code>（压缩归档日志）启动时加载一个索引文件，发现索引的内部不变量被破坏：某个偏移量指向了文件末尾之后。这个工具没有修复索引的逻辑。最合适的处理是：</p>",
  options: [
    "在每个读取索引的函数里检查偏移量并返回错误码，一层层传回 <code>main</code>",
    "打印清楚的诊断信息（哪个文件、哪个偏移量出错）后直接退出",
    "把越界的偏移量截断到文件末尾，让程序继续运行",
    "跳过这条索引项，当它不存在",
  ],
  answer: 1,
  explain: `<p>数据结构内部不一致，通常说明有 bug 或者文件损坏，工具本身又没有修复手段，这正是 10.8 节说的适合直接崩溃的情形：很少发生、难以处理，打印诊断信息后退出最简单，信息清楚的话用户还能据此重建索引。</p>
<p>层层返回错误码，增加了大量很少执行的代码，最终的处理还是"退出"。截断偏移量或者跳过索引项看起来像"把错误定义掉"，其实是把损坏藏了起来，用户可能拿到残缺的归档却毫不知情。只有当调用者不需要这个信息时，才能把错误定义掉；"索引坏了"恰恰是用户必须知道的。</p>`,
},
{
  id: "ch10-judge-02", ch: 10, type: "judge", title: "哪种错误值得\"提升\"？",
  prompt: "<p>一个分片存储服务已经有一套完善、经常演练的机制：节点宕机后，从其他节点的副本重建它的数据。下面哪种错误最适合\"提升\"成\"当作这个节点宕机来处理\"？</p>",
  options: [
    "某个对象的校验和不匹配（极少发生）",
    "客户端请求里的 key 超过了长度上限",
    "和某个副本之间偶尔丢掉一个心跳包",
    "磁盘使用率超过了 80%",
  ],
  answer: 0,
  explain: `<p><strong>错误提升</strong>（error promotion）的意思是：不为一个小错误单独写恢复机制，而是把它当成一个更大的、反正必须处理的错误，复用那套已有的恢复路径。书中 10.7 节的 RAMCloud 正是把单个对象损坏升级成整台服务器崩溃。好处是少写一套恢复代码，而且崩溃恢复被执行得更频繁，其中的 bug 也更容易暴露。</p>
<p>代价是恢复成本变大，所以<strong>只适合罕见的错误</strong>。心跳丢包太频繁，每丢一个就重建一个节点显然不行，作者也明确说过不能每丢一个网络包就让服务器崩溃。key 太长是这条请求自己的问题，应该用"中止当前请求"的方式回一个错误。磁盘使用率 80% 根本不是错误，而是需要报警和扩容的状态。</p>`,
},
{
  id: "ch10-judge-03", ch: 10, type: "judge", title: "永远成功的 RPC",
  prompt: "<p>一个 RPC 库为了\"让上层不用操心网络问题\"，在内部捕获并丢弃所有超时和连接错误：<code>call()</code> 永远\"成功\"，失败时返回一个默认构造的响应。按本章的标准，这个设计的问题在于：</p>",
  options: [
    "它用了屏蔽，而屏蔽这种技术本身就是有害的",
    "它应该改成聚合：让所有网络错误一路传到 <code>main</code>，在那里统一 catch",
    "被藏起来的信息恰恰是调用者构建可靠程序所必需的；只有调用者不需要的异常信息，才可以在模块内部定义掉或屏蔽",
    "没有问题，这正是\"把复杂性往下拉\"",
  ],
  answer: 2,
  explain: `<p>这几乎就是书中 10.9 节的例子：一个学生团队的网络模块吞掉了所有网络异常，用它的应用没办法知道消息丢了或者对端挂了，也就不可能做得可靠。这种情况下，模块必须把异常暴露出来，即使接口因此变复杂。</p>
<p>屏蔽本身没有错，TCP 屏蔽丢包就是好例子。区别在于 TCP 屏蔽的是调用者不需要知道的事（某个包丢了又补上了），而这个库屏蔽的是调用者必须知道的事（这次调用根本没成功）。"一路传到 <code>main</code> 统一处理"也不对：聚合的意义是在一个<strong>能做出正确反应</strong>的地方集中处理，<code>main</code> 并不知道每个 RPC 失败后该怎么办。</p>`,
},
{
  id: "ch10-judge-04", ch: 10, type: "judge", title: "\"抛异常能帮我们抓 bug\"",
  prompt: "<p>你提议把 <code>slice()</code> 改成越界时自动截断。同事反对：\"越界抛异常能帮我们发现 bug，改了以后 bug 会被藏起来。\"作者对这类反对意见的回应，最接近下面哪一项？</p>",
  options: [
    "同意：所以应该保留异常，并在每个调用处加上 try/catch",
    "异常从来抓不到 bug，这种担心没有根据",
    "应该改用断言：调试版本里检查，发布版本里去掉",
    "抛错的写法也许能抓到一些 bug，但它增加的复杂性（额外的检查代码、被忘掉的检查）会带来别的 bug；减少 bug 最好的办法是让软件更简单",
  ],
  answer: 3,
  explain: `<p>作者在 10.5 节正面回应过这个问题：抛错的做法确实可能抓到一些 bug，但调用者要么得写额外的代码去避开或忽略这个错误（代码多了，出错机会也多了），要么忘了写，运行时冒出意想不到的异常。整体来看，减少 bug 靠的是让软件更简单。</p>
<p>作者并没有说异常从来抓不到 bug，也没有讨论断言。本站补充：如果某个越界在你的场景里几乎一定意味着调用者写错了或数据坏了（而不是"取一段可能偏短的预览"这种正常需求），那么越界就是重要信息，不该被定义掉。这和 10.9 节的标准是一致的。</p>`,
},
{
  id: "ch10-write-01", ch: 10, type: "write", title: "把\"已存在\"定义掉",
  prompt: `<p>下面是一个文件系统辅助库的接口和它最常见的用法。请重新定义这个操作，让绝大多数调用者不需要任何异常处理。写出新的声明和接口注释，并说明<strong>还剩下哪些错误</strong>、为什么它们应该留下。</p>`,
  code: `// 创建目录 path。父目录不存在时抛 NoSuchDirectory；path 已存在时抛 AlreadyExists。
void fs::makeDir(const std::string& path);

// 服务启动时的典型调用：
try { fs::makeDir(dataDir); } catch (const AlreadyExists&) {}
try { fs::makeDir(dataDir + "/wal"); } catch (const AlreadyExists&) {}
try { fs::makeDir(dataDir + "/snapshots"); } catch (const AlreadyExists&) {}`,
  reference: `<pre><code class="lang-cpp">// 确保 path 是一个目录：缺少的父目录会一并创建；已经是目录时什么也不做。
// 返回这次调用是否新建了 path（大多数调用者可以忽略）。
// 失败时抛 FsError：path 或某个父路径已存在但不是目录、没有权限、磁盘已满等。
bool fs::ensureDir(const std::string&amp; path);

fs::ensureDir(dataDir + "/wal");
fs::ensureDir(dataDir + "/snapshots");</code></pre>
<p>语义从"创建一个目录"变成"确保这个目录存在"，于是 <code>AlreadyExists</code> 和 <code>NoSuchDirectory</code> 两个错误都消失了：前者说明活已经干完，后者被"顺便创建父目录"吸收（类似 <code>mkdir -p</code>）。</p>
<p>剩下的错误应该保留：路径被一个普通文件占着、没有权限、磁盘满。在这些情况下调用者确实没法继续，也需要知道原因。对一个服务的启动代码来说，它们很可能直接导致"打印信息后退出"，这正好是 10.8 节"直接崩溃"的用武之地。</p>`,
  rubric: ["把语义改成\"确保存在\"，已存在不再是错误", "处理了父目录不存在的情况（一并创建，或者明确说明仍然报错）", "保留了调用者确实需要知道的错误（路径是普通文件、权限、磁盘满）", "给少数关心\"是否新建\"的调用者留了获取信息的办法（返回值等），而不是靠异常"],
  explain: `<p>这道题的关键在于找到一个让"错误"自然消失的定义，而不是在函数内部偷偷吞掉异常。好的新定义读起来应该完全自然：没人会觉得"确保目录存在，而它已经存在"是一种错误。</p>`,
},
{
  id: "ch10-write-02", ch: 10, type: "write", title: "给每种异常选一种处理方式",
  prompt: `<p>一个图片缩略图服务：接收 HTTP 请求，从对象存储读原图，解码、裁剪、缩放，结果缓存在本地磁盘。下面是它会遇到的 7 种异常情况。请为每一种选择本章的一种技术（<strong>定义掉 / 屏蔽 / 聚合 / 直接崩溃</strong>），或者判断它<strong>必须暴露给调用者</strong>，并各写一句理由。</p>
<ol>
<li>请求里的 <code>width</code> 参数不是数字</li>
<li>删除某张缩略图的缓存文件时，文件本来就不存在</li>
<li>从对象存储读原图时偶发连接重置，立刻重试一次通常就好</li>
<li>启动时发现配置的缓存目录不可写</li>
<li>解码库报告原图已损坏</li>
<li>进程内存分配失败</li>
<li>请求的裁剪区域有一部分超出了图片边界</li>
</ol>`,
  reference: `<ol>
<li><strong>聚合</strong>：参数解析函数抛"请求错误"，错误信息在抛出处生成（"width must be a positive integer"），由分发器统一回 400。所有处理函数都不写 catch。</li>
<li><strong>定义掉</strong>：删除缓存的语义是"确保它不在缓存里"，不存在就是已经完成。</li>
<li><strong>屏蔽</strong>：在对象存储客户端内部重试。读操作是幂等的，重试是安全的；重试几次仍失败，再作为真正的错误往上报。</li>
<li><strong>直接崩溃</strong>：启动阶段就打印清楚的信息并退出。服务带着不能用的缓存继续运行，只会让问题以更隐蔽的方式出现。</li>
<li><strong>必须暴露</strong>（通过聚合的请求错误回给客户端，例如 422）：客户端需要知道这张图本身有问题，不能用空白图或旧图冒充成功。</li>
<li><strong>直接崩溃</strong>：在大多数服务里内存耗尽意味着 bug 或配置严重失误，交给进程管理器重启。例外：如果分配大小由请求决定（超大图片），应该先按尺寸上限拒绝请求。</li>
<li><strong>定义掉</strong>：裁剪区域定义为"请求区域与图片的交集"，交集为空时再作为请求错误。</li>
</ol>`,
  rubric: ["把参数类错误交给一个顶层处理器（聚合），而不是在每个处理函数里各自处理", "至少找出两处可以通过改语义来定义掉的错误（删除不存在的缓存、裁剪越界）", "屏蔽重试时考虑了操作是否幂等，并在重试仍失败时继续上报", "认识到\"原图损坏\"是调用者需要的信息，不能屏蔽或定义掉", "区分了\"这条请求失败\"和\"整个进程该退出\"两类错误"],
  explain: `<p>可以留意你的答案里有多少个 catch 位置：理想情况下只剩分发器里的一个，加上对象存储客户端内部的一个，外加一个分配包装函数。本章的核心就是<strong>减少必须处理异常的地方</strong>，而不是减少错误本身。</p>`,
},
{ id: "ch10-card-01", ch: 10, type: "card",
  front: "本章减少异常处理位置的<b>四种技术</b>是什么？各自把处理器放在哪里？",
  back: "<p>① <b>定义掉</b>：改语义，让正常行为覆盖这种情况，根本没有处理器（最优先）。② <b>屏蔽</b>：在底层就地处理，上层感知不到；常放在被很多人调用的库函数里。③ <b>聚合</b>：让异常往上传几层，在高处用一个处理器接住一大批（例如请求循环顶部的\"中止当前请求\"）。④ <b>直接崩溃</b>：难以处理又很少发生的错误，打印诊断信息后退出。屏蔽和聚合的共同点：都把处理器放在能接住最多异常的位置。</p>" },
{ id: "ch10-card-02", ch: 10, type: "card",
  front: "为什么说异常处理对复杂性的贡献<b>不成比例</b>地大？",
  back: "<p>异常打乱了正常流程，不论\"继续往前做\"还是\"中止并上报\"都不简单（中止要先恢复一致状态）；处理过程本身会制造次生异常（重发造成重复、备份也丢了）；语言的异常语法冗长，难以把处理代码和出错位置对应起来；处理代码很少执行、难以测试，\"没执行过的代码就不会正确工作\"。书中引用的研究发现，分布式数据密集型系统中超过 90% 的灾难性故障源于错误处理不当。</p>" },
{ id: "ch10-card-03", ch: 10, type: "card",
  front: "什么时候<b>不能</b>把异常定义掉或屏蔽掉？",
  back: "<p>当模块外的调用者<b>需要</b>这个异常信息的时候（10.9 节）。例如网络模块把所有网络错误吞掉，应用就无法知道消息丢了、对端挂了，也就做不成可靠的程序。不重要的东西要藏起来，越多越好；重要的东西必须暴露。<code>unset</code>、<code>substring</code> 之所以可以定义掉，是因为少数关心这些特殊情况的调用者另有办法拿到信息。</p>" },
);

// —— 取材于读者讨论组的第二批题目（2026-10，B 档讨论串）。场景和代码均为本站原创。——
window.APOSD_DRILLS.push(
{
  id: "ch10-ab-06", ch: 10, type: "ab", title: "下载大文件总是超时",
  prompt: "<p>HTTP 客户端默认 30 秒超时。下载大文件的调用总被误杀，于是到处都是手工调大超时的代码。两种改法：</p>",
  a: { label: "按文件大小估算超时", code: `// 调用处
auto size = client.head(url).contentLength();
auto timeout = std::max(30s, estimateSeconds(size, kMinExpectedBytesPerSec));
Options opts;
opts.timeout = timeout;
client.get(url, opts);

// 库的接口不变：
// timeout：整个请求必须在这段时间内完成，否则抛 TimeoutError。` },
  b: { label: "换一个超时的定义", code: `// 库的接口：
// idleTimeout（默认 30 秒）：连续这么长时间没有收到任何数据，
// 就认为对端失去响应，抛 TimeoutError。只要数据还在持续到达，
// 请求可以运行任意长的时间。
// 需要限制总时长的调用者另外传 deadline（默认不限）。

// 调用处
client.get(url);` },
  answer: "b",
  explain: `<p>A 是在"处理"大文件这个特殊情况：每个调用者都要多发一次请求、猜一个速率、算一个数，猜错了照样误杀或者挂很久。B 没有处理它，而是换了定义：超时的本意是发现"对端没反应了"，那就直接按"多久没有进展"来判，文件大小不再相关，绝大多数调用者回到了一行。这是 10.3 节的手法。</p>
<p>这个定义是 Ousterhout 在读者讨论组里回答同一个问题时提出的（<a href="https://groups.google.com/g/software-design-book/c/4LOLZArwQEk">2023-06</a>，不在书里）。B 里的 <code>deadline</code> 是本站加的：只按进展计时，管不住每隔几秒才吐一个字节的对端；面对不可信的服务器，或者调用者自己有时限时，仍然需要一个总时限。它默认不限，所以不需要的人不必知道。</p>`,
},
{
  id: "ch10-judge-05", ch: 10, type: "judge", title: "定义掉了，还是吞掉了",
  prompt: "<p>接口 <code>setAvailability(user, slots)</code> 原来在同一个用户重复提交、或一次提交里有重叠时间段时报错。为了\"把错误定义掉\"，改成后提交的覆盖先提交的、重叠时取最后一个。错误处理代码少了一大半。评审时最该追问的是什么？</p>",
  options: [
    "覆盖语义比报错语义多了多少行实现代码：如果实现变长了，就说明复杂性只是从调用者挪到了模块内部，没有净收益",
    "接口文档有没有同步更新：只要注释里写明了\"后提交的覆盖先提交的\"，调用者就有责任自己保证不重复提交",
    "原来那个报错有没有人靠它发现问题：重复提交若通常是调用方的 bug，覆盖就成了静默失败，应让调用方明说要哪一种",
    "性能有没有变化：覆盖需要先查找再替换，比直接报错多一次查找，在高并发下可能成为新的瓶颈",
  ],
  answer: 2,
  explain: `<p>把错误定义掉的前提是：新的定义对所有调用者都是他们想要的。"我想更新我的空闲时间"的调用者想要覆盖；"我以为这是第一次提交"的调用者遇到重复，多半是自己出了 bug，覆盖会把它藏起来。这正是 10.9 节说的别做过头：重要的信息不能被藏掉。</p>
<p>读者讨论组里有人拿几乎一样的接口来问，Ousterhout 同意这种担心，建议加一个类似命令行 <code>-f</code> 的强制参数，由调用方选严格还是覆盖（<a href="https://groups.google.com/g/software-design-book/c/8zkWyisdVBA">2021-08</a>，不在书里）。同一串里读者给了另一条路：重新想想接口围绕的概念，有时换一个概念，冲突就不存在了。实现变长本身不是问题（那正是往下拉）；写了文档也不能让一个容易误用的语义变得不容易误用。</p>`,
},
{
  id: "ch10-judge-06", ch: 10, type: "judge", title: "异常还是 std::optional",
  prompt: "<p>解析器最底层的 <code>readToken()</code> 可能遇到非法输入。它上面隔着七八层调用（表达式、语句、函数、文件……），只有最外层的 <code>compile()</code> 知道该怎么向用户报告。用返回 <code>std::optional&lt;Token&gt;</code> 还是抛异常？</p>",
  options: [
    "返回 <code>std::optional</code>：错误写在了返回类型里，每一层都必须显式检查并继续往上返回，控制流完全可见，比异常更容易推理",
    "抛异常：中间七八层对这个错误无事可做，返回值会逼着每一层都检查并转交；让它一路退到真正能处理的地方，总的复杂性更低",
    "两者都不用：把非法输入定义成一种特殊的 <code>Token::Invalid</code>，让上层像处理普通记号一样处理它，错误就被定义掉了",
    "抛异常，但每一层都要 <code>catch</code> 之后补充上下文再重新抛出，这样最外层才能拿到完整的调用路径用于报告",
  ],
  answer: 1,
  explain: `<p>特殊返回值看起来绕开了异常的复杂性，代价是每个调用者都得检查。中间层如果除了"原样往上交"之外无事可做，这些检查就是纯粹的负担，而且漏掉一处就会带着空值继续跑。Ousterhout 在读者讨论组里的判据是：处理这种情况的最好办法如果是退出很深的调用栈，异常的总复杂性更低（<a href="https://groups.google.com/g/software-design-book/c/3hgHk9NhZL4">2023-07</a>，不在书里；同时说明这只是个人看法，没有完美的办法）。这也是 10.7 节"聚合"的做法：在一个地方统一处理。</p>
<p>反过来，如果紧挨着的调用者就能处理（查找没找到、可选的配置项缺失），<code>std::optional</code> 更合适。逐层捕获再重抛等于把返回值检查的负担换了个写法搬回来。把非法输入做成一种记号并没有定义掉错误：上层照样得在每个用到记号的地方判断它。</p>`,
},
);
