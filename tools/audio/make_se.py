"""効果音(SE)10種を合成して frontend/assets/audio/se/ に ogg で書き出す。

使い方: python make_se.py
"""
import os

import numpy as np

import synth as S
from synth import SR

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "..", "..", "frontend", "assets", "audio", "se")


def put(buf, sig, t, gain=1.0):
    """モノラルのバッファ buf の t 秒の位置に sig を足す。"""
    i = int(round(t * SR))
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def with_room(x, rt60, wet, tail):
    """モノラル x に短いリバーブを足してステレオにする。tail 秒ぶん余韻を伸ばす。"""
    x = np.concatenate([x, np.zeros(int(tail * SR))])
    st = S.to_stereo(x)
    return st + S.reverb(st, rt60=rt60, damp=6000) * wet


# 仕様の長さに合わせて余韻を切る秒数(None は切らない)
LENGTH = {"correct": 1.0, "wrong": 0.7, "stamp": 0.45, "badge": 1.3,
          "complete": 2.1, "word-save": 0.55, "hint": 0.6}


def finish(name, x):
    """長さ調整 + フェード + -3dBFS ピーク正規化 + ogg 保存。"""
    L = LENGTH.get(name[:-4])
    if L is not None:
        x = x[: int(L * SR)]
    x = S.fade_edges(x, 0.002, 0.15 if L and L >= 0.9 else 0.06 if L else 0.012)
    x = S.peak_normalize(x, -3.0)
    S.save_ogg(os.path.join(OUT, name), x, quality=4)
    print(f"{name}: {len(x) / SR:.2f}s")


# --------------------------------------------------------------------
def click():
    """ボタンを押したときの、やわらかい「ポチッ」。"""
    t = S.taxis(0.09)
    body = S.sweep_sine(1500, 900, 0.01, 0.09) * np.exp(-t / 0.014)
    tick = S.bandpass(S.noise(0.09), 2000, 6000) * np.exp(-t / 0.003)
    return body * 0.8 + tick * 0.35


def select():
    """選択肢を選ぶ音。丸くて心地よい「コッ」。"""
    t = S.taxis(0.16)
    f = S.sweep_sine(760, 880, 0.012, 0.16)  # ほんの少し上がるピッチ
    y = f + 0.2 * np.sin(2 * np.pi * 1760 * t) + 0.08 * np.sin(2 * np.pi * 2640 * t)
    return y * S.attack(t, 0.002) * np.exp(-t / 0.04)


def correct():
    """正解: C-E-G と上がるきらきらチャイム。"""
    buf = np.zeros(int(1.0 * SR))
    for i, n in enumerate(("C6", "E6", "G6")):
        last = i == 2
        put(buf, S.bell(S.mtof(S.note(n)), 0.8, tau=0.45 if last else 0.18), 0.09 * i)
        put(buf, S.bell(S.mtof(S.note(n)) * 2, 0.5, tau=0.15, vel=0.3), 0.09 * i)
    put(buf, S.bell(S.mtof(S.note("G7")), 0.5, tau=0.25, vel=0.25), 0.22)  # きらめき
    return with_room(buf, 0.9, 0.5, 0.3)


def wrong():
    """不正解: 角のない低めの「ボン、ボン」(下がる2音)。励ますような長3度の下降。"""
    buf = np.zeros(int(0.7 * SR))
    for t0, n, g in ((0.0, "E4", 1.0), (0.17, "C4", 0.9)):
        f = S.mtof(S.note(n))
        t = S.taxis(0.5)
        y = S.sweep_sine(f * 1.15, f, 0.02, 0.5) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
        y *= S.attack(t, 0.004) * np.exp(-t / 0.13)
        put(buf, S.lowpass(y, 1800), t0, g)
    return buf


def stamp():
    """パスポートのスタンプ: ドスッ + 紙とインクの「チャッ」。"""
    buf = np.zeros(int(0.45 * SR))
    t = S.taxis(0.3)
    thump = S.sweep_sine(150, 55, 0.05, 0.3) * np.exp(-t / 0.085)
    body = S.lowpass(S.noise(0.3), 700) * np.exp(-t / 0.02)
    chk = S.bandpass(S.noise(0.3), 1500, 5000) * np.exp(-t / 0.012)
    put(buf, thump, 0, 1.0)
    put(buf, body, 0, 0.7)
    put(buf, chk, 0, 0.5)
    # 紙がこすれる「シャッ」
    t2 = S.taxis(0.25)
    paper = S.bandpass(S.noise(0.25), 3000, 9000) * S.attack(t2, 0.006) * np.exp(-t2 / 0.06)
    put(buf, paper, 0.035, 0.22)
    # インクが落ち着く小さな音
    t3 = S.taxis(0.05)
    put(buf, S.bandpass(S.noise(0.05), 800, 2500) * np.exp(-t3 / 0.01), 0.1, 0.18)
    buf = S.lowpass(buf, 9000)
    st = with_room(buf, 0.25, 0.4, 0.1)
    return st


