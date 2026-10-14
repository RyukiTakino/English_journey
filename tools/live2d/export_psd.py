r"""Live2D 風モデルの層を、PSD（Photoshop / Clip Studio / Krita / Live2D Cubism で開ける）に書き出す。

使い方:
    D:\WineEngine\Scratch\psdvenv\Scripts\python.exe tools/live2d/export_psd.py <絵のフォルダ> <出力する .psd>
    例: ...\python.exe tools/live2d/export_psd.py D:\WineEngine\Tools\Live2D\Ituki\guide2 source-art/characters/guide_neutral.psd

    psd-tools が要る（D:\WineEngine\Scratch\psdvenv に入れてある。作り直すときは: python -m venv psdvenv; psdvenv\Scripts\pip install psd-tools）。

中身:
    ・<絵のフォルダ>/layers/*.png の各層を、元の位置のまま、1 つのレイヤーにする（透明の余白は切り詰めて、容量を減らす）
    ・重ね順は rig.json の "order"（奥 → 手前）のとおり
    ・フォルダ（グループ）で、オブジェクトごとにまとめる:
        Hair_Back / Body（体・スカーフのしっぽ）/ Face（顔・口・Eye_L・Eye_R）/ Hair_Front（横髪・前髪）
    ・レイヤー名は「リグで使う名前 (英語の説明)」。グループ名も英語（PSD の旧形式の名前が日本語を書けないため）
"""
import json
import os
import sys

from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer

# 層の名前 → 英語の説明。
# PSD の旧形式のレイヤー名（Mac Roman）は日本語を書けず、保存に失敗するので、レイヤー名・グループ名は英語（ASCII）にする。
# 日本語の説明は source-art/README.md に書く。
LABEL = {
    "hair_back": "back hair fill", "body": "neck, shoulders, clothes, backpack", "part_scarf_tail": "scarf tails (swings)",
    "face": "face skin and ears", "mouth": "mouth line", "hair_side_L": "side hair left", "hair_side_R": "side hair right",
    "hair_front": "bangs and crown",
    "eye_white_L": "eye white L", "iris_L": "iris L", "eyeline_L": "eye outline L", "lash_L": "lashes L", "strands_L": "hair over eye L",
    "eye_white_R": "eye white R", "iris_R": "iris R", "eyeline_R": "eye outline R", "lash_R": "lashes R", "strands_R": "hair over eye R",
}
# グループ → 含む層（グループ内の順は、奥 → 手前）
GROUPS = [
    ("Hair_Back", ["hair_back"]),
    ("Body", ["body", "part_scarf_tail"]),
    ("Face", ["face", "mouth", "@eye_L", "@eye_R"]),
    ("Hair_Front", ["hair_side_L", "hair_side_R", "hair_front"]),
]
EYES = {"@eye_L": ("Eye_L", ["eye_white_L", "iris_L", "eyeline_L", "lash_L", "strands_L"]),
        "@eye_R": ("Eye_R", ["eye_white_R", "iris_R", "eyeline_R", "lash_R", "strands_R"])}


def main(root, out):
    cfg = json.load(open(os.path.join(root, "rig.json"), encoding="utf-8"))
    present = set(cfg["order"])
    base = Image.open(os.path.join(root, "base.png"))
    psd = PSDImage.new("RGB", base.size)
    made = {}

    def add(name):
        im = Image.open(os.path.join(root, "layers", name + ".png")).convert("RGBA")
        box = im.getchannel("A").getbbox()
        if not box:
            return None
        layer = PixelLayer.frompil(im.crop(box), psd, name=f"{name} ({LABEL.get(name, '')})", top=box[1], left=box[0])
        psd.append(layer)
        made[name] = layer
        return layer

    # 奥 → 手前の順に、すべての層を作る
    for g_name, members in GROUPS:
        for m in members:
            for n in (EYES[m][1] if m in EYES else [m]):
                if n in present:
                    add(n)
    # グループにまとめる（目の左右 → 顔 → ほか）
    groups = []
    for g_name, members in GROUPS:
        children = []
        for m in members:
            if m in EYES:
                eye_layers = [made[n] for n in EYES[m][1] if n in made]
                if eye_layers:
                    children.append(psd.create_group(layer_list=eye_layers, name=EYES[m][0]))
            elif m in made:
                children.append(made[m])
        groups.append((g_name, children))
    for g_name, children in groups:
        if len(children) > 1 or g_name != "Hair_Back":
            psd.create_group(layer_list=children, name=g_name)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    psd.save(out)
    print("saved", out, f"{os.path.getsize(out) / 1e6:.1f} MB", "layers:", len(made))

    # 読み戻して、重ねた結果が、層をそのまま重ねたものと同じか確認する
    # （composite(force=True) は、PSD に保存された重ね済みの画像ではなく、レイヤーから重ね直す）
    back = Image.new("RGBA", base.size, (255, 255, 255, 255))
    back.alpha_composite(PSDImage.open(out).composite(force=True).convert("RGBA"))
    back = back.convert("RGB")
    ref = Image.new("RGBA", base.size, (255, 255, 255, 255))
    for n in cfg["order"]:
        ref.alpha_composite(Image.open(os.path.join(root, "layers", n + ".png")).convert("RGBA"))
    import numpy as np
    d = np.abs(np.asarray(back).astype(int) - np.asarray(ref.convert("RGB")).astype(int))
    print("読み戻し確認: 平均の差", round(float(d.mean()), 3), "| 差が 8 を超える画素", int((d.max(axis=2) > 8).sum()))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
