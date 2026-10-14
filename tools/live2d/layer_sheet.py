r"""層の一覧画像を作る（確認用）：各層を、市松模様の上に並べて 1 枚の画像にする。

使い方:
    python layer_sheet.py <絵のフォルダ> <出力する png> [列数]
"""
import os
import sys

from PIL import Image, ImageDraw

root, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
cell = 360
names = sorted(n[:-4] for n in os.listdir(os.path.join(root, "layers")) if n.endswith(".png"))
rows = (len(names) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell, rows * (cell + 16)), (200, 200, 200))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    im = Image.open(os.path.join(root, "layers", n + ".png")).convert("RGBA")
    box = im.getchannel("A").getbbox()
    if box:
        im = im.crop(box)
    im.thumbnail((cell - 8, cell - 8))
    # 市松模様の背景
    tile = Image.new("RGB", (cell - 8, cell - 8), (255, 255, 255))
    td = ImageDraw.Draw(tile)
    for yy in range(0, cell - 8, 16):
        for xx in range(0, cell - 8, 16):
            if (xx // 16 + yy // 16) % 2:
                td.rectangle([xx, yy, xx + 15, yy + 15], fill=(215, 215, 215))
    ox, oy = (i % cols) * cell + 4, (i // cols) * (cell + 16) + 4
    sheet.paste(tile, (ox, oy))
    sheet.paste(im, (ox + (cell - 8 - im.width) // 2, oy + (cell - 8 - im.height) // 2), im)
    d.text((ox, oy + cell - 6), f"{n}  {box[2]-box[0]}x{box[3]-box[1]}" if box else n, fill=(0, 0, 0))
sheet.save(out)
print(len(names), "layers ->", out)
