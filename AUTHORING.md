# APOSD 精读站：编写规范

读者：中文母语的程序员，C/C++ 背景（读过 OSTEP），正在读《A Philosophy of Software Design》第 2 版。
他们已经决定**自己读原书**；本站是**学习伴侣**，不是替代品。

这本书和 OSTEP 不同：知识本身不难，读一遍都能点头；难的是**写代码时认得出问题、做得出更好的设计**。
所以本站的重心是：**判断力训练**（大量原创代码题）+ **迁移**（渐进重构项目），章节页只做轻量的读前导读与读后巩固。

## 版权红线（最重要，违反任何一条都要返工）
原书是商业出版物（不像 OSTEP 免费公开），本站会公开发布。因此：
1. **不逐段翻译或转述原书。** 章节页用你自己的组织方式讲核心观点，篇幅明显短于原书章节。读者应该"带着本页的问题去读原书"，而不是"读本页代替读原书"。
2. **直接引用原文**：每页最多 2 处，每处不超过 25 个英文单词，用 `<blockquote class="quote">…<cite>— 第 N.M 节</cite></blockquote>` 标明出处。术语和短语（如 deep module、define errors out of existence）不算引用。
3. **代码示例必须原创。** 不得复制或改写书中的代码（书中的例子包括 Java I/O 流、HTTP 服务器项目、文本编辑器的 backspace/insert、RAMCloud、Tcl unset、IndexLookup 等）。可以**点名提及**书中例子并用一句话说明它说明了什么（"书中用 Java 的三层输入流说明……，见 4.7 节"），然后给出**你自己的 C/C++ 例子**。
4. **不复刻原书的图。** 画你自己的示意图（同一个概念可以画，但构图、标注、例子要是你的）。
5. 写完后自检：`python3 tools/overlap.py chapters/<slug>.html` 检查与原文的英文长片段重合（要求 0 处 ≥ 12 词的重合，引用块除外）。

## 目录结构
```
/home/lee/aposd/
  assets/style.css  assets/aposd.js  assets/drill.js  assets/chapters.js   ← 共享，只读（发现 bug 请在报告中说明，不要自己改）
  chapters/<slug>.html                 ← 章节页（slug 见 assets/chapters.js）
  train/data/chNN.js                   ← 本章题库（NN 两位数）。不要改 train/data/index.js（多个作者并行，最后统一更新）
  source/text/NN-*.txt                 ← 原书章节全文（写作依据，不公开）
  source/digest.md                     ← 全书结构化摘要（每章例子、红旗、边界条件、跨章线索）
  tools/check.mjs                      ← 浏览器质检
  tools/overlap.py                     ← 与原文重合度检查
```
样板：`chapters/04-deep-modules.html` + `train/data/ch04.js`。**动笔前先完整读一遍这两个文件**，结构、语气、组件用法都以它们为准。

## 章节页结构（按顺序，用 `<h2>` 分节；轻章可以合并或省略个别节）
1. **读前：这一章要回答什么**：`.crux` 写一个关键问题（你自己提炼的，原书没有 CRUX）；2-3 段说明它在全书中的位置（承上启下）。
   然后一个 `.reading` 块：3 条"读原书时留意"，指向具体小节号，每条是一个读者读的时候应该带着的问题或该注意的点。
