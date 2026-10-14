"""BGM 3曲(home / study / result)を合成して frontend/assets/audio/bgm/ に ogg で書き出す。

使い方:
    python make_bgm.py            # 3曲すべて
    python make_bgm.py home       # 1曲だけ

ループのつなぎ目について:
  Mix クラスが「曲の終わりからはみ出した余韻」を曲頭に折り返して足すので、
  合成した波形そのものは最後と最初が連続している(リバーブの尾も切れない)。
"""
import os
import sys

import numpy as np

import synth as S
from synth import SR

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "..", "..", "frontend", "assets", "audio", "bgm")


# ------------------------------------------------------------ 楽譜ユーティリティ
def parse_bar(text):
    """'E5:1.5 G5:0.5 r:2' のような1小節ぶんの文字列 -> [(拍位置, MIDI or None, 長さ拍)]。

    r は休符。1小節は必ず4拍になっていること(違うと例外)。
    """
    pos, out = 0.0, []
    for tok in text.split():
        name, d = tok.split(":")
        d = float(d)
        out.append((pos, None if name == "r" else S.note(name), d))
        pos += d
    assert abs(pos - 4.0) < 1e-9, f"1小節が4拍になっていません: {text}"
    return out


def jitter(sd=0.006):
    """人間らしい演奏のゆらぎ(秒)。"""
    return float(S.rng.normal(0, sd))


def vjit(v, sd=0.07):
    """ベロシティ(強さ)のゆらぎ。"""
    return v * float(1 + S.rng.normal(0, sd))


def finish(name, mix, rt60, quality=3):
    """レンダリング -> -18LUFS付近へ正規化 -> ogg 保存し、結果を表示する。"""
    x = mix.render(rt60=rt60)
    x = S.loudness_normalize(x, -18.0, -3.0)
    path = os.path.join(OUT, name + ".ogg")
    S.save_ogg(path, x, quality=quality)
    print(f"{name}.ogg: {len(x) / SR:.1f}s, LUFS~{S.lufs(x):.1f}, "
          f"peak {20 * np.log10(np.max(np.abs(x))):.1f} dBFS, {os.path.getsize(path) / 1024:.0f} KB")


