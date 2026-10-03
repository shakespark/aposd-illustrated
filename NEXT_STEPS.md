# 状态

2026-10-01：首版完成，全部通过质检。

## 内容
- 22 章章节页（读前问题、核心观点、图解与交互、原创 C/C++ 例子、边界与反方、练习、自测、项目任务）。
- 训练场：328 道原创题（其中 18 道取材于读者讨论组，2026-10-03 新增，分布在第 2、3、4、5、7、8、9、11、12、14、19 章） + 14 张自动生成的红旗记忆卡，Leitner 间隔复习（localStorage 键 `aposd-srs`）。
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

## 讨论组素材（进行中）
书里给的讨论组 groups.google.com/g/software-design-book 可以补充"读者质疑 + 作者回应"。
- 2026-10-03：首次扫描 238 串，只按标题、回复数、作者是否参与做了初筛（A 29 / B 83 / C 67 / 跳过 59），**正文一串都还没读**。
- 清单：`tools/group/TRIAGE.md`（生成的）；结论和"读到第几条"记在 `tools/group/triage.json`；扫描历史在 `tools/group/scans.log`。
- 2026-10-03：精读了 38 串（原 A 档 29 串 + 待定 + 两串授权相关），读后为 A 18 / B 14 / C 4 / 跳过 2。
  每串一份转述笔记在 `tools/group/notes/<id>.md`（含"挂到站点哪里"和"待核实"）；**还没有任何内容写进站点页面**。
  B 档其余约 75 串、C 档都还没读。
- 2026-10-03：两个专题页已补上讨论组材料（`topics/clean-code.html#group`；`topics/ai-era.html` 的 `#said` 第二处和 `#readers`），
  用到的 10 串在清单里标为"已采用"（部分采用也算；Kb5K、yHsx 等串里还有训练题素材没用）。章节页和训练场还没动。
- 2026-10-03：14 个章节页（第 2～9、11～15、19 章中有材料的）在"边界与反方"末尾加了"讨论组 · 作者补充 / 读者质疑"块，
  写法约定见 `AUTHORING.md`"讨论组材料"一节。又有 21 串标为"已采用"。训练题已出 18 道（各 `train/data/chNN.js` 末尾单独一段）
  （现成素材：TVHbMP5ENXo、J3GweRh4VbM、Kb5K3YcjIXw 串尾、iS2GVCApGoo、Java I/O 缓冲分层）。
- 2026-10-03：B 档 74 串也读完了（读后 A 11 / B 34 / C 26 / 跳过 3），笔记同在 `tools/group/notes/`，**还没写进页面**。
  能补的空白章节：第 1 章（SJxs5KCxJNE、F-u7U4lbg8s、07rvfWgQkGs）、第 10 章（4LOLZArwQEk、3hgHk9NhZL4、SPVi2Ib3Vhg、
  jngfdK-tWnk、8zkWyisdVBA、ouVwAfqZfgo、bDj6Jr5N5Sg、8R28OGS1ikE）、第 16/17 章（fO0RtWYZ9ko）、第 18 章（raZiHfaBRX4、
  b8TI5ioYf1k、XuXnFQSG7Vo、frHMNxt-3rI）、第 20 章（SPVi2Ib3Vhg）、第 21 章（raZiHfaBRX4、ouVwAfqZfgo）、第 22 章（xisvPNmDHM4、FvL6_yfol6c）；
  OSTEP 专题（zC65L9Hq0B4，fork/exec）。作者说过会改书的四处：19.4 的 TDD 描述（bJ6vmAIz5_0）、第 9 章没提内聚/耦合（Zd7vVeJb1PY）、
  7.5 没提单例（edN-bAAHGN0）、14.1 加 typedef 解法（WQTyymI0Zx4）。uHWl_gbtmW8 有 7 条正文接口返回为空，要用得回网页补读。
  C 档 67 串还没读。
- 取正文到本机：`python3 tools/groups_fetch.py A`（或给串 id），落在不入库的 `source/group/`。
- 写完笔记后回填：`python3 tools/groups_scan.py --notes`（按笔记头部的"精读 / 对应 / 优先级"更新 `triage.json`）。
- 再次扫描：`python3 tools/groups_scan.py`，会列出新增的串和有新回复的串，不动 `triage.json` 里已有的结论。
- 精读一串后，在 `triage.json` 里把 `status` 改成"已精读"、`read_messages` 填当时的消息数、`read_at` 填日期，
  再跑 `python3 tools/groups_scan.py --render`。以后这一串有新回复，清单里会标 🔄。
- 帖子正文版权属于各发帖人：只转述观点 + 附原帖链接 + 短引用；正文不入库。

## 以后想改进时
- 新增或重写章节：按 `AUTHORING.md`；改完跑上面四个工具。
- 新增题目后不需要改 `train/data/index.js`（22 章都已注册）。
- 本机预览：`python3 -m http.server 8770`（8765～8767 常被其他预览占用）。
- 部署：推送到 main 即自动部署。部署架构、密钥、Nginx、新增教程的步骤都在 `~/tutorials-deploy/README.md`；
  线上检查用 `~/tutorials-deploy/scripts/check-site.sh aposd index.html project/m06.html project/minikv/src/store.cpp`。
