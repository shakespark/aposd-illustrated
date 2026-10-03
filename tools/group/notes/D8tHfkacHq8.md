# Tell, Don't Ask principle

- 原帖：https://groups.google.com/g/software-design-book/c/D8tHfkacHq8
- 精读：2026-10-03，读到第 9 条（2026-02-18 ～ 2026-03-02）
- 主题：《程序员修炼之道》按 "Tell, Don't Ask" 修掉链式调用（train wreck）的办法，看起来会制造 APOSD 第 7 章反对的透传方法——两条原则冲突吗，谁优先。
- 对应：第 7 章 7.1（透传方法）/ 第 4 章（4.5 浅模块）/ 第 5 章（信息泄漏，读者 [8]）/ 第 19 章 19.6（getter/setter，间接相关）/ 训练场
- 性质：勘误或澄清 · 真正的分歧 · 可改编成训练题的例子
- 优先级：B。分歧主要在读者之间（[7] 对 [8]）。两本常被一起读的书之间的表面矛盾，作者给了明确态度（赞同 Tell, Don't Ask）和一个书里没有的解法（把问题挪到别处消掉）；例子小，适合做成第 7 章的一道题。

## 读者说了什么（转述）

1. **提出矛盾**（Joshua Miller，[1]）：贴了 APOSD 的 `TextDocument` 类（**这段代码是书里 7.1 的原例**，一个几乎全是透传方法的学生作业类），对照《程序员修炼之道》里的例子：把 `customer.orders.find(order_id).getTotals().applyDiscount(discount)` 改成 `customer.findOrder(order_id).applyDiscount(discount)`。后者不可避免地要加 `findOrder` 这类透传方法。两条原则谁优先？
2. **顺着做下去就是透传，然后合并**（Ivan Yordanov，[2]）：认为《程序员修炼之道》的例子有误导性（不使用类成员的方法就不该在类里；例子还违反迪米特法则）。按这个思路"修好"会得到一个只转发的包装类，而 APOSD 给的解法就是把两个类合并。这类包装并非毫无用处，但应该等需求真往那个方向发展再引入——比如 `TextDocument` 将来变成多页，每页一个 `TextArea`，那时它的职责是把指令转给当前页并换算偏移。
3. **干脆不要这个方法**（Paul Becker，[3]）：既然调用者手里已经有 customer，直接写 `customer.findOrder(order_id).applyDiscount(discount)` 就很清楚，外面那层 `applyDiscount(customer, order_id, discount)` 是个带来的复杂性多于便利的"便利方法"；除非它是一道接口边界（调用者不该直接接触 Customer 或 Order）。并指出一处误读：APOSD 并没有说透传方法一概不好，真正的问题是相邻层的抽象相似、职责没分清。
4. **提问者的归纳**（Joshua Miller，[4][5]）：重读后同意 Paul Becker 的纠正。归纳出的做法是：违反 Tell, Don't Ask 时，加透传方法只是眼前的修法；按 APOSD，真正的解法是 7.1 列的三条——把下层类直接暴露给调用者、在类之间重新分配功能、或合并。并举 `Customer`/`OrderCollection` 的例子说明"先加透传、再合并"。[5] 补充：Tell, Don't Ask 和迪米特法则看起来实际上是一回事。
5. **Tell, Don't Ask 说的是职责**（Paul Becker，[6]）：这条原则讲的是模块化的基本道理——别在对象内部乱翻、替它干活；需要对象上下文才能做的事就该由对象做。它关乎代码该住在哪里、什么信息该跨过对象边界。
6. **换一种关系结构**（Paul Becker，[7]）：改成 `discount.applyTo(orders.find(customer_id, order_id))`——折扣依赖订单并知道如何修改订单，订单只带一个客户 id，客户不依赖订单，入口从 customer 换成 orders。对象之间的关系怎么设计，会很大程度影响接口。
7. **反对**（Joshua Miller，[8]）：这样会削弱 `Order` 的抽象——`Discount` 要 get 价格、算完再 set 回去；将来折扣若还需要动订单的别的状态（比如应税金额的标志），就会冒出更多 getter/setter，造成信息泄漏。倾向把这部分逻辑留在 `Order` 里；`Discount` 更适合承担"根据订单选出最合适的折扣"这类知识。

## 作者的回应

