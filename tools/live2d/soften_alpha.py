r"""Live2D 風リグの層（layers/*.png）の輪郭をなだらかにする。

使い方（build_layers.py のあと、export_web.py の前に実行する）:
    python soften_alpha.py <絵のフォルダ> [--sigma 1.1]
    例: D:\WineEngine\Tools\Live2D\Luka\.venv\Scripts\python.exe soften_alpha.py D:\WineEngine\Tools\Live2D\Ituki\guide

なぜ必要か:
    切り抜きの輪郭は 0 か 1 かのくっきりした境目になりやすく、画面に縮小して出すと、
    髪の先や服の縁が階段状（ギザギザ）に見える。透明度（アルファ）だけを少しぼかすと、なめらかに見える。

やること（髪・体・髪の房の層だけ。目・まつ毛などの細かい部品は触らない）:
    1. 透明な場所の色を、いちばん近い不透明な色で塗りつぶす
       （ぼかしたときに、境目に白や黒のふちが出ないようにするため）
    2. アルファだけをガウスぼかしする
    ほかに、髪の房のあいだに取り残された白い背景（ほぼ真っ白な領域）を透明にする。
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage

# これ以上明るい（R・G・B すべてが WHITE_MIN 以上の）ピクセルは、背景の白の取り残しとして消す
WHITE_MIN = 240

# 輪郭をなだらかにする層。名前が前方一致したものだけ
TARGETS = ("hair", "body", "strands_")


def soften(path: str, sigma: float) -> None:
    im = np.array(Image.open(path).convert("RGBA"))
    alpha = im[..., 3].astype(np.float32) / 255.0
    # 髪の房のあいだなどに取り残された、元の白い背景を透明にする。
    # 髪・服・スカーフには真っ白な色が無いので、3色とも WHITE_MIN 以上のものは背景とみなして消す
    alpha[im[..., :3].min(axis=2) >= WHITE_MIN] = 0.0
    solid = alpha > 0.5
    if not solid.any():
        return
    # 透明な場所の色を、最も近い不透明なピクセルの色で埋める（distance_transform_edt が最近傍の位置を返す）
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    rgb = im[..., :3][iy, ix]
    # アルファだけをぼかす。もとの不透明な内側は 1 のままなので、縁だけがなだらかになる
    soft = ndimage.gaussian_filter(alpha, sigma)
    # もとが透明だったところは、ぼかしが外へ広がりすぎないよう少し弱める（縁が太って見えるのを防ぐ）
    soft = np.where(alpha > 0, soft, soft * 0.85)
    out = np.dstack([rgb, np.clip(soft * 255, 0, 255).astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(path, optimize=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("picture_dir")
    ap.add_argument("--sigma", type=float, default=1.1)
    args = ap.parse_args()
    layers = os.path.join(args.picture_dir, "layers")
    for name in sorted(os.listdir(layers)):
        if name.endswith(".png") and name.startswith(TARGETS):
            soften(os.path.join(layers, name), args.sigma)
            print("softened", name)


if __name__ == "__main__":
    main()
