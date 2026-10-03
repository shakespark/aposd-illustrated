#!/usr/bin/env python3
"""扫描 APOSD 讨论组（groups.google.com/g/software-design-book）的讨论串列表。

只保存元数据：列表里的标题、消息数、最后活动时间，以及每串各条消息的发帖人和时间
（用来判断作者是否参与）。帖子正文不保存——正文版权属于各发帖人。
数据都放在 tools/group/（tools/ 不会被部署到线上）：

  snapshot.json  机器写：每串的最新元数据 + 原始记录。每次扫描整体覆盖。
  triage.json    人/Claude 写：每串的筛选结论和"读到第几条"。扫描只新增条目，不改已有字段。
  scans.log      每次扫描一行：时间、总数、新增、有新回复。
  TRIAGE.md      由上面两个文件生成的清单，不要手改（改 triage.json 后跑 --render）。

用法：
  python3 tools/groups_scan.py            重新扫描，打印与上次的差异，更新全部文件
  python3 tools/groups_scan.py --render   不联网，只按 triage.json 重新生成 TRIAGE.md
  python3 tools/groups_scan.py --notes    不联网，把 tools/group/notes/<id>.md 头部的结论回填到 triage.json

精读笔记（notes/<id>.md）是我们自己的转述，头部固定有"精读 / 对应 / 优先级"三行，--notes 靠它们回填。
"""
import datetime
import html
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

GROUP = "software-design-book"
GROUP_ADDR = GROUP + "@googlegroups.com"
BASE = "https://groups.google.com"
# batchexecute 的 RPC 名；Google 改版后可能要重新从页面源码的 'ds:N' : {id:…,request:…} 里找
RPC = "Dq0xse"  # 讨论串列表，分页
RPC_THREAD = "H08Fi"  # 一串里的全部消息
PAGE = 30
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
OUSTERHOUT_IDS = {"101729067348323017529", "110001577630801284790"}  # 作者用过两个账号

DIR = pathlib.Path(__file__).resolve().parent / "group"
SNAPSHOT = DIR / "snapshot.json"
TRIAGE = DIR / "triage.json"
LOG = DIR / "scans.log"
REPORT = DIR / "TRIAGE.md"

# triage.json 里 status 的取值
STATUSES = ["未看", "已列出", "已精读", "已采用", "跳过"]
PRIORITIES = ["A", "B", "C", "X", ""]


def call(rpc, args):
    body = urllib.parse.urlencode({"f.req": json.dumps([[[rpc, json.dumps(args), None, "generic"]]])}).encode()
    r = urllib.request.Request(
        f"{BASE}/_/GroupsFrontendUi/data/batchexecute?rpcids={rpc}&hl=en&rt=c",
        data=body,
        headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
    )
    for attempt in range(3):
        try:
            text = urllib.request.urlopen(r, timeout=30).read().decode()
            break
        except OSError:
            if attempt == 2:
                raise
            time.sleep(5)
    for line in text.splitlines():
        if line.startswith('[["wrb.fr"'):
            payload = json.loads(line)[0][2]
            if payload is None:
                raise RuntimeError("RPC 返回空结果，接口可能变了：" + line[:200])
            return json.loads(payload)
    raise RuntimeError("响应里没有 wrb.fr 行，接口可能变了：" + text[:200])


def fetch_all():
    records, token, total = [], "", None
    while True:
        d = call(RPC, [GROUP_ADDR, PAGE, token, [], 2])
        total = d[1]
        records += d[2] or []
        token = d[3] if len(d) > 3 else None
        if not token or not d[2]:
            return total, records
        time.sleep(1.5)


def parse(rec):
    """列表记录 -> 我们关心的字段。下标含义是对照网页核实过的。"""
    t = rec[0]
    return {
        "id": t[1],
        "title": html.unescape(t[2] or ""),
        "url": f"{BASE}/g/{GROUP}/c/{t[1]}",
        "messages": t[6],
        "last_ts": t[5][0],  # 最后一条消息的发帖时间
        "participant_count": t[9][1],
    }


def fetch_posts(tid):
    """一串里每条消息的发帖人和时间。列表接口只给首帖人和最后发帖人，所以要单独取。正文在这里丢弃。"""
    d = call(RPC_THREAD, [GROUP_ADDR, tid, 100, None, None, 2])
    posts = []
    for m in d[2]:
        h = m[0][0]
        a = h[2][0] if h[2] and h[2][0] else []  # 已删除的消息没有发帖人
        # 账号 ID 只用来认出作者，不落盘
        jo = len(a) > 3 and a[3] in OUSTERHOUT_IDS
        posts.append({"name": a[0] if a else "", "ts": h[8][0], "ousterhout": jo})
    return sorted(posts, key=lambda p: p["ts"])