# ============================================================ home (ホーム画面)
def make_home():
    """C メジャー / 96BPM / 32小節 (約80秒)。マリンバの旋律 + ギターのアルペジオ。"""
    S.seed(101)
    bpm = 96
    beat = 60 / bpm
    bar = 4 * beat
    bars = 32
    mix = S.Mix(bars * bar)

    # コード: (ベース音, アルペジオ用の和音構成音)
    CH = {
        "C":   (S.note("C3"),  [55, 60, 64, 67]),
        "G/B": (S.note("B2"),  [55, 62, 67, 71]),
        "Am":  (S.note("A2"),  [52, 57, 60, 64]),
        "Em/G": (S.note("G2"), [52, 59, 64, 67]),
        "F":   (S.note("F2"),  [53, 57, 60, 65]),
        "C/E": (S.note("E2"),  [55, 60, 64, 67]),
        "Dm7": (S.note("D3"),  [53, 57, 60, 65]),
        "G":   (S.note("G2"),  [50, 55, 59, 62]),
        "G7":  (S.note("G2"),  [53, 59, 62, 65]),
        "Em":  (S.note("E2"),  [55, 59, 64, 67]),
    }
    prog = (
        # A (1-8)
        ["C", "G/B", "Am", "Em/G", "F", "C/E", "Dm7", "G"]
        # B (9-16)
        + ["F", "G", "Em", "Am", "F", "G", "C", "C"]
        # A' (17-24)
        + ["C", "G/B", "Am", "Em/G", "F", "C/E", "Dm7", "G7"]
        # C ブリッジ (25-32) 最後は G7 で C(曲頭)へ戻る
        + ["Am", "F", "C", "G", "Am", "F", "G", "G7"]
    )
    melody = [
        # A
        "E5:1.5 G5:0.5 E5:1 D5:1", "D5:1.5 B4:0.5 D5:2", "C5:1 E5:1 A5:1.5 G5:0.5",
        "G5:2 E5:1 r:1", "A5:1.5 G5:0.5 F5:1 E5:1", "G5:1.5 E5:0.5 C5:2",
        "D5:1 F5:1 A5:1 G5:0.5 F5:0.5", "D5:2 B4:1 r:1",
        # B
        "A5:1 C6:1.5 A5:0.5 F5:1", "B5:1.5 A5:0.5 G5:2", "G5:1 E5:1 G5:1 B5:1",
        "A5:2 G5:1 E5:1", "A5:1 C6:1 A5:1 F5:1", "G5:1.5 B5:0.5 D6:2",
        "C6:2 G5:1 E5:1", "E5:1.5 D5:0.5 C5:2",
        # A'
        "G5:1.5 E5:0.5 G5:1 C6:1", "B5:1.5 G5:0.5 D6:2", "C6:1 A5:1 E5:1 A5:1",
        "G5:1.5 B5:0.5 G5:2", "F5:1 A5:1 C6:1.5 A5:0.5", "G5:1.5 E5:0.5 G5:1 C6:1",
        "D6:1.5 C6:0.5 A5:1 F5:1", "B4:1 D5:1 F5:1 G5:1",
        # C
        "E5:2 A5:2", "C6:1.5 A5:0.5 F5:2", "G5:1 E5:1 G5:2", "D5:1 G5:1 B5:2",
        "C6:1.5 B5:0.5 A5:1 E5:1", "F5:1 A5:1 C6:2", "D6:1.5 B5:0.5 G5:1 D5:1",
        "D5:1 F5:1 G5:2",
    ]
    patterns = {  # アルペジオの弾き方: 'b'=ベース音, 数字=和音構成音の番号
        1: ["b", 0, 1, 2, 3, 2, 1, 0],
        2: ["b", 0, 2, 1, 3, 1, 2, 1],
    }
    accent = [1.0, 0.55, 0.75, 0.6, 0.85, 0.6, 0.75, 0.55]

    for bi in range(bars):
        t0 = bi * bar
        sec = bi // 8  # 0:A 1:B 2:A' 3:C
        b_note, tones = CH[prog[bi]]

        # パッド(やわらかい持続音)
        for m in tones[:3]:
            mix.add(S.pad(S.mtof(m), bar + 0.5, 1.0), t0, gain=0.09, send=0.35)

        # ギターのアルペジオ(8分音符)
        pat = patterns[2 if sec in (1, 3) else 1]
        for k, p in enumerate(pat):
            m = b_note + 12 if p == "b" else tones[p]
            mix.add(S.pluck(S.mtof(m), 1.5, vjit(accent[k] * (0.9 if sec == 3 else 1.0))),
                    t0 + k * beat / 2 + jitter(0.004), gain=0.2,
                    pan=-0.3 + 0.1 * (k % 3), send=0.2)

        # ベース
        mix.add(S.bass(S.mtof(b_note), beat * 1.8), t0, gain=0.34)
        if bi % 8 >= 4 or sec in (1, 2):
            mix.add(S.bass(S.mtof(b_note + 7), beat * 0.9, 0.8), t0 + 2 * beat, gain=0.28)
        if sec == 1 and bi % 2 == 1:
            mix.add(S.bass(S.mtof(b_note + 12), beat * 0.6, 0.7), t0 + 3.5 * beat, gain=0.24)

        # 旋律 (A,A',B: マリンバ  C: ビブラフォン)
        for pos, m, d in parse_bar(melody[bi]):
            if m is None:
                continue
            f = S.mtof(m)
            tt = t0 + pos * beat + jitter()
            if sec == 3:
                mix.add(S.vibes(f, d * beat + 1.8, vjit(0.85)), tt, gain=0.26, pan=0.15, send=0.35)
            else:
                mix.add(S.marimba(f, d * beat + 1.2, vjit(0.95)), tt, gain=0.34, pan=0.15, send=0.3)
                if sec == 2 and pos == 0:  # A' はきらめきのベルを足して変化をつける
                    mix.add(S.bell(f * 2, 1.0, tau=0.3, vel=0.5), tt + 0.02, gain=0.08, pan=0.35, send=0.5)

        # シェイカー(2小節目以降: 4小節目から)
        if bi >= 4:
            if sec == 3:   # ブリッジは4分音符だけ
                steps = [(k * beat, 0.5) for k in range(4)]
            else:
                steps = [(k * beat / 2, (0.5 if k % 2 == 0 else 0.3) * (1.3 if k in (3, 7) else 1.0))
                         for k in range(8)]
            for off, v in steps:
                mix.add(S.shaker(vjit(v)), t0 + off + jitter(0.003), gain=0.08, pan=0.35, send=0.1)

        # キック・リム(Bと A' のみ。ブリッジは軽いリムだけ)
        if sec in (1, 2):
            mix.add(S.kick(0.8), t0, gain=0.3)
            mix.add(S.kick(0.6), t0 + 2 * beat, gain=0.25)
            mix.add(S.rim(0.5), t0 + 1 * beat, gain=0.12, pan=-0.2, send=0.1)
            mix.add(S.rim(0.5), t0 + 3 * beat, gain=0.12, pan=-0.2, send=0.1)
        elif sec == 3:
            mix.add(S.rim(0.4), t0 + 1 * beat, gain=0.09, pan=-0.2, send=0.15)
            mix.add(S.rim(0.4), t0 + 3 * beat, gain=0.09, pan=-0.2, send=0.15)

    finish("home", mix, rt60=1.8)


