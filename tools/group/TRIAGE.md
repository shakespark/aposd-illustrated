# 讨论组筛选清单

由 `tools/groups_scan.py` 生成，不要手改；改 `triage.json` 后跑 `python3 tools/groups_scan.py --render`。

- 最近一次扫描：2026-10-03 04:20 UTC，组内共 238 串，抓到 238 串。
- 状态：未看 0、已列出 141、已精读 28、已采用 10、跳过 59；读过之后又有新回复 0。
- 优先级：A 必读，B 值得读，C 有空再看，X 跳过；空白表示还没判断。
- “已列出”只表示看过标题、回复数和发帖人，**没有读过正文**。
- “回复”= 消息数 − 1；“已读”是上次精读时这一串的消息数，比当前少就标 🔄。
- “作者”是 Ousterhout 在这一串里发的消息数。

| 优先 | 标题 | 回复 | 人数 | 首帖 | 最后活动 | 作者 | 状态 | 已读 | 挂到 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| A | [Releasing the tension between "deep modules" and "small function" practices](https://groups.google.com/g/software-design-book/c/Kb5K3YcjIXw) | 32 | 13 | 2019-04-22 | 2022-01-28 | 3 | 已采用 | 33 | 第 9 章（§9.7 拆分与合并方法、连体方法；§9.8 对 Clean Code 的不同意见）/ 专题 clean-code / 第 4 章（深度、"什么时候算深"）/ 第 7 章（透传方法）/ 第 14 章（名字难起）/ 第 13 章（一行注释 vs 一个函数）/ 训练场 | 以 Robert Martin 的 "Extract till you Drop"（把 25 行的 SymbolReplacer 拆成 9 个小方法）为靶子，争论"只做一件事"到底指什么、函数该拆到多细；中途转为 Ralf Westphal 与 Indrit Selimi 关于单一职责原则的争论，2020 年又接上一个 black 项目代码评审里的单行谓词函数例子。 |
| A | [Book Review: A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/DvnQ1Bvqy30) | 31 | 7 | 2018-10-08 | 2025-02-22 | 8 | 已精读 | 32 | 第 4 章（4.2 接口的形式/非形式部分、4.4 深模块、4.5 浅模块、4.6 classitis、4.7 Unix I/O）；次要：第 7 章（透传方法）、第 1 章（瀑布模型一段）、第 3 章 3.4（Facebook 一段）、第 10 章 10.5（substring） | 前半（2018）是 James Koppel 发书评前与作者的公开往来——"接口简单"能不能等同于"规约（specification）简单"、Unix I/O 到底算不算简单；后半（2024）换了话题——"深度"里的"功能"算不算委托给别的模块的部分、薄包装方法算不算深、不看实现能不能判断深度。 |
| A | [Criticism for several ideas from the book](https://groups.google.com/g/software-design-book/c/3kCDvG6CV1E) | 29 | 8 | 2023-04-09 | 2023-04-18 | 1 | 已精读 | 30 | 第 7 章（§7.5 context 对象）/ 第 19 章（§19.3 单元测试、§19.4 TDD）/ 第 3 章与第 16 章（攒着再重构 = 战术式编程的变体）/ 第 6 章（§6.1 "接口通用、功能不超前"）/ 第 8 章（§8.2 配置参数）/ 第 13 章（接口注释的篇幅）/ 第 14 章（名字长短）/ 第 9 章（§9.7 连体方法）/ 第 18 章（§18.2 事件驱动）/ 训练场 | 一位做电话网关（嵌入式、事件驱动）的读者一口气对书提了十条异议（context 对象、接口注释太长、长名字、断言、单元测试、"攒几次再重构"、多线程、事件驱动、通用代码慢、配置参数），作者在第 15 条逐条作答；其余是读者之间关于"加功能该不该动多个类"和"重构的定义"的争论。 |
| A | [why are longer methods better than shorter methods? longer methods with nesting give me a headache](https://groups.google.com/g/software-design-book/c/NibdflTQTy8) | 26 | 8 | 2023-01-29 | 2023-04-02 | 5 | 已采用 | 27 | 第 9 章（§9.7 拆分与合并方法、连体方法；§9.8 对 Clean Code 的不同意见）/ 第 4 章（深度的定义）/ 专题 clean-code / 第 2 章（复杂性的定义，"简单"与"容易"）/ 专题 ai-era（一条读者评论）/ 第 18 章（易写 vs 易读） / 训练场（次要） | 一位读者记得书"偏爱长方法"并拿深层嵌套的长方法来反对，作者澄清自己没这么说；随后话题转到"单一职责原则"和"深度"哪个是更好的拆分标准，再转到 Rich Hickey 的"简单 vs 容易"之分。 |
| A | [the ideal world](https://groups.google.com/g/software-design-book/c/50lEgky-jqw) | 23 | 10 | 2026-05-11 | 2026-06-02 | 5 | 已精读 | 24 | 第 2 章（2.3 复杂性的两个成因：依赖与隐晦）；第 4 章 4.1；第 9 章（拆分是否增加依赖）；次要：第 5 章（数据格式/schema 作为接口） | 从 4.1 节"理想世界里模块彼此完全独立"这句话出发，争论依赖本身是不是坏东西——读者认为依赖是模块化的本质，坏的只是隐晦的依赖；作者坚持不存在"好的依赖"。 |
| A | [your book, "A Philosophy of Software Design"](https://groups.google.com/g/software-design-book/c/OlYvD18QtnI) | 20 | 11 | 2019-01-10 | 2019-11-20 | 3 | 已采用 | 21 | 第 9 章（9.7 拆分与合并方法、9.8 对《Clean Code》的不同意见）；第 4 章（4.6 classitis）；专题 clean-code；次要：第 19 章（单元测试、TDD）、第 10 章（10.5 substring）、第 18 章 | 一位偏好小方法、小类的老程序员质疑书里对方法长度的态度；作者解释"拆小是局部优化"，并点名《Clean Code》的一段代码作反例。中途话题散到深层嵌套、提前返回、为测试而拆方法。 |
| A | [First Edition on Amazon](https://groups.google.com/g/software-design-book/c/H-3sC61ZN9E) | 13 | 10 | 2021-10-17 | 2021-11-15 | 5 | 已精读 | 14 | 第 4 章（深模块、接口成本，4.4～4.6）；第 2 章（2.1 复杂性的定义：开发者某一时刻面对的复杂性）；第 9 章（拆还是合）；专题 clean-code；前半串对应"关于本书 / 版本说明" | 前半串是亚马逊上第一版/第二版混淆的出版事务；从第 10 条起换了话题——"模块成本 vs 集成成本"、整体复杂还是局部复杂、架构有没有必要，作者在最后一条给了一段很有分量的回答。 |
| A | [Comments: I agree with the problem, not with the solution](https://groups.google.com/g/software-design-book/c/iS2GVCApGoo) | 12 | 10 | 2023-11-18 | 2024-05-26 | 2 | 已精读 | 13 | 第 12 章 12.1（"好代码自文档化"）/ 第 4 章 4.2（同一句话也出现在这里）/ 第 13 章 13.5（接口注释）/ 第 19 章 19.3（单元测试）/ 第 10 章 10.5（substring 例子）/ 训练场 / 专题 ai-era（末两条） | 书里说接口的非形式部分"只能用注释描述"，读者认为单元测试也能、甚至更好；作者承认测试更精确，但坚持注释更好找、更好读。 |
| A | [Top-down vs Bottom-up](https://groups.google.com/g/software-design-book/c/i8I9gOcQKII) | 11 | 7 | 2020-03-22 | 2020-03-24 | 3 | 已精读 | 12 | 第 4 章（深/浅模块）；第 6 章（通用模块、把应用的特殊需求挡在接口外）；第 5 章（5.3 时间分解）；第 7 章（分层）；次要涉及第 11 章 | 书里没谈"自顶向下还是自底向上"；读者主张自底向上更能适应变化，作者则刚得出相反的初步看法（自顶向下更容易得到深模块），几轮之后双方收敛到"各有各的风险"。 |
| A | [Eliminating pass-through variables by creating objects up front](https://groups.google.com/g/software-design-book/c/6Vs1trmcq9k) | 9 | 5 | 2022-09-24 | 2022-10-03 | 2 | 已精读 | 10 | 第 7 章（7.5 透传变量、图 7.2）；次要涉及第 5 章（信息隐藏：main 不该知道调用链）、第 2 章（不明显的依赖） | 7.5 的透传变量除了 context 对象还有没有更好的解法：一位读者提出"在 main 里预先把对象一层层构造好"，被作者否定；另一位读者提出"绑定在调用栈上的作用域式 context"，作者称之为接近最优。 |
| A | [TDD in A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/vE2aqVXi8nw) | 8 | 7 | 2024-04-22 | 2025-05-22 | 1 | 已采用 | 9 | 第 19 章（19.4 测试驱动开发，兼 19.3 单元测试）；专题 clean-code（辩论里的 TDD 一节）；次要涉及第 3 章（战术式编程）、第 11 章（设计两次） | 读者认为书里对 TDD 的批评（"没有明显的设计时机"）是稻草人——重构步骤、或"先写测试=先设计接口"就是设计；作者坚持批评并补了一段更细的推演。 |
| A | [Omission of fsync in APoSD and RAMCloud](https://groups.google.com/g/software-design-book/c/OCSMlVYmQTE) | 8 | 4 | 2025-03-18 | 2025-04-05 | 3 | 已精读 | 9 | 第 4 章（4.4 深模块的 Unix I/O 例子，4.7 Java 与 Unix I/O 的默认行为）；第 2 章（2.1 复杂性按"开发者花在上面的时间"加权）；专题 ostep（文件系统持久性、fsync、崩溃一致性） | 书里把 Unix 文件 I/O 的五个调用当作深模块的典范，却没提 fsync；读者问：算上持久性之后这个接口还"简单"吗？后半串转到 RAMCloud 不调用 fsync 是否安全。 |
| A | [A little copying is better than a little dependency](https://groups.google.com/g/software-design-book/c/J3GweRh4VbM) | 8 | 7 | 2024-02-20 | 2024-02-23 | 2 | 已精读 | 9 | 第 9 章（9.3 合并以消除重复、红旗"重复"）；第 2 章（依赖与"不明显"是复杂性的来源）；第 13 章（注释要写清变量的含义）；第 14 章（名字含糊）；次要涉及第 16 章（改已有代码时的战术性做法） | Go 谚语"少量复制好过少量依赖"对不对；作者的判据是"复制之后依赖真的消失了吗"，并把读者举的反例归因于变量含义没写清楚。 |
| A | [Question about 9.4 and 9.2](https://groups.google.com/g/software-design-book/c/AlSb_DOIpeg) | 8 | 5 | 2022-10-19 | 2022-10-25 | 1 | 已精读 | 9 | 第 9 章（9.2、9.4）；第 4 章（Java I/O 例子的出处，"让常见用法尽可能简单"）；第 2 章（复杂性是一点点累积的）；次要涉及第 7 章（装饰器式的分层） | 9.2 说 FileInputStream 和 BufferedInputStream 应该合并，9.4 又说通用机制要单独成模块，两条是否矛盾；作者给出了书里没有写明的解法——缓冲做成内部复用的模块，而不是暴露给用户的一层。 |
| A | [a small worked example](https://groups.google.com/g/software-design-book/c/TVHbMP5ENXo) | 7 | 5 | 2026-02-26 | 2026-03-13 | 2 | 已精读 | 8 | 第 4 章（4.4 深模块、4.5 浅模块）/ 第 9 章 9.7（方法的拆与合）/ 第 5 章（信息泄漏、时序耦合）/ 第 6 章（通用模块，仅读者提到）/ 第 13 章 13.5（接口注释）/ 训练场 / 专题 clean-code | 同一个小程序（给 Markdown 标题行加章节编号）的"一个函数写完"与"拆成两个类"两种实现，哪个更简单；作者逐条点评了拆类版本的毛病。 |
| A | [4.7 Examples: Java and Unix I/O (p. 26) feedback.](https://groups.google.com/g/software-design-book/c/rin4ykU9plo) | 6 | 5 | 2019-05-31 | 2022-11-14 | 3 | 已精读 | 7 | 第 4 章 4.7；次要：第 7 章（装饰器，7.3）、第 6 章（通用性）、第 20 章（性能） | 4.7 节 Java I/O 的例子（打开文件读序列化对象要建三个对象）批评得对不对——缓冲该不该默认、ObjectInputStream 独立成类有没有道理、装饰器分层的替代方案是什么。 |
| A | [Single Responsibility Principal](https://groups.google.com/g/software-design-book/c/qD9WOq0ceOg) | 6 | 6 | 2020-07-17 | 2022-02-07 | 2 | 已采用 | 7 | 第 4 章 4.6（类过多症）、4.7（Java 与 Unix I/O）/ 专题 clean-code / 第 9 章（9.7、9.8）/ 第 19 章 19.3（单元测试） | 第 4 章批评的 Java I/O（读一个文件要建三个对象）是不是单一职责原则（SRP）的产物；作者怎么看 SRP。 |
| A | [A Philosophy of Software Design — does strategic vs. tactical still hold with AI coding tools?](https://groups.google.com/g/software-design-book/c/eh_JUu9H-30) | 1 | 2 | 2026-07-08 | 2026-07-13 | 1 | 已采用 | 2 | 专题 ai-era；第 3 章（战略 vs 战术，3.1～3.3）；次要涉及第 4 章（浅模块） | 如果以后"和代码长期相处"的是 AI 而不是人，第 3 章"战略式编程值得投资"的论证还成立吗；作者给了一个谨慎的回答。 |
| B | [Has AI Actually Improved Software Quality in Production Systems?](https://groups.google.com/g/software-design-book/c/EUy3koBr1ow) | 17 | 12 | 2026-02-20 | 2026-05-12 | 1 | 已采用 | 18 | 专题 ai-era；次要涉及第 3 章（战术龙卷风，3.1）、第 2 章（复杂性是一点点累积的，2.4） | AI 编程助手让写代码变快了，但在生产系统里有没有让软件质量（缺陷、性能、可维护性）真的变好；读者各自给出经验和二手数据。 |
| B | [APOSD vs. Clean Code](https://groups.google.com/g/software-design-book/c/yHsxTAAqP9g) | 17 | 14 | 2025-02-23 | 2026-01-08 | 2 | 已采用 | 18 | 专题 clean-code；次要涉及第 12～13 章（注释）、第 19 章（TDD）、第 4 章（深度） | 作者公布他与 Robert Martin 的书面辩论（GitHub 上的 aposd-vs-clean-code），请大家在这一串里评论。 |
| B | [Dependency injection for eliminating pass-through variables](https://groups.google.com/g/software-design-book/c/xYzAzHcB630) | 17 | 8 | 2018-08-22 | 2018-09-24 | 4 | 已精读 | 18 | 第 7 章（7.5 透传变量与 context 对象；第 1 版第 50～53 页）；第 2 章（依赖、不明显）；次要涉及第 14 章（"context"这个名字是否含糊）、专题 clean-code（依赖倒置 / SOLID 只是顺带提到） | 读者认为依赖注入（DI）框架已经解决了透传变量问题；作者坦言不懂 DI，追问"显式写出这类依赖到底有什么价值"，最后没弄明白、搁置；读者之间对 DI 是什么也没有共识。 |
| B | [Function names as a language](https://groups.google.com/g/software-design-book/c/CEIpGjyswfg) | 14 | 5 | 2026-01-12 | 2026-01-15 | 1 | 已精读 | 15 | 第 4 章（4.4～4.5 深与浅）/ 第 9 章 9.7（拆方法）/ 第 14 章（名字的精确性，14.3）/ 第 7 章（读者最后提问，无人回答）/ 专题 clean-code | 浅函数如果能"给代码造词汇"（如 `add_null(attribute)`、`triangle_perimeter(a, b, c)`），算不算有价值；作者把"词汇"问题归回到深/浅模块。 |
| B | [About Comments](https://groups.google.com/g/software-design-book/c/kIq42jPTR7U) | 12 | 9 | 2018-12-24 | 2025-02-07 | 2 | 已精读 | 13 | 第 15 章 15.3（注释是设计工具）/ 第 12 章（12.1、12.4）/ 第 13 章（13.5 接口注释、13.6 实现注释）/ 专题 clean-code | 一位 Clean Code 背景的读者觉得大量注释"难看、分心"，并问"把注释当设计工具"有没有别的资料；作者说明自己的注释实际长什么样。 |
| B | [Process to arrive a good design that separates general & special purpose code](https://groups.google.com/g/software-design-book/c/MtQQkeuUD2s) | 12 | 8 | 2023-04-26 | 2025-01-11 | 1 | 已精读 | 13 | 第 11 章（设计两次）；第 6 章（6.1 适度通用、6.6 把专用代码往上推）与第 9 章 9.4；第 3 章（持续的小投资）；次要涉及第 15 章（先写注释 / 先写用法）、第 16 章；中途跑题到 DSL、代码生成、GUI 工具箱历史 | 怎样的过程才能把通用代码和专用代码分对——先设计还是先写乱再重划边界；作者答"先想、别卡住、做两个差别很大的方案、准备好迭代两三轮"，提问者一年半后回来写了实践心得。 |
| B | [What purpose do factories serve?](https://groups.google.com/g/software-design-book/c/46heiunvGug) | 11 | 9 | 2021-12-21 | 2022-11-14 | 4 | 已精读 | 12 | 第 4 章（浅模块、classitis、接口数量本身是成本）；第 8 章（把复杂性往下拉：宁可类的实现复杂些，也别让使用者复杂）；第 7 章（多一层要多一份抽象；7.5 的透传在 [2][6] 被顺带提到）；专题 clean-code（仅因设计模式文化，关系较远） | 这一串是作者自己发问——重回 Java 后在 gRPC 代码里看到大量工厂、builder，不明白比构造函数好在哪；读者给出若干理由，作者接受了其中一个（运行时才能确定具体类型），否定了两个。 |
| B | [Chapter 2: A quibble](https://groups.google.com/g/software-design-book/c/frHMNxt-3rI) | 11 | 3 | 2019-01-26 | 2019-01-29 | 2 | 已列出 |  | 第2章 | 第 2 章的异议，11 回复，后半段可能跑题 |
| B | [On the completeness of a philosophy of software design](https://groups.google.com/g/software-design-book/c/bDj6Jr5N5Sg) | 10 | 5 | 2022-08-02 | 2022-08-25 | 2 | 已列出 |  | 第22章 | 这套哲学是否完备，10 回复 |
| B | [Feedback to "A Philosophy of software design"](https://groups.google.com/g/software-design-book/c/FvL6_yfol6c) | 10 | 6 | 2020-01-04 | 2020-01-10 | 2 | 已列出 |  | 第7章 | 综合反馈，涉及全局上下文 |
| B | [Tell, Don't Ask principle](https://groups.google.com/g/software-design-book/c/D8tHfkacHq8) | 8 | 4 | 2026-02-18 | 2026-03-02 | 1 | 已精读 | 9 | 第 7 章 7.1（透传方法）/ 第 4 章（4.5 浅模块）/ 第 5 章（信息泄漏，读者 [8]）/ 第 19 章 19.6（getter/setter，间接相关）/ 训练场 | 《程序员修炼之道》按 "Tell, Don't Ask" 修掉链式调用（train wreck）的办法，看起来会制造 APOSD 第 7 章反对的透传方法——两条原则冲突吗，谁优先。 |
| B | [Choosing Names](https://groups.google.com/g/software-design-book/c/YHNMr_FgnRY) | 8 | 6 | 2023-07-29 | 2024-04-22 | 1 | 已精读 | 9 | 第 14 章 14.1（坏名字导致 bug）/ 第 10 章 10.3（把错误定义掉）/ 第 13 章（注释 vs 类型 vs 名字里带单位）/ 训练场 | 第 14 章的 `block` 变量 bug，如果物理块号和逻辑块号是两个不同的类型就不会发生——那么什么时候该给"其实就是个整数"的东西单独建类型；后半串转到 "Parse, Don't Validate" 和带单位的名字。 |
| B | [Definition of complexity](https://groups.google.com/g/software-design-book/c/JSgeGrY6NBU) | 7 | 5 | 2018-08-22 | 2018-09-20 | 1 | 已精读 | 8 | 第 2 章 2.1（复杂性的定义与公式）；次要：第 9 章（拆分）、第 6 章（让常见情况简单）、第 11 章（比较两个设计） | 2.1 节那条复杂性公式（各部分复杂度按开发者花在其上的时间加权求和）有没有漏洞——读者认为它不惩罚"大量小函数"，提议改成按"变更类型"求和。 |
| B | [Another approach to complexity reduction: interface elimination](https://groups.google.com/g/software-design-book/c/raZiHfaBRX4) | 7 | 5 | 2018-08-20 | 2018-08-30 | 2 | 已列出 |  | 第4章 | 消除接口来降复杂度 |
| B | [Thoughts on Chapter 13.5 Interface documentation](https://groups.google.com/g/software-design-book/c/SPVi2Ib3Vhg) | 6 | 4 | 2021-06-23 | 2021-06-26 | 2 | 已列出 |  | 第13章 | 13.5 接口文档 |
| B | [A review of A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/nV1YJ6d9wRo) | 6 | 5 | 2020-02-20 | 2020-03-12 | 2 | 已采用 | 7 | 第 19 章（19.3 单元测试、19.4 TDD）；第 12 章（"好代码自己就是文档"这个借口，12.1）与第 13 章；专题 clean-code | Gergely Orosz 发了一篇书评（内容不在串里），作者回应其中两点批评——书里为什么几乎不谈测试、注释能不能靠重构消掉；随后 Dan Cross 追问"测试不影响设计"这个说法。 |
| B | [Informal interface elements](https://groups.google.com/g/software-design-book/c/0am-9T4-sX8) | 6 | 5 | 2019-02-27 | 2019-02-28 | 1 | 已列出 |  | 第4章 | 接口的非形式部分，6 回复 |
| B | [Few thoughts on (de)composition](https://groups.google.com/g/software-design-book/c/jDZlJRhWloY) | 5 | 4 | 2025-12-15 | 2025-12-28 | 1 | 已列出 |  | 第9章 | 拆分与合并 |
| B | [Simple vs Complex < Pure vs Impure?](https://groups.google.com/g/software-design-book/c/jHqSuH3lnmA) | 5 | 5 | 2022-12-21 | 2022-12-23 | 1 | 已列出 |  | 第2章 | 简单/复杂 与 纯/不纯 |
| B | [Thoughts on fork()](https://groups.google.com/g/software-design-book/c/zC65L9Hq0B4) | 5 | 4 | 2022-08-18 | 2022-12-05 | 1 | 已列出 |  | 专题:ostep | fork() 的设计，系统方向 |
| B | [Chapter 1](https://groups.google.com/g/software-design-book/c/a8FqeEpPgrM) | 5 | 5 | 2021-06-17 | 2021-06-18 | 1 | 已列出 |  | 第1章 |  |
| B | [Feedback on the book from our study group](https://groups.google.com/g/software-design-book/c/7uHUHoZyTmE) | 4 | 4 | 2024-07-11 | 2024-07-15 | 1 | 已列出 |  | 第4章 | 读书小组的集中反馈，涉及 Java 文件 I/O |
| B | [Suggestion for page 111 comment](https://groups.google.com/g/software-design-book/c/jngfdK-tWnk) | 4 | 2 | 2024-05-17 | 2024-05-20 | 3 | 已列出 |  | 第13章 | 具体一条注释的改法，作者 3 条 |
| B | [Mountains to Molehills](https://groups.google.com/g/software-design-book/c/-3R1G0sU3zI) | 4 | 3 | 2023-06-01 | 2023-06-17 | 1 | 已精读 | 5 | 第 5 章（信息隐藏与泄漏）；第 4 章（4.2 接口的非正式部分）；第 2 章（依赖与模糊性，2.3）；次要涉及第 18 章（事件驱动让代码不显然，18.2） | 一位读者推销自己的 "Eventz" 方法（所有函数由事件触发、只读写一个共享的事件记录归档，自称"没有契约、函数彼此独立"）；作者用信息隐藏的观点指出它为什么站不住。 |
| B | [Defining errors of out existence - help me understand the tradeoffs with this example](https://groups.google.com/g/software-design-book/c/8zkWyisdVBA) | 4 | 4 | 2021-08-11 | 2021-08-22 | 1 | 已列出 |  | 第10章 | "把错误定义掉"的取舍 |
| B | [Better shallow modules example?](https://groups.google.com/g/software-design-book/c/8wb20I9tc5U) | 4 | 4 | 2020-10-04 | 2020-10-07 | 1 | 已列出 |  | 第4章 | 更好的浅模块例子 |
| B | [Abstraction as unit of development in TDD](https://groups.google.com/g/software-design-book/c/auIx2lPEJsc) | 4 | 4 | 2019-06-01 | 2019-06-11 | 1 | 已列出 |  | 第19章 | TDD 的开发单位 |
| B | [Deep shallowness?](https://groups.google.com/g/software-design-book/c/wdYR4VpnCM8) | 4 | 2 | 2019-03-31 | 2019-04-16 | 2 | 已列出 |  | 第4章 | 深度的衡量，作者 2 条 |
| B | [Interface vs. Concrete Type Declaration for a Variable](https://groups.google.com/g/software-design-book/c/b8TI5ioYf1k) | 4 | 3 | 2019-01-25 | 2019-02-05 | 2 | 已列出 |  | 第4章 | 变量声明用接口还是具体类型 |
| B | [Philosophy of test design](https://groups.google.com/g/software-design-book/c/CxbZoE8i_Y0) | 4 | 5 | 2018-08-28 | 2018-08-31 | 1 | 已列出 |  | 第19章 | 测试的设计哲学 |
| B | [On unit testing, mocks, and classitis](https://groups.google.com/g/software-design-book/c/CZ-gs8MPqvA) | 4 | 3 | 2018-07-23 | 2018-07-25 | 2 | 已列出 |  | 第19章 | 单元测试、mock 与 classitis |
| B | [The Agile approach to software design](https://groups.google.com/g/software-design-book/c/07rvfWgQkGs) | 3 | 3 | 2025-03-15 | 2025-03-21 | 1 | 已列出 |  | 第19章 | 敏捷与设计，作者回应 |
| B | [Feedback on A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/PUemYLM9BQk) | 3 | 4 | 2024-01-03 | 2024-01-23 | 1 | 已列出 |  | 第12章 | 读者综合意见，含注释 |
| B | [Local/private general purpose helpers vs a general purpose library](https://groups.google.com/g/software-design-book/c/q8kbWtdjqfc) | 3 | 3 | 2022-02-09 | 2022-03-15 | 1 | 已列出 |  | 第6章 | 本地通用 helper vs 通用库 |
| B | [1 line modules](https://groups.google.com/g/software-design-book/c/9XGtei4gdi4) | 3 | 2 | 2021-07-27 | 2021-07-30 | 2 | 已列出 |  | 第4章 | 一行的模块，带代码样例，可做训练题素材 |
| B | [Student project ideas](https://groups.google.com/g/software-design-book/c/-zRoJ2cAVlI) | 3 | 3 | 2021-01-18 | 2021-01-19 | 1 | 已列出 |  | 项目 | 学生项目选题 |
| B | [Note on Wrappers and Pass-Through Methods](https://groups.google.com/g/software-design-book/c/xisvPNmDHM4) | 3 | 3 | 2019-06-13 | 2019-06-14 | 1 | 已列出 |  | 第7章 | 包装器与透传方法，作者回应 |
| B | [Note on Implementation Comments](https://groups.google.com/g/software-design-book/c/TTPivcnXqd4) | 3 | 3 | 2019-06-13 | 2019-06-13 | 1 | 已列出 |  | 第13章 | 实现注释，作者回应 |
| B | [Composable decorators -- does that make sense?](https://groups.google.com/g/software-design-book/c/XF1ApRr0h9Y) | 3 | 2 | 2019-01-11 | 2019-01-18 | 1 | 已列出 |  | 第7章 | 可组合的装饰器 |
| B | [Confusing example in the book APOSD](https://groups.google.com/g/software-design-book/c/0mnHI6zxnAk) | 2 | 3 | 2026-08-29 | 2026-09-21 | 1 | 已精读 | 3 | 第 4 章 4.7（Java I/O 例子）、4.2（接口包含什么）；次要：第 7 章（装饰器） | 读者问 4.7 节的 Java I/O 例子——三个装饰器对象共用同一个接口，而书里说成本来自接口不来自类，那用三个对象的成本为什么不等于用一个？ |
| B | [Terminological ambiguity in Chapter 2 of A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/iNUoSa7t4xw) | 2 | 3 | 2025-12-20 | 2025-12-26 | 1 | 已列出 |  | 第2章 | 第 2 章术语歧义，作者回应 |
| B | [Learnings from the "A Philosophy of Software Design" applied to testing](https://groups.google.com/g/software-design-book/c/r4cbN7jxFts) | 2 | 2 | 2025-01-12 | 2025-01-29 | 1 | 已列出 |  | 第19章 | 把书中原则用于测试，含与作者的对谈 |
| B | [Pass-through Variables](https://groups.google.com/g/software-design-book/c/edN-bAAHGN0) | 2 | 3 | 2024-09-06 | 2024-09-07 | 1 | 已列出 |  | 第7章 | 透传变量，作者回应 |
| B | [Inquiry on Pass-through Methods from "A Philosophy of Software Design"](https://groups.google.com/g/software-design-book/c/CTt_XD_ZekA) | 2 | 2 | 2024-08-17 | 2024-08-26 | 1 | 已列出 |  | 第7章 | 透传方法的疑问，作者回应 |
| B | [a philosophy of software design and tdd](https://groups.google.com/g/software-design-book/c/_JpPAYy8h9g) | 2 | 2 | 2024-08-07 | 2024-08-07 | 1 | 已列出 |  | 第19章 | TDD，作者回应 |
| B | [Thanks -- my thoughts](https://groups.google.com/g/software-design-book/c/LdDRVpwLL-Y) | 2 | 3 | 2024-04-20 | 2024-04-22 | 1 | 已采用 | 3 | 第 9 章（9.7 拆分与合并方法）；第 13 章（注释写什么）；专题 clean-code；次要涉及第 4 章（浅模块 / 工具类） | 标题是致谢和一篇博客书评，实际内容是另一位读者谈注释和"长方法要不要拆"，作者借机澄清自己并不反对拆长方法。 |
| B | [Thank you and two questions about the book](https://groups.google.com/g/software-design-book/c/Eh14W0_Bxfc) | 2 | 3 | 2024-02-23 | 2024-03-05 | 1 | 已列出 |  | 第4章 | 浅函数相关提问 |
| B | [Complexity when component is a black box](https://groups.google.com/g/software-design-book/c/htX4Y2CnCHY) | 2 | 3 | 2024-02-27 | 2024-02-27 | 1 | 已列出 |  | 第2章 | 黑盒组件的复杂度 |
| B | [Opinion on Test-driven development](https://groups.google.com/g/software-design-book/c/bJ6vmAIz5_0) | 2 | 2 | 2023-09-10 | 2023-09-13 | 2 | 已列出 |  | 第19章 | TDD，作者 2 条 |
| B | [How to design Components in modern web apps?](https://groups.google.com/g/software-design-book/c/XuXnFQSG7Vo) | 2 | 3 | 2023-07-06 | 2023-07-11 | 1 | 已列出 |  | 第4章 | 前端组件的接口 |
| B | [Pass through variables, decorators and managed dependency injection](https://groups.google.com/g/software-design-book/c/zFoDD4KtyZE) | 2 | 2 | 2022-11-14 | 2022-11-15 | 1 | 已列出 |  | 第7章 | 透传变量与依赖注入 |
| B | [Enforcing properties via code instead of by convention](https://groups.google.com/g/software-design-book/c/WQTyymI0Zx4) | 2 | 3 | 2022-08-03 | 2022-08-03 | 1 | 已列出 |  | 第17章 | 用代码而非约定来保证性质 |
| B | [Surface of a class](https://groups.google.com/g/software-design-book/c/TQABoaV0rQA) | 2 | 2 | 2021-05-20 | 2021-05-22 | 1 | 已列出 |  | 第4章 | 类的"表面积" |
| B | [Over abstraction and under abstraction](https://groups.google.com/g/software-design-book/c/6IlNDHgnM4I) | 2 | 3 | 2020-11-21 | 2020-11-28 | 1 | 已列出 |  | 第4章 | 过度抽象与抽象不足 |
| B | [interface simplicity vs implementaion simplicity](https://groups.google.com/g/software-design-book/c/1dlMFd6928Y) | 2 | 3 | 2019-03-12 | 2019-03-12 | 1 | 已列出 |  | 第8章 | 接口简单 vs 实现简单 |
| B | [Some thoughts about "Classitis"](https://groups.google.com/g/software-design-book/c/i3opLcNPJXo) | 2 | 3 | 2019-02-19 | 2019-02-19 | 1 | 已列出 |  | 第4章 | classitis |
| B | [The UNIX file interface example](https://groups.google.com/g/software-design-book/c/EFFt6f_92E8) | 1 | 2 | 2026-01-13 | 2026-01-13 | 1 | 已列出 |  | 第4章 | UNIX 文件接口例子的追问，作者回应 |
| B | [Section 9.7/9.8](https://groups.google.com/g/software-design-book/c/dubcmvgew0I) | 1 | 2 | 2025-12-22 | 2025-12-26 | 1 | 已列出 |  | 第9章 | 9.7/9.8 小节的疑问，作者回应 |
| B | [APOSD - Practical Application Exercises](https://groups.google.com/g/software-design-book/c/F-u7U4lbg8s) | 1 | 2 | 2025-06-09 | 2025-06-11 | 1 | 已列出 |  | 项目 | 书中课程项目的说明，作者回应 |
| B | [Seeking advice for teaching](https://groups.google.com/g/software-design-book/c/SJxs5KCxJNE) | 1 | 2 | 2025-03-18 | 2025-03-19 | 1 | 已列出 |  | 训练场 | 作者谈怎么教这本书 |
| B | [Is interface informal information a bad thing?](https://groups.google.com/g/software-design-book/c/lqWkasBh5jA) | 1 | 2 | 2023-12-28 | 2024-01-12 | 1 | 已列出 |  | 第4章 | 接口的非形式部分 |
| B | [Comments on Chapter 5 regarding (more) explicit control flow](https://groups.google.com/g/software-design-book/c/3hgHk9NhZL4) | 1 | 2 | 2023-06-24 | 2023-07-08 | 1 | 已列出 |  | 第5章 | 显式控制流，作者回应 |
| B | [More example on error prone design](https://groups.google.com/g/software-design-book/c/4LOLZArwQEk) | 1 | 2 | 2023-06-16 | 2023-06-20 | 1 | 已列出 |  | 第10章 | 易错设计的例子，作者回应 |
| B | [Data on the impact of Technical Debt (Chapter 3)](https://groups.google.com/g/software-design-book/c/f5aRoGS_avg) | 1 | 2 | 2023-03-19 | 2023-03-23 | 1 | 已列出 |  | 第3章 | 技术债影响的数据 |
| B | [Chapter 9 - Why no mention of coupling/cohesion?](https://groups.google.com/g/software-design-book/c/Zd7vVeJb1PY) | 1 | 2 | 2022-11-17 | 2022-11-18 | 1 | 已列出 |  | 第9章 | 为什么不提耦合/内聚，作者回应 |
| B | [Context Objects](https://groups.google.com/g/software-design-book/c/bFpTYCL3p0U) | 1 | 2 | 2021-12-10 | 2021-12-13 | 1 | 已列出 |  | 第7章 | 上下文对象，作者回应 |
| B | [An alternative implementation to the undoable delete](https://groups.google.com/g/software-design-book/c/RFJ7q9wdke4) | 1 | 2 | 2020-05-30 | 2020-06-02 | 1 | 已列出 |  | 第6章 | 可撤销删除的另一种实现，作者回应 |
| B | [Re: Questions on Software Consistency](https://groups.google.com/g/software-design-book/c/fO0RtWYZ9ko) | 1 | 2 | 2019-05-17 | 2019-05-17 | 1 | 已列出 |  | 第17章 | 一致性 |
| B | [Shallow modules + unit tests = rigid code?](https://groups.google.com/g/software-design-book/c/DofyDeG57yo) | 1 | 2 | 2019-01-04 | 2019-01-05 | 1 | 已列出 |  | 第19章 | 浅模块 + 单元测试是否导致僵化 |
| B | [Deep and shallow modules](https://groups.google.com/g/software-design-book/c/myxG1aeXLos) | 1 | 2 | 2018-11-03 | 2018-11-05 | 1 | 已列出 |  | 第4章 | 深浅模块的例子 |
| B | [Throwing less number of exceptions](https://groups.google.com/g/software-design-book/c/ouVwAfqZfgo) | 1 | 2 | 2018-07-18 | 2018-07-19 | 1 | 已列出 |  | 第10章 | 少抛异常 |
| B | [Good example of a bad interface (shaaaaallow)](https://groups.google.com/g/software-design-book/c/uHWl_gbtmW8) | 5 | 5 | 2023-04-02 | 2023-04-11 |  | 已列出 |  | 第4章 | 浅接口的实例，可做训练题素材 |
| B | [Are chapters 1-3 an indictment of agile?](https://groups.google.com/g/software-design-book/c/4iaOVD8lqws) | 5 | 4 | 2022-02-10 | 2022-07-18 |  | 已列出 |  | 第19章 | 前三章是否在批评敏捷；也可挂第3章 |
| B | [Determinism and immutability as a way of reducing complexity](https://groups.google.com/g/software-design-book/c/TW3Uy0Ro8qQ) | 4 | 2 | 2022-05-16 | 2022-06-08 |  | 已列出 |  | 第2章 | 确定性与不可变性 |
| B | [AI is good at helping you "Design It Twice"](https://groups.google.com/g/software-design-book/c/RROhiBErr-8) | 3 | 4 | 2025-06-03 | 2026-06-22 |  | 已列出 |  | 专题:ai-era | AI 与"设计两次"；也可挂第11章 |
| B | [Opinion on using very short and simple functions to encapsulate mathematical operations](https://groups.google.com/g/software-design-book/c/V1guAyS_Jh0) | 3 | 4 | 2022-12-28 | 2023-01-31 |  | 已列出 |  | 第4章 | 极短函数封装数学运算 |
| B | [Has Anyone Tried Using APOSD Red Flags with LLMs?](https://groups.google.com/g/software-design-book/c/OG9xef7i118) | 2 | 2 | 2026-03-29 | 2026-03-30 |  | 已列出 |  | 专题:ai-era | 把红旗用于 LLM 的实践 |
| B | [Thoughts on Section 7.5 "Pass-through variables"](https://groups.google.com/g/software-design-book/c/80J6w37-b8s) | 2 | 3 | 2024-02-15 | 2024-02-16 |  | 已列出 |  | 第7章 | 7.5 透传变量 |
| B | [The difference between the different approaches to deal with pass-through variables](https://groups.google.com/g/software-design-book/c/bLAoxe7mSpU) | 2 | 3 | 2021-05-09 | 2023-03-17 |  | 已列出 |  | 第7章 | 处理透传变量的几种办法之别 |
| B | [Chapter 6 / undo and redo](https://groups.google.com/g/software-design-book/c/ZMZGwjoxqg4) | 1 | 2 | 2025-12-22 | 2025-12-22 |  | 已列出 |  | 第6章 | 撤销/重做例子 |
| B | [Section 7.5](https://groups.google.com/g/software-design-book/c/fGi1O_QBJDA) | 1 | 2 | 2025-12-22 | 2025-12-22 |  | 已列出 |  | 第7章 | 7.5 透传变量 |
| B | [Information Leakage and Dependencies](https://groups.google.com/g/software-design-book/c/u8YarQz5xrA) | 1 | 1 | 2025-02-10 | 2025-02-11 |  | 已列出 |  | 第5章 | 信息泄漏与依赖 |
| B | [Any thoughts on Dependency Injections?](https://groups.google.com/g/software-design-book/c/K7fNnxD5RSE) | 1 | 2 | 2019-11-07 | 2019-11-08 |  | 已列出 |  | 第7章 | 依赖注入 |
| B | [Defining errors out of existence - Example 10.4 - File deletion in Windows](https://groups.google.com/g/software-design-book/c/8R28OGS1ikE) | 1 | 2 | 2018-08-04 | 2018-09-19 |  | 已列出 |  | 第10章 | 10.4 Windows 文件删除例子 |
| B | [Thrown exception handling vs error result handling](https://groups.google.com/g/software-design-book/c/J2crXSe2lvQ) | 0 | 1 | 2025-06-05 | 2025-06-05 |  | 已列出 |  | 第10章 | 异常与错误返回值 |
| B | [Chapter 4 Section 4.2 What is an Interface?](https://groups.google.com/g/software-design-book/c/ZHelY68bC-E) | 0 | 1 | 2025-05-13 | 2025-05-13 |  | 已列出 |  | 第4章 | 4.2 接口定义的疑问，无回复 |
| B | [Interesting example of "Design errors out of existence" from a recent talk by Leslie Lamport](https://groups.google.com/g/software-design-book/c/Z0QKfMb2U10) | 0 | 1 | 2025-03-25 | 2025-03-25 |  | 已列出 |  | 第10章 | "把错误定义掉"的新例子，可做训练题素材 |
| B | [Is "obscurity" mostly "indirect dependency"?](https://groups.google.com/g/software-design-book/c/HeCQ4bwlX5Q) | 0 | 1 | 2025-03-23 | 2025-03-23 |  | 已列出 |  | 第2章 | 模糊性是否就是间接依赖，无回复 |
| C | [(Hiring) Companies that follow these practices](https://groups.google.com/g/software-design-book/c/DXbvAMWzdnI) | 6 | 5 | 2022-06-30 | 2022-07-14 | 1 | 已列出 |  |  | 求职 |
| C | [Followed book's principles for years, wrote an article](https://groups.google.com/g/software-design-book/c/c_CNaDTJtbI) | 4 | 3 | 2023-05-19 | 2023-06-11 | 1 | 已列出 |  |  | 读者文章 |
| C | [Formal documentation](https://groups.google.com/g/software-design-book/c/ZVBh_EvdUYg) | 4 | 3 | 2020-10-10 | 2020-10-13 | 2 | 已列出 |  | 第13章 | 形式化文档 |
| C | [My 2 cents](https://groups.google.com/g/software-design-book/c/0WFGp4Mi7_E) | 4 | 3 | 2020-03-02 | 2020-03-11 | 2 | 已列出 |  |  |  |
| C | [A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/6smjcBde2pI) | 4 | 3 | 2019-07-15 | 2019-07-16 | 1 | 已列出 |  |  | 涉及程序正确性证明 |
| C | [A text version of this book which can be fed to LLMs for context?](https://groups.google.com/g/software-design-book/c/_wl1DciZZqw) | 3 | 4 | 2026-03-01 | 2026-03-02 | 1 | 已列出 |  | 专题:ai-era | 书的文本版喂给 LLM；涉及版权态度 |
| C | [Broader applications of your ideas](https://groups.google.com/g/software-design-book/c/8esxT-NJjRg) | 3 | 4 | 2025-05-24 | 2025-08-04 | 1 | 已列出 |  |  | 原则的更广应用 |
| C | [A Philosophy of Software Design by John Ousterhout](https://groups.google.com/g/software-design-book/c/k4wDZYOkt5c) | 3 | 3 | 2025-01-22 | 2025-01-22 | 1 | 已列出 |  |  |  |
| C | [ERRATA url?](https://groups.google.com/g/software-design-book/c/aPXogPNArQI) | 3 | 2 | 2019-03-12 | 2019-03-13 | 2 | 已列出 |  |  | 勘误表地址，可用来核对本站 |
| C | [On "A Philosophy of Software Design"](https://groups.google.com/g/software-design-book/c/M1Wz8ad-YE8) | 2 | 3 | 2025-03-03 | 2025-03-10 | 1 | 已列出 |  |  |  |
| C | [Comments on the best books, and requests](https://groups.google.com/g/software-design-book/c/CXfYnJxSJrA) | 2 | 3 | 2022-05-03 | 2024-08-19 | 1 | 已列出 |  |  | 书单 |
| C | [Philosophy of Software Design - minor erratum](https://groups.google.com/g/software-design-book/c/Gee_250qqRY) | 2 | 3 | 2024-04-21 | 2024-04-24 | 1 | 已列出 |  |  | 勘误之争，可核对本站是否受影响 |
| C | [Blog posts about POSD](https://groups.google.com/g/software-design-book/c/xbc0yUtORlQ) | 2 | 3 | 2021-02-19 | 2021-02-20 | 1 | 已列出 |  |  | 读者博客 |
| C | [Summary and Testing](https://groups.google.com/g/software-design-book/c/7LjNrrLWZVU) | 2 | 3 | 2020-06-22 | 2020-06-25 | 1 | 已列出 |  | 第19章 |  |
| C | [A couple suggestions](https://groups.google.com/g/software-design-book/c/rlzKnFiMui0) | 2 | 3 | 2019-03-28 | 2019-03-31 | 1 | 已列出 |  |  |  |
| C | [Design Principles and Red Flags](https://groups.google.com/g/software-design-book/c/Re2CjXc6XUE) | 1 | 2 | 2026-08-24 | 2026-08-24 | 1 | 已精读 | 2 | 速查页 | 一位读者请求把书末两页总结（设计原则、红旗）逐字放进自己的开源仓库，作者同意。 |
| C | [A few minor suggestions](https://groups.google.com/g/software-design-book/c/37hxUatsLAc) | 1 | 2 | 2026-08-10 | 2026-08-17 | 1 | 已列出 |  |  | 小勘误，可核对本站是否受影响 |
| C | [Request for Permission to Share Brief Summaries from Your Book](https://groups.google.com/g/software-design-book/c/hIsC3Nf5siA) | 1 | 2 | 2025-11-23 | 2025-11-24 | 1 | 已精读 | 2 | 无 | 一位读者请求在 LinkedIn 上发若干篇"简短、高层次、不直接引用"的章节摘要，作者同意。 |
| C | [Correction?](https://groups.google.com/g/software-design-book/c/4yZMqc4lbe8) | 1 | 2 | 2025-09-22 | 2025-09-22 | 1 | 已列出 |  |  | 勘误，可核对本站是否受影响 |
| C | [Appreciation, Suggestions, and Request for "A Philosophy of Software Design"](https://groups.google.com/g/software-design-book/c/su71D1F5zcg) | 1 | 2 | 2024-04-05 | 2024-04-09 | 1 | 已列出 |  |  |  |
| C | [@ouster: Have you heard of "Confident Ruby/Code"?](https://groups.google.com/g/software-design-book/c/eYhdcKN3-2E) | 1 | 2 | 2022-12-19 | 2022-12-22 | 1 | 已列出 |  | 第10章 |  |
| C | [Comment for philosophy Of Software Design](https://groups.google.com/g/software-design-book/c/IKg5lB2irsQ) | 1 | 2 | 2022-07-19 | 2022-07-20 | 1 | 已列出 |  |  |  |
| C | [Your book is fucking amazing](https://groups.google.com/g/software-design-book/c/SUny_TDVJz0) | 1 | 2 | 2022-07-12 | 2022-07-13 | 1 | 已列出 |  |  | 作者回答了三个问题，标题看不出主题 |
| C | [A thank you and a few suggestions for the book](https://groups.google.com/g/software-design-book/c/Y4M-QTU1Os0) | 1 | 2 | 2022-05-04 | 2022-05-09 | 1 | 已列出 |  |  |  |
| C | [Comments on Chapter 1](https://groups.google.com/g/software-design-book/c/GdOE7njh1JE) | 1 | 2 | 2021-06-18 | 2021-06-18 | 1 | 已列出 |  | 第1章 |  |
| C | [Chapter 20: text and code don't match](https://groups.google.com/g/software-design-book/c/hvn_-AjYJkg) | 1 | 2 | 2019-01-28 | 2019-02-04 | 1 | 已列出 |  | 第20章 | 书中文字与代码不一致，可核对本站 |
| C | [Nit-pick: Code sample with WeakReference](https://groups.google.com/g/software-design-book/c/XjDVC-H6tDo) | 1 | 2 | 2018-09-12 | 2018-09-13 | 1 | 已列出 |  |  | 代码样例的小问题 |
| C | [software design course in other universities?](https://groups.google.com/g/software-design-book/c/MszZffHkuKA) | 1 | 2 | 2018-08-31 | 2018-09-02 | 1 | 已列出 |  |  |  |
| C | [Enforcing strict design rules](https://groups.google.com/g/software-design-book/c/zuDGuDEbZhw) | 1 | 2 | 2018-08-20 | 2018-08-21 | 1 | 已列出 |  | 第17章 |  |
| C | [miscellaneous feedback about the book](https://groups.google.com/g/software-design-book/c/WYcVSUiP0QE) | 1 | 2 | 2018-05-24 | 2018-05-25 | 1 | 已列出 |  |  |  |
| C | [[Low-Code UI Architecture] How to design a UI layer that supports template injection and domain-specific extensibility?](https://groups.google.com/g/software-design-book/c/j17fYXHPCTg) | 8 | 6 | 2025-06-10 | 2025-06-29 |  | 已列出 |  |  | 低代码 UI 架构，偏题 |
| C | [the concrete aspects of software design practice](https://groups.google.com/g/software-design-book/c/K-yj3nxstE8) | 4 | 5 | 2025-08-02 | 2025-11-15 |  | 已列出 |  |  | 设计实践泛谈 |
| C | [Great book. Some feedback](https://groups.google.com/g/software-design-book/c/12OrIn-vMhU) | 4 | 3 | 2018-09-28 | 2018-11-14 |  | 已列出 |  |  |  |
| C | [Unit Operations in Software Engineering](https://groups.google.com/g/software-design-book/c/tVKNHjC4YWs) | 3 | 2 | 2025-07-15 | 2025-08-09 |  | 已列出 |  |  |  |
| C | [Examples of codebases that have "minimized complexity"](https://groups.google.com/g/software-design-book/c/qSrNI30D6Xg) | 3 | 3 | 2020-12-25 | 2020-12-28 |  | 已精读 | 4 | 无固定章节；勉强相关的是第 4 章（接口设计的实例）和专题 ostep（延伸阅读）；项目（本站的重构项目正是在回应同一个需求） | 有读者想看按本书原则写成的完整代码库，而不只是书里的小片段；另两位读者推荐了几个可以研究的系统（TCP/IP 实现、事件处理接口的演变、Plan 9）。 |
| C | [Decoupling UI Components: Addressing Layout and Dependency Challenges](https://groups.google.com/g/software-design-book/c/E0g0E1Upab8) | 2 | 2 | 2025-06-13 | 2025-06-15 |  | 已列出 |  |  | UI 组件解耦，偏题 |
| C | [Writing good designs is limited by organizational factors?](https://groups.google.com/g/software-design-book/c/hvPjR3TJGvk) | 2 | 3 | 2024-10-14 | 2024-11-18 |  | 已列出 |  | 第3章 | 组织因素对设计的限制 |
| C | [Video on General-Purpose Modules](https://groups.google.com/g/software-design-book/c/nXXXPtBaYVA) | 2 | 3 | 2022-01-16 | 2022-01-28 |  | 已列出 |  | 第6章 | 通用模块的视频 |
| C | [clarity](https://groups.google.com/g/software-design-book/c/dHrqt2nDVSM) | 2 | 3 | 2020-10-12 | 2020-10-13 |  | 已列出 |  |  |  |
| C | [Advice for a Novice](https://groups.google.com/g/software-design-book/c/KbKE4xTooLc) | 1 | 2 | 2026-09-15 | 2026-09-18 |  | 已列出 |  |  | 新手求建议 |
| C | [Does the software design mean only mean to make modular, reusable, and abstracted code ? or there is other things to care about ?](https://groups.google.com/g/software-design-book/c/eYbwHclsiiI) | 1 | 2 | 2026-02-17 | 2026-05-03 |  | 已列出 |  | 第1章 | 泛泛之问 |
| C | [Review of APoSD and comments on prior discussions](https://groups.google.com/g/software-design-book/c/GDglsxrKIgo) | 1 | 1 | 2025-02-09 | 2025-02-10 |  | 已精读 | 2 | 无；勉强相关的是第 14 章（起名字）和"怎么读这本书"的学习方法 | 一位读者讲自己边读边按章改写一个 G-code 前端项目的经历，顺带对讨论组里旧帖发几句感想（文学式编程、图形化表达代码），并提到用表格枚举来给模块起名。 |
| C | [Alternative way of seeing tactical vs strategic programming](https://groups.google.com/g/software-design-book/c/3L-v21okEJg) | 1 | 1 | 2024-09-12 | 2024-09-12 |  | 已列出 |  | 第3章 |  |
| C | [Testing](https://groups.google.com/g/software-design-book/c/C3JHu0G6T2w) | 1 | 2 | 2024-08-03 | 2024-08-12 |  | 已列出 |  |  |  |
| C | ["All” of our present IT industry troubles seem to be the result of flawed cohesion and coupling.](https://groups.google.com/g/software-design-book/c/2hnz0duQx4Y) | 1 | 2 | 2024-07-21 | 2024-07-21 |  | 已列出 |  |  |  |
| C | [On the Criteria to be used in Decomposing Systems into Modules, 1971](https://groups.google.com/g/software-design-book/c/XIp8n6eQyuA) | 1 | 2 | 2024-07-18 | 2024-07-18 |  | 已列出 |  | 第5章 | Parnas 论文，短 |
| C | [Two questions/remarks re your book "A philosophy of software design"](https://groups.google.com/g/software-design-book/c/8f9zf3mm2mg) | 1 | 2 | 2023-09-05 | 2023-09-06 |  | 已列出 |  |  |  |
| C | [Ideas to add to the book](https://groups.google.com/g/software-design-book/c/Qu0XOoLcnVE) | 1 | 2 | 2023-03-07 | 2023-03-08 |  | 已列出 |  |  |  |
| C | [Software Design, a learning project on Wikiversity](https://groups.google.com/g/software-design-book/c/Uxqo4A9zaPE) | 1 | 2 | 2019-12-09 | 2019-12-29 |  | 已列出 |  |  |  |
| C | [Another books on the topic of managing complexity](https://groups.google.com/g/software-design-book/c/NFlEEtiIGjQ) | 1 | 2 | 2019-06-09 | 2019-06-10 |  | 已列出 |  |  | 相关书目，可作延伸阅读 |
| C | [Feedback](https://groups.google.com/g/software-design-book/c/TFb4mNO0ggk) | 1 | 2 | 2019-01-18 | 2019-04-29 |  | 已列出 |  |  |  |
| C | [Question about software design in the age of AI](https://groups.google.com/g/software-design-book/c/9f4KveGak7o) | 0 | 1 | 2026-08-13 | 2026-08-13 |  | 已列出 |  | 专题:ai-era | 无回复的提问 |
| C | [Functional programming](https://groups.google.com/g/software-design-book/c/fe9nhlD2qkE) | 0 | 1 | 2026-05-31 | 2026-05-31 |  | 已列出 |  | 第19章 | 函数式编程，无回复 |
| C | ["Software Fundamentals Matter More Than Ever" — Matt Pocock](https://groups.google.com/g/software-design-book/c/Cigw-zRvFac) | 0 | 1 | 2026-04-29 | 2026-04-29 |  | 已列出 |  | 专题:ai-era | 外部视频链接 |
| C | [tactical tornado -- managers](https://groups.google.com/g/software-design-book/c/sSyTiYFu0-s) | 0 | 1 | 2026-04-29 | 2026-04-29 |  | 已列出 |  | 第3章 | 战术龙卷风与管理者，无回复 |
| C | [Matt Pocock endorses APOSD for use with AI](https://groups.google.com/g/software-design-book/c/nMgt9l8ghLY) | 0 | 1 | 2026-03-12 | 2026-03-12 |  | 已列出 |  | 专题:ai-era | 外部推荐 |
| C | [HCI principles and APOSD](https://groups.google.com/g/software-design-book/c/K9q7I-6WSdM) | 0 | 1 | 2026-01-05 | 2026-01-05 |  | 已列出 |  |  | HCI 原则，无回复 |
| C | [Visualization of Philosophy Of Software Design](https://groups.google.com/g/software-design-book/c/eNubozbQ4IU) | 0 | 1 | 2025-12-30 | 2025-12-30 |  | 已列出 |  |  | 可视化，无回复 |
| C | [On error handling and exceptions](https://groups.google.com/g/software-design-book/c/yyNzkIsmv5s) | 0 | 1 | 2025-12-22 | 2025-12-22 |  | 已列出 |  | 第10章 | Railway Oriented Programming 链接 |
| C | [Review by Internet of Bugs](https://groups.google.com/g/software-design-book/c/Y8Dy1iXRois) | 0 | 1 | 2024-12-01 | 2024-12-01 |  | 已列出 |  |  | 外部视频书评，无回复 |
| C | [A better name for complexity "symptom"?](https://groups.google.com/g/software-design-book/c/Ljx60ND993E) | 0 | 1 | 2023-11-18 | 2023-11-18 |  | 已列出 |  | 第2章 |  |
| C | [e: Followed book's principles for years, wrote an article](https://groups.google.com/g/software-design-book/c/sgJHJQwZ27c) | 0 | 1 | 2023-06-11 | 2023-06-11 |  | 已列出 |  |  | 与下一串同题 |
| C | [Why my code is so hard to understand](https://groups.google.com/g/software-design-book/c/CrbdtZccdGk) | 0 | 1 | 2023-03-31 | 2023-03-31 |  | 已列出 |  |  | 外部文章 |
| C | [Suggestions for "creative coding" projects](https://groups.google.com/g/software-design-book/c/6ZI1M0--m1o) | 0 | 1 | 2022-11-24 | 2022-11-24 |  | 已列出 |  | 项目 | 读书小组找练手项目 |
| C | [John Ousterhout on Software Engineering Radio](https://groups.google.com/g/software-design-book/c/GOmAiJoeHk8) | 0 | 1 | 2022-07-12 | 2022-07-12 |  | 已列出 |  |  | 播客访谈链接，可作延伸阅读 |
| C | [A short (mostly positive) book review](https://groups.google.com/g/software-design-book/c/4Y-FefX_Rbk) | 0 | 1 | 2021-11-03 | 2021-11-03 |  | 已列出 |  |  | 外部书评 |
| C | [Chapter 5 questions](https://groups.google.com/g/software-design-book/c/0EKWkEmNEcY) | 0 | 1 | 2021-04-27 | 2021-04-27 |  | 已列出 |  | 第5章 | 无回复的提问 |
| C | [Dialogue with Product Developers](https://groups.google.com/g/software-design-book/c/cOk6Vw3iMck) | 0 | 1 | 2021-01-06 | 2021-01-06 |  | 已列出 |  |  |  |
| C | [Philosophy of Software Design - some remarks](https://groups.google.com/g/software-design-book/c/mJVCHf7T5Zk) | 0 | 1 | 2019-07-08 | 2019-07-08 |  | 已列出 |  |  |  |
| C | [Thoughts on Chapter 3](https://groups.google.com/g/software-design-book/c/RmsgIVJblPo) | 0 | 1 | 2019-01-27 | 2019-01-27 |  | 已列出 |  | 第3章 |  |
| C | [7.5 Pass-through variables](https://groups.google.com/g/software-design-book/c/5OfdGmn5uVo) | 0 | 1 | 2018-12-09 | 2018-12-09 |  | 已列出 |  | 第7章 |  |
| X | [On the criteria to be used in decomposing systems into modules](https://groups.google.com/g/software-design-book/c/p4ywseTrZX0) | 26 | 9 | 2022-07-19 | 2024-08-26 | 3 | 已精读 | 27 | 无 | 标题借用 Parnas 1972 年论文的题目，内容却是一位读者（Steve Jackson）反复推介自己的"一切皆独立函数 + 事件"方案（EventzAPI）；作者和其他读者都不买账。提出方案的帖子几乎全部已删除，只剩反方的回应。 |
| X | [E-readers for the vision impaired?](https://groups.google.com/g/software-design-book/c/oVNz-YySXm4) | 6 | 5 | 2018-08-27 | 2018-08-31 | 2 | 跳过 |  |  | 电子书 |
| X | [Test Subject](https://groups.google.com/g/software-design-book/c/tOuUfLKXIGQ) | 3 | 2 | 2023-04-05 | 2023-04-07 | 1 | 跳过 |  |  | 测试帖 |
| X | [Minor Spelling Errors](https://groups.google.com/g/software-design-book/c/pwsdBC3M57o) | 3 | 4 | 2019-06-06 | 2019-06-06 | 1 | 跳过 |  |  | 错别字 |
| X | [Philosophy of Software Design PDF](https://groups.google.com/g/software-design-book/c/hcCDGS2Y8h0) | 2 | 2 | 2024-04-20 | 2024-04-21 | 1 | 跳过 |  |  | PDF 版本 |
| X | [Second edition Kindle version?](https://groups.google.com/g/software-design-book/c/eXXlzo6HyB8) | 2 | 2 | 2022-04-18 | 2022-04-18 | 1 | 跳过 |  |  | Kindle 版本 |
| X | [Prototype for a custom-developed hospital workflow management system](https://groups.google.com/g/software-design-book/c/LEEi7GAkygA) | 2 | 2 | 2019-06-29 | 2019-07-01 | 1 | 跳过 |  |  | 偏题 |
| X | [grammar correction](https://groups.google.com/g/software-design-book/c/IVMuoS5JaOU) | 2 | 3 | 2018-10-04 | 2019-01-28 | 1 | 跳过 |  |  | 语法 |
| X | [Great book! Two extremely minor grammatical nits](https://groups.google.com/g/software-design-book/c/oXzQpsFEuuM) | 2 | 2 | 2018-06-13 | 2018-06-13 | 1 | 跳过 |  |  | 错别字 |
| X | [Loving the book - one little issue](https://groups.google.com/g/software-design-book/c/lHpaTkQMXNE) | 1 | 2 | 2025-05-01 | 2025-05-01 | 1 | 跳过 |  |  | 错别字 |
| X | [Where to buy besides Amazon?](https://groups.google.com/g/software-design-book/c/NfOB1hNPIW0) | 1 | 2 | 2024-10-08 | 2024-10-08 | 1 | 跳过 |  |  | 购买渠道 |
| X | [Your book](https://groups.google.com/g/software-design-book/c/179lZ_ceDKg) | 1 | 2 | 2022-08-30 | 2022-09-05 | 1 | 跳过 |  |  |  |
| X | [This book isn't short](https://groups.google.com/g/software-design-book/c/-9up43BNuKQ) | 1 | 2 | 2022-07-29 | 2022-07-29 | 1 | 跳过 |  |  |  |
| X | [Small fixes for v1.0 of _A Philosophy of Software Design_](https://groups.google.com/g/software-design-book/c/ge0fXVDCqYk) | 1 | 2 | 2019-11-15 | 2019-11-18 | 1 | 跳过 |  |  | 错别字 |
| X | [A Philosophy of Software Design - Typo](https://groups.google.com/g/software-design-book/c/-_u_EFQQHpk) | 1 | 2 | 2019-07-08 | 2019-07-08 | 1 | 跳过 |  |  | 错别字 |
| X | [APOSD Translate for Japanese](https://groups.google.com/g/software-design-book/c/wZHh8_EU5mQ) | 1 | 2 | 2019-06-05 | 2019-06-05 | 1 | 跳过 |  |  | 翻译 |
| X | [Infographic?](https://groups.google.com/g/software-design-book/c/Z0k1x9ctKrY) | 1 | 2 | 2019-02-10 | 2019-02-10 | 1 | 跳过 |  |  |  |
| X | [Problem with console window](https://groups.google.com/g/software-design-book/c/o_ssi3ichAw) | 0 | 1 | 2025-11-13 | 2025-11-13 | 1 | 跳过 |  |  | 误发 |
| X | [Ebook edition](https://groups.google.com/g/software-design-book/c/AtmHMHbBNs4) | 4 | 5 | 2018-08-01 | 2018-10-26 |  | 跳过 |  |  | 电子书 |
| X | [A fun typo in the 2nd edition of this book: "noone"](https://groups.google.com/g/software-design-book/c/IqJXNTnF-Q4) | 1 | 2 | 2024-08-06 | 2024-08-06 |  | 跳过 |  |  | 错别字 |
| X | [Reading the book](https://groups.google.com/g/software-design-book/c/E6d4wwSlFjg) | 1 | 2 | 2024-02-13 | 2024-05-14 |  | 跳过 |  |  |  |
| X | [Sign me up!](https://groups.google.com/g/software-design-book/c/n9W1SxyVvhA) | 1 | 2 | 2022-09-21 | 2022-09-21 |  | 跳过 |  |  | 加入请求 |
| X | [Rank your app #1 for any keyword on the App Store.](https://groups.google.com/g/software-design-book/c/xYoRjaO-cVg) | 1 | 1 | 2021-02-03 | 2021-02-05 |  | 跳过 |  |  | 垃圾帖 |
| X | [Unable to find the group. Please add me in it.](https://groups.google.com/g/software-design-book/c/xTEIhUNnpc4) | 1 | 2 | 2020-07-11 | 2020-07-11 |  | 跳过 |  |  | 加入请求 |
| X | [Sharing My Book With You](https://groups.google.com/g/software-design-book/c/KzV0Mo8zC0U) | 0 | 1 | 2026-09-28 | 2026-09-28 |  | 跳过 |  |  | 自荐 |
| X | [How to join?](https://groups.google.com/g/software-design-book/c/_2QYQDErpJ8) | 0 | 1 | 2026-09-27 | 2026-09-27 |  | 跳过 |  |  | 加入请求 |
| X | [Re: Confusing example.](https://groups.google.com/g/software-design-book/c/9GXZW6uK43M) | 0 | 1 | 2026-08-29 | 2026-08-29 |  | 已精读 | 1 | 第 4 章 4.7（与 0mnHI6zxnAk 相同） | 只有一句话的孤立跟帖，是 0mnHI6zxnAk（"Confusing example in the book APOSD"）同一位读者同一天发的补充，被讨论组拆成了单独一串。 |
| X | [Thanks for APOSD](https://groups.google.com/g/software-design-book/c/9_VC-rDMTt4) | 0 | 1 | 2026-05-03 | 2026-05-03 |  | 跳过 |  |  | 致谢 |
| X | [eBook other than kindle?](https://groups.google.com/g/software-design-book/c/50DRoF2No-I) | 0 | 1 | 2026-04-21 | 2026-04-21 |  | 跳过 |  |  | 电子书格式 |
| X | [（无标题）](https://groups.google.com/g/software-design-book/c/WBviCLVAHNY) | 0 | 1 | 2026-01-28 | 2026-01-28 |  | 跳过 |  |  | 加入请求 |
| X | [About the book](https://groups.google.com/g/software-design-book/c/x-fcQ9UvKwo) | 0 | 1 | 2025-12-21 | 2025-12-21 |  | 跳过 |  |  | 询问邮箱 |
| X | [JOIN](https://groups.google.com/g/software-design-book/c/Tj2l3z8RITw) | 0 | 1 | 2025-06-27 | 2025-06-27 |  | 跳过 |  |  | 加入请求 |
| X | [Seeking code reviewer with extensive knowledge and experience](https://groups.google.com/g/software-design-book/c/sTHQdAv8uzI) | 0 | 1 | 2024-09-30 | 2024-09-30 |  | 跳过 |  |  | 找代码评审人 |
| X | [Tuple Spaces](https://groups.google.com/g/software-design-book/c/VbZZNUlsYiM) | 0 | 1 | 2024-08-25 | 2024-08-25 |  | 跳过 |  |  | 偏题 |
| X | [Please include](https://groups.google.com/g/software-design-book/c/o_95ZK4qQnU) | 0 | 1 | 2024-07-02 | 2024-07-02 |  | 跳过 |  |  | 加入请求 |
| X | [Started with punch cards and still going strong](https://groups.google.com/g/software-design-book/c/E5ojxXNSTAI) | 0 | 1 | 2024-05-13 | 2024-05-13 |  | 跳过 |  |  | 致谢 |
| X | [你以什么样的心態去面對生活，你就會收获什么样的心情！](https://groups.google.com/g/software-design-book/c/kbO7-oG7V0s) | 0 | 1 | 2024-01-19 | 2024-01-19 |  | 跳过 |  |  | 垃圾帖 |
| X | [1,000 More Eyeballs On Your Next Episode](https://groups.google.com/g/software-design-book/c/-Vzv1eSGWH0) | 0 | 1 | 2024-01-05 | 2024-01-05 |  | 跳过 |  |  | 垃圾帖 |
| X | [High Intent Traffic From YouTube](https://groups.google.com/g/software-design-book/c/epXRRoUzLYY) | 0 | 1 | 2024-01-05 | 2024-01-05 |  | 跳过 |  |  | 垃圾帖 |
| X | [Add to mailing list](https://groups.google.com/g/software-design-book/c/XXqNp8XDFeI) | 0 | 1 | 2023-01-02 | 2023-01-02 |  | 跳过 |  |  | 加入请求 |
| X | [Join](https://groups.google.com/g/software-design-book/c/-ksrSEXP2qM) | 0 | 1 | 2022-11-17 | 2022-11-17 |  | 跳过 |  |  | 加入请求 |
| X | [Subscribe](https://groups.google.com/g/software-design-book/c/jfo1dCqayHM) | 0 | 1 | 2022-10-05 | 2022-10-05 |  | 跳过 |  |  | 加入请求 |
| X | [ISEC 2023: Call for papers [Deadline Extended]](https://groups.google.com/g/software-design-book/c/Xff-sntPhnU) | 0 | 1 | 2022-09-16 | 2022-09-16 |  | 跳过 |  |  | 征稿广告 |
| X | [【GOTOP】Inquiry the translarion right of A Philosophy of Software Design](https://groups.google.com/g/software-design-book/c/o6Ag8jfYw40) | 0 | 1 | 2022-09-13 | 2022-09-13 |  | 跳过 |  |  | 翻译版权 |
| X | [Foreign translations of the book](https://groups.google.com/g/software-design-book/c/0Z6mqi77bf8) | 0 | 1 | 2022-08-06 | 2022-08-06 |  | 跳过 |  |  | 翻译 |
| X | [Quick Question](https://groups.google.com/g/software-design-book/c/9hCHNA54vDU) | 0 | 1 | 2022-04-21 | 2022-04-21 |  | 跳过 |  |  |  |
| X | [在各自岗位上尽职盡責，无需豪言壮语，默默...](https://groups.google.com/g/software-design-book/c/w6RnljlY5QY) | 0 | 1 | 2022-02-01 | 2022-02-01 |  | 跳过 |  |  | 垃圾帖 |
| X | [Subscribe](https://groups.google.com/g/software-design-book/c/xn7n5A4mx1E) | 0 | 1 | 2021-08-27 | 2021-08-27 |  | 跳过 |  |  | 加入请求 |
| X | [A philosophy of software design](https://groups.google.com/g/software-design-book/c/O9F0WJgl6FA) | 0 | 1 | 2021-07-10 | 2021-07-10 |  | 跳过 |  |  | 致谢 |
| X | [Typos for "A Philosophy of Software Design"](https://groups.google.com/g/software-design-book/c/vQkvW8Zu-14) | 0 | 1 | 2021-05-28 | 2021-05-28 |  | 跳过 |  |  | 错别字 |
| X | [（无标题）](https://groups.google.com/g/software-design-book/c/0AZnC9ObRkQ) | 0 | 1 | 2021-05-17 | 2021-05-17 |  | 跳过 |  |  | 空帖 |
| X | [A Philosophy of Software Design \| Translation of Your Book by O'Reilly Germany?](https://groups.google.com/g/software-design-book/c/fBxvujJZHkE) | 0 | 1 | 2020-09-11 | 2020-09-11 |  | 跳过 |  |  | 翻译 |
| X | [（无标题）](https://groups.google.com/g/software-design-book/c/qK_V0kib6Ek) | 0 | 1 | 2020-02-27 | 2020-02-27 |  | 跳过 |  |  | 空帖 |
| X | [Please add me](https://groups.google.com/g/software-design-book/c/SR-8L9Qk45g) | 0 | 1 | 2020-01-23 | 2020-01-23 |  | 跳过 |  |  | 加入请求 |
| X | [About Japanese translation](https://groups.google.com/g/software-design-book/c/sIbE5OlbxaY) | 0 | 1 | 2019-02-19 | 2019-02-19 |  | 跳过 |  |  | 翻译 |
| X | [Quote the first chapter reminds me of](https://groups.google.com/g/software-design-book/c/kFBW0bn9juY) | 0 | 1 | 2019-01-24 | 2019-01-24 |  | 跳过 |  |  |  |
| X | [Passage from preface reminds me of an Orson Scott Card quote](https://groups.google.com/g/software-design-book/c/Mtb84SMV558) | 0 | 1 | 2019-01-23 | 2019-01-23 |  | 跳过 |  |  |  |
| X | [Just bought the group I like to join the group](https://groups.google.com/g/software-design-book/c/aXDEhhGlKUg) | 0 | 1 | 2018-09-19 | 2018-09-19 |  | 跳过 |  |  | 加入请求 |
| X | [Missing period on page 103](https://groups.google.com/g/software-design-book/c/QHFFec0Ij2w) | 0 | 1 | 2018-08-27 | 2018-08-27 |  | 跳过 |  |  | 错别字 |
| X | [Re: A Philosophy of Software Design : ISBN 978-1732102200 : Korean translation rights](https://groups.google.com/g/software-design-book/c/78sa8mJI3CA) | 0 | 1 | 2018-07-12 | 2018-07-12 |  | 跳过 |  |  | 翻译 |
| X | [Editing mistake](https://groups.google.com/g/software-design-book/c/sXtjuyg7HBE) | 0 | 1 | 2018-06-21 | 2018-06-21 |  | 跳过 |  |  | 错别字 |
