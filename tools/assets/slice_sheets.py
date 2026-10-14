# -*- coding: utf-8 -*-
"""
UIスプライトシート2枚から、個別の透過PNGを切り出すスクリプト。

使い方:
    python slice_sheets.py [--src <シートのあるフォルダ>] [--out <出力フォルダ>]

- シート1 (クリーンな白背景): box内で外周に連結した白背景を塗りつぶしで判定 -> 前景マスク -> 透過PNG
- シート2 (にじんだ色背景)  : 角丸矩形のエッジ検出 + 角丸マスク、グリフは色差分で抽出

座標は元画像(1536x1024)のピクセル座標 (x0, y0, x1, y1)。
出力した全ファイルは manifest.json にも記録される(README作成用)。
"""
import argparse
import json
import os

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC_DIR = r"C:\Users\YutoImata\Downloads\web-ui-asstes"
OUT_DIR = r"C:\Users\YutoImata\Desktop\Web_github\English_journey\frontend\assets\images"
SHEET1 = "ff7b5dd0-8fb1-4821-843b-04df6eacaadd.png"
SHEET2 = "a_clean_flat_soft_shaded_illustrated_ui_asset_she.png"
PAD = 4  # 切り出し後の余白(px)

manifest = []  # 出力したファイルの記録 (README生成用)


# ---------------------------------------------------------------- 共通処理
def load_rgb(path):
    return np.array(Image.open(path).convert("RGB"))


def finalize(rgb, alpha_f):
    """
    境界の白縁(フリンジ)を消すため、マスク境界の色は内側(1px侵食した領域)の最近傍色で置き換える。
    """
    hard = alpha_f > 0.5
    core = cv2.erode(hard.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    if core.sum() < 10:
        core = hard
    idx = ndi.distance_transform_edt(~core, return_distances=False, return_indices=True)
    near = rgb[idx[0], idx[1]]
    out = rgb.copy()
    out[~core] = near[~core]
    return out


def trim_pad(rgba, pad=PAD):
    a = rgba[..., 3]
    ys, xs = np.where(a > 8)
    if len(ys) == 0:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    c = rgba[y0:y1, x0:x1]
    return np.pad(c, ((pad, pad), (pad, pad), (0, 0)))


def save(rgba, folder, name, sheet, desc, note="", upscale=1):
    im = Image.fromarray(rgba, "RGBA")
    if upscale != 1:
        im = im.resize((im.width * upscale, im.height * upscale), Image.LANCZOS)
        note = (note + " " if note else "") + "Lanczos %dx拡大済み" % upscale
    d = os.path.join(OUT_DIR, folder)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name + ".png")
    im.save(p, optimize=True)
    manifest.append(dict(path="%s/%s.png" % (folder, name), w=im.width, h=im.height,
                         desc=desc, sheet=sheet, note=note))
    return p


def soft_alpha(mask):
    """二値マスク -> 境界を少しぼかしたアルファ(0..1)"""
    return np.clip(cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 0.6), 0, 1)


# ---------------------------------------------------------------- シート1: 白背景からの抽出
def is_orange(a):
    """強いオレンジ(鳥の足など)かどうか"""
    a = a.astype(int)
    return (a[..., 0] > 190) & (a[..., 1] < 150) & (a[..., 2] < 100) & (a[..., 0] - a[..., 2] > 110)


