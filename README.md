# APOSD 精读：软件设计的哲学 · 中文学习伴侣

John Ousterhout《A Philosophy of Software Design》（第 2 版）的中文学习伴侣：章节导读、判断力训练（原创 C/C++ 题 + 间隔复习）、
渐进式重构项目 minikv、原则与红旗速查、争议与对照专题。

在线阅读：<https://t.miaowuao.cn/aposd/>

**这不是原书的翻译或替代。** 所有讲解、代码与题目均为原创；书中观点以原书为准，请阅读原书。

## 本地打开

```bash
git clone <本仓库> && cd <目录>
python3 -m http.server 8770   # 浏览器访问 http://localhost:8770
```

不需要联网，也不需要构建。学习进度与答题记录保存在浏览器的 localStorage 中（键名以 `aposd-` 开头）。

## 目录

| 路径 | 内容 |
|---|---|
| `index.html` | 总览：学习进度、今日复习、全书地图、章节列表 |
| `chapters/*.html` | 每章一页：读前问题、核心观点、图解、原创例子、边界与反方、练习、自测 |
| `train/` | 训练场：题库（`train/data/chNN.js`）与间隔复习 |
| `project/` | minikv：故意写得很"战术"的 C++ 键值存储，8 个重构任务与参考解答 |
| `cheatsheet.html` | 14 个红旗、16 条原则、设计评审清单 |
| `topics/` | 专题：APOSD 与 Clean Code、与 OSTEP 对照、AI 时代读这本书 |
| `assets/` | 共享样式与脚本 |
| `tools/` | 质检脚本（浏览器检查、与原文重合度检查） |
| `AUTHORING.md` | 编写规范 |
| `source/` | 原书 PDF 与提取文本，写作依据；版权归作者与出版方，**不在仓库里** |

## 部署

推送到 `main` 后，GitHub Actions（`.github/workflows/deploy.yml`）用 rsync 把站点同步到服务器的
`/var/www/tutorials/aposd/`，由 Nginx 提供访问。需要仓库 Secret `DEPLOY_SSH_KEY`。
