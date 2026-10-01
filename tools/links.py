#!/usr/bin/env python3
"""站内链接检查：python3 tools/links.py
扫描所有 .html 的 href/src，检查站内目标文件是否存在、#锚点是否存在（静态 id，或者运行时生成的已知锚点）。
外部链接只列出域名统计，不访问网络。
"""
import glob, os, re, sys, collections

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
pages = [p for p in glob.glob(os.path.join(ROOT, "**/*.html"), recursive=True) if "/source/" not in p and "/node_modules/" not in p]

# 运行时生成的锚点：章节页 h2 → s1..sN；drill → drill-<id>；训练场 hash 参数不算锚点
def ids_of(path):
    t = open(path, encoding="utf-8").read()
    ids = set(re.findall(r'\bid="([^"]+)"', t))
    n_h2 = len(re.findall(r"<h2\b", t))
    ids |= {f"s{k}" for k in range(1, n_h2 + 1)}
    return ids

cache = {}
bad, ext = [], collections.Counter()
for p in pages:
    t = open(p, encoding="utf-8").read()
    t = re.sub(r"<script\b(?![^>]*\bsrc=)[^>]*>.*?</script>", "", t, flags=re.S)  # 内联脚本里的模板字符串不检查
    for m in re.finditer(r'\b(?:href|src)="([^"]+)"', t):
        u = m.group(1)
        if u.startswith(("http://", "https://")):
            ext[re.sub(r"^https?://([^/]+).*", r"\1", u)] += 1
            continue
        if u.startswith(("mailto:", "javascript:", "data:")) or "${" in u:
            continue
        path, _, frag = u.partition("#")
        if path:
            target = os.path.normpath(os.path.join(os.path.dirname(p), path))
            if path.endswith("/"):
                if not os.path.isdir(target):
                    bad.append((p, u, "目录不存在"))
                continue
            if not os.path.exists(target):
                if not target.endswith("aposd-project.zip"):
                    bad.append((p, u, "文件不存在"))
                continue
        else:
            target = p
        if frag and target.endswith(".html") and not re.match(r"^(ch|flag|type)=|^review$", frag):
            if target not in cache:
                cache[target] = ids_of(target)
            if frag not in cache[target]:
                bad.append((p, u, "锚点不存在"))

for p, u, why in bad:
    print(f"  {os.path.relpath(p, ROOT)}: {u}  （{why}）")
print(f"\n检查 {len(pages)} 个页面；外部链接域名：" + "、".join(f"{d}×{n}" for d, n in ext.most_common()))
print("全部通过" if not bad else f"{len(bad)} 处问题")
sys.exit(1 if bad else 0)