def extract_clean(img, box, T=9, merge=3, keep="largest", excl=(), holes=False, keep_orange=False, open_px=0):
    """
    box内の前景マスクを作る。
    - 白(253前後)との差 d=255-min(RGB) が T 以下で、box外周に連結している領域を背景とする
    - 前景のうち、merge px 膨張で連結した成分の最大のものだけを残す(隣のアイテムの混入防止)
    - excl: 隣接アイテムと接触している場合に白で塗りつぶす矩形
    - holes=True: 内部に孤立した白い穴(荷札の紐穴など)も透明にする
    """
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1].copy()
    for (ex0, ey0, ex1, ey1) in excl:
        sl = (slice(max(ey0 - y0, 0), max(ey1 - y0, 0)), slice(max(ex0 - x0, 0), max(ex1 - x0, 0)))
        blk = sub[sl]
        if keep_orange:
            keep_m = is_orange(blk)
            blk[~keep_m] = 255  # オレンジ(鳥の足)だけ残し、隣のアイコンの輪郭は消す
        else:
            blk[...] = 255
    d = 255 - sub.min(axis=2).astype(int)
    fg_raw = d > T
    lab, n = ndi.label(~fg_raw)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    if holes:
        l2, n2 = ndi.label(~fg_raw & fg)
        for i in range(1, n2 + 1):
            if (l2 == i).sum() >= 30:
                fg[l2 == i] = False
    if open_px:
        # 細い突起(隣接物とのつなぎ目など)を取り除く: モルフォロジーのオープニング
        ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_px, open_px))
        fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, ker).astype(bool)
    if keep == "largest":
        k = max(1, merge)
        dil = cv2.dilate(fg.astype(np.uint8), np.ones((2 * k + 1, 2 * k + 1), np.uint8))
        l3, n3 = ndi.label(dil)
        if n3 == 0:
            return sub, fg
        sizes = ndi.sum(fg, l3, range(1, n3 + 1))
        fg = fg & (l3 == (np.argmax(sizes) + 1))
        # 選んだ塊の中でも、面積の小さいゴミ(飛び散った点)は取り除く
        l4, n4 = ndi.label(fg)
        if n4 > 1:
            sz = ndi.sum(fg, l4, range(1, n4 + 1))
            for i, v in enumerate(sz):
                if v < 40:
                    fg[l4 == i + 1] = False
    if not holes:
        fg = ndi.binary_fill_holes(fg)  # 白ハイライトなどの小さな穴は前景として埋める
    return sub, fg


def to_rgba(sub, fg):
    a = soft_alpha(fg)
    rgb = finalize(sub, a)
    return np.dstack([rgb, (a * 255).astype(np.uint8)])


ALT = {}  # 補正済みシート画像 (key -> ndarray)


def cut1(img, folder, name, box, desc, note="", upscale=1, alt=None, **kw):
    if alt:
        img = ALT[alt]
    sub, fg = extract_clean(img, box, **kw)
    rgba = trim_pad(to_rgba(sub, fg))
    if rgba is None:
        print("EMPTY", name)
        return None
    save(rgba, folder, name, 1, desc, note, upscale)
    return rgba


# ---------------------------------------------------------------- アイテム定義 (シート1)
S1 = []


def add(folder, name, box, desc, **kw):
    S1.append((folder, name, box, desc, kw))


# --- マスコット(丸い鳥)
add("mascot", "bird-wave", (595, 12, 728, 140), "立ち姿で手を振る鳥")
add("mascot", "bird-cheer", (738, 8, 885, 135), "羽を広げて飛び跳ねる鳥(喜び)", merge=2)
add("mascot", "bird-think", (878, 4, 1005, 140), "頭に手を当て電球を思いつく鳥", merge=14)
add("mascot", "bird-chin", (598, 143, 712, 277), "羽をあごに当てて考える鳥", excl=[(708, 120, 770, 196)], merge=1)
add("mascot", "bird-happy", (728, 140, 868, 250), "目を閉じて笑う鳥", merge=3)
add("mascot", "bird-read", (898, 138, 1025, 255), "本を読む鳥")
add("mascot", "bird-listen", (750, 222, 925, 345), "ヘッドホンで飛ぶ鳥(足は隣のアイコンに接触していたため端を一部補正)",
    excl=[(750, 330, 829, 420), (845, 330, 925, 420)], keep_orange=True)
add("mascot", "bird-sleep", (940, 278, 1055, 392), "座って眠る鳥", merge=1)
add("effects", "lightbulb", (708, 124, 766, 192), "光る電球(鳥と一緒に使う装飾)", merge=6, excl=[(748, 176, 770, 196)])

# --- バナー
add("banners", "banner-sky-plane", (1034, 10, 1530, 102), "空と飛行機のバナー")
add("banners", "banner-world-map", (1034, 103, 1530, 294), "ルート付き世界地図バナー")
add("banners", "banner-skyline-1", (1066, 293, 1530, 400), "街並みスカイラインのバナー(1)")
add("banners", "banner-skyline-2", (1066, 401, 1530, 500), "街並みスカイラインのバナー(2・ドーム)")

# --- ナビアイコン(角丸プレート付き)
nav = [("icon-home", 6, 92, "ホーム(紺プレート)"), ("icon-globe", 100, 186, "地球(クリームプレート)"),
       ("icon-map", 190, 276, "地図ピン"), ("icon-book", 280, 367, "開いた本(紺プレート)"),
       ("icon-headphones", 373, 461, "ヘッドホン"), ("icon-passport", 468, 555, "パスポート(紺プレート)"),
       ("icon-suitcase", 562, 650, "スーツケース"), ("icon-award", 657, 742, "受賞リボン(紺プレート)"),
       ("icon-chart", 750, 830, "棒グラフ"), ("icon-settings", 842, 924, "歯車")]