# ============================================================ study (勉強画面)
def make_study():
    """F メジャー / 76BPM / 24小節 (約76秒)。エレピの和音とまばらな旋律。"""
    S.seed(202)
    bpm = 76
    beat = 60 / bpm
    bar = 4 * beat
    bars = 24
    mix = S.Mix(bars * bar)

    CH = {  # (ベース音, 構成音)
        "Fmaj7": (S.note("F2"),  [52, 57, 60, 65]),
        "Dm9":   (S.note("D2"),  [53, 57, 60, 64]),
        "Gm7":   (S.note("G2"),  [53, 58, 62, 67]),
        "C7":    (S.note("C2"),  [52, 55, 58, 64]),
        "Am7":   (S.note("A2"),  [55, 60, 64, 67]),
        "Bbmaj7": (S.note("Bb2"), [57, 62, 65, 70]),
        "Gm9":   (S.note("G2"),  [58, 62, 65, 69]),
        "C7sus": (S.note("C2"),  [53, 55, 58, 65]),
    }
    prog = (["Fmaj7", "Dm9", "Gm7", "C7"]
            + ["Fmaj7", "Am7", "Bbmaj7", "C7"]
            + ["Dm9", "Gm9", "C7", "Fmaj7"]
            + ["Bbmaj7", "Am7", "Gm7", "C7sus"]      # ブリッジ
            + ["Fmaj7", "Dm9", "Gm7", "C7"]
            + ["Bbmaj7", "Gm7", "C7sus", "C7"])      # 終わりは C7 で曲頭 F へ戻る
    melody = [
        "r:1 C5:1.5 D5:0.5 C5:1", "A4:2 r:2", "Bb4:1.5 A4:0.5 G4:2", "r:1 E4:1 G4:1 Bb4:1",
        "A4:3 r:1", "r:2 C5:1 E5:1", "D5:2 C5:1 A4:1", "G4:2 r:2",
        "F5:1.5 E5:0.5 D5:2", "r:1 D5:1 Bb4:2", "E5:2 C5:1 r:1", "A4:4",
        "D5:1 F5:1 A5:2", "G5:1.5 E5:0.5 C5:2", "Bb4:1 D5:1 F5:2", "F5:2 E5:1 r:1",
        "C5:1 A4:1 C5:1 F5:1", "E5:2 D5:1 A4:1", "D5:1.5 C5:0.5 Bb4:2", "r:1 G4:1 Bb4:1 E5:1",
        "D5:2 A4:2", "D5:2 Bb4:1 G4:1", "C5:2 Bb4:1 G4:1", "E4:1 G4:1 Bb4:1 r:1",
    ]

    for bi in range(bars):
        t0 = bi * bar
        phrase = bi // 4
        b_note, tones = CH[prog[bi]]

        # 低いサイン波ベース(小節いっぱいのばす)
        mix.add(S.bass(S.mtof(b_note), bar * 0.98, 0.9), t0, gain=0.3)

        # 弦のようなパッド(とても小さく)
        for m in tones[:3]:
            mix.add(S.pad(S.mtof(m), bar + 1.0, 1.0, att=0.8, rel=1.2), t0, gain=0.055, send=0.4)

        # エレピの和音: 1拍目はゆっくりロール、後半は小さく軽く
        for i, m in enumerate(tones):
            mix.add(S.epiano(S.mtof(m), bar * 1.1, vjit(0.55)), t0 + i * 0.04 + jitter(0.005),
                    gain=0.17, pan=-0.15 + 0.1 * i, send=0.35)
        if bi % 2 == 0:
            second = 2 * beat      # 3拍目
        else:
            second = 1.5 * beat    # 2拍目裏(少しだけシンコペーション)
        if phrase != 3 or bi % 2 == 0:  # ブリッジは少しだけ静かに
            for i, m in enumerate(tones[1:]):
                mix.add(S.epiano(S.mtof(m), bar * 0.7, vjit(0.32)), t0 + second + i * 0.03 + jitter(0.005),
                        gain=0.14, pan=0.0 + 0.1 * i, send=0.35)

        # 旋律: 少し明るめの音色。ブリッジは1オクターブ上のベルをうっすら重ねる
        for pos, m, d in parse_bar(melody[bi]):
            if m is None:
                continue
            f = S.mtof(m)
            tt = t0 + pos * beat + jitter(0.008)
            mix.add(S.epiano(f, d * beat + 2.0, vjit(0.8)), tt, gain=0.26, pan=0.12, send=0.45)
            if phrase == 3:
                mix.add(S.bell(f * 2, 1.2, tau=0.4, vel=0.4), tt + 0.03, gain=0.05, pan=0.3, send=0.6)

    finish("study", mix, rt60=2.4)


