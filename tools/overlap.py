#!/usr/bin/env python3
"""与原书的英文长片段重合检查：python3 tools/overlap.py 文件… [--n 12] [--max-quotes 3]
实现在 ~/tutorials-deploy/scripts/overlap.py（所有伴读站共用），这里只是转调。每页允许几处引用按本书的规范改 MAX_QUOTES。"""
import os, runpy, sys
MAX_QUOTES = "2"
if "--max-quotes" not in sys.argv: sys.argv += ["--max-quotes", MAX_QUOTES]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.argv[1:] = [os.path.relpath(os.path.abspath(a), root) if os.path.exists(a) else a for a in sys.argv[1:]]
os.chdir(root)
runpy.run_path(os.path.expanduser("~/tutorials-deploy/scripts/overlap.py"), run_name="__main__")
