r"""Live2D 風モデルの姿勢の確認：複数のモデル・姿勢で撮った顔のアップを、1 枚の画像（行＝モデル、列＝姿勢）に並べる。

使い方:
    python tools/dev/pose_sheet.py <出力 png> <モデル名> [<モデル名> ...] [--crop x0,y0,x1,y1] [--poses 名,名,...]
    例: python tools/dev/pose_sheet.py out.png guide guide2
モデルは frontend/assets/characters/<名前>/<名前>.json。dev/rig-pose.html を Playwright で開いて撮る。
前提: http://localhost:8800/ で frontend/ が配信されていること。
"""
import os
import sys

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

POSES = {
    "neutral": "", "blink": "eyeOpen:0", "squint": "eyeOpen:0.5",
    "yawL": "angleX:-30", "yawR": "angleX:30", "pitchUp": "angleY:-26", "pitchDn": "angleY:26",
    "tiltL": "angleZ:-18", "tiltR": "angleZ:18",
    "eyesL": "eyeBallX:-1", "eyesR": "eyeBallX:1", "eyesUp": "eyeBallY:1",
    "yawR+dn": "angleX:30,angleY:26,eyeBallX:1,eyeBallY:-1", "yawL+up": "angleX:-30,angleY:-26,eyeBallX:-1,eyeBallY:1",
    "smile": "mouthForm:1", "t1.7": "t", "t3.4": "t", "t5.1": "t",
}
TIMES = {"t1.7": 1.7, "t3.4": 3.4, "t5.1": 5.1}


def main():
    args = sys.argv[1:]
    out = args.pop(0)
    crop = (130, 480, 810, 1200)
    names = list(POSES)
    models = []
    i = 0
    while i < len(args):
        if args[i] == "--crop":
            crop = tuple(int(v) for v in args[i + 1].split(","))
            i += 2
        elif args[i] == "--poses":
            names = args[i + 1].split(",")
            i += 2
        else:
            models.append(args[i])
            i += 1
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    k = 0.5  # 縮小
    tw, th = int(cw * k), int(ch * k)
    sheet = Image.new("RGB", (tw * len(names), (th + 14) * len(models)), "white")
    d = ImageDraw.Draw(sheet)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        page = browser.new_page(viewport={"width": 900, "height": 1200})
        for r, model in enumerate(models):
            for c, name in enumerate(names):
                p = POSES[name]
                url = f"http://localhost:8800/dev/rig-pose.html?model={model}&zoom=2&fy=0&bg=%23f5f1e8"
                if p and name not in TIMES:
                    url += f"&p={p}"
                if name in TIMES:
                    url += f"&t={TIMES[name]}"
                page.goto(url)
                page.wait_for_function("window.__ready === true", timeout=20000)
                page.wait_for_timeout(1100)
                png = "_pose_tmp.png"
                page.screenshot(path=png)
                im = Image.open(png).convert("RGB").crop(crop).resize((tw, th), Image.LANCZOS)
                sheet.paste(im, (c * tw, r * (th + 14) + 14))
                d.text((c * tw + 3, r * (th + 14) + 1), f"{model}:{name}", fill=(0, 0, 0))
        browser.close()
    os.remove("_pose_tmp.png")
    sheet.save(out)
    print("saved", out, sheet.size)


if __name__ == "__main__":
    main()