for nm, a, b, ds in nav:
    add("icons", nm, (a, 327, b, 411), ds, excl=[(740, 218, 940, 331)], alt="icons", open_px=9)

# --- 丸ボタン類
rnd = [("icon-play", 7, 76, "再生(オレンジ丸)"), ("icon-pause", 79, 148, "一時停止(紺丸)"),
       ("icon-stop", 151, 222, "停止(紺丸)"), ("icon-volume", 227, 293, "音量(紺丸)"),
       ("icon-mute", 295, 360, "ミュート(紺丸・×)"), ("icon-mute-alt", 360, 428, "ミュート(オレンジ・別デザイン)"),
       ("icon-music", 429, 498, "音符(紺丸)")]
for nm, a, b, ds in rnd:
    add("icons", nm, (a, 414, b, 486), ds)
add("ui", "switcher-arrows", (506, 414, 666, 486), "左右矢印のスイッチャー")
add("ui", "toggle-orange", (666, 414, 768, 486), "オレンジのトグルスイッチ(ON)")
add("icons", "icon-hint", (772, 408, 846, 486), "ヒント(電球の吹き出し)")
add("icons", "icon-alert", (847, 408, 917, 486), "注意(!の吹き出し)")
add("icons", "icon-correct", (918, 408, 988, 486), "正解(チェックの吹き出し)")
add("icons", "icon-wrong", (989, 405, 1062, 486), "不正解(×の吹き出し)")

# --- プログレス
add("ui", "progress-blue", (9, 488, 291, 528), "青いプログレスバー(約40%)")
add("ui", "progress-orange-knob", (299, 486, 551, 528), "ノブ付きオレンジのプログレスバー")
add("ui", "progress-orange-full", (9, 530, 291, 568), "オレンジの満タンバー")
add("ui", "progress-route", (557, 478, 925, 525), "飛行機のルート型ステップ進捗")
add("ui", "spinner", (988, 474, 1054, 536), "ローディングスピナー(ドット)")

# --- ピル
add("ui", "pill-stars-4", (298, 527, 436, 570), "星4つのレーティングピル(3つ点灯)")
add("ui", "pill-stars-3", (439, 527, 568, 570), "星3つのレーティングピル(2つ点灯)")
add("ui", "pill-heart", (571, 527, 661, 570), "ハートのピル")
add("ui", "pill-bookmark", (663, 527, 753, 570), "ブックマークのピル")
add("ui", "pill-menu", (755, 527, 844, 570), "メニュー(三本線)のピル")
add("ui", "pill-dots", (848, 527, 962, 570), "三点リーダーのピル")
add("ui", "bubble-chat", (967, 535, 1058, 590), "オレンジのチャットアイコン付き吹き出しピル")
add("ui", "panel-label-wide", (1068, 500, 1530, 598), "紺枠の横長ラベル2枚(写真つき・星つき)", merge=8)

# --- 国カード (カード全体。ピクチャのみ版は run_sheet1 で作る)
CARDS = [("uk", 11, 129, "イギリス(ビッグベン)"), ("france", 132, 261, "フランス(エッフェル塔)"),
         ("italy", 263, 392, "イタリア(コロッセオ)"), ("egypt", 394, 520, "エジプト(ピラミッドとスフィンクス)"),
         ("australia", 522, 645, "オーストラリア(オペラハウス)"), ("usa", 646, 764, "アメリカ(自由の女神)")]

# --- パスポート関連
add("passport", "passport-cover", (766, 572, 915, 767), "閉じた紺のパスポート")
add("effects", "star-small", (902, 593, 936, 632), "小さなオレンジの星", merge=1)
add("passport", "world-map-old", (912, 586, 1198, 790), "古い宝の地図風の世界地図", T=12, excl=[(900, 588, 937, 636), (1060, 580, 1200, 594)], merge=1)
add("passport", "passport-book-open", (1194, 597, 1524, 790), "スタンプ帳(見開き・スタンプ6個)", T=12, merge=1)
add("passport", "stamp-tool", (1418, 792, 1522, 898), "赤いゴム印ツール")

# --- バッジ
bd = [("badge-globe", 10, 124, "地球"), ("badge-suitcase", 127, 242, "スーツケース"),
      ("badge-camera", 243, 357, "カメラ"), ("badge-mountain", 357, 465, "山と太陽"),
      ("badge-map-pin", 466, 580, "地図ピン"), ("badge-crown", 583, 699, "王冠と月桂樹"),
      ("badge-books", 702, 817, "本と月桂樹"), ("badge-wheel", 819, 935, "船の舵輪")]
