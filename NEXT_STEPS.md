# 状态

2026-10-01：首版完成，全部通过质检。

## 内容
- 22 章章节页（读前问题、核心观点、图解与交互、原创 C/C++ 例子、边界与反方、练习、自测、项目任务）。
- 训练场：310 道原创题 + 14 张自动生成的红旗记忆卡，Leitner 间隔复习（localStorage 键 `aposd-srs`）。
  每个红旗至少 3 道专练题（`flags` 标签 + flag 题答案）。
- minikv：故意写成"战术式"的 C++17 键值存储（src 1418 行），8 个重构任务，参考解答各自独立、零警告、测试全绿；
  问题地图在 `project/solutions/MAP.md`（27 处有意埋下的问题 + 几处"看起来像但不是问题"）。
- 速查页（14 个红旗、16 条原则、可打印的评审清单）；专题：与 Clean Code 的分歧、与 OSTEP 对照、AI 时代读这本书。

## 质量保障（做过的）
- 浏览器质检：38 个页面 × {浅色, 深色} × {400px, 1100px}，无 JS 错误、溢出、低对比度、undefined/NaN。
- 与原文英文长片段重合：0 处；每页引用 ≤2 处、每处 ≤25 词。
- 二审：6 个按章审校代理 + 1 个跨章红旗一致性审校 + 1 个专题来源核实（WebFetch 原始出处）。
  修正了约 40 处机械错误；有争议的题目由主编裁决后修改。
- 版权结构测试（页面段落能否与原书逐段对齐）：第 13 章不合格 → 已按"看到一条注释时依次问自己的四个问题"重组；
  第 1、8 章的核心观点卡片已按主题重排；第 7、18、19 章处在边界但在线内。
- 自测题答案位置：用 `tools/shuffle_mcq.py` 打乱并消除了作者照抄样板形成的 CADB/BDAC 规律。
- 代词：对未说明代词的人（作者、Martin、泛指的人）一律用中性说法。

## 工具
- `node tools/check.mjs [页面…]`：浏览器质检（默认全部页面；`--quick`、`--shots 目录`）。
- `python3 tools/overlap.py 文件…`：与原文重合度（需要本机 `source/text/`）。
- `python3 tools/links.py`：站内链接与锚点。
- `python3 tools/shuffle_mcq.py 页面…`：打乱自测题选项并同步解析里的字母。
- 题库校验：见 AUTHORING.md"自检"一节。

## 以后想改进时
- 新增或重写章节：按 `AUTHORING.md`；改完跑上面四个工具。
- 新增题目后不需要改 `train/data/index.js`（22 章都已注册）。
- 本机预览：`python3 -m http.server 8770`（8765～8767 常被其他预览占用）。
- 部署：推送到 main 即自动部署。部署架构、密钥、Nginx、新增教程的步骤都在 `~/tutorials-deploy/README.md`；
  线上检查用 `~/tutorials-deploy/scripts/check-site.sh aposd index.html project/m06.html project/minikv/src/store.cpp`。