2. **核心观点**：`.cards` 网格，4-8 张卡片，每张一句话，用自己的话。卡片里可以放 `<span data-flag="id"></span>` / `<span data-principle="k"></span>` 徽章。
3. **心智模型 / 图解**：至少 1 张自绘 SVG（`figure.fig`）。若本章适合，做 1 个小交互（`.sim` 组件）——**只在交互能帮助理解时才做**（例如第 4 章的深度计）。不要为了交互而交互；轻章可以没有。
4. **原创例子**：至少 1 个 C/C++ 改前/改后对比（`.ba` 组件），场景要贴近真实工程（服务端、存储、网络、工具、业务代码），并说明改后好在哪里、代价是什么。
5. **边界与反方**：2-4 个 `.counter` 块（`data-title` 写小标题）。必须覆盖原书自己承认的局限（"Taking it too far"、"A different opinion" 等，见 digest），以及该观点与常见建议的冲突。这一节是培养判断力的关键，不能空泛。
6. **练一练**：`<div class="drill-embed" data-ids="…"></div>` 嵌入本章 2-3 道代表性题（题目写在 train/data/chNN.js 里）。
7. **自测题**：`<p class="quiz-score"></p>` + 5-8 道 `.mcq`。考理解和易错点，不考记忆细节。`data-answer` 是 0 基下标，正确答案位置要分散。
8. **动手：项目任务**（仅限有对应任务的章节，放在"自测题"之前）：一段话说明这一章对应 minikv 项目的哪个任务、要找什么问题，加一个 `.lab` 块：
   ```html
   <div class="lab"><p>任务 m0X：……（一句话）。详见 <a href="../project/m0X.html">任务页</a>。</p>
   <pre><code>cd project/minikv &amp;&amp; make test</code></pre></div>
   ```
   minikv 是本站原创的 C++ 迷你键值存储（追加写日志 + 内存索引 + 文本命令），故意按"战术式"风格写成，由另一位作者同时编写，你不必读它的代码。任务与章节的对应（固定）：
   m01 → 第 4、5 章（深模块、信息泄漏、按时间顺序分解、过度暴露）；m02 → 第 6 章（专用方法 → 通用核心），第 11 章（设计两次是 m02 的设计步骤）；
   m03 → 第 7 章（透传方法、透传变量）；m04 → 第 8 章（配置参数往上推）；m05 → 第 9 章（重复、连体方法、通用专用混杂）；
   m06 → 第 10 章（把错误定义掉、聚合、屏蔽、直接崩溃）；m07 → 第 12～15 章（命名、注释、先写注释）；m08 → 第 18、20 章（不明显的代码、关键路径性能）。
9. **小结与读后一句话**：要点列表 + 和下一章的联系 + `<textarea class="note" data-key="chNN-oneline" placeholder="…">`。

体量参考：轻章（8、11、21、22 等）250-450 行；中重章 450-800 行（含脚本）。宁短而准，不要注水。

## 页面骨架
```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>第 N 章 · 标题</title>
<link rel="stylesheet" href="../assets/style.css">
<script src="../assets/chapters.js"></script>
<script src="../assets/aposd.js"></script>
<script src="../train/data/chNN.js"></script>
<script src="../assets/drill.js"></script>
<style>/* 仅本页需要的少量样式；颜色一律用 var(--token) */</style>
</head>
<body data-chapter="N">
<main>
  …（章节头、本页目录、底部导航、"已读完"勾选由 aposd.js 自动注入，不要自己写）…
</main>
<script>/* 本页交互代码 */</script>
</body></html>
```

## 组件速查（详见 assets/aposd.js 和 assets/drill.js 文件头注释）
- 代码：`<pre><code class="lang-cpp">…</code></pre>` 自动高亮；`<pre class="numbered" data-mark="2,3">` 带行号并高亮第 2、3 行。HTML 里的 `<`、`>`、`&` 要转义。
- 改前/改后：`<div class="ba"><div data-label="改之前：…">pre + 说明</div><div data-label="改之后：…">pre + 说明</div></div>`；可以有第三个面板；`data-tone="neutral"` 改标签颜色。
- 红旗/原则徽章：`<span data-flag="shallow"></span>`、`<span data-principle="4"></span>`（id 见 assets/chapters.js）。
- 标注框：`.crux` `.reading` `.counter[data-title]` `.tip` `.warn`（常见误区）`.aside[data-title]` `.key`；引用 `blockquote.quote`。
- 交互：`.sim > .sim-head(.tag, h3, .desc) + .sim-body(.controls, .stage, .narrate, .stats)`。工具函数 `APOSD.h / APOSD.s / APOSD.codeBlock / APOSD.highlight`。
- 本地笔记：`<textarea class="note" data-key="唯一键">`。
- 对照 OSTEP：读者读过 OSTEP，适当处可以用 `.aside data-title="对照 OSTEP"` 建立联系（只在确实有联系时）。OSTEP 学习站章节链接形如 `https://t.miaowuao.cn/ostep/chapters/43-lfs.html`（slug 见 /home/lee/operating_systems_three_easy_pieces/assets/chapters.js）。
- 站内其他页面（由其他作者同时编写，链接可以直接写）：速查页 `../cheatsheet.html#flag-<id>` / `#p-<k>`；训练场 `../train/index.html#ch=N`；专题 `../topics/clean-code.html`（APOSD 与 Clean Code 的分歧）、`../topics/ostep.html`（与 OSTEP 对照）、`../topics/ai-era.html`（AI 时代读这本书）；项目 `../project/index.html`、`../project/m0X.html`。