for nm, a, b, ds in bd:
    add("badges", nm, (a, 770, b, 887), "実績バッジ: " + ds, merge=3)

# --- エフェクト・チケット
STAR_BIG_EXCL = [(1084, 800, 1098, 820), (1110, 812, 1140, 830)]  # 星にくっついている紙吹雪を消す
add("effects", "star-big", (1066, 806, 1133, 880), "大きなオレンジの星", merge=1, excl=STAR_BIG_EXCL)
add("effects", "confetti", (938, 781, 1213, 888), "紙吹雪(大きな星を除く)", keep="all", excl=[(1120, 776, 1213, 792)], star_mask=True)
add("ui", "ticket-blank", (1210, 804, 1416, 894), "搭乗券(空白+飛行機スタブ)")

# --- 下段コンテナ
add("ui", "pinboard", (9, 878, 188, 1012), "コルクボード(飛行機のピン付き)")
add("cards", "card-photo-landscape", (188, 884, 359, 1012), "山の風景写真+地図ピン(フォトプレースホルダ)")
add("ui", "bubble-rect", (367, 888, 532, 1012), "四角い吹き出し(空白)")
add("ui", "bubble-cloud", (530, 888, 666, 1012), "雲形の吹き出し(空白)")
add("ui", "ribbon-orange", (668, 891, 840, 953), "オレンジのリボンバナー", merge=1)
add("ui", "ribbon-blue", (668, 945, 840, 1012), "青いリボンバナー", merge=1)
add("ui", "tag-luggage-1", (842, 888, 1016, 958), "荷札(上)", holes=True)
add("ui", "tag-luggage-2", (842, 946, 1022, 1016), "荷札(下)", holes=True)
add("ui", "envelope-airmail", (1287, 894, 1434, 1002), "航空便の封筒")
add("ui", "washi-orange", (1438, 900, 1522, 938), "マスキングテープ(オレンジ)")
add("ui", "washi-blue", (1438, 938, 1522, 972), "マスキングテープ(青)")
add("ui", "washi-yellow", (1438, 972, 1522, 1010), "マスキングテープ(黄)")


def make_alt_images(img):
    """鳥の足がアイコンのプレートに被っている部分(オレンジ)をインペイントで消した画像を作る"""
    m = is_orange(img)
    zone = np.zeros(m.shape, bool)
    zone[326:347, 750:925] = True
    m = (m & zone).astype(np.uint8)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    ALT["icons"] = cv2.inpaint(img, m, 3, cv2.INPAINT_TELEA)


