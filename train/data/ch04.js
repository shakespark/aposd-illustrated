// 第 4 章 模块应该深 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch04-flag-01", ch: 4, type: "flag", title: "给标准容器包一层",
  prompt: "<p>项目规范要求\"不要直接使用标准容器，要包一层有业务含义的类型\"。于是有了下面这个类，项目里到处都在用它。</p>",
  code: `// 订单里的商品列表
class ItemList {
public:
    void addItem(const Item& item)      { items_.push_back(item); }
    void removeLastItem()               { items_.pop_back(); }
    size_t getItemCount() const         { return items_.size(); }
    const Item& getItem(size_t i) const { return items_[i]; }
private:
    std::vector<Item> items_;
};`,
  choices: ["shallow", "none"], answer: ["shallow"], mark: [4, 5, 6, 7],
  explain: `<p>第 4～7 行的每个方法都只是把 <code>std::vector</code> 的一个操作换了个名字。使用者要多学一套名字，可 <code>vector</code> 的规矩一条也没被藏住：空列表上调用 <code>removeLastItem</code> 仍是未定义行为，<code>getItem</code> 仍不检查越界。与此同时，迭代器、范围 for、标准算法都用不了了，迟早会有人加一个 <code>getItems()</code> 把内部的 vector 交出去。<strong>接口变多了，隐藏的东西是零</strong>，这是浅模块。</p>
<p>注意它和"链表天生就浅"不同：链表自己提供了基本功能，只是杠杆小；这个类是在现成的接口外面再包一层，自己什么功能都没加。改法二选一：直接用 <code>std::vector&lt;Item&gt;</code>（最多加个类型别名）；或者让这个类真正承担职责，比如合并同一商品的数量、维护"每单最多 100 件"的约束，这样它才藏住了东西。</p>`,
},
{
  id: "ch04-flag-02", ch: 4, type: "flag", title: "很短，但浅吗？",
  prompt: "<p>下面这个函数只有一行公开声明，实现大约 200 行（只列出了注释提纲）。</p>",
  code: `// 把 text 中的相对日期表达（"明天下午3点"、"下周一"、"3 days ago"）
// 解析成绝对时间。now 是参照时刻。解析失败返回 std::nullopt。
// "周一"等不带修饰的星期，指 now 之后最近的那一天。
std::optional<TimePoint> parseRelativeDate(std::string_view text, TimePoint now);

// 实现提纲：
//   分词与中英文数字归一化；星期/月份/上下午词表；
//   "下下周"等嵌套修饰的递归处理；跨月、闰年、夏令时修正；
//   按上面约定的规则做歧义消解……`,
  choices: ["shallow", "none"], answer: ["none"],
  explain: `<p>这是一个<strong>深</strong>函数：接口只有两个参数、一个可选返回值和三行注释，背后却隐藏了分词、词表、递归、日历修正和歧义消解。调用者完全不需要知道这些。</p>
<p>注意第 3 行注释：同一句"周一"可以有不同的解释，得到不同的日期，调用者需要知道函数选了哪一种，所以这条策略属于接口，必须写进接口注释（4.2 节：接口的非正式部分只能靠注释说明）。怎样实现这条规则则留在实现里。</p>
<p>判断深浅看的是<strong>接口的复杂度和隐藏的功能之比</strong>，不是代码行数，也不是"接口短不短"。flag-01 里 <code>ItemList</code> 的每个方法也很短，但它们背后什么都没藏。</p>`,
},
{
  id: "ch04-flag-03", ch: 4, type: "flag", title: "一个功能很全的类",
  prompt: "<p>一个表示 HTTP 请求的类，团队觉得\"封装得很好，什么都能设置\"。</p>",
  code: `class HttpRequest {
public:
    void setMethod(const std::string& m)      { method_ = m; }
    const std::string& method() const         { return method_; }
    void setPath(const std::string& p)        { path_ = p; }
    const std::string& path() const           { return path_; }
    void setHeader(const std::string& k, const std::string& v) { headers_[k] = v; }
    std::string header(const std::string& k) const;  // 不存在返回 ""
    void setBody(const std::string& b)        { body_ = b; }
    const std::string& body() const           { return body_; }
    void setContentLength(size_t n)           { contentLength_ = n; }
    size_t contentLength() const              { return contentLength_; }
    // ……还有 14 个同样形式的 getter/setter
private:
    std::string method_, path_, body_;
    std::map<std::string, std::string> headers_;
    size_t contentLength_ = 0;
};`,
  choices: ["shallow", "none"], answer: ["shallow"], mark: [11, 12],
  explain: `<p>类很大，但几乎每个公开方法都只是对一个字段的读写，<strong>接口的复杂度≈实现的复杂度</strong>。这是浅模块。</p>
<p>更糟的是第 11、12 行：<code>contentLength</code> 本该由 <code>body</code> 自动推出来，现在却要求调用者自己保持两者一致——一个本可以藏起来的细节被推到了每个调用者身上。更深的设计会让 <code>setBody</code> 自动维护长度，并干脆删掉 <code>setContentLength</code>。</p>`,
},
{
  id: "ch04-flag-04", ch: 4, type: "flag", title: "RAII 文件句柄",
  code: `// 拥有一个打开的文件；析构时自动关闭。不可复制，可移动。
class File {
public:
    explicit File(const std::string& path, Mode mode);   // 打不开时抛 IoError
    size_t read(std::span<std::byte> buf);               // 返回 0 表示到达末尾
    void write(std::span<const std::byte> data);         // 全部写完才返回
    ~File();
    File(File&&) noexcept;
    File& operator=(File&&) noexcept;
private:
    int fd_;
};`,
  choices: ["shallow", "none"], answer: ["none"],
  explain: `<p>接口很小：构造、读、写，外加编译器帮你调用的析构和移动。它隐藏的东西却不少：系统调用的错误码、<code>write</code> 的部分写入需要循环重试、<code>EINTR</code> 重试、确保每条路径都会关闭文件。</p>
<p>特别是"析构时自动关闭"：它和书中垃圾回收的例子是同一个道理——<strong>把一整项接口（手动释放）直接从系统里删掉</strong>，接口反而变小了。</p>`,
},
{
  id: "ch04-ab-01", ch: 4, type: "ab", title: "HTTP 客户端的连接复用",
  prompt: "<p>一个内部 HTTP 客户端库，服务之间的调用都用它。两种设计：</p>",
  a: { label: "连接池由调用方创建并传入", code: `auto pool = std::make_shared<ConnectionPool>(/*maxPerHost=*/8);
HttpClient client;
auto resp = client.get("https://inventory.internal/v1/items/42",
                       {.pool = pool});
// 不传 pool 也能正常工作：每个请求都新建一条 TCP + TLS 连接，用完即关` },
  b: { label: "默认复用连接", code: `HttpClient client;                  // 内部自带连接池
auto resp = client.get("https://inventory.internal/v1/items/42");

// 极少数场景（如压测时专门测量冷连接的延迟）可以关掉复用：
HttpClient cold({.reuseConnections = false});` },
  answer: "b",
  explain: `<p>几乎所有调用方都希望复用连接。A 让<strong>每个</strong>调用方都必须知道连接池的存在、自己创建、管好它的生命周期、每次请求都记得传进去；忘了也不会报错，只是每个请求都多一次 TCP 握手和 TLS 握手，延迟和对端负载悄悄翻倍，往往要到线上才被发现。B 让最常见的用法最简单，把"不复用"这个罕见需求放进一个可选参数，大多数人根本不必知道它存在。书中 4.7 节用 Java 早期的文件流需要手动加缓冲层说明的是同一件事。</p>
<p>A 这种"像积木一样自己组装"的风格也有更合适的时候：当可选的层很多、彼此独立、不同调用方的组合方式各不相同时，例如数据流上要不要压缩、要不要加密、要不要限速，做成可以自由叠加的组件，比在一个类里塞进所有开关组合更清楚。即便如此，最常见的那种组合也应该有一个现成的入口。</p>`,
},
{
  id: "ch04-ab-02", ch: 4, type: "ab", title: "谁来负责释放？",
  prompt: "<p>一个图像解码库，两种接口：</p>",
  a: { label: "", code: `Image* img = decoder.decode(bytes);
// ... 使用 img ...
decoder.release(img);    // 必须用同一个 decoder 释放，不能 delete` },
  b: { label: "", code: `std::unique_ptr<Image> img = decoder.decode(bytes);
// ... 使用 img ...
// 离开作用域自动释放；decoder 先销毁也没关系` },
  answer: "b",
  explain: `<p>A 的接口里有两条<strong>非正式</strong>约束：必须调用 <code>release</code>，而且必须用同一个 decoder。编译器检查不了，调用者只能从文档里知道，忘了就是泄漏或崩溃。</p>
<p>B 把释放这件事整个从接口里拿掉了（同时 B 隐含要求 <code>Image</code> 不依赖 decoder 的生命周期，这是实现方该解决的问题）。功能不变、接口变小，模块更深。</p>`,
},
{
  id: "ch04-judge-01", ch: 4, type: "judge", title: "哪些属于\"接口\"？",
  prompt: "<p>关于 C 标准库的 <code>strtok(char* str, const char* delim)</code>，下列哪一项<strong>不</strong>属于它的接口？</p>",
  options: [
    "第一次调用传入字符串，之后传 <code>NULL</code> 继续切分同一个字符串",
    "它会把原字符串里的分隔符改写成 <code>'\\0'</code>",
    "它用一个静态变量记住切到哪里了，所以不能在两个线程里同时用，也不能嵌套切分两个字符串",
    "glibc 的实现内部借助 <code>strspn</code> 等字符串函数来定位分隔符",
  ],
  answer: 3,
  explain: `<p>"之后传 <code>NULL</code> 继续切分"、"改写分隔符"、"静态状态导致不能多线程或嵌套使用"这三条都是<strong>非正式接口</strong>：函数签名里看不出来，但调用者不知道就会用错，所以它们属于接口。内部调用了哪些辅助函数是实现细节，换一种实现调用者也不会受影响。</p>
<p><code>strtok</code> 是个好例子：正式接口只有两个参数，非正式接口却又多又危险。书里说大多数接口的非正式部分比正式部分更大、更复杂，指的就是这种情况。</p>`,
},
{
  id: "ch04-judge-02", ch: 4, type: "judge", title: "抽象的两种失败",
  prompt: `<p>一个键值存储库的 <code>put(key, value)</code> 注释只写着"保存键值对"。实际上它先写进内存，每 5 秒才批量写盘一次；进程崩溃时最近 5 秒的数据会丢。一位同事基于这个库实现了转账记录。这是哪种问题？</p>`,
  options: [
    "抽象包含了不重要的细节，增加了使用者的认知负担",
    "虚假的抽象（false abstraction）：省略了对使用者很重要的细节，看起来简单，其实不然",
    "浅模块：接口和实现一样复杂",
    "没有问题：持久化时机属于实现细节，本来就不该出现在接口里",
  ],
  answer: 1,
  explain: `<p>抽象只能省略<strong>真正不重要</strong>的细节。对需要崩溃后保住数据的调用者来说，"什么时候真正落盘"非常重要，必须出现在接口里（例如说明延迟写入，并提供 <code>sync()</code>）。省略它就得到一个虚假的抽象。</p>
<p>这和书中文件系统的例子是同一个道理：块分配可以藏起来，但写回规则必须让数据库这类调用者看得到。</p>`,
},
{
  id: "ch04-write-01", ch: 4, type: "write", title: "写出一个函数的完整接口",
  prompt: `<p>下面是一个缓存类的方法声明。请列出它的<strong>完整接口</strong>：正式部分是什么？还有哪些非正式部分是调用者必须知道的？（实现在下方，可以读，但答案只写调用者需要知道的东西。）</p>`,
  code: `class LruCache {
public:
    explicit LruCache(size_t capacity);
    // ???
    const Value* get(const Key& k);
private:
    // get 命中时会把该项移到链表头部；
    // put 可能淘汰链表尾部的项并释放它的 Value。
};`,
  reference: `<p><strong>正式部分</strong>：方法名 <code>get</code>，参数 <code>const Key&amp;</code>，返回 <code>const Value*</code>，非 const 方法（说明它会修改缓存状态）。</p>
<p><strong>非正式部分</strong>（调用者必须知道）：</p>
<ul>
<li>未命中时返回 <code>nullptr</code>。</li>
<li>返回的指针<strong>只在下一次 <code>put</code> 之前有效</strong>，因为 <code>put</code> 可能淘汰并释放这一项。</li>
<li><code>get</code> 会改变淘汰顺序（命中的项变成"最近使用"），所以它不是只读操作。</li>
<li>不是线程安全的（即使只调用 <code>get</code> 也会修改内部链表）。</li>
</ul>
<p>不该写进接口的：内部用链表、移到头部的具体方式。</p>`,
  rubric: ["写出了未命中时返回 <code>nullptr</code>", "指出了返回指针的有效期", "指出 get 会改变淘汰顺序或线程安全问题", "没有把\"内部用链表\"这类实现细节写成接口"],
  explain: `<p>你会发现非正式部分比签名长得多。这正是为什么接口注释不可省略（第 12、13 章会展开），也是为什么一个返回值就能带来这么多依赖。如果你想让接口更简单，可以考虑返回 <code>std::optional&lt;Value&gt;</code>（拷贝）来消掉"指针有效期"这一条，代价是一次拷贝。</p>`,
},
{
  id: "ch04-write-02", ch: 4, type: "write", title: "把一串浅类合成一个深类",
  prompt: `<p>一个服务要调用另一个服务的 HTTP 接口。团队的网络库按处理步骤拆成了 5 个类，发一个 POST 请求要这样写。请设计一个更深的接口（只写类声明和几行接口注释即可），并说明它隐藏了哪些东西。</p>`,
  code: `auto url = UrlBuilder("https", "orders.internal").path("/v1/orders").query("dryRun", "1").build();
HeaderMap headers;
headers.add("Host", url.host());                              // 自己加 Host
headers.add("Content-Type", "application/json");
headers.add("Content-Length", std::to_string(body.size()));   // 自己算长度
auto bytes = RequestSerializer().serialize("POST", url, headers, body);
SocketSender sender(url.host(), url.port(), /*timeoutMs=*/5000);
sender.sendAll(bytes);
auto resp = ResponseParser().parse(sender.receiveAll());       // 分块编码？
if (resp.status() == 301 || resp.status() == 302) { /* 自己跟随重定向 */ }`,
  reference: `<pre><code class="lang-cpp">// 发送 HTTP 请求并读完整个响应。自动处理：Host 与 Content-Length 头、
// 连接复用、分块传输编码、最多 5 次重定向。
// 连接失败或超时抛 HttpError；4xx/5xx 不算错误，照常返回，由调用方看 status。
class HttpClient {
public:
    struct Options { std::chrono::milliseconds timeout{5000}; bool followRedirects = true; };
    explicit HttpClient(Options opt = {});
    Response request(std::string_view method, std::string_view url,
                     const Headers&amp; extra = {}, std::string_view body = {});
    Response get(std::string_view url);
    Response postJson(std::string_view url, std::string_view json);  // 自动加 Content-Type
};

auto resp = client.postJson("https://orders.internal/v1/orders?dryRun=1", body);</code></pre>
<p>隐藏的东西：URL 解析与转义、能从其他参数推出来的头（Host、Content-Length）、请求报文的格式、建立连接与超时、部分写入的重试、响应报文的解析（状态行、头、分块编码）、重定向、连接复用。调用者从"按正确顺序串起 5 个对象"变成"一次调用"。</p>`,
  rubric: ["调用方一次调用就能发出请求并拿到响应，不再需要知道处理步骤和它们的顺序", "Host、Content-Length 这类能推出来的头由模块自己填", "说明了出错时的行为（例如网络错误与 4xx/5xx 是否同等对待）", "常见用法有便捷入口，罕见需求（超时、关闭重定向、自定义头）通过可选参数提供", "列出了至少三项被隐藏的细节"],
  explain: `<p>原来的设计里，每个小类单独看都很合理，但调用者要学 5 个接口，还要知道它们的调用顺序（这也是接口的一部分），Host、Content-Length、重定向这些本可以藏起来的知识也落到了每个调用者头上。这就是书中说的"类炎"（classitis）：类越多，系统越复杂。</p>
<p>注意参考答案并没有删掉这些步骤：URL 解析、报文序列化、响应解析多半仍是内部的独立函数或类，只是从公开接口里消失了。下一章还会从"信息隐藏"的角度再看：<code>RequestSerializer</code> 和 <code>ResponseParser</code> 这样按处理步骤切开的类，往往各自懂一份相同的协议格式知识。</p>`,
},
{ id: "ch04-card-01", ch: 4, type: "card",
  front: "什么是<b>深模块</b>？深度怎么衡量？",
  back: "<p>用简单的接口提供强大的功能。把模块画成矩形：面积是功能，顶边长度是接口复杂度；顶边短、面积大的就是深模块。本质上是收益（功能）和成本（接口给系统增加的复杂度）之比。</p>" },
{ id: "ch04-card-02", ch: 4, type: "card",
  front: "模块的<b>接口</b>由哪两部分组成？哪部分通常更大？",
  back: "<p>正式部分：签名、类型、公开变量等编译器能检查的东西。非正式部分：高层行为、调用顺序约束、副作用、有效期、线程安全……只能用注释描述。大多数接口的非正式部分更大、更复杂。判断标准：使用者必须知道才能正确使用的信息，都属于接口。</p>" },
{ id: "ch04-card-03", ch: 4, type: "card",
  front: "抽象会以哪<b>两种方式</b>出错？",
  back: "<p>① 包含了不重要的细节：抽象变复杂，使用者认知负担变重。② 省略了重要的细节：变成<b>虚假的抽象</b>，看起来简单，用的人却缺少正确使用所需的信息（造成模糊性 obscurity）。</p>" },
{ id: "ch04-card-04", ch: 4, type: "card",
  front: "什么是<b>类炎</b>（classitis）？它为什么有害？",
  back: "<p>认为\"类是好东西，所以越多越好\"，于是尽量让每个类只做很少的事。单个类简单了，但类的数量和接口总量暴增，系统整体反而更复杂，代码也更啰嗦。</p>" },
);

