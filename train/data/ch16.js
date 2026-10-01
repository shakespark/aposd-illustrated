// 第 16 章 修改已有代码 —— 训练题。代码均为本站原创示例。
// 本章没有新的红旗，flag 题用的是第 4～15 章的红旗，场景都是"评审一份 diff"。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch16-flag-01", ch: 16, type: "flag", title: "评审 diff：一个紧急修复",
  prompt: "<p>线上问题：大客户 A 公司反映导出的报表金额少了两位小数。值班同学提交了下面的修复，说\"改动最小，风险最低\"。<code>formatNumber</code> 是全公司共用的格式化库函数。</p>",
  code: `  std::string formatNumber(double v, const FormatSpec& spec) {
+     // A 公司的报表要求保留 4 位小数
+     if (spec.context == "report" && currentTenant() == "acme") {
+         return fixedPoint(v, 4);
+     }
      ...（原有的 60 行通用逻辑）
  }`,
  choices: ["special-general", "repetition", "comment-repeats", "passthrough", "none"], answer: ["special-general"], mark: [2, 3, 4, 5],
  explain: `<p>一个通用的格式化函数里掺进了只服务某个客户、某种报表的代码，还顺带让格式化库依赖上了"当前租户"这个全局状态。这是典型的"通用与专用混杂"。改动确实很小，但它正是书中 16.1 节描述的那种最小改动：每次只加一点特殊情况，系统就变差一点。</p>
<p>更好的做法：精度本来就该是 <code>FormatSpec</code> 的一部分，由报表模块根据租户配置传进来（例如 <code>spec.decimals = tenantCfg.reportDecimals</code>）。如果时间紧到只能先上热修复，也应该在修复之后安排时间把它挪出通用库。注释没有问题：它说明了原因，不是在复述代码。</p>`,
},
{
  id: "ch16-flag-02", ch: 16, type: "flag", title: "评审 diff：给下载也加上重试",
  prompt: "<p>上传客户端早就有重试逻辑。这次需求是\"下载也要能重试\"，提交如下。</p>",
  code: `  Status Downloader::fetch(const Url& url, Sink& out) {
-     return http_.get(url, out);
+     // 重试逻辑和 Uploader::send 里的一样
+     Status st;
+     for (int attempt = 0; attempt < 5; ++attempt) {
+         st = http_.get(url, out);
+         if (st.ok() || !st.retryable()) break;
+         out.reset();
+         std::this_thread::sleep_for(100ms * (1 << attempt));
+     }
+     return st;
  }`,
  choices: ["repetition", "special-general", "comment-repeats", "shallow", "none"], answer: ["repetition"], mark: [3, 5, 6, 7, 8, 9],
  explain: `<p>第 3 行的注释自己就承认了：这段退避重试和上传里的那段一模一样。将来要调整重试次数、退避策略或加上抖动，就得记得同时改两处（甚至更多处），这是"重复"红旗。</p>
<p>战略式的改法是：既然第二次需要重试，就说明缺了一个抽象。把它提取成 <code>retryWithBackoff(op, policy)</code>，上传和下载都调用它。注释"和 xx 里的一样"本身也是个信号：它在用文字维持两份代码的一致，而这种一致性靠注释是维持不住的。</p>`,
},
{
  id: "ch16-flag-03", ch: 16, type: "flag", title: "评审 diff：记录里加一个字段",
  prompt: "<p>日志记录要加一个\"写入时间\"字段。这次提交改了两个类。</p>",
  code: `  // log_writer.cpp
  void LogWriter::encode(const Record& r, Buffer& b) {
      b.putU32(crc(r));
      b.putU8(r.type);
+     b.putU64(r.writtenAtMs);
      b.putU32(r.key.size());
      ...
  }
  // log_reader.cpp
  Record LogReader::decode(Buffer& b) {
      Record r;
      uint32_t c = b.getU32();
      r.type = b.getU8();
+     r.writtenAtMs = b.getU64();
      uint32_t keyLen = b.getU32();
      ...
  }`,
  choices: ["leakage", "conjoined", "temporal", "repetition", "none"], answer: ["leakage"], mark: [5, 14],
  explain: `<p>记录的二进制格式这一个设计决定，同时体现在 <code>LogWriter</code> 和 <code>LogReader</code> 两个类里：加一个字段，两边要以完全相同的顺序同时改，漏改一边就会读出乱码，而且编译器不会报错。这是"信息泄漏"。</p>
<p>评审 diff 时有一个实用的信号：<strong>一个概念上很小的改动，却必须同时修改几个模块</strong>，往往说明这些模块之间泄漏了同一份知识。战略式的修法是借这次修改把编码和解码收进同一个类（如 <code>RecordCodec</code>），格式只在一个地方定义。</p>`,
},
{
  id: "ch16-flag-04", ch: 16, type: "flag", title: "评审 diff：修一个并发 bug",
  prompt: "<p>修复\"偶发读到半截配置\"的 bug。提交如下。</p>",
  code: `  class ConfigHolder {
-     std::shared_ptr<Config> current_;
+     std::shared_ptr<const Config> current_;   // 发布之后不再修改
      // ...
  };

  void ConfigHolder::reload(const std::string& path) {
-     current_->parseFrom(readFile(path));
+     // 先在新对象里解析完，再原子地替换指针。不要改回原地解析：
+     // 读者线程不加锁，原地解析时它们会看到解析到一半的配置。
+     auto fresh = std::make_shared<const Config>(Config::parse(readFile(path)));
+     std::atomic_store(&current_, fresh);
  }`,
  choices: ["comment-repeats", "impl-contaminates", "special-general", "none"], answer: ["none"],
  explain: `<p>这是一次好的修改。修复本身是战略式的（换成"解析完再整体替换"的不可变设计，而不是在原地解析外面加一把锁）；更重要的是，<strong>导致这个 bug 的微妙原因写在了代码里</strong>，就在它所解释的那几行上方。</p>
<p>注释没有复述代码："解析完再替换"看代码能看出来，但"为什么不能原地解析"看不出来。书中 16.3 节说的正是这种情况：如果这个原因只写在提交信息里，将来有人觉得\"每次都新建对象太浪费\"，把它改回原地解析，就会重新引入这个 bug。注释写的是实现内部的约束，放在方法体里而不是接口注释里，位置也对。</p>`,
},
{
  id: "ch16-flag-05", ch: 16, type: "flag", title: "评审 diff：CSV 多了一列",
  prompt: "<p>商品导入流水线按执行顺序分成三个类：<code>Loader</code>（第一步：读文件、切列）→ <code>Validator</code>（第二步：校验）→ <code>Writer</code>（第三步：写库）。上游的 CSV 在价格后面加了一列币种，这次提交如下（<code>Validator</code> 的改动略）。</p>",
  code: `  // loader.cpp：第一步，读文件、切列
  std::vector<Row> Loader::load(std::istream& in) {
      std::vector<Row> rows;
      for (std::string line; std::getline(in, line); ) {
          Row r = splitCsv(line);
-         if (r.size() != 4) { ++badLines_; continue; }
+         if (r.size() != 5) { ++badLines_; continue; }
          rows.push_back(std::move(r));
      }
      return rows;
  }
  // writer.cpp：第三步，写库
  void Writer::write(const std::vector<Row>& rows) {
      for (const Row& r : rows) {
-         db_.upsert(r[0], r[1], parseCents(r[2]), std::stoi(r[3]));
+         db_.upsert(r[0], r[1], parseMoney(r[2], r[3]), std::stoi(r[4]));
      }
  }`,
  choices: ["temporal", "leakage", "repetition", "special-general", "none"], answer: ["temporal", "leakage"], mark: [6, 7, 15, 16],
  explain: `<p>"CSV 有哪几列、各在第几位"是<strong>一份</strong>知识，却被拆散在流水线的几个阶段里：<code>Loader</code> 知道列数，<code>Writer</code> 知道每列的下标（<code>Validator</code> 多半也按下标校验）。加一列这么小的需求，要同时改两三个阶段，漏改一处就会把库存写成币种。这是<strong>信息泄漏</strong>，而造成泄漏的原因是<strong>按时间顺序分解</strong>（5.3 节）：模块是按"先读、再校验、后写"切的，而不是按"谁掌握 CSV 格式"切的。</p>
<p>和本章另一道题"记录里加一个字段"对比：那里的 <code>LogWriter</code> 和 <code>LogReader</code> 是同一格式的两个方向，本身就是合理的两个模块，问题只是格式被写了两遍；这里的模块边界本身就是执行顺序，格式知识是被流水线的阶段切开的。</p>
<p>按 16.1 节的思路，这次修改正是改设计的好时机：加一个掌握格式的 <code>ProductCsv::parse(line) → std::optional&lt;ProductRecord&gt;</code>，<code>Loader</code> 输出带字段名的记录，<code>Writer</code> 只用 <code>rec.price</code>、<code>rec.stock</code>，以后再加列只改一个地方。</p>`,
},
{
  id: "ch16-flag-06", ch: 16, type: "flag", title: "评审 diff：换一种淘汰算法",
  prompt: "<p>为了减少读路径上的锁竞争，会话缓存的淘汰算法从严格 LRU 换成了 CLOCK。下面是这次提交里头文件的改动（.cpp 的改动略）。</p>",
  code: `  // session_cache.h
  // 按会话 id 缓存登录会话，最多保存 capacity 个；线程安全。
- // 内部用 std::list 维护 LRU 顺序，unordered_map 存 id 到链表节点的
- // 迭代器；每次 get 都把节点 splice 到表头。
+ // 内部用 CLOCK 近似 LRU：环形数组存会话，每项一个引用位；get 只置位，
+ // 淘汰时指针绕圈清零引用位，遇到引用位为 0 的项就淘汰它。
  // 容量满时，put 会淘汰一个较久没被访问的会话。
  class SessionCache {
  public:
      explicit SessionCache(size_t capacity);
      std::shared_ptr<Session> get(SessionId id);   // 不存在返回 nullptr
      void put(SessionId id, std::shared_ptr<Session> s);
  };`,
  choices: ["impl-contaminates", "comment-repeats", "leakage", "shallow", "none"], answer: ["impl-contaminates"], mark: [3, 4, 5, 6],
  explain: `<p>这次改动只换了实现，类的用法一点没变，头文件里的<strong>接口注释</strong>却也得跟着改：说明它写的本来就是调用者不需要的东西（链表、迭代器、引用位、指针绕圈）。新加的两行把同样的错误又犯了一遍，下次换成分段 LRU 还得再改。这是"实现细节污染接口注释"（13.5 节）。</p>
<p>16.6 节说：比代码更抽象的注释更好维护，因为它不随细节变。调用者真正需要知道的只有一件新事：淘汰不再是严格的 LRU。所以接口注释应改成"容量满时，put 会淘汰一个较久没被访问的会话（近似 LRU，不保证淘汰的恰好是最久未访问的那个）"，CLOCK 的做法写进 .cpp 里的实现注释。它不算"注释重复代码"：这些内容在声明里确实看不到，问题是写错了位置、写给了错的读者。</p>`,
},
{
  id: "ch16-ab-01", ch: 16, type: "ab", title: "微妙的原因写在哪里",
  prompt: "<p>修复了一个时区相关的 bug。两种提交方式：</p>",
  a: { label: "原因写在提交信息里", code: `// 代码：
TimePoint dayStart = floorToDay(ts, tz_);

// 提交信息：
// 修复跨夏令时那天统计重复计数的问题。
// 不能用 ts - ts % 86400 来求当天零点：夏令时切换那天
// 只有 23 或 25 小时，会算错零点，导致同一笔订单被算进两天。` },
  b: { label: "原因写在代码里", code: `// 代码：
// 当天零点必须按时区日历计算，不能用 ts - ts % 86400：
// 夏令时切换那天只有 23 或 25 小时，那样算会把订单记到错误的日期。
TimePoint dayStart = floorToDay(ts, tz_);

// 提交信息：
// 修复跨夏令时那天统计重复计数的问题（原因见代码注释）。` },
  answer: "b",
  explain: `<p>将来读这段代码的人最需要的信息是"为什么不用更简单的取模写法"，而他们几乎不会想到去翻提交历史；就算想到，在几千条提交里找到这一条也很费劲。如果原因只在提交信息里，有人看到 <code>floorToDay</code> 觉得\"取模就行，何必调日历库\"，一改就把 bug 带回来了。</p>
<p>作者的规则是：写提交信息时问自己，将来的开发者会不会需要这条信息？需要就写进代码。提交信息里再放一份也没问题，A 的错误不在于写了提交信息，而在于<strong>只</strong>写在那里。</p>`,
},
{
  id: "ch16-ab-02", ch: 16, type: "ab", title: "一个有坑的变量，坑写在哪",
  prompt: "<p><code>lastSeen_</code> 有一个不直观的行为，类里有三处代码依赖它。两种注释方式：</p>",
  a: { label: "", code: `// 最后一次收到对端任何数据的时刻（单调时钟）。
// 注意：探活包的回复不会更新它，否则对端进程卡死、
// 只剩内核还在回应时，我们会误以为它还活着。
TimePoint lastSeen_;

void Peer::onData(...)   { ... lastSeen_ = now(); ... }
void Peer::onProbeAck()  { /* 不更新 lastSeen_，原因见其声明处 */ }
bool Peer::isAlive()     { return now() - lastSeen_ < timeout_; }` },
  b: { label: "", code: `TimePoint lastSeen_;

void Peer::onData(...) {
    // 更新 lastSeen_。探活回复不更新它，因为对端卡死时内核仍会回应探活。
    ... lastSeen_ = now(); ...
}
void Peer::onProbeAck() {
    // 这里不更新 lastSeen_：对端进程卡死时内核仍会回应探活，
    // 如果更新就会误以为它还活着。
}
bool Peer::isAlive() {
    // lastSeen_ 不包括探活回复（对端卡死时内核也会回应探活），
    // 所以这里判断的是对端进程本身是否活着。
    return now() - lastSeen_ < timeout_;
}` },
  answer: "a",
  explain: `<p>同一个设计决定只记录一次，放在最显然的地方：变量的声明处正是读者看不懂相关代码时最可能去查的地方。其他地方如果需要，留一句简短的指引（"原因见其声明处"）。</p>
<p>B 把同一段解释抄了三遍。将来如果改了规则（比如决定某种探活回复也算数），很可能只改了其中一两处，剩下的就悄悄过时了，而读者没有任何办法察觉。A 的指引就算过时（声明处的注释被删了），读者顺着指引找不到东西，问题也是一眼可见的。</p>`,
},
{
  id: "ch16-judge-01", ch: 16, type: "judge", title: "三个月 vs 两小时",
  prompt: "<p>你发现要\"正确地\"支持一个新需求，需要重构计费模块，估计要三个月；一个快速但难看的修补只要两小时，而上线日期就在下周。按作者在 16.1 节的说法，你应该怎么做？</p>",
  options: [
    "坚持重构三个月，设计永远第一",
    "做两小时的修补，之后不必再管：商业现实就是这样",
    "先找找有没有一个几天就能完成、又几乎一样干净的方案；实在没有，就先做快速修补，并争取在截止日期之后安排时间回来重构",
    "既然要改，就趁机把整个计费模块重写一遍",
  ],
  answer: 2,
  explain: `<p>作者承认商业现实：期限很紧时，可能不得不先做快速修补；重构如果会给很多其他团队造成不兼容，也可能不现实。但作者要求尽量抵抗这种妥协，并问自己：<strong>在当前约束下，这是我能做到的最干净的设计吗？</strong>也许存在一个几天就能完成、几乎和三个月方案一样干净的办法；如果眼下真的做不了大重构，就去争取在截止日期之后安排时间回来做。</p>
<p>作者还建议每个开发组织都拿出一小部分精力专门用于清理和重构。"修完不管"和"无视约束硬上"都偏离了这个立场。</p>`,
},
{
  id: "ch16-judge-02", ch: 16, type: "judge", title: "C++ 的接口注释放在哪",
  prompt: "<p>在 C/C++ 项目里，方法的接口注释应该放在头文件的声明处，还是 .cc 文件里方法体的旁边？作者在 16.2 节的观点是：</p>",
  options: [
    "放在 .cc 文件里方法体的旁边最好：修改方法的人一定会看到它；使用者应该看 Doxygen 之类工具生成的文档或 IDE 的提示，而不是去读头文件",
    "必须放在头文件里，因为使用者只看头文件",
    "两处各放一份，读者在哪里都能看到",
    "接口注释应该写在提交信息里，代码里只留实现注释",
  ],
  answer: 0,
  explain: `<p>作者的出发点是维护：注释离它描述的代码越远，越不容易被同步更新。改方法体的人不会去翻头文件，所以作者认为最好的位置是代码文件里、紧挨着方法体。书中把"放在 .h 里"称为一种可选做法，但认为离代码太远。对"使用者需要看头文件"的反驳是：使用者应该从 Doxygen、Javadoc 生成的文档或 IDE 的悬停提示里获得信息，所以注释应该放在对<strong>改代码的人</strong>最方便的地方。</p>
<p>"两处各放一份"违反了 16.4 节的"避免重复"。这个观点在 C++ 社区有争议，本章页面的\"边界与反方\"里有讨论。</p>`,
},
{
  id: "ch16-write-01", ch: 16, type: "write", title: "把提交信息里的原因搬进代码",
  prompt: `<p>下面是一次提交的 diff 和它的提交信息。代码里没有任何注释。请写出应该加在代码里的注释（写清楚放在哪一行上方）。</p>`,
  code: `  void Batcher::flush() {
-     for (auto& item : pending_) sink_->write(item);
-     pending_.clear();
+     std::vector<Item> batch;
+     batch.swap(pending_);
+     for (auto& item : batch) sink_->write(item);
  }

  提交信息：
  修复 flush 时偶发崩溃。sink_->write() 失败时会回调 onError()，
  而 onError() 会调用 add() 往 pending_ 里重新放入失败的条目，
  导致我们在遍历 pending_ 时修改了它（迭代器失效）。`,
  reference: `<pre><code class="lang-cpp">void Batcher::flush() {
    // 先把 pending_ 整个换出来再遍历：write() 失败时会经由 onError()
    // 调用 add()，把条目重新放回 pending_。直接遍历 pending_ 会在
    // 遍历中修改它，导致迭代器失效。重新放回的条目留到下一次 flush。
    std::vector&lt;Item&gt; batch;
    batch.swap(pending_);
    for (auto&amp; item : batch) sink_-&gt;write(item);
}</code></pre>
<p>要点：注释说明的是<strong>为什么要先换出来</strong>（会被重入修改），而不是复述"把 pending_ 交换到 batch"；它放在被解释的那两行正上方；它还顺带说明了一个行为上的后果（失败条目会在下一次 flush 时重试），这是读者看代码不容易推出来的。</p>`,
  rubric: ["说明了为什么不能直接遍历 pending_（write 失败会重入修改它）", "注释放在 swap 那几行的正上方，而不是方法开头的一大段或提交信息里", "没有写成历史叙述（\"之前这里会崩溃，所以改成了……\"）", "没有复述代码本身（\"把 pending_ 交换到 batch\"）"],
  explain: `<p>一个常见的误区是把注释写成变更记录："2024-03 修复崩溃：改用 swap"。代码注释描述的是代码<strong>现在</strong>为什么是这个样子，变更历史属于版本控制。检验标准是：一个从没见过这次提交的人，读完注释能不能避免把它改回去？</p>`,
},
{ id: "ch16-card-01", ch: 16, type: "card",
  front: "第 16 章给出的让注释跟上代码的几条做法是什么？",
  back: "<p>① 注释放在离代码最近的地方（接口注释紧挨方法体；实现注释下沉到能覆盖相关代码的最小范围）。② 将来有人需要的信息写进代码，不要只写在提交信息里。③ 避免重复：每个设计决定只在最显然的地方记录一次，别处引用它；外部已有的文档直接引用。④ 提交前看一遍 diff，确认文档反映了每处改动。⑤ 注释越比代码高层、越抽象，越不容易过时。</p>" },
);
