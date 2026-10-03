#!/usr/bin/env python3
"""把讨论组里指定的讨论串正文取到本机 source/group/<id>.txt，供精读用。

source/ 不入库、不部署：正文版权属于各发帖人，只在本机读，写进站点时只转述 + 链接 + 短引用。

用法：
  python3 tools/groups_fetch.py A 待定        取 triage.json 里优先级为 A、或"挂到"为待定的串
  python3 tools/groups_fetch.py <串 id>…      取指定的串
  加 --full：保留引用的上文（以 "> " 开头），另存为 <id>.full.txt。
  作者逐段插在引文之间回复时，要靠它确认每一段是在回应哪句话。
"""
import datetime
import html
import html.parser
import json
import pathlib
import re
import sys
import time

import groups_scan as g

OUT = pathlib.Path(__file__).resolve().parent.parent / "source" / "group"


class _Text(html.parser.HTMLParser):
    """邮件 HTML -> 纯文本。引用的上文（blockquote）跳过，免得每条回复都把前文重复一遍；
    夹在引用之间的逐段回复会保留。"""

    BREAK = {"br", "p", "div", "li", "pre", "tr", "h1", "h2", "h3"}

    def __init__(self, keep_quotes=False):
        super().__init__()
        self.out, self.quote, self.attr, self.keep = [], 0, 0, keep_quotes

    def handle_starttag(self, tag, attrs):
        if tag == "blockquote":
            self.quote += 1
        elif self.attr or "gmail_attr" in (dict(attrs).get("class") or ""):
            self.attr += tag not in ("br", "img")  # "On … wrote:" 这一行
        if tag in self.BREAK:
            self.out.append("\n")

    def handle_endtag(self, tag):
        if tag == "blockquote":
            self.quote = max(0, self.quote - 1)
        elif self.attr:
            self.attr -= 1
        if tag in self.BREAK:
            self.out.append("\n")

    def handle_data(self, data):
        if self.keep and self.quote:
            self.out.append("\x00" + data)  # 之后把含这个标记的行改成 "> " 开头
        elif not self.quote and not self.attr:
            self.out.append(data)


def to_text(parts, keep_quotes=False):
    t = _Text(keep_quotes)
    for part in parts:
        t.feed(part)
        t.out.append("\n")
    t.close()
    lines = [ln.rstrip().replace("\xa0", " ") for ln in "".join(t.out).splitlines()]
    if keep_quotes:
        lines = [("> " + ln.replace("\x00", "")) if "\x00" in ln else ln for ln in lines]
    else:
        lines = [ln for ln in lines if not ln.lstrip().startswith(">")]
    text = "\n".join(lines)
    text = text.split("You received this message because you are subscribed")[0]
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def body_parts(m):
    """一条消息的正文分成若干段，每段的 HTML 在 [1][1]。"""
    segs = m[0][1][1] or []
    return [seg[1][1] for seg in segs if len(seg) > 1 and seg[1] and len(seg[1]) > 1 and isinstance(seg[1][1], str)]


def fetch(tid, title, full=False):
    d = g.call(g.RPC_THREAD, [g.GROUP_ADDR, tid, 100, None, None, 2])
    msgs = sorted(d[2], key=lambda m: m[0][0][8][0])
    out = [f"# {title}", f"{g.BASE}/g/{g.GROUP}/c/{tid}", f"{len(msgs)} 条消息", ""]
    for n, m in enumerate(msgs, 1):
        h = m[0][0]
        a = h[2][0] if h[2] and h[2][0] else []
        name = a[0] if a else "（已删除）"
        when = datetime.datetime.fromtimestamp(h[8][0], datetime.timezone.utc).strftime("%Y-%m-%d")
        out += [f"===== [{n}] {name} · {when} =====", to_text(body_parts(m), full), ""]
    (OUT / (f"{tid}.full.txt" if full else f"{tid}.txt")).write_text("\n".join(out), encoding="utf-8")
    return len(msgs)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    snap = g.load(g.SNAPSHOT, {"threads": {}})["threads"]
    triage = g.load(g.TRIAGE, {})
    want = []
    full = "--full" in sys.argv
    for arg in sys.argv[1:]:
        if arg == "--full":
            continue
        if arg in snap:
            want.append(arg)
        else:
            want += [i for i, t in triage.items() if t.get("priority") == arg or t.get("target") == arg]
    for tid in dict.fromkeys(want):
        n = fetch(tid, snap[tid]["title"], full)
        print(f"{tid}  {n:3d} 条  {(OUT / (tid + ('.full.txt' if full else '.txt'))).stat().st_size:7d} 字节  {snap[tid]['title'][:60]}")
        time.sleep(1)


if __name__ == "__main__":
    main()
