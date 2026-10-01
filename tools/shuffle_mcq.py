#!/usr/bin/env python3
"""把页面里 .mcq 选择题的选项按可复现的随机顺序重排，同步更新 data-answer、按钮上的字母前缀，
以及解析（.explain）里用字母指代选项的地方（"A、B 都是……"）。"C++""C 函数""C 风格"这类不是选项引用，跳过。
用法：python3 tools/shuffle_mcq.py 页面… [--dry]"""
import random, re, sys, hashlib

LET = "ABCDEF"
REF = re.compile(r"(?<![A-Za-z0-9_+\-#])([A-F])(?![A-Za-z0-9_+\-#])(?! ?(?:函数|风格|语言|标准库|代码|程序))")

def remap_text(html, mp):
    # 只改标签外的文字
    parts = re.split(r"(<[^>]+>)", html)
    return "".join(p if p.startswith("<") else REF.sub(lambda m: mp.get(m.group(1), m.group(1)), p) for p in parts)

def target_seq(n_questions, n_opts, seed):
    """均衡的目标答案位置：各位置出现次数接近，且同一位置不连续出现 3 次。"""
    rnd = random.Random(seed)
    while True:
        pool = [k % n_opts for k in range(n_questions)]
        rnd.shuffle(pool)
        if all(not (pool[i] == pool[i - 1] == pool[i - 2]) for i in range(2, len(pool))):
            return pool

def shuffle_block(m, seed, target):
    whole = m.group(0)
    ans = int(m.group(1))
    opts_m = re.search(r'(<div class="opts">)(.*?)(</div>)', whole, re.S)
    btns = re.findall(r"<button>(.*?)</button>", opts_m.group(2), re.S)
    n = len(btns)
    bodies = [re.sub(r"^\s*[A-F]\s*[.．、]\s*", "", b) for b in btns]
    rnd = random.Random(seed)
    target = min(target, n - 1)
    others = [k for k in range(n) if k != ans]
    rnd.shuffle(others)
    perm = others[:target] + [ans] + others[target:]   # perm[new] = old，正确答案落在 target
    new_btns = "".join(f"<button>{LET[k]}. {bodies[old]}</button>" for k, old in enumerate(perm))
    mp = {LET[old]: LET[new] for new, old in enumerate(perm)}
    new_ans = perm.index(ans)
    out = whole.replace(opts_m.group(0), opts_m.group(1) + new_btns + opts_m.group(3), 1)
    out = re.sub(r'data-answer="\d"', f'data-answer="{new_ans}"', out, count=1)
    out = re.sub(r'(<div class="explain">)(.*?)(</div></div>)$', lambda e: e.group(1) + remap_text(e.group(2), mp) + e.group(3), out, flags=re.S)
    return out, new_ans

dry = "--dry" in sys.argv
for path in [a for a in sys.argv[1:] if not a.startswith("--")]:
    t = open(path, encoding="utf-8").read()
    seq = []
    blocks = re.findall(r'<div class="mcq" data-answer="\d">', t)
    targets = target_seq(len(blocks), 4, hashlib.md5(path.encode()).hexdigest())
    def rep(m):
        seed = hashlib.md5((path + str(len(seq))).encode()).hexdigest()
        out, a = shuffle_block(m, seed, targets[len(seq)])
        seq.append(LET[a])
        return out
    t2 = re.sub(r'<div class="mcq" data-answer="(\d)">.*?<div class="explain">.*?</div></div>', rep, t, flags=re.S)
    print(f"{path}: {''.join(seq)}")
    if not dry:
        open(path, "w", encoding="utf-8").write(t2)
