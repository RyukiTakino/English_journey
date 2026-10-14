r"""層を、定義した重ね順に（変形なしで）重ねて、元の絵と比べる（確認用）。

使い方:
    python compose_check.py <絵のフォルダ> <出力フォルダ>
出力:
    composite.png … 重ねた結果（白い背景の上）
    diff.png      … 元の絵との差（明るいほど違う）。層の欠け・余り・色のずれを探す
    横に並べた比較（compare.png）も作る
"""
import json
import os
import sys

import numpy as np
from PIL import Image

root, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
cfg = json.load(open(os.path.join(root, "rig.json"), encoding="utf-8"))
base = Image.open(os.path.join(root, "base.png")).convert("RGB")
canvas = Image.new("RGBA", base.size, (255, 255, 255, 255))
for name in cfg["order"]:
    layer = Image.open(os.path.join(root, "layers", name + ".png")).convert("RGBA")
    canvas.alpha_composite(layer)
comp = canvas.convert("RGB")
comp.save(os.path.join(out, "composite.png"))
diff = np.abs(np.asarray(comp).astype(int) - np.asarray(base).astype(int)).max(axis=2)
Image.fromarray(np.clip(diff * 3, 0, 255).astype(np.uint8)).save(os.path.join(out, "diff.png"))
w, h = base.size
s = 0.45
pair = Image.new("RGB", (int(w * s) * 3, int(h * s)), "white")
for i, im in enumerate((base, comp, Image.open(os.path.join(out, "diff.png")).convert("RGB"))):
    pair.paste(im.resize((int(w * s), int(h * s))), (i * int(w * s), 0))
pair.save(os.path.join(out, "compare.png"))
print("mean diff", round(float(diff.mean()), 2), "| pixels with diff>40:", int((diff > 40).sum()))