def badge():
    """バッジ獲得: 暖かいベルのミニファンファーレ(約1.2秒)。"""
    buf = np.zeros(int(1.5 * SR))
    for i, n in enumerate(("C5", "E5", "G5")):  # 駆け上がり
        f = S.mtof(S.note(n))
        put(buf, S.bell(f, 0.5, tau=0.2), 0.1 * i)
        put(buf, S.marimba(f, 0.5, 0.6), 0.1 * i)
    for n in ("C5", "E5", "G5", "C6"):  # 最後の和音
        f = S.mtof(S.note(n))
        t = S.taxis(1.1)
        warm = np.sin(2 * np.pi * f * t) * S.attack(t, 0.02) * np.exp(-t / 0.5)
        put(buf, warm, 0.34, 0.3)
        put(buf, S.bell(f * 2, 1.0, tau=0.5, vel=0.5), 0.34)
    put(buf, S.bell(S.mtof(S.note("E7")), 0.6, tau=0.3, vel=0.3), 0.4)
    return with_room(buf, 1.3, 0.6, 0.4)


def complete():
    """レッスン/ツアー完了: 少し長い、うれしいジングル(約2秒)。"""
    buf = np.zeros(int(2.4 * SR))
    mel = (("C5", 0.0), ("E5", 0.14), ("G5", 0.28), ("C6", 0.42), ("E6", 0.56),
           ("D6", 0.78), ("B5", 0.92))
    for n, t0 in mel:
        f = S.mtof(S.note(n))
        put(buf, S.marimba(f, 0.6, 0.8), t0)
        put(buf, S.bell(f * 2, 0.4, tau=0.12, vel=0.3), t0)
    # 最後の大きな和音
    for n in ("C5", "E5", "G5", "C6", "E6"):
        f = S.mtof(S.note(n))
        t = S.taxis(1.1)
        warm = np.sin(2 * np.pi * f * t) * S.attack(t, 0.015) * np.exp(-t / 0.6)
        put(buf, warm, 1.08, 0.22)
        put(buf, S.bell(f, 1.1, tau=0.6, vel=0.5), 1.08)
    for k, n in enumerate(("G6", "C7", "E7")):  # きらきら
        put(buf, S.bell(S.mtof(S.note(n)), 0.6, tau=0.25, vel=0.3), 1.2 + 0.07 * k)
    return with_room(buf, 1.4, 0.6, 0.2)


def word_save():
    """単語帳に保存: ポップ + きらり。"""
    buf = np.zeros(int(0.6 * SR))
    t = S.taxis(0.12)
    # 低 -> 高へ素早く上がるピッチの「ぽっ」
    f = 250 + (800 - 250) * (1 - np.exp(-t / 0.025))
    pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * S.attack(t, 0.002) * np.exp(-t / 0.035)
    put(buf, pop, 0, 1.0)
    for k, (n, g) in enumerate((("A6", 0.45), ("E7", 0.4), ("A7", 0.32))):
        put(buf, S.bell(S.mtof(S.note(n)), 0.35, tau=0.08, vel=g), 0.07 + 0.05 * k)
    return with_room(buf, 0.5, 0.4, 0.1)


def page():
    """画面遷移: ふわっとした空気のページめくり(約0.4秒、ステレオ)。"""
    dur = 0.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    fc = 600 * (3600 / 600) ** (t / dur)  # 600Hz -> 3600Hz へ上がる
    env = np.sin(np.pi * (t / dur) ** 0.7) ** 2
    out = np.zeros((n, 2))
    block = 256
    for c in range(2):
        raw = S.rng.uniform(-1, 1, n)
        zi = None
        y = np.zeros(n)
        for i in range(0, n, block):
            f0 = fc[min(i, n - 1)]
            sos = S.signal.butter(2, [f0 / 1.6, min(f0 * 1.6, 20000)], "band", fs=SR,
                                  output="sos")
            if zi is None:
                zi = np.zeros((sos.shape[0], 2))
            seg, zi = S.signal.sosfilt(sos, raw[i:i + block], zi=zi)
            y[i:i + block] = seg
        out[:, c] = y * env
    return out


def hint():
    """ヒントを開く: 電球がともるような小さな「チン」。"""
    buf = np.zeros(int(0.6 * SR))
    for t0, n, g in ((0.0, "D6", 0.55), (0.06, "G6", 1.0)):
        f = S.mtof(S.note(n))
        put(buf, S.bell(f, 0.5, tau=0.18, vel=g), t0)
    return with_room(buf, 0.6, 0.4, 0.1)


def main():
    S.seed(2024)
    for name, fn in (("click", click), ("select", select), ("correct", correct),
                     ("wrong", wrong), ("stamp", stamp), ("badge", badge),
                     ("complete", complete), ("word-save", word_save),
                     ("page", page), ("hint", hint)):
        finish(name + ".ogg", fn())


if __name__ == "__main__":
    main()