def load(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def dump(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def day(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%d")


def pending(th, tr):
    """这一串自上次读过之后有没有新消息。"""
    return tr.get("read_messages") is not None and th["messages"] > tr["read_messages"]


def render(snap, triage):
    threads = snap["threads"]
    rows = sorted(
        threads.values(),
        key=lambda th: (
            PRIORITIES.index(triage[th["id"]].get("priority", "")),
            not th["ousterhout"],
            -th["messages"],
            -th["last_ts"],
        ),
    )
    count = lambda f: sum(1 for th in threads.values() if f(th, triage[th["id"]]))
    out = [
        "# 讨论组筛选清单",
        "",
        "由 `tools/groups_scan.py` 生成，不要手改；改 `triage.json` 后跑 `python3 tools/groups_scan.py --render`。",
        "",
        f"- 最近一次扫描：{snap['scanned_at']}，组内共 {snap['total_reported']} 串，抓到 {len(threads)} 串。",
        "- 状态："
        + "、".join(f"{s} {count(lambda th, tr, s=s: tr['status'] == s)}" for s in STATUSES)
        + f"；读过之后又有新回复 {count(pending)}。",
        "- 优先级：A 必读，B 值得读，C 有空再看，X 跳过；空白表示还没判断。",
        "- “已列出”只表示看过标题、回复数和发帖人，**没有读过正文**。",
        "- “回复”= 消息数 − 1；“已读”是上次精读时这一串的消息数，比当前少就标 🔄。",
        "- “作者”是 Ousterhout 在这一串里发的消息数。",
        "",
        "| 优先 | 标题 | 回复 | 人数 | 首帖 | 最后活动 | 作者 | 状态 | 已读 | 挂到 | 备注 |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for th in rows:
        tr = triage[th["id"]]
        read = "" if tr.get("read_messages") is None else str(tr["read_messages"])
        if pending(th, tr):
            read += " 🔄"
        title = th["title"].replace("|", "\\|") or "（无标题）"
        out.append(
            f"| {tr.get('priority', '')} | [{title}]({th['url']}) | {th['messages'] - 1} | {th['participant_count']} "
            f"| {day(th['first_ts'])} | {day(th['last_ts'])} | {th['ousterhout'] or ''} | {tr['status']} | {read} "
            f"| {tr.get('target', '')} | {tr.get('note', '').replace('|', '/')} |"
        )
    REPORT.write_text("\n".join(out) + "\n", encoding="utf-8")


def sync_notes(snap, triage):
    """笔记头部 -> triage.json。read_messages 记快照里的消息数（列表口径），这样以后有新回复才会标出来。"""
    for f in sorted((DIR / "notes").glob("*.md")):
        tid, text = f.stem, f.read_text(encoding="utf-8")
        head = dict(re.findall(r"^- (精读|对应|优先级|主题)：(.*)$", text, flags=re.M))
        if tid not in triage or not {"精读", "对应", "优先级"} <= set(head):
            print(f"跳过 {f.name}：不认识的 id 或头部不全")
            continue
        pr = re.match(r"\s*(?:[ABCX]\s*→\s*)?([ABCX])", head["优先级"])
        day_read = re.match(r"\d{4}-\d{2}-\d{2}", head["精读"])
        if not pr or not day_read:
            print(f"跳过 {f.name}：优先级或精读日期写法不对")
            continue
        triage[tid].update(
            status="已采用" if triage[tid]["status"] == "已采用" else "已精读", priority=pr.group(1), target=head["对应"].strip(),
            note=head.get("主题", "").strip(), read_messages=snap["threads"][tid]["messages"],
            read_at=day_read.group(0),
        )


def main():
    DIR.mkdir(exist_ok=True)
    old = load(SNAPSHOT, {"threads": {}})
    triage = load(TRIAGE, {})
    if "--notes" in sys.argv:
        sync_notes(old, triage)
        dump(TRIAGE, triage)
    if "--render" in sys.argv or "--notes" in sys.argv:
        render(old, triage)
        return

    total, records = fetch_all()
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    threads = {}
    for rec in records:
        th = parse(rec)
        was = old["threads"].get(th["id"])
        # 消息数没变就沿用上次取到的发帖人（两个数偶尔对不上：列表不计已删除的消息）
        if was and was["messages"] == th["messages"] and was["last_ts"] == th["last_ts"]:
            th["posts"] = was["posts"]
        else:
            time.sleep(1)
            th["posts"] = fetch_posts(th["id"])
        th["first_ts"] = th["posts"][0]["ts"]
        th["starter"] = th["posts"][0]["name"]
        th["ousterhout"] = sum(1 for p in th["posts"] if p["ousterhout"])
        threads[th["id"]] = th
    if total != len(threads):
        print(f"注意：组内报告 {total} 串，实际抓到 {len(threads)} 串")

    new = [t for i, t in threads.items() if i not in old["threads"]]
    grown = [
        t for i, t in threads.items()
        if i in old["threads"] and t["messages"] > old["threads"][i]["messages"]
    ]
    gone = [t for i, t in old["threads"].items() if i not in threads and not t.get("gone")]
    # 已消失的串保留在快照里，免得 triage 里的结论失去对应
    for i, t in old["threads"].items():
        if i not in threads:
            threads[i] = dict(t, gone=True)

    for i, t in threads.items():
        triage.setdefault(i, {"title": t["title"], "status": "未看", "priority": "", "target": "", "note": "",
                              "read_messages": None, "read_at": None})

    first = not old["threads"]
    print(f"{now}：共 {len(threads)} 串" + ("（首次扫描）" if first else f"，新增 {len(new)}，有新回复 {len(grown)}，消失 {len(gone)}"))
    if not first:
        for t in new:
            print(f"  新增  {t['title']}（{t['messages'] - 1} 回复）{t['url']}")
        for t in grown:
            was = old["threads"][t["id"]]["messages"]
            st = triage[t["id"]]["status"]
            print(f"  新回复 {t['title']}（{was} → {t['messages']} 条，状态：{st}）{t['url']}")
        for t in gone:
            print(f"  消失  {t['title']}")

    dump(SNAPSHOT, {"scanned_at": now, "total_reported": total, "rpc_id": RPC, "threads": threads})
    dump(TRIAGE, triage)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(f"{now}\ttotal={total}\tfetched={len(records)}\tnew={len(new)}\tgrown={len(grown)}\tgone={len(gone)}\n")
    render({"scanned_at": now, "total_reported": total, "threads": threads}, triage)


if __name__ == "__main__":
    main()
