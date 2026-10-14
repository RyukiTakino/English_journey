r"""Live2D 風モデルの、アイドル中の動き（操作なし）を連続で撮って、並べる。顔の形が時間で伸び縮みしないかを見る。

使い方:
    python tools/dev/idle_strip.py <出力 png> <モデル名> [<モデル名> ...] [--frames 10] [--interval 700] [--wind 1]
出力: 行＝モデル、列＝時間。あわせて、顔の中の目・鼻・口・あごの位置が時間でどれだけ動いたか（ずれ）を、数値でも表示する。
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
out = args.pop(0)
frames, interval, wind = 10, 700, 1.0
models = []
i = 0
while i < len(args):
    if args[i] == "--frames":
        frames = int(args[i + 1]); i += 2
    elif args[i] == "--interval":
        interval = int(args[i + 1]); i += 2
    elif args[i] == "--wind":
        wind = float(args[i + 1]); i += 2
    else:
        models.append(args[i]); i += 1

crop = (60, 380, 880, 1200)           # 顔と髪が入る範囲（画面 900x1200 の中）
k = 0.42
tw, th = int((crop[2] - crop[0]) * k), int((crop[3] - crop[1]) * k)
sheet = Image.new("RGB", (tw * frames, (th + 14) * len(models)), "white")
d = ImageDraw.Draw(sheet)
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel="chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    page = browser.new_page(viewport={"width": 900, "height": 1200})
    for r, model in enumerate(models):
        page.goto(f"http://localhost:8800/dev/rig-pose.html?model={model}&zoom=1.9&fy=0&wind={wind}")
        page.wait_for_function("window.__ready === true", timeout=20000)
        page.wait_for_timeout(1500)
        prev = None
        diffs = []
        for c in range(frames):
            page.screenshot(path="_idle_tmp.png")
            im = Image.open("_idle_tmp.png").convert("RGB").crop(crop)
            sheet.paste(im.resize((tw, th), Image.LANCZOS), (c * tw, r * (th + 14) + 14))
            d.text((c * tw + 3, r * (th + 14) + 1), f"{model} #{c}", fill=(0, 0, 0))
            a = np.asarray(im).astype(int)
            if prev is not None:
                diffs.append(float(np.abs(a - prev).mean()))
            prev = a
            page.wait_for_timeout(interval)
        print(model, "フレーム間の変化の平均:", [round(x, 2) for x in diffs])
    browser.close()
os.remove("_idle_tmp.png")
sheet.save(out)
print("saved", out)
