// APOSD 精读站：训练题引擎 + 间隔复习。依赖 aposd.js（window.APOSD）与 chapters.js。
//
// 题库：train/data/chNN.js 里 APOSD_DRILLS.push({...})。题型：
//   flag  识红旗：读代码，多选其中的红旗（choices 里可放 "none" 表示没有明显问题）
//         { id, ch, type:"flag", title, prompt?, code, choices:[flagId|"none"], answer:[flagId|"none"], mark?:[行号], explain }
//   ab    A/B 对比：两种设计选更好的
//         { id, ch, type:"ab", title, prompt, a:{label?, code, note?}, b:{…}, answer:"a"|"b", explain }
//   judge 判断：单选
//         { id, ch, type:"judge", title, prompt, code?, options:[html], answer:下标, explain }
//   write 先写后对照：自己写，再看参考答案、按要点自评
//         { id, ch, type:"write", title, prompt, code?, reference:html, rubric:[要点], explain? }
//   card  记忆卡：{ id, ch, type:"card", front:html, back:html }
// 另外每个红旗自动生成一张记忆卡（id: card-flag-<flagId>）。
//
// 间隔复习（Leitner 盒子）：答对升一盒，部分对留在原盒（至少 1），答错回到 1 盒并在 10 分钟后到期。
// 盒子 b 的复习间隔为 INTERVAL[b] 天；b ≥ 4 视为"已掌握"。进度存在 localStorage 的 aposd-srs。
(function () {
  "use strict";
  const { h, esc, codeBlock, wire, LS, ROOT } = window.APOSD;
  const DAY = 864e5;
  const INTERVAL = [0, 1, 2, 4, 8, 16, 32];
  const TYPE_NAME = { flag: "识红旗", ab: "A/B 对比", judge: "判断", write: "先写后对照", card: "记忆卡" };
  const flagsById = () => Object.fromEntries((window.APOSD_FLAGS || []).map((f) => [f.id, f]));

  // ---------- 题库 ----------
  function all() {
    const items = (window.APOSD_DRILLS || []).slice();
    for (const f of window.APOSD_FLAGS || []) {
      items.push({ id: "card-flag-" + f.id, ch: f.ch, type: "card", auto: true,
        front: `红旗信号：<b>${esc(f.zh)}</b>（${esc(f.en)}）<br><span class="muted small">它指的是什么？通常怎么改？</span>`,
        back: `<p>${esc(f.def)}</p><p class="small muted">第 ${f.ch} 章提出。<a href="${ROOT}cheatsheet.html#flag-${f.id}">速查页里的例子和改法 →</a></p>` });
    }
    return items;
  }
  function byId(id) { return all().find((d) => d.id === id); }

  // ---------- 间隔复习存储 ----------
  const SRS = {
    load() { return LS.get("srs", {}); },
    get(id) { return this.load()[id]; },
    record(id, q) {
      const st = this.load();
      const cur = st[id] || { b: 0, n: 0 };
      let b = cur.b;
      if (q >= 2) b = Math.min(b + 1, INTERVAL.length - 1);
      else if (q === 1) b = Math.max(1, b);
      else b = 1;
      const due = q === 0 ? Date.now() + 10 * 60e3 : Date.now() + INTERVAL[b] * DAY;
      st[id] = { b, d: due, n: cur.n + 1, r: q, t: Date.now() };
      LS.set("srs", st);
      document.dispatchEvent(new CustomEvent("aposd-srs", { detail: { id, q } }));
      return st[id];
    },
    reset() { LS.set("srs", {}); },
    isDue(id, now = Date.now()) { const s = this.get(id); return !!s && s.d <= now; },
    mastered(id) { const s = this.get(id); return !!s && s.b >= 4; },
  };

  // 可复现的洗牌（按题目 id 做种子），让红旗选项的位置不固定又不会每次刷新都变
  function seededShuffle(arr, seedStr) {
    let a = 2166136261;
    for (const c of seedStr) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
    const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const html = (s) => { const d = h("div"); d.innerHTML = s || ""; return d; };
  const frag = (s) => { const d = html(s); const f = document.createDocumentFragment(); f.append(...d.childNodes); return f; };

  // ---------- 渲染一道题 ----------
  // render(item, host, {onDone(q), compact}) → 返回题目根元素。q: 0 错 / 1 部分 / 2 对
  function render(item, host, opts = {}) {
    const st = SRS.get(item.id);
    const chapter = (window.APOSD_CHAPTERS || []).find((c) => c.n === item.ch);
    const meta = h("span", { class: "meta" },
      chapter ? h("a", { href: `${ROOT}chapters/${chapter.slug}.html` }, `第 ${item.ch} 章`) : null,
      st ? `　· 第 ${st.b} 盒${st.b >= 4 ? " ✓" : ""}` : "　· 新题");
    const root = h("section", { class: "drill", id: "drill-" + item.id },
      h("div", { class: "drill-head" }, h("span", { class: "type t-" + item.type }, TYPE_NAME[item.type] || item.type), h("h4", {}, item.title || (item.type === "card" ? "回忆一下" : "")), meta));
    const body = h("div", { class: "drill-body" });
    root.append(body);
    const finish = (q) => {
      SRS.record(item.id, q);
      const s2 = SRS.get(item.id);
      meta.lastChild.textContent = `　· 第 ${s2.b} 盒${s2.b >= 4 ? " ✓" : ""}`;
      opts.onDone && opts.onDone(q);
    };
    const explain = () => item.explain ? h("div", { class: "explain" }, frag(item.explain)) : null;
    const verdict = (q, text) => h("div", { class: "verdict " + ["bad", "partial", "ok"][q] }, text);

    if (item.prompt) body.append(html(item.prompt));
    const T = item.type;

    if (T === "flag") {
      const flags = flagsById();
      const pre = codeBlock(item.code);
      body.append(pre);
      const sel = new Set();
      const choices = seededShuffle(item.choices, item.id);
      const box = h("div", { class: "choices" });
      const btns = choices.map((c) => {
        const f = flags[c];
        const b = h("button", { title: f ? f.def : "代码在这方面没有明显问题", onclick: () => { if (root.dataset.done) return; sel.has(c) ? sel.delete(c) : sel.add(c); if (c === "none") [...sel].forEach((x) => x !== "none" && sel.delete(x)); else sel.delete("none"); paint(); } },
          f ? `⚑ ${f.zh}` : "✓ 没有明显问题");
        b.dataset.c = c;
        return b;
      });
      const paint = () => btns.forEach((b) => b.classList.toggle("sel", sel.has(b.dataset.c)));
      box.append(...btns);
      const submit = h("button", { class: "primary" }, "提交");
      body.append(h("p", { class: "small muted", style: { margin: "8px 0 0" } }, "这段代码亮了哪些红旗？可以多选；鼠标悬停在选项上能看定义。"), box, h("div", { class: "actions" }, submit));
      submit.onclick = () => {
        if (!sel.size) { submit.textContent = "先选至少一项"; return; }
        root.dataset.done = 1;
        submit.remove();
        const ans = new Set(item.answer);
        btns.forEach((b) => {
          const c = b.dataset.c;
          if (sel.has(c) && ans.has(c)) b.classList.add("right");
          else if (sel.has(c)) b.classList.add("wrong");
          else if (ans.has(c)) b.classList.add("missed");
          b.disabled = true;
        });
        const hit = [...sel].filter((c) => ans.has(c)).length, extra = [...sel].filter((c) => !ans.has(c)).length;
        const q = hit === ans.size && !extra ? 2 : hit > 0 ? 1 : 0;
        const names = item.answer.map((c) => (flags[c] ? flags[c].zh : "没有明显问题")).join("、");
        body.append(verdict(q, q === 2 ? "完全正确。" : q === 1 ? `部分正确。参考答案：${names}（虚线框是漏选的）。` : `参考答案：${names}。`));
        if (item.mark && item.mark.length) pre.querySelectorAll(".ln").forEach((ln) => ln.classList.toggle("mark", item.mark.includes(Number(ln.dataset.n))));
        const ex = explain(); if (ex) body.append(ex);
        finish(q);
        wire(root);
      };
    } else if (T === "ab") {
      const col = (k, d) => h("div", { class: "ab-col" }, h("h5", {}, `方案 ${k.toUpperCase()}${d.label ? "：" + d.label : ""}`), d.code ? codeBlock(d.code, { numbers: false }) : null, d.note ? html(d.note) : null);
      body.append(h("div", { class: "ab-grid" }, col("a", item.a), col("b", item.b)));
      const opts2 = h("div", { class: "opts" });
      const bA = h("button", {}, "方案 A 更好"), bB = h("button", {}, "方案 B 更好");
      opts2.append(bA, bB);
      body.append(opts2);
      const pick = (k, btn) => {
        if (root.dataset.done) return;
        root.dataset.done = 1;
        const right = k === item.answer;
        btn.classList.add(right ? "right" : "wrong");
        (item.answer === "a" ? bA : bB).classList.add("right");
        body.append(verdict(right ? 2 : 0, right ? "判断正确。关键是你的理由是否和下面一致：" : `更好的是方案 ${item.answer.toUpperCase()}。`));
        const ex = explain(); if (ex) body.append(ex);
        finish(right ? 2 : 0);
        wire(root);
      };
      bA.onclick = () => pick("a", bA);
      bB.onclick = () => pick("b", bB);
    } else if (T === "judge") {
      if (item.code) body.append(codeBlock(item.code));
      const box = h("div", { class: "opts" });
      const btns = item.options.map((o, k) => h("button", { onclick: () => {
        if (root.dataset.done) return;
        root.dataset.done = 1;
        const right = k === item.answer;
        btns[k].classList.add(right ? "right" : "wrong");
        btns[item.answer].classList.add("right");
        body.append(verdict(right ? 2 : 0, right ? "正确。" : "不对，正确答案已标绿。"));
        const ex = explain(); if (ex) body.append(ex);
        finish(right ? 2 : 0);
        wire(root);
      } }, frag(`${String.fromCharCode(65 + k)}. ${o}`)));
      box.append(...btns);
      body.append(box);
    } else if (T === "write") {
      if (item.code) body.append(codeBlock(item.code));
      const draftKey = "draft-" + item.id;
      const ta = h("textarea", { placeholder: "先在这里写下你的答案，再看参考。写下来比在脑子里想有用得多。", rows: 5 });
      ta.value = LS.get(draftKey, "");
      ta.addEventListener("input", () => LS.set(draftKey, ta.value));
      const show = h("button", { class: "primary" }, "看参考答案");
      body.append(ta, h("div", { class: "actions" }, show));
      show.onclick = () => {
        if (!ta.value.trim() && !show.dataset.warned) { show.dataset.warned = 1; show.textContent = "真的不先写一下？再点一次直接看"; return; }
        show.parentElement.remove();
        const rub = h("ul", { class: "rubric" }, (item.rubric || []).map((r) => h("li", {}, h("label", {}, h("input", { type: "checkbox" }), " ", frag(r)))));
        body.append(h("div", { class: "explain" }, h("p", {}, h("strong", {}, "参考答案")), frag(item.reference)));
        if (item.rubric && item.rubric.length) body.append(h("p", { class: "small", style: { margin: "12px 0 0" } }, h("strong", {}, "对照要点："), "你的答案做到了哪些？"), rub);
        const ex = explain(); if (ex) body.append(ex);
        const rate = h("div", { class: "rate" }, h("span", { class: "muted" }, "自评："));
        [["基本没想到", 0], ["做到一部分", 1], ["要点都有", 2]].forEach(([t, q]) => rate.append(h("button", { onclick: () => { rate.replaceChildren(verdict(q, `已记录：${t}。`)); finish(q); } }, t)));
        body.append(rate);
        wire(root);
      };
    } else if (T === "card") {
      body.append(h("div", { class: "card-face" }, frag(item.front)));
      const show = h("button", { class: "primary" }, "翻面");
      body.append(h("div", { class: "actions" }, show));
      show.onclick = () => {
        show.parentElement.remove();
        body.append(h("div", { class: "card-back" }, frag(item.back)));
        const rate = h("div", { class: "rate" }, h("span", { class: "muted" }, "刚才想起来了吗？"));
        [["忘了", 0], ["模糊", 1], ["记得", 2]].forEach(([t, q]) => rate.append(h("button", { onclick: () => { rate.replaceChildren(verdict(q, `已记录：${t}。`)); finish(q); } }, t)));
        body.append(rate);
        wire(root);
      };
    }
    host.append(root);
    wire(root);
    return root;
  }

  // 章节页嵌入：<div class="drill-embed" data-ids="ch04-flag-01 ch04-ab-01"></div>
  //         或 <div class="drill-embed" data-ch="4" data-limit="3"></div>
  function wireEmbeds(root) {
    root.querySelectorAll(".drill-embed").forEach((host) => {
      if (host.dataset.wired) return;
      host.dataset.wired = 1;
      let items;
      if (host.dataset.ids) items = host.dataset.ids.split(/\s+/).filter(Boolean).map((id) => { const d = byId(id); if (!d) console.warn("drill not found", id); return d; }).filter(Boolean);
      else items = all().filter((d) => d.ch === Number(host.dataset.ch) && !d.auto).slice(0, Number(host.dataset.limit) || 3);
      items.forEach((d) => render(d, host));
      const ch = items[0] ? items[0].ch : Number(host.dataset.ch);
      const total = all().filter((d) => d.ch === ch).length;
      if (ch && total > items.length) host.after(h("p", { class: "drill-embed-more" }, h("a", { href: `${ROOT}train/index.html#ch=${ch}` }, `去训练场做本章全部 ${total} 题（含记忆卡），答题记录会进入间隔复习 →`)));
    });
  }
  document.addEventListener("DOMContentLoaded", () => wireEmbeds(document));

  window.APOSD_DRILL = { all, byId, render, SRS, INTERVAL, TYPE_NAME, wireEmbeds, seededShuffle };
})();
