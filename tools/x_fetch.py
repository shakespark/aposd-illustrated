#!/usr/bin/env python3
"""把 X（原 Twitter）上指定的帖子取到本机 source/x/<id>.txt，供写页面前对照原文用。

走 X 的公开嵌入接口，不用登录；返回帖子全文、展开后的链接，和它回复的上一条（只有紧邻的一条）。
source/ 不入库、不部署：帖子版权属于各发帖人，写进站点时只转述 + 链接。

用法：
  python3 tools/x_fetch.py <帖子 id 或链接>…
"""
import json
import math
import pathlib
import re
import sys
import urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / "source" / "x"
API = "https://cdn.syndication.twimg.com/tweet-result?id={id}&token={token}"
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


def _token(tweet_id):
    """嵌入脚本的算法：(id / 1e15 * π) 写成 36 进制，再去掉 0 和小数点。"""
    x = int(tweet_id) / 1e15 * math.pi
    whole, frac = int(x), x - int(x)
    head = ""
    while whole:
        head = DIGITS[whole % 36] + head
        whole //= 36
    tail = ""
    for _ in range(10):
        frac *= 36
        tail += DIGITS[int(frac)]
        frac -= int(frac)
    return re.sub(r"0+|\.", "", head + "." + tail)


def fetch(tweet_id):
    req = urllib.request.Request(API.format(id=tweet_id, token=_token(tweet_id)),
                                 headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def _one(t, label):
    lines = [f"[{label}] @{t.get('user', {}).get('screen_name', '?')}  {t.get('created_at', '')}"
             f"  https://x.com/i/status/{t.get('id_str', '')}", t.get("text", "")]
    urls = [u.get("expanded_url") for u in t.get("entities", {}).get("urls", [])]
    media = [m.get("media_url_https") for m in t.get("mediaDetails", [])]
    if urls:
        lines.append("链接：" + " ".join(urls))
    if media:
        lines.append("图片：" + " ".join(media))
    return "\n".join(lines)


def render(t):
    parts = []
    if t.get("parent"):
        parts.append(_one(t["parent"], "上一条"))
    elif t.get("in_reply_to_status_id_str"):
        parts.append(f"[上一条] 接口没有返回（id {t['in_reply_to_status_id_str']}）")
    if t.get("quoted_tweet"):
        parts.append(_one(t["quoted_tweet"], "引用"))
    parts.append(_one(t, "本帖"))
    return "\n\n".join(parts) + "\n"


def main(args):
    if not args:
        sys.exit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    for a in args:
        m = re.search(r"(\d{6,})$", a.split("?")[0].strip().rstrip("/"))
        if not m:
            print(f"{a}: 看不出帖子 id", file=sys.stderr)
            continue
        tweet_id = m.group(1)
        try:
            t = fetch(tweet_id)
        except Exception as e:  # 帖子被删、接口限流等
            print(f"{tweet_id}: 取不到（{e}）", file=sys.stderr)
            continue
        if not t.get("text"):
            print(f"{tweet_id}: 接口返回里没有正文（可能已删除）", file=sys.stderr)
            continue
        text = render(t)
        (OUT / f"{tweet_id}.txt").write_text(text, encoding="utf-8")
        print(text)


if __name__ == "__main__":
    main(sys.argv[1:])
