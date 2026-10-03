# Function names as a language

- 原帖：https://groups.google.com/g/software-design-book/c/CEIpGjyswfg
- 精读：2026-10-03，读到第 15 条（2026-01-12 ～ 2026-01-15）
- 主题：浅函数如果能"给代码造词汇"（如 `add_null(attribute)`、`triangle_perimeter(a, b, c)`），算不算有价值；作者把"词汇"问题归回到深/浅模块。
- 对应：第 4 章（4.4～4.5 深与浅）/ 第 9 章 9.7（拆方法）/ 第 14 章（名字的精确性，14.3）/ 第 7 章（读者最后提问，无人回答）/ 专题 clean-code
- 性质：真正的分歧 · 可改编成训练题的例子
- 优先级：B。作者只发了一条，但把"领域词汇"这个常见的反方论据直接接到了深/浅模块上；读者关于 `triangle_perimeter(a, b, c)` 与 `triangle.perimeter()` 的对比是现成的训练题素材。

## 读者说了什么（转述）

1. **提问**（Meir Goldenberg，[1]）：函数不只是行为单位，也是在给代码造一门语言。`add_null(attribute)` 比 `data.put(attribute, null)` 读起来更自然、更表达意图，哪怕它是浅的。想听作者的看法。
2. **两个都没表达意图**（Justin Hill，[2]）：`add_null` 更顺口但更含糊——看不出 attribute 属于某个集合，反而像"往集合里加一个值"；`data.put` 笨一点但至少看得出是键值集合。要表达意图就得把意图写出来，比如 `disable`、`reset`、`forget`。
3. **"造语言"式编程的来历与代价**（Justin Hill，[2][4]）：Lisp 系和 Forth 系本来就是这种风格（提到 Chuck Moore、Leo Brodie 的 Forth 书、SICP），在那里比在 Java/C# 里顺手。代价是新人（甚至过一段时间的原作者）要先学宿主语言再学这门自造语言；语言设计是一门手艺，多数人没练过，常见毛病是调用约定不一致、违反最小惊讶原则。适合人少且投入的项目，不适合人员流动的大项目。[4] 里引 Zen of Python 认为 Python 不鼓励大词汇量；"必要词汇"应来自领域名词（业务叫 invoice 就别在代码里叫 receipt）和动作；又说有价值的抽象比有价值的词汇更容易论证——看到重复模式后再抽，没看到重复之前都是猜；函数被引用得越少越容易改，每加一个调用点就是重新审视它的时机。
4. **第二个例子**（Meir Goldenberg，[7]）：用海伦公式算三角形面积时，`triangle_perimeter(a, b, c) / 2` 比 `(a + b + c) / 2` 读起来省力，因为点出了几何含义。
5. **反驳**（Justin Hill，[8][10][12]）：三数相加不值得一个函数，注释或一个叫 `perimeter` 的局部变量就够了；值得抽象的是整个"由三边求面积"。但如果已经有 `Triangle` 类，提供 `perimeter()` 当然合理。区别不在"名字挂在对象上"，而在调用约定：`perimeter(triangle)` 比 `perimeter(a, b, c)` 接口更窄更深，内部可以是存好的字段、三边相加、三点坐标算出来……调用者不必知道。
6. **最完整的论证**（Dan Cross，[13]）：`triangle_perimeter(a, b, c)` 既不灵活又过于宽松——它逼调用者知道"三角形由三条边长表示"这个多余细节，却又不能保证传进来的真是同一个三角形的三条边；名字没有抬高抽象层次，因为没告诉任何人不知道的东西。`triangle.perimeter()`（或 C 风格的 `triangle_perimeter(&triangle)`）则把表示法藏起来了。重点不是语法，而是把调用者看到的接口和类型的内部表示分开。顺带：用不用海伦公式也是无关细节，更好的抽象是直接给一个 `area`。
7. **未被回答的追问**（Meir Goldenberg，[14]）：`triangle_perimeter(a, b, c)` 这种自由函数算不算违反第 7 章"不同的层，不同的抽象"？串里没有人回答。
8. **收束**（Jonathan Camenisch，[15]）：所有反对意见其实都可以读成"要造好语言而不是坏语言"——加函数确实在塑造代码库的语言，但词汇多不等于语言好；和深模块一样，最好的语言是每个词都提供最大价值、且彼此配合得好。

## 作者的回应

作者只发了一条（[5]），在 Meir Goldenberg 提出三角形例子之前，所以**三角形例子和第 7 章的追问都没有作者的意见**。

- 不认为 `add_null(attribute)` 比 `data.put(attribute, null)` 更自然或更明显，两者做什么都挺清楚。反而 `data.put` 略清楚一点，因为 `add` 这个词让人犯嘀咕：属性已存在时"add"是什么意思——再加一个？报错？
- 两者在作者看来都浅，`add_null` 比 `data.put` 更浅。结论是 `add_null` 只有缺点、没有优点。
- 对"造语言 / 引入词汇"这个说法本身提出质疑：作者说不清楚讨论里这两个词指什么——难道不是每个接口都在"造语言""引入词汇"吗？引入词汇是好事吗？词汇多比词汇少好吗？作者对这些的回答都是"不一定"，正如"引入新接口是不是好事"的回答也是"不一定"。
- 作者预计这个问题最后会落回深类与浅类，并给了一个判据（原话）：
  > "If a new 'vocabulary' is easy to learn and allows me to express a large number of tasks cleanly and simply, then it's probably good."（John Ousterhout，[5]）
  
  反过来，如果词汇又大又复杂、特殊情况多（作者把 `add_null` 归为这类特殊情况），或者并没有让很多任务更好表达，那多半不好。

**让步**：没有。**坚持**：浅就是浅，"读起来像自然语言"不构成补偿。**新说法（书里没有）**：把"词汇/语言"的好坏用和深模块同一把尺子来量——学习成本 vs 能表达的任务数量。书里没有"vocabulary"这个角度。

## 挂到站点哪里

- 第 4 章"边界与反方"：加一条常见反方"浅函数能造领域词汇"，接作者的判据（易学 + 能表达很多任务才算好词汇），再接 Jonathan Camenisch 的一句话收束（标明是读者说的）。
- 第 14 章 14.3（名字要精确）：`add_null` 中 `add` 一词引出"已存在时怎么办"的疑问——作者亲口给的"名字不精确引发疑问"的例子；可配 Justin Hill 的"想表达意图就写 `disable`/`reset`/`forget`"。
- 训练场：改编成 C++ A/B/C 题——(A) `double trianglePerimeter(double a, double b, double c)`，(B) 直接写 `a + b + c` 并用局部变量命名，(C) `triangle.perimeter()`。问哪个抬高了抽象层次、为什么。答案要点用 Dan Cross 和 Justin Hill 的论证（标明是读者观点，作者未表态）。
- 专题 clean-code：与"小方法即文档"之争相呼应，可作一条旁注；Justin Hill 关于 Forth/Lisp 传统的背景可压成一句。
- Meir Goldenberg 在 [14] 的问题（这算不算第 7 章的反例）可以作为第 7 章的一道开放思考题，注明讨论组里无人作答。

## 待核实

- Justin Hill 关于 Lisp/Forth 社区风格、Zen of Python 含义的概括是个人看法，引用时不要写成定论。
- 原帖没说 `add_null`/`data.put` 出自什么代码；`data.put(attribute, null)` 的语义（Map 里放 null）是各人猜的。
