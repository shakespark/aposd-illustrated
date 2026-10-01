#!/usr/bin/env python3
"""与原书的英文长片段重合检查：python3 tools/overlap.py 文件… [--n 12]

把页面/题库里的英文按"连续的非中文片段"切开、分词，与 source/text/ 全书的 n 词片段比对。
<blockquote class="quote"> 里的标注引用不计入（规范允许每页 ≤2 处、每处 ≤25 词，另行统计）。
中文转述是否过于贴近原文，这个脚本查不出来，需要人工/审稿代理对照原文判断。
"""
import glob, html, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
args = sys.argv[1:]
N = 12
if "--n" in args:
    i = args.index("--n"); N = int(args[i + 1]); del args[i:i + 2]

WORD = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")
def words(s):
    return WORD.findall(s.lower().replace("’", "'"))

src_grams = {}
for f in sorted(glob.glob(os.path.join(ROOT, "source/text/*.txt"))):
    w = words(open(f, encoding="utf-8").read())
    for k in range(len(w) - N + 1):
        src_grams.setdefault(" ".join(w[k:k + N]), os.path.basename(f))
if not src_grams:
    sys.exit("找不到 source/text/*.txt（原书文本不在仓库里，只在本机）")

CJK = re.compile(r"[　-〿㐀-鿿＀-￯]+")
bad = 0
for path in args:
    t = open(path, encoding="utf-8").read()
    quotes = re.findall(r'<blockquote class="quote">(.*?)</blockquote>', t, flags=re.S)
    for q in quotes:
        n = len(words(re.sub(r"<[^>]+>", " ", re.sub(r"<cite>.*?</cite>", "", q, flags=re.S))))
        if n > 25:
            print(f"  {path}: 引用超过 25 词（{n} 词）"); bad += 1
    if len(quotes) > 2:
        print(f"  {path}: 引用 {len(quotes)} 处，超过 2 处"); bad += 1
    t = re.sub(r'<blockquote class="quote">.*?</blockquote>', " ", t, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    hits = []
    for run in CJK.split(t):
        w = words(run)
        k = 0
        while k <= len(w) - N:
            g = " ".join(w[k:k + N])
            if g in src_grams:
                # 向后延伸，报告整段
                e = k + N
                while e < len(w) and " ".join(w[e - N + 1:e + 1]) in src_grams:
                    e += 1
                hits.append((src_grams[g], " ".join(w[k:e])))
                k = e
            else:
                k += 1
    for src, frag in hits:
        print(f"  {path}: 与 {src} 重合 {len(frag.split())} 词：{frag[:160]}")
    bad += len(hits)
    if not hits:
        print(f"✓ {path}")
print("全部通过" if not bad else f"\n{bad} 处问题")
sys.exit(1 if bad else 0)