def run_sheet1(img):
    make_alt_images(img)
    # 紙吹雪から大きな星を取り除くためのマスク
    sub, star_fg = extract_clean(img, (1066, 806, 1133, 880), merge=1, excl=STAR_BIG_EXCL)
    nostar = img.copy()
    big = np.zeros(img.shape[:2], bool)
    big[806:880, 1066:1133] = star_fg
    big = cv2.dilate(big.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    nostar[big] = 255
    ALT["nostar"] = nostar
    for folder, name, box, desc, kw in S1:
        kw = dict(kw)
        if kw.pop("star_mask", False):
            kw["alt"] = "nostar"
        cut1(img, folder, name, box, desc, **kw)
    # 国カード: 全体(星ストリップ付き) と ピクチャのみ
    for nm, a, b, ds in CARDS:
        sub, fg = extract_clean(img, (a, 570, b, 770), T=9, merge=4)
        rgba = to_rgba(sub, fg)
        hsv = cv2.cvtColor(sub, cv2.COLOR_RGB2HSV)
        ys, xs = np.where(fg)
        w = xs.max() - xs.min()
        c0, c1 = xs.min() + w // 6, xs.max() - w // 6
        sat = hsv[:, c0:c1, 1].mean(axis=1) / 255.0
        ysplit = ys.max()
        # 下端から上へ走査し、彩度が高くなる最初の行 = ピクチャ(水面)の下端
        for y in range(ys.max() - 25, ys.min(), -1):
            if sat[y] > 0.30:
                ysplit = y + 1
                break
        pic = rgba.copy()
        pic[ysplit:, :, 3] = 0
        save(trim_pad(pic), "cards", "card-" + nm, 1, "国カード(ピクチャのみ・星ストリップなし): " + ds,
             "下端は直線(角丸は上側のみ)")
        save(trim_pad(rgba), "cards", "card-%s-rating" % nm, 1, "国カード(星ストリップ付き): " + ds)


# ---------------------------------------------------------------- スタンプ(丸く切り抜き)
STAMP_NAMES = ["stamp-plane", "stamp-france", "stamp-italy", "stamp-pyramids", "stamp-australia", "stamp-usa"]
STAMP_DESC = ["青い飛行機", "赤いエッフェル塔", "青いコロッセオ", "黄色いピラミッド", "青いオペラハウス", "赤い自由の女神"]


STAMP_GUESS = [(1259, 665, 35), (1349, 653, 37), (1452, 654, 36),
               (1282, 733, 33), (1373, 729, 35), (1462, 728, 35)]


def find_stamps(img):
    """目視で決めた円の概算位置から、彩度の高いインクの輪の外接矩形で (cx, cy, r) を補正する"""
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    sat = (hsv[..., 1] > 80) & (hsv[..., 2] > 90)
    out = []
    for cx, cy, r in STAMP_GUESS:
        yy, xx = np.mgrid[:img.shape[0], :img.shape[1]]
        win = np.hypot(xx - cx, yy - cy) < r + 1
        m = sat & win
        ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        out.append(((x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0) / 2 + 1.5))
    return out


def cut_circle(img, cx, cy, r, folder, name, sheet, desc, note=""):
    r = int(round(r))
    x0, y0 = int(round(cx)) - r - 2, int(round(cy)) - r - 2
    sub = img[y0:y0 + 2 * r + 4, x0:x0 + 2 * r + 4].copy()
    yy, xx = np.mgrid[:sub.shape[0], :sub.shape[1]]
    dist = np.hypot(xx - (r + 2 - 0.5), yy - (r + 2 - 0.5))
    a = np.clip(r - dist + 0.5, 0, 1)
    rgba = trim_pad(np.dstack([sub, (a * 255).astype(np.uint8)]))
    save(rgba, folder, name, sheet, desc, note)


# ---------------------------------------------------------------- シート2: 角丸矩形での切り抜き
def refine_box(img, box, win=7):
    """各辺を、エッジ(勾配)が最大の位置へ ±win px で補正する"""
    x0, y0, x1, y1 = box
    g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
    gx = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    w, h = x1 - x0, y1 - y0
    mx0, mx1 = x0 + int(w * 0.25), x1 - int(w * 0.25)
    my0, my1 = y0 + int(h * 0.25), y1 - int(h * 0.25)

    def best(profile, c):
        lo = max(0, c - win)
        return lo + int(np.argmax(profile[lo:c + win + 1]))
    colp = gx[my0:my1].mean(axis=0)
    rowp = gy[:, mx0:mx1].mean(axis=1)
    return best(colp, x0), best(rowp, y0), best(colp, x1), best(rowp, y1)


def rounded_mask(h, w, r):
    s = 4
    m = np.zeros((h * s, w * s), np.uint8)
    cv2.rectangle(m, (r * s, 0), (w * s - 1 - r * s, h * s - 1), 255, -1)
    cv2.rectangle(m, (0, r * s), (w * s - 1, h * s - 1 - r * s), 255, -1)
    for cx, cy in [(r, r), (w - 1 - r, r), (r, h - 1 - r), (w - 1 - r, h - 1 - r)]:
        cv2.circle(m, (cx * s + 2, cy * s + 2), r * s + 1, 255, -1)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def cut2_rr(img, folder, name, box, radius, desc, note="", inset=1, refine=True, win=7):
    if refine:
        box = refine_box(img, box, win)
    x0, y0, x1, y1 = box
    x0 += inset; y0 += inset; x1 -= inset - 1; y1 -= inset - 1
    sub = img[y0:y1, x0:x1].copy()
    a = rounded_mask(y1 - y0, x1 - x0, radius)
    rgba = trim_pad(np.dstack([sub, (a * 255).astype(np.uint8)]))
    save(rgba, folder, name, 2, desc, note)
    return box


def cut2_circle(img, folder, name, box, desc, note="", inset=1):
    x0, y0, x1, y1 = refine_box(img, box)
    cut_circle(img, (x0 + x1) / 2, (y0 + y1) / 2, min(x1 - x0, y1 - y0) / 2 - inset, folder, name, 2, desc, note)


def cut2_glyph(img, folder, name, box, desc, note="", dthr=40, scale=1):
    """
    クリーム色ボタン上のグリフ(星/ハート/ブックマーク)を抜く。
    背景(ボタンのクリーム色)との色差からアルファを滑らかに計算し(アンミックス)、
    半透明の縁はグリフの代表色で塗る。scale倍にLanczos拡大してから処理するので縁が滑らか。
    """
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1]
    if scale != 1:
        sub = np.array(Image.fromarray(sub).resize((sub.shape[1] * scale, sub.shape[0] * scale), Image.LANCZOS))
    f = sub.astype(np.float32)
    ring = np.concatenate([f[:3].reshape(-1, 3), f[-3:].reshape(-1, 3),
                           f[:, :3].reshape(-1, 3), f[:, -3:].reshape(-1, 3)])
    bgc = np.median(ring, axis=0)
    dist = np.linalg.norm(f - bgc, axis=2)
    core = dist > dthr
    lab, n = ndi.label(cv2.dilate(core.astype(np.uint8), np.ones((3, 3), np.uint8)))
    if n == 0:
        return
    sizes = ndi.sum(core, lab, range(1, n + 1))
    keepm = ndi.binary_fill_holes(core & (lab == np.argmax(sizes) + 1))
    solid = dist[keepm & (dist > np.percentile(dist[keepm], 40))]
    dfull = float(np.median(solid))
    a = np.clip((dist - dthr * 0.25) / (dfull * 0.8 - dthr * 0.25), 0, 1)
    a = a * ndi.binary_dilation(keepm, iterations=2)
    gcol = np.median(f[keepm & (dist > dfull * 0.8)], axis=0)
    rgb = np.where((a > 0.97)[..., None], f, gcol[None, None, :]).astype(np.uint8)
    rgba = trim_pad(np.dstack([rgb, (a * 255).astype(np.uint8)]))
    save(rgba, folder, name, 2, desc, note)