作者发了一条（[9]），在读者讨论基本结束之后。

- **同意是浅的、透传的**：这个问题本身很简单，难免出现浅方法；`applyDiscount(customer, order_id, discount)` 确实又浅又是透传，它唯一的价值是"按 order id 找到订单"。
- **第一个建议：不要这个方法**。直接在调用处写链式调用，作者算过只多打 9 个字符，而且代码很清楚。（与 Paul Becker 在 [3] 的意见一致。）
- **看出现次数**：作者追问这种事会在多少地方出现——打折听起来很专门，估计不会多。但如果确实很多、想加这个辅助方法，作者说即使它浅也"可以容忍"。这比书里把透传方法列为危险信号的口气要宽一些，条件是调用点多。
- **退一步看全局（书里没有的解法）**：是不是有很多地方手里拿着 `<customer, order_id>` 这一对值，却想操作 `Order` 对象？如果是，作者觉得这本身就别扭——传两个值而不是一个，用之前还得转换。也许该在很高的层次就把这一对值转换成 `Order`，这样等到要打折的时候手里已经是 `Order` 了。原话：
  > "Sometimes the best way to fix an awkwardness in one place is to make a change someplace else that eliminates the entire problem."（John Ousterhout，[9]）
- **对 Tell, Don't Ask 的态度**：作者说总体上赞同这条原则，觉得它会导向更深的类。原话：
  > "in general I agree with the philosophy of \"Tell, Don't Ask\"; it feels like it will lead to deeper classes."（John Ousterhout，[9]）
  
  书里没有出现过 Tell, Don't Ask 或迪米特法则，这是作者对它的首次表态（就我在原书文本里检索的结果而言）。

**作者没有回应的**：Paul Becker 的 `discount.applyTo(...)` 方案和 Joshua Miller 对它的反对（[7][8]）；"Tell, Don't Ask 是否等于迪米特法则"（[5]）；Ivan Yordanov 的"先包装、再合并"。也就是说，作者没有直接回答"两条原则冲突时谁优先"，而是通过"去掉方法 / 上移转换"绕开了冲突。

## 挂到站点哪里

- 第 7 章 7.1"边界与反方"：新增"与 Tell, Don't Ask 冲突吗？"一条。要点：(1) 书里说的是"相邻层抽象相似"才是病，透传方法只是症状（Paul Becker 的纠正，与 7.1、7.2 原文相符）；(2) 作者赞同 Tell, Don't Ask，认为它导向更深的类；(3) 链式调用的修法不止"加一层转发"——可以不加、可以合并、也可以把 id → 对象的转换提到更高层。
- 第 7 章或第 9 章的"作者补充"：那句"在别处做一个改动，把整个问题消掉"值得单独引，它和 10.3"把错误定义掉"是同一种思路（这是我的类比，不是作者说的）。
- 第 4 章 4.5：作者说调用点多时浅的辅助方法"可以容忍"，可作为"浅不等于禁用"的一条注脚。
- 训练场：一道第 7 章的重构题（原创 C++）。给出 `Customer` / `OrderBook` / `Order` 和一处链式调用，四个选项：(A) 保留链式调用；(B) 在 `Customer` 上加转发方法；(C) 调用方在入口处先把 (customer, orderId) 解析成 `Order&` 再往下传；(D) `Discount::applyTo(Order&)` 配 getter/setter。让读者指出哪个是透传、哪个泄漏了 `Order` 的内部（D，即 Joshua Miller 的反对），并说明作者倾向 A 或 C。
- 第 19 章 19.6（getter/setter）：Joshua Miller 的"get 价格、算、再 set 回去"是 getter/setter 导致逻辑外流的小例子，可以引。

## 待核实

- 《程序员修炼之道》里这个例子的原貌（Joshua Miller 说是讲 "train wreck" 和 Tell, Don't Ask 的一节）我没有查原书；Ivan Yordanov 说该例"违反迪米特法则""有误导性"是这位读者的判断。
- "Tell, Don't Ask 实际等同于迪米特法则"是 Joshua Miller 的看法（附了一个教材章节链接，未查看），不宜当定论——一般认为两者相关但不相同。
- Joshua Miller 在 [8] 的示例里，折后价写成 `price * (1 + percentDiscount)`，按字面是涨价而不是打折，应是笔误；改编时别照搬。