// —— 以下题目取材于书中给出的读者讨论组（2026-10）。场景和代码均为本站原创。——
window.APOSD_DRILLS.push(
{
  id: "ch04-ab-03", ch: 4, type: "ab", title: "缓冲放在哪一层",
  prompt: "<p>一个字节来源库，支持文件、管道、内存三种来源。逐字节读文件很慢，需要缓冲。两种设计，哪个让使用者更省心？</p>",
  a: { label: "缓冲垫在来源下面", code: `// detail::ReadBuffer：内部使用的缓冲部件（定义在 read_buffer.h），
// 三种来源各自持有一个；使用者看不到它

class FileSource {
public:
    // 打开文件用于顺序读取，读取带缓冲。
    // 需要逐次直达内核的读取（极少见）时传 Buffering::Off。
    explicit FileSource(const std::string& path,
                        Buffering mode = Buffering::On);
    size_t read(std::span<std::byte> out);
private:
    detail::ReadBuffer buf_;
};

// 使用
FileSource src("data.bin");` },
  b: { label: "缓冲叠在来源上面", code: `class ByteSource {             // 所有来源的公共接口
public:
    virtual size_t read(std::span<std::byte> out) = 0;
};
class FileSource     : public ByteSource { ... };  // 不带缓冲
class BufferedSource : public ByteSource {         // 给任意来源加缓冲
public:
    explicit BufferedSource(ByteSource& inner, size_t cap = 64 * 1024);
    ...
};

// 使用
FileSource file("data.bin");
BufferedSource src(file);      // 忘了这一行也能跑，只是很慢` },
  answer: "a",
  explain: `<p>两种设计里缓冲的实现都只有一份，也都和来源正交。区别在于<strong>谁来组装</strong>：B 让每个使用者自己套，要多认识一个类、多写一行，而且忘了套不会报错，只会变慢；A 把组装做在模块内部，常见用法一行就对。这是书中 4.7 节 Java I/O 例子的教训，"垫在下面"这个设计则是 Ousterhout 后来在读者讨论组里补充的（<a href="https://groups.google.com/g/software-design-book/c/rin4ykU9plo">2022-11</a>）。</p>
<p>B 并非一无是处：如果"要不要缓冲、用哪种缓冲"在你的系统里真的经常因场合而异（交互式终端输入、依赖背压的流），把选择权交给使用者是合理的。A 也留了出口（<code>Buffering::Off</code>），并在接口注释里写明了默认行为。判断标准是常见情况是什么。</p>`,
},
{
  id: "ch04-judge-03", ch: 4, type: "judge", title: "这个接口对谁是深的",
  prompt: "<p>书中用 Unix 文件 I/O 的五个基本调用说明深模块。你在写一个存储引擎，几乎每次写入之后都要调用 <code>fsync</code>，还要处理短写和 <code>EINTR</code>。关于\"文件 I/O 接口有多深\"，哪种说法最准确？</p>",
  options: [
    "书里的例子不成立：一个完整的文件接口必须包含 <code>fsync</code>，把它算进去之后调用数和语义都翻倍，这个接口其实是浅的",
    "深度是接口自身的固定属性：五个调用背后有几十万行实现，这个比值不因使用者是谁而改变，所以对你和对别人一样深",
    "对只用那五个调用的大多数程序，它很深；对你，<code>fsync</code> 等也是必须知道的东西，要算进成本，所以没那么深",
    "对你反而更深：你用到的功能比普通程序多，同样的五个调用替你藏起了更多实现，所以收益与成本之比更高",
  ],
  answer: 2,
  explain: `<p>接口的成本是"使用者必须知道的东西"。使用者不同，必须知道的东西就不同。Ousterhout 在读者讨论组里回答"为什么没列 <code>fsync</code>"时说得很直接：它很少被需要，所以不给大多数人增加负担；但如果你的代码大多都要用它，那它对你就是 I/O 接口的基本组成部分，评估复杂度时应当算进去（<a href="https://groups.google.com/g/software-design-book/c/OCSMlVYmQTE">2025-03</a>，不在书里）。</p>
<p>这对自己设计接口也有用：一个选项只有极少数使用者需要时，把它放在常用路径之外，多数人就不必为它付出学习成本。至于"背后实现有几十万行所以一定深"，Ousterhout 明确反对过把实现的大小当成深度：实现大也可能只是实现得差（<a href="https://groups.google.com/g/software-design-book/c/DvnQ1Bvqy30">2024-05</a>）。</p>`,
},
);