def cut2_bubble(img, folder, name, box, radius, tail, desc, note=""):
    """
    吹き出し: 本体は角丸矩形(エッジ補正)、しっぽは目視で決めた三角形を合成する。
    tail = (左付け根のx, 右付け根のx, 先端のx, 先端のy)  (すべてシート座標。本体補正後のbottomに付け根が来る)
    """
    x0, y0, x1, y1 = refine_box(img, box)
    x0 += 1; y0 += 1; x1 -= 0; y1 -= 0
    tb0, tb1, tx, ty = tail
    pad = 4
    X0, Y0, X1, Y1 = x0 - pad, y0 - pad, x1 + pad, ty + pad
    s = 4
    m = np.zeros(((Y1 - Y0) * s, (X1 - X0) * s), np.uint8)
    body = (rounded_mask(y1 - y0, x1 - x0, radius) * 255).astype(np.uint8)
    body = cv2.resize(body, None, fx=s, fy=s, interpolation=cv2.INTER_LINEAR)
    m[(y0 - Y0) * s:(y0 - Y0) * s + body.shape[0], (x0 - X0) * s:(x0 - X0) * s + body.shape[1]] = body
    poly = np.array([[(tb0 - X0) * s, (y1 - Y0 - 3) * s], [(tx - X0) * s, (ty - Y0) * s],
                     [(tb1 - X0) * s, (y1 - Y0 - 3) * s]], np.int32)
    cv2.fillPoly(m, [poly], 255)
    a = cv2.resize(m, (X1 - X0, Y1 - Y0), interpolation=cv2.INTER_AREA)
    sub = img[Y0:Y1, X0:X1]
    rgba = trim_pad(np.dstack([sub, a]))
    save(rgba, folder, name, 2, desc, note)


