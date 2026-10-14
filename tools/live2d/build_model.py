r"""案内キャラクターのモデルを、層分け → 輪郭の整え → 書き出し → アプリへコピー、まで一括で行う。

使い方（どの Python でもよい。内部で、WineEngine の道具の Python を呼ぶ）:
    python tools/live2d/build_model.py [絵のフォルダ名 ...]
    例: python tools/live2d/build_model.py guide2 guide2_happy guide2_sad     （引数なしなら、この 3 つ）

流れ（D:\WineEngine\Tools\Live2D\Ituki の中の、絵のフォルダごと）:
    1. build_parts.py      … オブジェクトごとの層に分ける（顔・髪・体・目・スカーフのしっぽ・口）
    2. soften_alpha.py     … 髪・体の輪郭をなだらかにし、髪のすき間に残った白い背景を透明にする
    3. export_web.py       … 層を WebP にして、モデルの JSON を作る（Ituki/viewer/models/<名前>）
    4. アプリへコピー      … frontend/assets/characters/<名前>/（名前の "2" を除く: guide2 → guide）

前提: 絵のフォルダに base.png / shapes.json / rig.json / work/seg/masks が揃っている
      （作り方は docs/character-prompt.md と、D:\WineEngine\Tools\Live2D\README.md）。
"""
import os
import shutil
import subprocess
import sys

ITUKI = r"D:\WineEngine\Tools\Live2D\Ituki"
PY = r"D:\WineEngine\Tools\Live2D\Luka\.venv\Scripts\python.exe"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
APP_MODELS = os.path.join(REPO, "frontend", "assets", "characters")


def run(args, cwd):
    subprocess.run([PY, *args], cwd=cwd, check=True)


def main(names):
    for name in names:
        picture = os.path.join(ITUKI, name)
        print(f"=== {name}")
        run([os.path.join(HERE, "build_parts.py"), "."], picture)
        run([os.path.join(HERE, "soften_alpha.py"), picture], ITUKI)
        run([os.path.join(ITUKI, "tools", "export_web.py"), name], ITUKI)
        # アプリへ：名前の "2" を外す（guide2_happy → guide_happy）
        app_name = name.replace("guide2", "guide")
        src = os.path.join(ITUKI, "viewer", "models", name)
        dst = os.path.join(APP_MODELS, app_name)
        shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(src, dst)
        os.replace(os.path.join(dst, f"{name}.json"), os.path.join(dst, f"{app_name}.json"))
        print("  ->", dst)


if __name__ == "__main__":
    main(sys.argv[1:] or ["guide2", "guide2_happy", "guide2_sad"])