# ============================================================ result (結果画面)
def make_result():
    """G メジャー / 110BPM / 16小節 (約35秒)。元気で明るいループ。"""
    S.seed(303)
    bpm = 110
    beat = 60 / bpm
    bar = 4 * beat
    bars = 16
    mix = S.Mix(bars * bar, tail=4.0)

    CH = {
        "G":    (S.note("G2"), [55, 59, 62, 67]),
        "D/F#": (S.note("F#2"), [57, 62, 66, 69]),
        "Em":   (S.note("E2"), [55, 59, 64, 67]),
        "C":    (S.note("C3"), [52, 55, 60, 64]),
        "D":    (S.note("D3"), [54, 57, 62, 66]),
    }
    prog = (["G", "D/F#", "Em", "C", "G", "D", "C", "D"]
            + ["Em", "C", "G", "D", "Em", "C", "D", "D"])
    melody = [
        "G5:0.5 B5:0.5 D6:1 B5:0.5 G5:0.5 A5:1", "A5:1 F#5:1 A5:0.5 D6:1.5",
        "G5:0.5 B5:0.5 E6:1 D6:0.5 B5:0.5 G5:1", "C6:1.5 B5:0.5 G5:1 E5:1",
        "G5:0.5 B5:0.5 D6:1 B5:0.5 G5:0.5 B5:1", "A5:1 D6:1 F#6:0.5 E6:0.5 D6:1",
        "E6:1 D6:0.5 C6:0.5 B5:1 G5:1", "A5:1.5 F#5:0.5 A5:1 D6:1",
        "B5:1 E6:1 D6:0.5 B5:0.5 G5:1", "C6:1 E6:1 D6:0.5 C6:0.5 G5:1",
        "D6:1.5 B5:0.5 G5:1 B5:1", "A5:1 F#5:1 A5:1 D6:1",
        "E6:1.5 D6:0.5 B5:1 G5:1", "C6:1 D6:1 E6:2",
        "F#6:1 E6:0.5 D6:0.5 A5:1 D6:1", "F#6:1 D6:1 A5:1 F#5:1",
    ]

    for bi in range(bars):
        t0 = bi * bar
        half = bi // 8
        b_note, tones = CH[prog[bi]]

        # パッド
        for m in tones[:3]:
            mix.add(S.pad(S.mtof(m), bar + 0.3, 1.0, att=0.15, rel=0.3), t0, gain=0.06, send=0.2)

        # ベース: 弾むパターン
        for off, dm, d in ((0, 0, 0.9), (1.5, 0, 0.45), (2, 7, 0.9), (3.5, 12, 0.45)):
            mix.add(S.bass(S.mtof(b_note + dm), d * beat, 0.9), t0 + off * beat, gain=0.3)

        # ギターの裏打ちコード(8分の裏)
        for k in range(4):
            tt = t0 + (k + 0.5) * beat
            for i, m in enumerate(tones[1:]):
                mix.add(S.pluck(S.mtof(m), 0.45, vjit(0.55), bright=1.3), tt + i * 0.008 + jitter(0.003),
                        gain=0.14, pan=-0.35, send=0.12)

        # 旋律(マリンバ) + 後半はベルを重ねてにぎやかに
        for pos, m, d in parse_bar(melody[bi]):
            if m is None:
                continue
            f = S.mtof(m)
            tt = t0 + pos * beat + jitter(0.004)
            mix.add(S.marimba(f, d * beat + 0.9, vjit(1.0)), tt, gain=0.33, pan=0.1, send=0.2)
            if half == 1:
                mix.add(S.bell(f * 2, 0.8, tau=0.2, vel=0.5), tt, gain=0.07, pan=0.3, send=0.3)

        # ドラム: キック(1,3拍) / クラップ(2,4拍) / ハット
        mix.add(S.kick(0.9), t0, gain=0.3)
        mix.add(S.kick(0.7), t0 + 2 * beat, gain=0.25)
        if bi % 4 == 3:
            mix.add(S.kick(0.6), t0 + 3.5 * beat, gain=0.2)
        for k in (1, 3):
            mix.add(S.clap(0.7), t0 + k * beat, gain=0.13, pan=-0.1, send=0.15)
        n_hat = 16 if half == 1 else 8
        for k in range(n_hat):
            off = k * 4 * beat / n_hat
            v = (0.7 if k % (n_hat // 4) == 0 else 0.35 if k % 2 == 0 else 0.2)
            mix.add(S.hat(vjit(v)), t0 + off, gain=0.07, pan=0.3)

    finish("result", mix, rt60=1.2)


if __name__ == "__main__":
    which = sys.argv[1:] or ["home", "study", "result"]
    for w in which:
        {"home": make_home, "study": make_study, "result": make_result}[w]()
