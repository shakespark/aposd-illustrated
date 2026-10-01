// 训练场加载全部题库。新增一章的题库后把章号加进来。
// 用 document.write 同步插入，保证 drill.js 执行前题库已经就绪（file:// 下也能用）。
(function () {
  const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const base = document.currentScript.src.replace(/index\.js(\?.*)?$/, "");
  for (const n of CHAPTERS) document.write(`<script src="${base}ch${String(n).padStart(2, "0")}.js"><\/script>`);
})();