def run_sheet2(img):
    # 角丸ボタン / ドロップダウン / 入力欄 (box, 角丸半径)
    rr = [
        ("ui", "btn-play-orange", (22, 162, 239, 269), 22, "オレンジの再生ボタン(角丸四角)"),
        ("ui", "btn-next-teal", (255, 162, 439, 269), 22, "ティールの右矢印ボタン(角丸四角)"),
        ("ui", "btn-back", (452, 164, 602, 267), 22, "クリーム色の戻る(左矢印)ボタン"),
        ("ui", "btn-star", (622, 164, 780, 268), 22, "星のボタン(クリーム)"),
        ("ui", "btn-heart", (802, 164, 961, 268), 22, "ハートのボタン(クリーム)"),
        ("ui", "btn-bookmark", (980, 164, 1131, 268), 22, "ブックマークのボタン(クリーム)"),
        ("ui", "btn-check", (1150, 162, 1322, 269), 22, "緑のチェックボタン"),
        ("ui", "btn-close", (1339, 162, 1513, 269), 22, "赤い×ボタン"),
        ("ui", "dropdown-globe-orange", (22, 297, 237, 367), 35, "地球アイコン付きオレンジのドロップダウン"),
        ("ui", "dropdown-bars-navy", (250, 297, 465, 367), 35, "棒グラフ付き紺のドロップダウン"),
        ("ui", "dropdown-calendar", (476, 297, 694, 367), 35, "カレンダー付きクリームのドロップダウン"),
        ("ui", "dropdown-list", (706, 297, 915, 367), 35, "リスト付きクリームのドロップダウン"),
        ("ui", "search-field", (956, 298, 1291, 366), 34, "虫眼鏡付き検索フィールド(空)"),
        ("ui", "btn-refresh", (1319, 295, 1513, 370), 20, "更新(リフレッシュ)ボタン(紺)"),
        ("ui", "level-sprout", (22, 402, 220, 472), 35, "レベルピル: 芽+星1"),
        ("ui", "level-two-stars", (237, 402, 440, 472), 35, "レベルピル: 星2(ティール)"),
        ("ui", "level-three-stars", (455, 402, 655, 472), 35, "レベルピル: 星3"),
    ]
    for folder, name, box, r, ds in rr:
        cut2_rr(img, folder, name, box, r, ds)
    cut2_rr(img, "icons", "icon-notes", (730, 14, 848, 135), 22, "ノート(付箋とブックマーク)アイコン(クリームのプレート)")
    # 切手: ギザギザの縁は背景との差が小さくきれいに切れないため、青い絵柄の矩形部分のみを使う
    cut2_rr(img, "passport", "postage-stamp-globe", (983, 521, 1110, 717), 1,
            "地球の切手(絵柄部分のみ・ギザギザの白縁なし)", "ギザギザ縁は背景との分離が難しく省略", inset=0)
    # 丸いトグル類
    cut2_circle(img, "icons", "icon-sound-on-round", (1146, 32, 1230, 117), "丸ボタン: スピーカーON(紺)")
    cut2_circle(img, "icons", "icon-music-on-round", (1242, 32, 1326, 117), "丸ボタン: 音符ON(クリーム)")
    cut2_circle(img, "icons", "icon-sound-off-round", (1338, 32, 1422, 117), "丸ボタン: スピーカーOFF(ティール)")
    cut2_circle(img, "icons", "icon-music-off", (1436, 32, 1519, 117), "丸ボタン: 音符OFF(クリーム・×)")
    # グリフ
    cut2_glyph(img, "icons", "icon-star", (662, 180, 738, 252), "オレンジの星(単体グリフ)", "元が小さいためLanczos 2x拡大済み", scale=2)
    cut2_glyph(img, "icons", "icon-heart", (844, 184, 922, 252), "オレンジのハート(単体グリフ)", "元が小さいためLanczos 2x拡大済み", scale=2)
    cut2_glyph(img, "icons", "icon-bookmark", (1025, 182, 1086, 252), "黄色のブックマーク(単体グリフ)", "元が小さいためLanczos 2x拡大済み", scale=2)
    # 吹き出し(しっぽ付き)
    bub = [("bubble-hint", (399, 897, 547, 983), (422, 447, 420, 1001), "ヒント(電球)入り吹き出し"),
           ("bubble-alert", (567, 898, 737, 985), (590, 615, 588, 1001), "注意(!)入り吹き出し"),
           ("bubble-correct", (759, 898, 925, 985), (782, 807, 780, 1001), "正解(チェック)入り吹き出し"),
           ("bubble-wrong", (945, 898, 1108, 985), (968, 993, 966, 1001), "不正解(×)入り吹き出し")]
    for nm, box, tail, ds in bub:
        cut2_bubble(img, "ui", nm, box, 24, tail, ds)


def write_manifest():
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


SKIPPED = [
    "シート1 左上の少女バスト3種(通常/笑顔/悲しみ): Live2D側で処理済みのため対象外",
    "シート2のホーム/地図/本/ヘッドホン/パスポート/賞/歯車アイコン、国カード、バッジ、スタンプ帳、ルート進捗、スピナー、チケット: シート1(白背景)の方が高品質なため不使用",
    "シート2の小鳥の頭+空白吹き出し: 鳥の輪郭が背景のにじみと混ざり、きれいに切れないため省略",
    "シート2の切手のギザギザ縁(perforation): 縁と背景の色差が小さく分離できないため、青い絵柄部分のみ(postage-stamp-globe)",
    "シート2の空白吹き出し(クリーム・しっぽ付き)と三点リーダー吹き出し: 輪郭がほぼ背景に溶けるため省略(シート1のbubble-rect/pill-dotsを使用)",
    "シート1のルート進捗右端にある小さな丸パーツ(リング+矢印風): 意味が不明な断片のため省略",
    "国カード下部の3つ星ストリップ単体(ui/stars-*.png): 星レーティングは pill-stars-3/4 と card-*-rating.png で代替できるため単体では出力していない",
]


