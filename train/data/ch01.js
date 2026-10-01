// 第 1 章 引言：一切都关乎复杂性 —— 训练题。代码均为本站原创示例。
(window.APOSD_DRILLS = window.APOSD_DRILLS || []).push(
{
  id: "ch01-judge-01", ch: 1, type: "judge", title: "消除，还是封装？",
  prompt: "<p>作者把对抗复杂性的办法分成两类：<strong>消除</strong>复杂性（让代码本身更简单、更显然），和<strong>封装</strong>复杂性（模块化设计，让人一次只面对一部分）。下面四个改动里，哪一个主要属于<strong>封装</strong>？</p>",
  options: [
    "让空列表和非空列表走同一条代码路径，删掉开头那个 <code>if (items.empty()) return ...;</code> 特殊分支",
    "全项目统一用 <code>nbytes</code> 表示字节数，不再有的地方叫 <code>len</code>、有的地方叫 <code>size</code>、有的地方叫 <code>n</code>",
    "把散落在 9 个调用点的\"失败后等待、重试 3 次\"逻辑收进 <code>RpcClient::call()</code> 内部，调用者不再看到重试",
    "删掉一个早已没人打开的兼容开关 <code>--legacy-format</code> 及其所有分支",
  ],
  answer: 2,
  explain: `<p>把重试收进 <code>RpcClient::call()</code>：重试本身的复杂性并没有消失（等多久、重试几次、哪些错误可以重试），只是被<strong>藏进了一个模块</strong>，9 个调用点的作者从此不必再理解它。这是封装，也就是后面第 4～9 章的主题。</p>
<p>另外三个都是<strong>消除</strong>：去掉特殊情况、统一命名、删掉没用的分支，复杂性直接没了，而不是换了个地方待着。作者在引言里举的消除例子正是\"去掉特殊情况\"和\"一致地使用标识符\"。</p>
<p>两条路经常一起用：先尽量消除，剩下消除不了的再封装起来。</p>`,
},
{
  id: "ch01-judge-02", ch: 1, type: "judge", title: "评审时看到了红旗",
  prompt: "<p>你在评审同事的合并请求，发现一个类的接口几乎和它的实现一样长，这是书中会讲到的一种红旗。按照作者在 1.1 节给的建议，最好的做法是哪个？</p>",
  options: [
    "代码能跑、测试也过了，红旗只是\"可能有问题\"，直接批准",
    "把它记进技术债清单，等下个季度的\"重构周\"统一处理",
    "停下来，和提交者一起想几种替代设计，选能消掉这个红旗的那种；第一种想法不行就再换，多试几种",
    "要求对方按书上某一章的标准写法改，书里一定有现成答案",
  ],
  answer: 2,
  explain: `<p>作者的建议很具体：看到红旗就<strong>停下来找替代设计</strong>，把问题消掉；一开始可能要试好几种方案才找到合适的，<strong>不要轻易放弃</strong>，试得越多学到的越多。代码评审是练这件事最好的场合，因为看别人的代码比看自己的更容易发现设计问题。</p>
<p>\"能跑就批准\"正是第 3 章要批评的战术式心态；\"等重构周\"的问题第 3 章末尾也会讲：忙完这一阵还有下一阵，推迟很容易变成永久。至于\"书里有标准答案\"：作者明说这本书没有保证出好设计的菜谱，原则只能帮你<strong>比较</strong>方案。</p>`,
},
{
  id: "ch01-ab-01", ch: 1, type: "ab", title: "两条评审意见",
  prompt: "<p>同一处代码，两位同事留了评审意见。哪一条更能帮作者改进设计？</p>",
  a: { label: "评审意见 A", code: `src/order.cpp:88
这段写得太乱了，读不下去。建议重构一下，
可以参考一下《Clean Code》。` },
  b: { label: "评审意见 B", code: `src/order.cpp:88-120
calcDiscount() 和 calcShipping() 各自解析了一遍 "VIP:3" 这种会员串。
以后会员格式一变，两处都得改，漏一处就会算错钱。
建议：加一个 parseMembership() 返回 Membership 结构，两处都用它。
另一个思路是在 Order 构造时就解析好并缓存，但那样 Order 就得了解
会员格式，我倾向第一种。你怎么看？` },
  answer: "b",
  explain: `<p>B 做到了作者在 1.1 节说的几件事：<strong>指出具体问题</strong>（同一个格式知识出现在两处），<strong>说明它会让以后的修改变难</strong>（改一处漏一处），<strong>给出替代设计</strong>，而且比较了不止一种方案。读到这条意见的人知道问题在哪、为什么是问题、可以怎么改。</p>
<p>A 只表达了\"不喜欢\"，没有说复杂性具体体现在哪，提交者无从下手，也学不到东西。\"乱\"是一种感受；本书的价值在于给这种感受起名字（第 2 章的三种症状，后面各章的红旗），让评审意见可以讨论、可以验证。</p>
<p>A 也不是一无是处：如果你一时说不清哪里不对，先说\"我读着很吃力\"也有价值，作者在 2.1 节就说过，别人觉得复杂，那它就是复杂的。但别停在这里，接着去找原因。</p>`,
},
{
  id: "ch01-ab-02", ch: 1, type: "ab", title: "从单链表里删除节点",
  prompt: "<p>删除单链表里所有 <code>key</code> 等于给定值的节点。两种写法功能相同：</p>",
  a: { label: "", code: `void removeAll(Node*& head, int key) {
    // pp 指向"指向当前节点的那个指针"：可能是 head，也可能是某个 next
    for (Node** pp = &head; *pp != nullptr; ) {
        if ((*pp)->key == key) {
            Node* dead = *pp;
            *pp = dead->next;
            delete dead;
        } else {
            pp = &(*pp)->next;
        }
    }
}` },
  b: { label: "", code: `void removeAll(Node*& head, int key) {
    while (head != nullptr && head->key == key) {   // 先处理头部
        Node* dead = head;
        head = head->next;
        delete dead;
    }
    Node* cur = head;
    while (cur != nullptr && cur->next != nullptr) { // 再处理其余节点
        if (cur->next->key == key) {
            Node* dead = cur->next;
            cur->next = dead->next;
            delete dead;
        } else {
            cur = cur->next;
        }
    }
}` },
  answer: "a",
  explain: `<p>B 把\"删除头节点\"当成特殊情况，写了两段几乎一样的循环，读者要分别验证两段都对，以后修改（比如删除时要顺便更新计数）也得改两处。A 用\"指向指针的指针\"把头节点和其他节点统一起来，特殊情况<strong>直接消失</strong>了。这就是作者说的第一条路：通过去掉特殊情况来<strong>消除</strong>复杂性。</p>
<p>代价也要看到：<code>Node**</code> 对不熟悉这个写法的读者是一道坎，所以 A 第 2 行那句注释很重要。另一种同样能消掉特殊情况的做法是用一个哨兵头节点（dummy head）。</p>`,
},
{
  id: "ch01-write-01", ch: 1, type: "write", title: "写一条评审意见",
  prompt: `<p>同事为了支持\"导出 TSV\"这个新需求，提交了下面的改动。请按 1.1 节的思路写一条评审意见：指出问题在哪、为什么会让以后的修改变难，并给出<strong>至少两种</strong>替代设计及你的倾向。</p>`,
  code: `// 新需求：导出时也要支持 TSV
void exportCsv(const Report& r, std::ostream& out, bool tsv = false) {
    for (const auto& row : r.rows) {
        for (size_t i = 0; i < row.size(); ++i) {
            if (i > 0) out << (tsv ? '\\t' : ',');
            out << (tsv ? row[i] : quoteCsv(row[i]));  // TSV 不加引号
        }
        out << '\\n';
    }
}`,
  reference: `<pre><code>export.cpp:2-9
1) 名字说的是 CSV，实际也负责 TSV；调用处写 exportCsv(r, out, true)，
   不看实现根本猜不出 true 是什么意思。
2) 格式差异（分隔符、要不要加引号）用 bool 分散在循环里的两个三元表达式中。
   下次再要支持 JSON Lines 或别的分隔符，只能再加参数、再加分支。
3) 顺带一个隐患：TSV 不加引号，字段里本身含 \\t 或换行时输出就坏了。

替代方案：
a. 拆成 exportCsv / exportTsv 两个函数，共用一个"按行遍历"的内部函数，
   分隔符和单元格转义作为参数传进去。改动最小。
b. 定义 struct TableFormat { char sep; std::function&lt;std::string(std::string_view)&gt; escape; }，
   提供 TableFormat::csv() / tsv()，导出函数只收一个 format。
   以后加格式不用改导出函数。
我倾向 b：现在多花半小时，以后加格式就不用再动这里。你觉得呢？</code></pre>`,
  rubric: [
    "指出了具体的位置（行号或函数），而不是笼统地说\"不好\"",
    "说明了问题会让<strong>以后的修改</strong>变难（再加格式要怎么改、调用处读不懂 bool 参数等）",
    "给出了至少两种替代设计，并说明各自的取舍",
    "语气是对事不对人、可以讨论的（例如以提问收尾）",
  ],
  explain: `<p>这一题没有唯一答案。关键是你的意见能不能让对方<strong>看到复杂性在哪</strong>并且<strong>有路可走</strong>。作者建议看到红旗时多试几种方案再定，评审意见里列出两种方案，本身就是在做这件事。第 2 章之后，你可以用更精确的词（变更放大、认知负担、未知的未知）来写同样的意见。</p>`,
},
{ id: "ch01-card-01", ch: 1, type: "card",
  front: "作者说对抗复杂性有哪<b>两条路</b>？各举一个例子。",
  back: "<p>① <b>消除</b>：让代码更简单、更显然，例如去掉特殊情况、一致地使用标识符。② <b>封装</b>：模块化设计，把复杂性藏在模块内部，让开发者一次只需面对一部分，例如把重试逻辑藏进 RPC 客户端。</p>" },
{ id: "ch01-card-02", ch: 1, type: "card",
  front: "什么是<b>红旗</b>（red flag）？看到红旗时作者建议怎么做？",
  back: "<p>红旗是\"这段代码可能比必要的更复杂\"的迹象。看到红旗就停下来，寻找能消掉它的替代设计；可能要试好几种方案，不要轻易放弃，试得越多学得越多。最好的练习场合是代码评审：别人的代码里的问题更容易看出来。</p>" },
);
