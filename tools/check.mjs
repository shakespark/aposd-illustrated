// 站点质检：node tools/check.mjs [页面路径…]（默认检查全部页面）
// 对每个页面 × {浅色, 深色} × {400px, 1100px}：
//   JS 报错 / 控制台错误、加载失败的资源、外部网络请求、横向溢出、低对比度文字；
//   然后自动做题、点交互按钮，再扫描 "undefined" / "NaN" / "[object …]" 文本。
// 选项：--shots 目录  保存截图；--quick 只跑浅色 1100px 一种组合。
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT_PATH || join(process.env.HOME, ".npm/_npx/e41f203b7505f1fb/node_modules/playwright");
const { chromium } = require(PW);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { createServer } from "node:net";
// 找一个空闲端口（本机常有别的预览服务占着 8000/8765/8766）
const PORT = await new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

const args = process.argv.slice(2);
const shotsIdx = args.indexOf("--shots");
const shots = shotsIdx >= 0 ? args.splice(shotsIdx, 2)[1] : null;
const quick = args.includes("--quick");
const pagesArg = args.filter((a) => !a.startsWith("--"));
function allPages() {
  const out = ["index.html", "cheatsheet.html"];
  for (const d of ["chapters", "train", "topics", "project"]) {
    const p = join(ROOT, d);
    if (!existsSync(p)) continue;
    for (const f of readdirSync(p).sort()) if (f.endsWith(".html")) out.push(`${d}/${f}`);
  }
  return out.filter((p) => existsSync(join(ROOT, p)));
}
const pages = pagesArg.length ? pagesArg : allPages();

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch();
let failures = 0;
const combos = quick ? [["light", 1100]] : [["light", 400], ["light", 1100], ["dark", 400], ["dark", 1100]];

for (const page of pages) {
  const problems = new Set();
  for (const [theme, width] of combos) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
    const pg = await ctx.newPage();
    const tag = `${theme}/${width}`;
    pg.on("pageerror", (e) => problems.add(`JS 异常 ${e.message}`));
    pg.on("console", (m) => { if (m.type() === "error") problems.add(`控制台错误 ${m.text()}`); if (m.type() === "warning" && /drill not found/.test(m.text())) problems.add(`题目缺失 ${m.text()}`); });
    pg.on("request", (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith("data:")) problems.add(`外部请求 ${u}`); });
    pg.on("response", (r) => { if (r.status() >= 400 && !/aposd-project\.zip/.test(r.url())) problems.add(`HTTP ${r.status()} ${r.url().replace(`http://127.0.0.1:${PORT}/`, "")}`); });
    await pg.goto(`http://127.0.0.1:${PORT}/${page}`, { waitUntil: "load" });
    await pg.waitForTimeout(250);

    const scan = async (phase) => {
      const r = await pg.evaluate(() => {
        const out = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > window.innerWidth + 1) {
          // 找出最宽的罪魁祸首
          let worst = null;
          for (const el of document.querySelectorAll("body *")) {
            const b = el.getBoundingClientRect();
            if (b.right > window.innerWidth + 1 && !el.closest("figure.fig, .table-wrap, .stage, pre, .ba-pane pre")) { worst = el; break; }
          }
          out.push(`横向溢出 ${doc.scrollWidth}px > ${window.innerWidth}px` + (worst ? `（${worst.tagName.toLowerCase()}.${worst.className}）` : ""));
        }
        const text = document.querySelector("main")?.innerText || "";
        for (const bad of ["[object ", "undefined", "NaN"]) {
          const i = text.indexOf(bad);
          if (i >= 0) out.push(`可疑文本 "${text.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, " ")}"`);
        }
        // 低对比度：只看有直接文字的可见元素
        const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
        let low = 0, sample = "";
        for (const el of document.querySelectorAll("main *:not(svg *):not(script):not(style)")) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const st = getComputedStyle(el);
          if (st.visibility === "hidden" || st.display === "none" || !el.offsetParent || parseFloat(st.opacity) < 0.5) continue;
          const fg = parse(st.color), bg = bgOf(el);
          if (!fg || !bg) continue;
          const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          if (ratio < 3 && !el.closest("button:disabled, .off")) { low++; if (!sample) sample = `${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 20)}" 对比度 ${ratio.toFixed(2)}`; }
        }
        if (low) out.push(`低对比度文字 ${low} 处，例如 ${sample}`);
        return out;
      });
      r.forEach((x) => problems.add(`[${tag} ${phase}] ${x}`));
    };
    await scan("加载后");

    // 交互：做题、点按钮
    await pg.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (const d of document.querySelectorAll(".drill")) {
        const choice = d.querySelector(".choices button"); if (choice) { choice.click(); d.querySelector(".actions .primary")?.click(); }
        const opt = d.querySelector(".opts button"); if (opt) opt.click();
        const ta = d.querySelector("textarea"); if (ta) { ta.value = "测试"; d.querySelector(".actions .primary")?.click(); }
        const flip = d.querySelector(".actions .primary"); if (flip && /翻面/.test(flip.textContent)) flip.click();
        d.querySelector(".rate button")?.click();
      }
      for (const q of document.querySelectorAll(".mcq")) q.querySelector(".opts button")?.click();
      for (const t of document.querySelectorAll(".ba-tab")) t.click();
      for (const det of document.querySelectorAll("details")) det.open = true;
      const btns = [...document.querySelectorAll(".sim button, .sim input[type=checkbox], .sim li")].slice(0, 60);
      for (const b of btns) { try { b.click(); } catch (e) {} await sleep(5); }
    });
    await pg.waitForTimeout(200);
    await scan("交互后");
    if (shots) { mkdirSync(shots, { recursive: true }); await pg.screenshot({ path: join(shots, `${page.replace(/\//g, "_")}-${theme}-${width}.png`), fullPage: true }); }
    await ctx.close();
  }
  if (problems.size) { failures++; console.log(`✗ ${page}`); for (const p of problems) console.log("    " + p); }
  else console.log(`✓ ${page}`);
}
await browser.close();
server.kill();
console.log(failures ? `\n${failures} 个页面有问题` : "\n全部通过");
process.exit(failures ? 1 : 0);