## 题库（train/data/chNN.js）——本站的重心
格式见 `assets/drill.js` 文件头注释和样板 `train/data/ch04.js`。每章题量：
- 重章（5、6、9、10、13、14）：14-20 题；中章：10-14 题；轻章（8、11、21、22 等）：6-10 题。
- 题型配比：识红旗 flag 30-40%、A/B 对比 ab 20-30%、判断 judge 15-25%、先写后对照 write 2-4 道、记忆卡 card 3-5 张。注释/命名类章节可以多出 write 题（写注释、起名字）。
- id 规则：`chNN-<type>-NN`，如 `ch05-flag-03`。
- **flag 题**：`choices` 只能包含**本章及之前章节**引入的红旗 id（读者还没学过后面的）加上 `"none"`；至少放 1 个干扰项。第 4 章之前没有红旗，第 1-3 章不出 flag 题。要有"看起来像但其实没问题"的反例题（answer 为 `["none"]`），比例约 1/4。`mark` 标出关键行。
- **ab 题**：两种方案都要"像真的"，差的那个要是很多人真会写的样子；答案 a/b 位置要分散。解析要讲清**为什么**，也讲另一个方案在什么条件下反而合理（如果有）。
- **judge 题**：考概念边界、"什么时候不适用"；`options` 2-4 个，答案位置分散；不要在解析里用字母引用选项（选项不打乱，但仍请用内容指代）。
- **write 题**：要求读者真的写点东西（接口声明、注释、名字、重构草图），`reference` 给参考答案，`rubric` 给 3-5 条可自查的要点。
- **card 题**：概念记忆卡，`front` 是问题，`back` 是简洁答案。
- 代码一律原创 C/C++（C++17 为主，可用标准库）；片段 5-30 行，能看出上下文即可，不要求可编译，但不能有语法错误式的低级问题。
- 解析（explain）要具体：指出哪几行、为什么、怎么改；适当时提到"书中 x.y 节的例子说明的是同一件事"。

## 风格
- 中文自然、准确、不啰嗦；术语首次出现写"中文（English）"，如"信息泄漏（information leakage）"。
- 解释"为什么"而不只是"是什么"。忠实原书观点：可以补充、可以讨论反方，但不能歪曲作者立场；作者的观点和本站的补充要分得清（"作者认为……""本站补充：……"）。
- 颜色只用 style.css 的 token（`--fg --muted --faint --surface --surface-2 --border --accent --accent-soft --ok --bad --warn` 及 `-soft`、`--c1..--c8`、`--part0..5`）。不写死 `#fff` / `#000`（在实色块上写字用 `var(--on-accent)`）。SVG 用 `class="ok-soft/bad-soft/warn-soft/accent-soft/box/stroke/t-muted"` 等。
- 不依赖外部网络资源（无 CDN、外链字体、外链图片）。
- 窄屏（400px）可用：宽 SVG/表格放在 `figure.fig` / `.table-wrap` / `.stage` 里。

## 自检（交付前必须全部通过）
1. `node tools/check.mjs chapters/<slug>.html`：无 JS 错误、无溢出、无低对比度、交互后无 undefined/NaN。
2. 题库语法：`node -e "global.window={};require('./train/data/chNN.js');console.log(window.APOSD_DRILLS.length)"`；id 不重复；flag 题的 choices/answer 只用已定义的红旗 id；embed 里引用的 id 都存在（check.mjs 会报"题目缺失"）。
3. `python3 tools/overlap.py chapters/<slug>.html train/data/chNN.js`：0 处长片段重合。
4. 对照 `source/text/` 原文核对：页面上每一个"作者认为"的陈述都要能在原文找到依据，小节号要对。
