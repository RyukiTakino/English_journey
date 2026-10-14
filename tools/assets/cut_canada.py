r"""canada.png（国のカードとスタンプが 1 枚に入った画像）から、2 つを切り出す。

使い方: python tools/assets/cut_canada.py [元の画像]
出力: frontend/assets/images/cards/card-canada.png（カード）、frontend/assets/images/stamps/stamp-canada.png（スタンプ）

元の画像は、にじんだ光（半透明）が絵のまわりに付いているので、ほぼ不透明な画素（alpha が高い所）だけを「本体」として切り出す。
カードは角丸の外側を透明に、スタンプは丸の外側を透明にする。
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\YutoImata\Downloads\web-ui-asstes\canada.png"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "assets", "images")


def largest(mask):
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return lab == (1 + int(np.argmax(sizes)))


def cut(im, region, solid=250):
    x0, y0, x1, y1 = region
    arr = np.array(im)
    a = arr[..., 3].astype(np.float32)
    box = np.zeros(a.shape, bool)
    box[y0:y1, x0:x1] = True
    body = largest((a >= solid) & box)
    body = ndimage.binary_fill_holes(ndimage.binary_closing(body, iterations=3))
    # 縁をなめらかにする（1px ぶん内側に寄せてから、ぼかす）
    body = ndimage.binary_erosion(body, iterations=1)
    soft = ndimage.gaussian_filter(body.astype(np.float32), 0.9)
    arr[..., 3] = (soft * 255).clip(0, 255).astype(np.uint8)
    ys, xs = np.nonzero(body)
    return Image.fromarray(arr).crop((xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3))


im = Image.open(SRC).convert("RGBA")
card = cut(im, (40, 40, 830, 1010))
# カードの縁は、にじんだ光のせいで少し波打つので、角丸の長方形でなめらかに切り直す
from PIL import ImageDraw
_m = Image.new("L", (card.width * 4, card.height * 4), 0)
ImageDraw.Draw(_m).rounded_rectangle([0, 0, _m.width - 1, _m.height - 1], radius=int(min(card.size) * 0.09 * 4), fill=255)
card.putalpha(_m.resize(card.size, Image.LANCZOS))
stamp = cut(im, (840, 120, 1536, 900))
# 画面で使う大きさ（国のカードは幅 240 前後、スタンプは 190）の 2 倍に縮小
card.thumbnail((520, 700), Image.LANCZOS)
stamp.thumbnail((380, 380), Image.LANCZOS)
os.makedirs(os.path.join(OUT, "cards"), exist_ok=True)
os.makedirs(os.path.join(OUT, "stamps"), exist_ok=True)
card.save(os.path.join(OUT, "cards", "card-canada.png"), optimize=True)
stamp.save(os.path.join(OUT, "stamps", "stamp-canada.png"), optimize=True)
print("card", card.size, "stamp", stamp.size)
