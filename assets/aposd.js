// APOSD 精读站：共享运行时（从 OSTEP 图解站的 ostep.js 派生）。
// 章节页在 <body data-chapter="4"> 上声明章号；其他页面不写 data-chapter。
// 本脚本注入顶栏、章节导航、"已学完"勾选，并接好通用组件：
//   .mcq 选择题、pre 复制按钮、pre > code.lang-cpp 语法高亮、.ba 改前/改后切换、
//   [data-flag] 红旗徽章、[data-principle] 原则徽章、textarea.note 本地笔记、.lab 项目实验块。
// localStorage 的键一律以 "aposd-" 开头：本站和 OSTEP 站在同一个域名下，不能撞键。
(function () {
  "use strict";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("aposd-" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("aposd-" + k, JSON.stringify(v)); } catch (e) {} },
  };

  // 站点根目录：从本脚本自己的 src 推出来（…/assets/aposd.js → …/），任何层级的页面都适用
  const ROOT = (() => {
    const el = document.currentScript || [...document.scripts].find((s) => /assets\/aposd\.js/.test(s.src));
    const src = el ? el.getAttribute("src") : "assets/aposd.js";
    return src.replace(/assets\/aposd\.js.*$/, "");
  })();

  // ---------- 主题 ----------
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme(LS.get("theme", "system"));

  // ---------- DOM 小工具 ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const color = (i) => `var(--c${(i % 8) + 1})`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- C / C++ 语法高亮 ----------
  // 不追求完整：关键字、类型、字符串、字符、数字、注释、预处理行。返回 HTML 字符串。
  const KW = new Set(("alignas alignof auto break case catch class const constexpr const_cast continue co_await co_return co_yield decltype default delete do dynamic_cast else enum explicit export extern false final for friend goto if inline mutable namespace new noexcept nullptr operator override private protected public reinterpret_cast return sizeof static static_assert static_cast struct switch template this throw true try typedef typeid typename union using virtual volatile while").split(" "));
  const TY = new Set(("bool char char8_t char16_t char32_t double float int long short signed unsigned void wchar_t size_t ssize_t off_t mode_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t std string string_view vector map unordered_map set optional variant unique_ptr shared_ptr span FILE").split(" "));
  function highlight(src) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])+')|(^[ \t]*#[^\n]*)|\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][-+]?\d+)?[uUlLfF]*)\b|\b([A-Za-z_]\w*)\b/gm;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const t = esc(m[0]);
      if (m[1]) out += `<span class="tk-c">${t}</span>`;
      else if (m[2]) out += `<span class="tk-s">${t}</span>`;
      else if (m[3]) out += `<span class="tk-p">${t}</span>`;
      else if (m[4]) out += `<span class="tk-n">${t}</span>`;
      else if (KW.has(m[5])) out += `<span class="tk-k">${t}</span>`;
      else if (TY.has(m[5])) out += `<span class="tk-t">${t}</span>`;
      else out += t;
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  // 把代码渲染成带行号的 <pre>；mark: 要高亮的行号数组（1 基），marked 行加 .mark
  function codeBlock(src, opts = {}) {
    const lines = highlight(src.replace(/\n$/, "")).split("\n");
    const mark = new Set(opts.mark || []);
    const pre = h("pre", { class: "code" + (opts.numbers === false ? "" : " numbered") });
    const code = h("code", { class: "lang-cpp", "data-hl": "1" });
    code.innerHTML = lines.map((ln, i) => `<span class="ln${mark.has(i + 1) ? " mark" : ""}" data-n="${i + 1}">${ln || " "}</span>`).join("");
    pre.append(code);
    return pre;
  }
  function wireHighlight(root) {
    root.querySelectorAll("pre > code.lang-cpp, pre > code.lang-c").forEach((code) => {
      if (code.dataset.hl) return;
      code.dataset.hl = "1";
      const pre = code.parentElement;
      const mark = (pre.dataset.mark || "").split(/[ ,]+/).filter(Boolean).map(Number);
      const lines = highlight(code.textContent.replace(/^\n/, "").replace(/\n\s*$/, "")).split("\n");
      if (pre.classList.contains("numbered") || mark.length) {
        pre.classList.add("numbered");
        code.innerHTML = lines.map((ln, i) => `<span class="ln${mark.includes(i + 1) ? " mark" : ""}" data-n="${i + 1}">${ln || " "}</span>`).join("");
      } else code.innerHTML = lines.join("\n");
    });
  }

  // ---------- 改前 / 改后 切换 ----------
  // <div class="ba"><div data-label="改之前">…</div><div data-label="改之后">…</div></div>
  // 每个子 div 是一个面板（通常含一个 pre）；生成标签页，默认显示第一个。
  function wireBA(root) {
    root.querySelectorAll(".ba").forEach((ba) => {
      if (ba.dataset.wired) return;
      ba.dataset.wired = 1;
      const panes = [...ba.children];
      const tabs = h("div", { class: "ba-tabs", role: "tablist" });
      const show = (k) => panes.forEach((p, j) => { p.hidden = j !== k; tabs.children[j].classList.toggle("on", j === k); tabs.children[j].setAttribute("aria-selected", j === k); });
      panes.forEach((p, k) => {
        p.classList.add("ba-pane");
        const lbl = p.dataset.label || ["改之前", "改之后"][k] || `方案 ${k + 1}`;
        const cls = p.dataset.tone || (k === 0 ? "bad" : "ok");
        tabs.append(h("button", { class: "ba-tab tone-" + cls, role: "tab", onclick: () => show(k) }, lbl));
      });
      ba.prepend(tabs);
      show(0);
    });
  }

  // ---------- 红旗 / 原则徽章 ----------
  // <span data-flag="shallow"></span> → 「⚑ 浅模块」，悬停看定义，点击去速查页
  function wireBadges(root) {
    const flags = Object.fromEntries((window.APOSD_FLAGS || []).map((f) => [f.id, f]));
    root.querySelectorAll("[data-flag]").forEach((el) => {
      if (el.dataset.wired) return;
      const f = flags[el.dataset.flag];
      if (!f) { el.textContent = "?" + el.dataset.flag; return; }
      el.dataset.wired = 1;
      const a = h("a", { class: "badge flag-badge", href: `${ROOT}cheatsheet.html#flag-${f.id}`, title: `${f.en}：${f.def}` }, "⚑ ", el.textContent.trim() || f.zh);
      el.replaceWith(a);
    });
    const ps = Object.fromEntries((window.APOSD_PRINCIPLES || []).map((p) => [p.k, p]));
    root.querySelectorAll("[data-principle]").forEach((el) => {
      if (el.dataset.wired) return;
      const p = ps[el.dataset.principle];
      if (!p) return;
      el.dataset.wired = 1;
      el.replaceWith(h("a", { class: "badge principle-badge", href: `${ROOT}cheatsheet.html#p-${p.k}`, title: p.zh }, `原则 ${p.k}`, el.textContent.trim() ? "：" + el.textContent.trim() : ""));
    });
  }

  // ---------- 本地笔记 ----------
  // <textarea class="note" data-key="ch04-oneline" placeholder="…"></textarea>：输入即保存到本机浏览器
  function wireNotes(root) {
    root.querySelectorAll("textarea.note").forEach((ta) => {
      if (ta.dataset.wired) return;
      ta.dataset.wired = 1;
      const key = "note-" + ta.dataset.key;
      ta.value = LS.get(key, "");
      const tip = h("div", { class: "note-tip small muted" }, ta.value ? "已保存在本机浏览器" : "写下来会自动保存在本机浏览器（不会上传）");
      ta.after(tip);
      let t = null;
      ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { LS.set(key, ta.value); tip.textContent = "已保存在本机浏览器"; }, 400); });
    });
  }

  // ---------- 页面装配 ----------
  function chapterIndex() {
    const n = Number(document.body.dataset.chapter);
    return (window.APOSD_CHAPTERS || []).findIndex((c) => c.n === n);
  }
  function mountChrome() {
    const list = window.APOSD_CHAPTERS || [];
    const idx = chapterIndex();
    const cur = list[idx];
    const part = cur ? window.APOSD_PARTS[cur.part] : null;
    const chHref = (c) => `${ROOT}chapters/${c.slug}.html`;

    const themeBtn = h("button", { title: "切换主题" });
    const themes = ["system", "light", "dark"], names = { system: "◐", light: "☀", dark: "☾" }, full = { system: "跟随系统", light: "浅色", dark: "深色" };
    const paintTheme = () => { const t = LS.get("theme", "system"); themeBtn.textContent = names[t]; themeBtn.title = "主题：" + full[t]; };
    themeBtn.onclick = () => { const t = themes[(themes.indexOf(LS.get("theme", "system")) + 1) % 3]; LS.set("theme", t); applyTheme(t); paintTheme(); };
    paintTheme();

    const here = location.pathname;
    const nav = (href, label, re) => h("a", { class: "nav" + (re.test(here) ? " on" : ""), href: ROOT + href }, label);
    const bar = h("header", { class: "topbar" }, h("div", { class: "topbar-inner" },
      h("a", { class: "home", href: ROOT + "index.html" }, "APOSD 精读"),
      h("span", { class: "crumb" }, cur ? `第 ${cur.n} 章 · ${cur.title}` : ""),
      h("nav", { class: "topnav" },
        nav("train/index.html", "训练场", /\/train\//),
        nav("project/index.html", "项目", /\/project\//),
        nav("cheatsheet.html", "速查", /cheatsheet/)),
      idx > 0 ? h("a", { class: "btn", href: chHref(list[idx - 1]), title: "上一章" }, "←") : null,
      idx >= 0 && idx < list.length - 1 ? h("a", { class: "btn", href: chHref(list[idx + 1]), title: "下一章" }, "→") : null,
      themeBtn));
    document.body.prepend(bar);

    if (!cur) return;
    const main = document.querySelector("main");
    if (!main) return;
    if (!main.querySelector(".chapter-head")) {
      main.prepend(h("div", { class: "chapter-head" },
        h("div", { class: "kicker" }, h("span", { class: "dot", style: { background: part.color } }), `${part.name} · ${part.en}`, h("span", {}, `第 ${cur.n} 章`)),
        h("h1", {}, cur.title), h("p", { class: "en" }, cur.en)));
    }
    const heads = [...main.querySelectorAll("h2")];
    if (heads.length >= 3 && !main.querySelector(".toc")) {
      heads.forEach((el, k) => { if (!el.id) el.id = "s" + (k + 1); });
      const toc = h("nav", { class: "toc" }, h("b", {}, "本页目录"), h("ol", {}, heads.map((el) => h("li", {}, h("a", { href: "#" + el.id }, el.textContent)))));
      main.querySelector(".chapter-head").after(toc);
    }
    const key = "done-" + cur.n;
    const cb = h("input", { type: "checkbox", id: "done-cb" });
    cb.checked = !!LS.get(key, false);
    cb.onchange = () => LS.set(key, cb.checked);
    main.append(h("label", { class: "done-box", for: "done-cb" }, cb, "我已经读完这一章、做完了练习（进度会显示在总览页）"));
    const prev = list[idx - 1], next = list[idx + 1];
    main.append(h("nav", { class: "chapter-nav" },
      prev ? h("a", { class: "prev", href: chHref(prev) }, h("small", {}, "← 上一章 · 第 " + prev.n + " 章"), prev.title) : null,
      next ? h("a", { class: "next", href: chHref(next) }, h("small", {}, "下一章 · 第 " + next.n + " 章 →"), next.title) : null));
    document.title = `${cur.n}. ${cur.title} · APOSD 精读`;
  }

  // 选择题：<div class="mcq" data-answer="1"><div class="q">…</div><div class="opts"><button>…</button>…</div><div class="explain">…</div></div>
  function wireMcq(root) {
    root.querySelectorAll(".mcq").forEach((q) => {
      if (q.dataset.wired) return;
      q.dataset.wired = 1;
      const ans = Number(q.dataset.answer);
      const btns = [...q.querySelectorAll(".opts button")];
      btns.forEach((b, k) => b.addEventListener("click", () => {
        if (q.classList.contains("answered")) return;
        q.classList.add("answered");
        b.classList.add(k === ans ? "right" : "wrong");
        btns[ans] && btns[ans].classList.add("right");
        q.dataset.correct = k === ans ? "1" : "0";
        updateScore();
      }));
    });
  }
  function updateScore() {
    const all = document.querySelectorAll(".mcq"), done = document.querySelectorAll(".mcq.answered"), right = document.querySelectorAll('.mcq[data-correct="1"]');
    document.querySelectorAll(".quiz-score").forEach((el) => (el.textContent = `已答 ${done.length} / ${all.length}，答对 ${right.length}`));
  }

  // 项目实验块：从 "cd project/<dir>" 里认出目录，在块首加上源码链接（本站镜像 + GitHub）和获取方式。
  const REPO = "https://github.com/shakespark/aposd-illustrated";
  function wireLabs(root) {
    root.querySelectorAll(".lab").forEach((lab) => {
      const m = lab.textContent.match(/project\/([0-9a-z_-]+)/);
      if (!m || lab.querySelector(".lab-src")) return;
      const ext = { target: "_blank", rel: "noopener" };
      lab.prepend(h("p", { class: "lab-src" },
        "代码：", h("a", { href: `${ROOT}project/${m[1]}/` }, `project/${m[1]}`),
        "（", h("a", { href: `${REPO}/tree/main/project/${m[1]}`, ...ext }, "GitHub ↗"), "）。获取全部代码：",
        h("a", { href: `${ROOT}aposd-project.zip` }, "下载 aposd-project.zip"), " 解压，或 ", h("code", {}, `git clone ${REPO}.git`),
        "；下面的命令在 project/ 所在的目录运行。"));
    });
  }
  function wireCopy(root) {
    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".copy")) return;
      const b = h("button", { class: "copy", title: "复制" }, "复制");
      b.onclick = () => {
        const code = pre.querySelector("code") || pre;
        const text = code.querySelector(".ln") ? [...code.querySelectorAll(".ln")].map((l) => l.textContent).join("\n") : code.innerText.replace(/^复制$/m, "");
        const ok = () => { b.textContent = "已复制"; setTimeout(() => (b.textContent = "复制"), 1200); };
        const fallback = () => {
          const ta = h("textarea", { style: { position: "fixed", opacity: "0" } }, text);
          document.body.append(ta); ta.select();
          try { document.execCommand("copy"); ok(); } catch (e) { b.textContent = "复制失败"; }
          ta.remove();
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, fallback);
        else fallback();
      };
      pre.append(b);
    });
  }
  // 动态插入内容后调用：把所有通用组件接上
  function wire(root) {
    wireHighlight(root);
    wireBA(root);
    wireBadges(root);
    wireNotes(root);
    wireMcq(root);
    wireLabs(root);
    wireCopy(root);
  }

  // 页脚：备案号（ICP 备案要求每个页面可见）
  function mountFooter() {
    document.body.append(h("footer", { class: "site-footer" },
      h("a", { href: "https://beian.miit.gov.cn/", target: "_blank", rel: "noopener" }, "京ICP备18057656号-1")));
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountChrome();
    mountFooter();
    wire(document);
    updateScore();
  });

  window.APOSD = { h, s, esc, color, highlight, codeBlock, wire, wireMcq, LS, ROOT };
})();