def write_readme():
    groups = {}
    for m in manifest:
        groups.setdefault(m["path"].split("/")[0], []).append(m)
    order = ["mascot", "banners", "icons", "ui", "cards", "passport", "stamps", "badges", "effects"]
    names = {"mascot": "マスコット(鳥)", "banners": "バナー", "icons": "アイコン・丸ボタン", "ui": "UI部品",
             "cards": "カード", "passport": "パスポート・地図", "stamps": "スタンプ", "badges": "バッジ", "effects": "エフェクト"}
    L = ["# 画像アセット一覧", "",
         "`tools/assets/slice_sheets.py` でUIスプライトシート2枚から自動切り出しした透過PNGです。",
         "再生成は `python tools/assets/slice_sheets.py` (Pillow / numpy / scipy / opencv が必要)。", "",
         "- シート1: `ff7b5dd0-...png` (白背景・メイン) / シート2: `a_clean_flat_soft_shaded_...png` (にじんだ色背景)",
         "- 全ファイル 4px の透明余白付き。元解像度のまま(基本 1x 以下で使用してください。拡大するとぼやけます)。",
         "- `manifest.json` に同じ内容を機械可読で出力しています。", "",
         "## ファイル数", "", "| フォルダ | 枚数 |", "|---|---|"]
    for g in order:
        if g in groups:
            L.append("| %s/ | %d |" % (g, len(groups[g])))
    L.append("| 合計 | %d |" % len(manifest))
    for g in order:
        if g not in groups:
            continue
        L += ["", "## %s/ (%s)" % (g, names[g]), "", "| パス | サイズ(px) | 内容 | シート | 備考 |", "|---|---|---|---|---|"]
        for m in groups[g]:
            note = m["note"]
            if m["w"] < 64 and m["h"] < 64 and not note:
                note = "小さいアセット: 1xまで"
            L.append("| `%s` | %dx%d | %s | %d | %s |" % (m["path"], m["w"], m["h"], m["desc"], m["sheet"], note))
    L += ["", "## 命名メモ(依頼の例と異なるもの)", "",
          "- 鳥: `bird-wave / cheer / think / chin / happy / read / listen / sleep`。`bird-default` は無し(立ち姿は `bird-wave`)。",
          "- ミュートは2種: `icon-mute`(紺丸) / `icon-mute-alt`(オレンジのスピーカー)。シート2の丸ボタンは `icon-sound-on-round / icon-music-on-round / icon-sound-off-round / icon-music-off`。",
          "- スタンプ: ピラミッドは `stamp-pyramids`(エジプトではなく描かれているもの名)。UKのスタンプは存在せず、`stamp-plane` が青い飛行機。",
          "- 国カード: `card-<国>.png` は星ストリップなし、`card-<国>-rating.png` は星ストリップ付き。", "",
          "## 省略したもの・品質メモ", ""]
    L += ["- " + t for t in SKIPPED]
    L += ["- `mascot/bird-listen.png`: 足がナビアイコンのプレートに接触していたため、足先の端を少し補正。",
          "- `icons/icon-chart.png` / `icon-settings.png`: 同様に鳥の足が重なっていた上端をインペイントで補正(上辺が少しだけ他より粗い)。",
          "- 元画像自体の解像度が低く縁に微細なにじみがあるため、鳥など小さなアセットは等倍以下での利用を推奨。", ""]
    with open(os.path.join(OUT_DIR, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def main():
    global SRC_DIR, OUT_DIR
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=SRC_DIR)
    ap.add_argument("--out", default=OUT_DIR)
    a = ap.parse_args()
    SRC_DIR, OUT_DIR = a.src, a.out
    img1 = load_rgb(os.path.join(SRC_DIR, SHEET1))
    run_sheet1(img1)
    comps = find_stamps(img1)
    if len(comps) == 6:
        for (cx, cy, r), nm, ds in zip(comps, STAMP_NAMES, STAMP_DESC):
            cut_circle(img1, cx, cy, r, "stamps", nm, 1, "スタンプ(円形): " + ds)
    else:
        print("stamp count", len(comps))
    img2 = load_rgb(os.path.join(SRC_DIR, SHEET2))
    run_sheet2(img2)
    write_manifest()
    write_readme()
    print("done", len(manifest))


if __name__ == "__main__":
    main()
