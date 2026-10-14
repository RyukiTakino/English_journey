r"""オブジェクトごとの層（パーツ）に分けて、Live2D 風リグの層を作る（build_generic.py の v2）。

使い方（D:\WineEngine\Tools\Live2D\Ituki の中の、絵のフォルダで実行）:
    ..\..\Luka\.venv\Scripts\python.exe D:\...\tools\live2d\build_parts.py <絵のフォルダ>

v1（build_generic.py）との違い:
    v1 は「顔の肌 + 髪」が 1 枚の層（hair）で、頭の近くほど頭に追従する量をなだらかに変えていた。
    そのため、首を回すと顔の中で追従量が場所ごとに違い、顔が伸び縮みして「水中のように」ゆがんで見えた。
    v2 は、次のようにオブジェクトごとに層を分ける。

        hair_back      頭のうしろの髪（顔や髪の下に隠れる部分を、髪の色で埋めたもの）
        body           首・肩・服・リュック（スカーフのしっぽと髪の下は、服の色で埋めてある）
        part_scarf_tail スカーフのしっぽ（結び目からぶら下がる布。振り子のように揺れる）
        hair_side_L/R  顔の横〜肩に垂れる髪（毛先ほど揺れる）
        face           顔の肌と耳（まばたき・視線の部品を抜いて、まぶたの肌を描いてある。頭と一緒に動く硬い層）
        mouth          口の線（笑ったときに口角が上がる。任意）
        eye_white / iris / eyeline / lash  目の部品（左右）
        strands_L/R    目の前を横切る髪の毛
        hair_front     前髪・頭頂の髪・顔の前を横切る髪（頭と一緒に動く）

    顔・目・前髪はすべて「頭の変形」を同じ強さで受けるので、顔だけが伸びたり、目がずれたりしない。

必要なもの（絵のフォルダの中）:
    base.png, shapes.json, rig.json, work/seg/masks/{figure,face,iris_L,iris_R,scarf_tail}.png
shapes.json の追加項目（v2）:
    "mouth_line": [[x,y],...]      口の線を囲む多角形（無ければ口は顔の層に含める）
    "tail_poly":  [[x,y],...]      スカーフのしっぽを囲む多角形（SAM の切り抜きの、はみ出しを切る）
    "tail_pivot": [x,y]            スカーフのしっぽが吊り下がる点（結び目）
    "front_grow": 34               顔のまわり何 px までの髪を「前髪（顔の前の髪）」にするか
    "top_y": 800                   これより上（頭頂）の髪は前髪の層にする
    "under_grow": 60               髪の下の体を、何 px 先まで服の色で埋めるか
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

TOOLS = r"D:\WineEngine\Tools\Live2D\Ituki\tools"
sys.path.insert(0, TOOLS)
import rigtools  # noqa: E402
from build_generic import border_background, hair_colours  # noqa: E402
from rigtools import Part, clean, inpaint, poly_mask, skin_lid, unmix_edges, unmix_white  # noqa: E402


def soft_alpha(mask):
    """くっきりした 0/1 のマスクを、縁だけ少しなだらかにした 0〜1 のアルファにする"""
    a = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 0.7)
    a[mask] = np.maximum(a[mask], 0.55)
    return a


def skin_fill(sheet_c, hole_mask, rgb):
    """まぶた（目の部品を抜いたあとの穴）を、まわりの「明るい肌色」だけから描く。
    v1 の skin_lid は、暗い髪の影や線の色も少し混ぜたので、目を細めたときに黒いシミが残った。
    ここでは、肌と言える色（明るい・彩度が低め・暖色）だけを材料にして、近いほど強く効くようにぼかして埋める。
    """
    f = rgb.astype(np.float32)
    lum = f @ np.float32([0.299, 0.587, 0.114])
    sat = f.max(axis=2) - f.min(axis=2)
    skin = (lum > 218) & (sat < 85) & ((f[..., 0] - f[..., 2]) > 12)   # 影の入った茶色っぽい肌は材料にしない
    # 線画（暗い線）のすぐそばは、アンチエイリアスで色が濁るので、材料にしない
    near_dark = ndimage.binary_dilation(lum < 150, iterations=3)
    hole = ndimage.binary_dilation(hole_mask, iterations=3)
    known = (skin & ~near_dark & ~hole).astype(np.float32)
    src = sheet_c.astype(np.float32) * known[..., None]
    # 大きいぼかし（遠くの肌の平均）から順に、小さいぼかし（近くの肌）を、材料が十分ある所だけ重ねる。
    # 重ね方は連続的なので、v1 のような「ブロック状のパッチ」にならない
    out = None
    for sigma in (96, 48, 24, 12, 6):
        num = cv2.GaussianBlur(src, (0, 0), sigma)
        den = cv2.GaussianBlur(known, (0, 0), sigma)
        fill = num / np.maximum(den, 1e-4)[..., None]
        if out is None:
            out = fill
        else:
            w = np.clip(den / 0.35, 0, 1)[..., None]
            out = out * (1 - w) + fill * w
    smooth = cv2.GaussianBlur(out, (0, 0), 4)
    # 明るい肌だけを材料にしたので、まわりの肌（頬の赤みなど）より少し明るくなりがち。穴のすぐ外の肌の平均に、明るさを合わせる
    inner = hole_mask & ~ndimage.binary_erosion(hole_mask, iterations=10)
    outer = ndimage.binary_dilation(hole_mask, iterations=16) & ~ndimage.binary_dilation(hole_mask, iterations=5) & (lum > 185) & ~near_dark
    if inner.any() and outer.any():
        delta = sheet_c[outer].astype(np.float32).mean(axis=0) - smooth[inner].mean(axis=0)
        smooth = smooth + delta * 0.85
    # 穴の外側へ、塗りの色を少しにじませる（境目の輪郭が見えないように）
    dist_out = ndimage.distance_transform_edt(~hole_mask)
    w = np.where(hole_mask, 1.0, np.clip(1 - dist_out / 9.0, 0, 1) * 0.75)[..., None]
    blended = sheet_c.astype(np.float32) * (1 - w) + smooth * w
    result = blended.clip(0, 255).astype(np.uint8)
    return result


def main(root):
    part = Part(root)
    S = json.load(open(os.path.join(root, "shapes.json"), encoding="utf-8"))
    rgb = np.array(Image.open(os.path.join(root, "base.png")).convert("RGB"))
    H, W = rgb.shape[:2]
    yy, xx = np.mgrid[:H, :W]
    f = rgb.astype(np.int16)
    r, b = f[..., 0], f[..., 2]
    lum = rgb.astype(np.float32) @ np.float32([0.299, 0.587, 0.114])
    fg, soft = unmix_white(rgb)

    # ---------------------------------------------------------------- 全体の輪郭（v1 と同じ）
    fig = part.load_mask("figure")
    if S.get("dress_poly"):
        fig |= poly_mask((H, W), S["dress_poly"])        # SAM が欠けた所（髪飾りなど）を手書きの多角形で補う
    bg = border_background(rgb) & ~ndimage.binary_erosion(fig, iterations=10)
    if S.get("dress_from"):
        bg &= ~(fig & (yy > S["dress_from"]))            # 絵の下端に接する服の色を、背景と間違えない
    for name in ("backpack", "scarf"):                # 全体の切り抜きで欠けた端（リュックの端など）を補う
        if os.path.exists(os.path.join(part.masks, f"{name}.png")):
            fig |= part.load_mask(name) & ~bg
    fig = ndimage.binary_closing(fig & ~bg, iterations=3)
    fig = ndimage.binary_fill_holes(clean(ndimage.binary_opening(fig, iterations=2), 20000))
    white_bg = np.median(rgb[bg], axis=0).min() > 235 if bg.any() else False

    chin_y = S.get("chin_y", 1262)                            # あごの下端。これより下は首（体の層）
    face_vis = clean(part.load_mask("face"), 500) & fig & (yy < chin_y)   # 見えている顔の肌
    head = poly_mask((H, W), S["head"]) & fig

    # リュックの紐やスカーフは、色が髪に近い（オレンジ・紺）ので、髪と間違えないように先に除く
    excl = np.zeros((H, W), bool)
    for name in ("backpack", "scarf"):
        if os.path.exists(os.path.join(part.masks, f"{name}.png")):
            excl |= part.load_mask(name)
    excl = ndimage.binary_dilation(excl, iterations=1)

    # ---------------------------------------------------------------- 髪の判定（色から。v1 と同じ）
    eyes_zone = np.zeros((H, W), bool)
    sides = [s for s in "LR" if S.get(f"eye_{s}")]
    for s in sides:
        eyes_zone |= ndimage.binary_dilation(poly_mask((H, W), S[f"eye_{s}"]), iterations=12)
    sample = head & ~ndimage.binary_dilation(face_vis, iterations=6) & ~eyes_zone & (lum > 30)
    lab, centers = hair_colours(rgb, sample)
    dist = np.min(np.linalg.norm(lab[:, :, None, :] - centers[None, None], axis=3), axis=2)
    hairish = fig & (dist < S.get("hair_tol", 22)) & ~face_vis & ~excl
    hair = ndimage.binary_closing(clean(hairish, 300, fill=False), iterations=3) & fig
    labs, _ = ndimage.label(hair)
    keep = np.unique(labs[head & (labs > 0)])
    hair = np.isin(labs, keep[keep > 0])                      # 頭につながっている髪だけ

    # ---------------------------------------------------------------- 目の部品（v1 と同じ処理を使う）
    hairish_for_eyes = hairish | (hair & (lum > 90))
    lid_fill, eye_info = rigtools.build_eyes(part, rgb, S, lum, hairish_for_eyes, r, b, xx, yy)
    # 「目の前を横切る髪」の層（strands）に混ざった、まつ毛の破片（髪の色ではない暗い灰色の点）を取り除く。
    # strands は瞬きしないので、破片が残ると、目を閉じたとき、まぶたの上に黒いシミとして残ってしまう
    for s in sides:
        path = os.path.join(part.out, f"strands_{s}.png")
        im = np.array(Image.open(path).convert("RGBA"))
        c = im[..., :3].astype(np.int16)
        hairlike = ((c[..., 0] - c[..., 2]) > 35) & (c.mean(axis=2) > 95)
        a = im[..., 3].astype(np.float32) / 255.0
        a[~hairlike] = 0
        keep = clean(a > 0.3, 25, fill=False)
        a[~keep] = 0
        im[..., 3] = (a * 255).astype(np.uint8)
        Image.fromarray(im).save(path)
    sheet_c = skin_fill(rgb.copy(), lid_fill, rgb)            # まぶたを、まわりの明るい肌の色だけで描く

    # ---------------------------------------------------------------- 顔の層（肌と耳）
    # 見えている肌 + まぶた + 耳（顔のまわりの、明るい肌色）を、少しだけ閉じた形を「顔の全体の形」にする。
    # 髪の毛が横切って欠けた所は埋まり、前髪の下に隠れた広い部分は、無理に作らない
    # （そこは後ろ髪の層が見える。髪が揺れて見えても、髪の裏側として自然）。
    skin_like = fig & (lum > 185) & ((r - b) > 20) & ~excl
    near = ndimage.binary_dilation(face_vis | lid_fill, iterations=S.get("ear_reach", 26))
    face_core = face_vis | lid_fill | (skin_like & near & (yy < chin_y))
    face_core = clean(face_core, 500)
    face_full = ndimage.binary_closing(face_core, iterations=S.get("face_close", 24))
    face_full = ndimage.binary_fill_holes(face_full) & fig & (yy < chin_y)
    face_bottom = int(np.nonzero(face_full.any(axis=1))[0].max())     # あごの y
    face_cx = float(np.nonzero(face_full)[1].mean())

    # 口の線を、別の層にする（任意）
    mouth_line = None
    if S.get("mouth_line"):
        M = ndimage.binary_dilation(poly_mask((H, W), S["mouth_line"]), iterations=3)
        line = clean(M & (lum < 200), 10, fill=False)
        line = ndimage.binary_dilation(line, iterations=2) & M & (lum < 245)
        mouth_line = line
        part.save("mouth", rgb, line)
        hole = ndimage.binary_dilation(line, iterations=2).astype(np.uint8) * 255
        sheet_c = cv2.inpaint(np.ascontiguousarray(sheet_c), hole, 6, cv2.INPAINT_TELEA)

    # 髪の下に隠れた肌を、いちばん近い見えている肌の色で描く（なだらかにぼかす）
    skin_known = (face_vis | lid_fill) & ~hair
    if mouth_line is not None:
        skin_known |= mouth_line
    face_rgb = inpaint(sheet_c, skin_known, face_full, 18)    # 隠れた部分は、強くぼかして境目を消す
    part.save("face", face_rgb, face_full)

    # ---------------------------------------------------------------- 髪（前髪・横髪・後ろ髪）
    hair_all = hair & ~lid_fill                                   # 目の上の髪は strands_* の層にある
    # 頭の多角形の中で、髪でも顔でもない所（髪飾り・耳のまわりの影）は、近くの髪の層に入れる。あごより下は体
    rest = head & ~hair & ~face_full & ~lid_fill & (yy < face_bottom - 6)
    hair_ext = hair_all | rest
    front_zone = (ndimage.binary_dilation(face_full, iterations=S.get("front_grow", 34)) & (yy < face_bottom)) | (head & (yy < S.get("top_y", 800)))
    hair_front = hair_ext & front_zone
    side = hair_ext & ~front_zone
    side_L, side_R = side & (xx < face_cx), side & (xx >= face_cx)

    def save_layer(name, mask):
        colour = rgb.copy()
        a = soft_alpha(mask)
        if white_bg:
            unmix_edges(a, colour, soft, fg)                      # 白い紙に溶けた縁の、白いふちを消す
        part.save(name, colour, a)

    # 前髪と横髪のつなぎ目に、細い重なり（のりしろ）を持たせる。動き方が少し違っても、継ぎ目に隙間が開かない
    overlap = ndimage.binary_dilation(side, iterations=S.get("seam", 22))
    side_L = (side | (hair_ext & overlap)) & (xx < face_cx)
    side_R = (side | (hair_ext & overlap)) & (xx >= face_cx)
    # 目のまわりの暗い線（まつ毛・目の線の取り残し）が前髪に入っていると、目を閉じたとき、まぶたの上に黒いシミとして残る。
    # 髪の色ではない暗い画素は、まばたきと一緒に動く「まつ毛」の層へ移す
    for s in sides:
        zone = ndimage.binary_dilation(poly_mask((H, W), S[f"lash_{s}"]) | poly_mask((H, W), S[f"eye_{s}"]), iterations=S.get("lash_reach", 16))
        dark_px = hair_front & zone & ((lum < 125) | (((r - b) < 40) & (lum < 160)))
        if not dark_px.any():
            continue
        hair_front &= ~dark_px
        side_L &= ~dark_px
        side_R &= ~dark_px
        lp = os.path.join(part.out, f"lash_{s}.png")
        im = np.array(Image.open(lp).convert("RGBA"))
        a = np.maximum(im[..., 3].astype(np.float32) / 255.0, soft_alpha(dark_px))
        im[..., :3][dark_px] = rgb[dark_px]
        im[..., 3] = (a * 255).astype(np.uint8)
        Image.fromarray(im).save(lp)
    save_layer("hair_front", hair_front)
    save_layer("hair_side_L", side_L)
    save_layer("hair_side_R", side_R)

    # 後ろ髪：顔や髪の下に隠れる部分（頭のまわり）を、近くの髪の色で埋めた「下敷き」。頭が動いたとき、すき間から見える
    back_zone = (head | ndimage.binary_dilation(face_full, iterations=30)) & fig & (yy < chin_y + 30)
    # 色は、髪の中央値を暗くした単色にする（近くの色を引き伸ばすと放射状の筋が出るため）。奥なので、少し暗くする
    tone = np.median(rgb[hair_ext & head], axis=0) * 0.78
    back_rgb = np.empty_like(rgb)
    back_rgb[:] = tone.clip(0, 255).astype(np.uint8)
    back_mask = back_zone & ~ndimage.binary_erosion(hair_ext, iterations=3)         # 髪の縁に少し重ねる
    part.save("hair_back", back_rgb, soft_alpha(back_mask))

    # ---------------------------------------------------------------- 体（首・肩・服・リュック）とスカーフのしっぽ
    sheet = hair_ext | face_full | lid_fill
    tail = None
    if (S.get("tail_poly") and os.path.exists(os.path.join(part.masks, "scarf_tail.png"))):
        t = part.load_mask("scarf_tail") & fig & poly_mask((H, W), S["tail_poly"])
        t = ndimage.binary_opening(t, iterations=2)
        lab_t, n = ndimage.label(t)
        if n > 1:
            sizes = ndimage.sum(t, lab_t, range(1, n + 1))
            t = np.isin(lab_t, 1 + np.flatnonzero(sizes >= sizes.max() * 0.15))
        tail = t
    body = fig & ~sheet
    body = clean(ndimage.binary_opening(body, iterations=2), 3000, fill=False)
    if tail is not None:
        body &= ~tail
    under = ndimage.binary_dilation(body, iterations=S.get("under_grow", 60)) & sheet
    src = body & ~ndimage.binary_dilation(sheet, iterations=5) & (lum > 60)
    if tail is not None:
        src &= ~ndimage.binary_dilation(tail, iterations=3)
    body_rgb = inpaint(rgb, src, under | (body & ~src), 6)
    body_rgb[body & (lum <= 60)] = rgb[body & (lum <= 60)]

    body_a = (body | under).astype(np.float32)
    if tail is not None:
        # しっぽの下は、体に近い細い帯だけを服の色で描く（揺れたときに見える所だけ）。遠い側は空気なので、透明のまま
        hole = ndimage.binary_dilation(tail, iterations=4) & (body | under | tail)
        body_rgb = cv2.inpaint(np.ascontiguousarray(body_rgb), hole.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
        core = (body | under) & ~ndimage.binary_dilation(tail, iterations=2)
        reach = ndimage.distance_transform_edt(~core)
        fade = np.clip(1 - (reach - 18) / 14, 0, 1)
        body_a = np.where(tail | hole, np.maximum(body_a, 1.0) * fade, body_a).astype(np.float32)
        tail_a = cv2.GaussianBlur(tail.astype(np.float32), (0, 0), 0.8)
        tail_a[tail] = np.maximum(tail_a[tail], 0.5)
        if white_bg:
            unmix_edges(tail_a, rgb.copy(), soft, fg)
        part.save("part_scarf_tail", rgb, tail_a)
    if white_bg:
        unmix_edges(body_a, body_rgb, soft, fg)
    part.save("body", body_rgb, body_a)

    # ---------------------------------------------------------------- rig.json
    cfg_path = os.path.join(root, "rig.json")
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    rig = cfg["rig"]
    rig["eyes"] = eye_info
    rig["eyeAxis"] = S["eye_axis_deg"]
    # 頭の回転の中心は、顔の真ん中に置く（v1 は額のあたりで、顔が不自然に伸びた）
    ys, xs = np.nonzero(face_full)
    rig["head"] = {**rig.get("head", {}), "x": round(float(xs.mean()), 1), "y": round(float((ys.min() + ys.max()) / 2), 1),
                   "r": round(float((ys.max() - ys.min()) * 0.62), 1)}
    rig["neck"] = {"x": round(float(xs.mean()) + 20, 1), "y": round(face_bottom + 90, 1)}
    # 髪の揺れの中心は顔の真ん中。顔に近い髪（r の 1.1 倍まで）は頭と一緒に動き、遠い髪（毛先）ほど風と慣性で揺れる
    hr = rig["head"]["r"]
    rig["hair"] = {"x": rig["head"]["x"], "y": rig["head"]["y"], "follow": [round(hr * 1.1), round(hr * 1.2)],
                   "flow": [round(hr * 1.3), round(hr * 2.6)], "amp": 9, "crownY": round(H * 0.25), "crownDist": round(hr * 1.7)}
    rig["ahoge"] = S.get("ahoge", rig.get("ahoge"))
    if tail is not None:
        ys_t, xs_t = np.nonzero(tail)
        pv = S.get("tail_pivot", [float(xs_t.mean()), float(ys_t.min())])
        length = float(np.max(np.hypot(xs_t - pv[0], ys_t - pv[1])))
        old = rig.get("parts", {}).get("scarf_tail", {})
        rig["parts"] = {"scarf_tail": {**{"amp": 5, "freq": 0.8}, **old, "pivot": pv, "len": round(length)}}
    if mouth_line is not None:
        ys_m, xs_m = np.nonzero(mouth_line)
        rig["mouth"] = {"cx": round(float(xs_m.mean()), 1), "half": round(float((xs_m.max() - xs_m.min()) / 2) + 6, 1),
                        "top": round(float(ys_m.mean()), 1), "curve": 0, "smile": 6}
    else:
        rig.pop("mouth", None)
    rig["cells"] = {"hair_front": 22, "hair_side_L": 26, "hair_side_R": 26, "hair_back": 40, "face": 16, "body": 44,
                    "part_scarf_tail": 18, "mouth": 6}
    eye_layers = [f"{n}_{s}" for s in sides for n in ("eye_white", "iris", "eyeline", "lash", "strands")]
    cfg["order"] = (["hair_back", "body"] + (["part_scarf_tail"] if tail is not None else []) + ["face"]
                    + (["mouth"] if mouth_line is not None else []) + eye_layers + ["hair_side_L", "hair_side_R", "hair_front"])
    json.dump(cfg, open(cfg_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(json.dumps(eye_info), "white background" if white_bg else "coloured background", "| face_bottom", face_bottom)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]))
