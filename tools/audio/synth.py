"""English journey 用 サウンド合成の共通ライブラリ。

外部音源は一切使わず、numpy / scipy だけで音を作る。
ogg への変換だけは ffmpeg (libvorbis) を呼び出す。
"""
import os
import shutil
import subprocess
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100  # サンプルレート

# 乱数は seed() で固定する (再生成しても同じ音になるように)
rng = np.random.default_rng(0)


def seed(n):
    """乱数を固定する。各スクリプトの冒頭で呼ぶ。"""
    global rng
    rng = np.random.default_rng(n)


# ---------------------------------------------------------------- 音名・周波数
_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note(name):
    """'C5' 'F#4' 'Bb4' などの音名を MIDI ノート番号に変換する。"""
    pc = _PC[name[0]]
    i = 1
    while i < len(name) and name[i] in "#b":
        pc += 1 if name[i] == "#" else -1
        i += 1
    return 12 * (int(name[i:]) + 1) + pc


def mtof(m):
    """MIDI ノート番号 -> 周波数(Hz)。"""
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


# ---------------------------------------------------------------- 基本部品
def taxis(dur):
    """長さ dur 秒の時間軸(秒)。"""
    return np.arange(int(round(dur * SR))) / SR


def attack(t, a):
    """直線のアタック(0->1)。a 秒かけて立ち上がる。"""
    return np.minimum(1.0, t / max(a, 1e-4))


def release(x, sec=0.01):
    """末尾を sec 秒かけて 0 に落とす(ノートの切れ目のプチ音防止)。"""
    n = min(len(x), int(sec * SR))
    if n > 0:
        x[-n:] *= np.linspace(1.0, 0.0, n)
    return x


def noise(dur):
    """ホワイトノイズ(-1..1)。"""
    return rng.uniform(-1, 1, int(round(dur * SR)))


def lowpass(x, fc, order=2):
    sos = signal.butter(order, fc, "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def sweep_sine(f_start, f_end, tau, dur):
    """周波数が f_start から f_end へ指数的に落ちる(上がる)サイン波。"""
    t = taxis(dur)
    f = f_end + (f_start - f_end) * np.exp(-t / tau)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------------------------------------------------------- 楽器モデル
def bell(f, dur, tau=0.4, vel=1.0):
    """グロッケン/ベル風。倍音が整数に近く、高い倍音ほど早く消える。"""
    t = taxis(dur)
    parts = [(1.0, 1.00, 1.00), (2.0, 0.45, 0.60), (2.99, 0.25, 0.40),
             (4.16, 0.12, 0.25), (5.43, 0.06, 0.15)]
    y = np.zeros_like(t)
    for ratio, amp, dec in parts:
        if f * ratio < SR * 0.45:
            y += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (tau * dec))
    y *= attack(t, 0.002) * vel
    return release(y)


def marimba(f, dur, vel=1.0):
    """マリンバ風。基音 + 4倍音 + 10倍音、低音ほど長く響く。"""
    t = taxis(dur)
    base = 0.55 * (261.6 / f) ** 0.45
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / base)
         + 0.35 * np.sin(2 * np.pi * f * 3.99 * t) * np.exp(-t / (base * 0.35))
         + 0.10 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t / (base * 0.12)))
    y *= attack(t, 0.002) * vel
    return release(y)


def vibes(f, dur, vel=1.0):
    """ビブラフォン風。ゆっくり減衰し、ふんわりトレモロがかかる。"""
    t = taxis(dur)
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / 1.6)
         + 0.25 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.5))
    y *= (1 + 0.25 * np.sin(2 * np.pi * 4.8 * t)) * attack(t, 0.003) * vel
    return release(y, 0.03)


def pluck(f, dur, vel=1.0, bright=1.0):
    """ギター風の撥弦音(加算合成)。高い倍音ほど早く減衰する。"""
    t = taxis(dur)
    y = np.zeros_like(t)
    for k in range(1, 15):
        fk = f * k * np.sqrt(1 + 0.0002 * k * k)  # わずかな非整数倍音
        if fk > SR * 0.45:
            break
        amp = (1.0 / k) * np.exp(-0.2 * (k - 1) / bright)
        tau = 1.1 / (1 + 0.55 * (k - 1))
        y += amp * np.sin(2 * np.pi * fk * t + k) * np.exp(-t / tau)
    # ピックの当たる一瞬のノイズ
    n = min(len(t), int(0.004 * SR))
    y[:n] += 0.15 * lowpass(noise(0.004), 4000)[:n] * np.linspace(1, 0, n)
    y *= attack(t, 0.0015) * vel
    return release(y, 0.02)


def epiano(f, dur, vel=1.0):
    """エレピ(Rhodes風)。FM合成 + 立ち上がりのチン音。"""
    t = taxis(dur)
    idx = (0.8 + 2.2 * vel) * np.exp(-t / 0.55)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    if f * 14 < SR * 0.45:
        y += 0.12 * vel * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.04)
    tau = 2.6 * (261.6 / f) ** 0.4
    y *= np.exp(-t / tau) * attack(t, 0.003)
    y *= (1 + 0.08 * np.sin(2 * np.pi * 4.3 * t)) * vel
    return release(y, 0.05)


def pad(f, dur, vel=1.0, att=0.4, rel=0.7):
    """やわらかいパッド。3本のデチューンしたノコギリ波風 -> ステレオ(n,2)を返す。"""
    t = taxis(dur)
    out = np.zeros((len(t), 2))
    for cents, pl in ((-7, 0.8), (0, 0.5), (7, 0.2)):
        fv = f * 2 ** (cents / 1200)
        v = np.zeros_like(t)
        for k in range(1, 7):
            if fv * k < SR * 0.45:
                v += np.sin(2 * np.pi * fv * k * t + k * 1.3) / (k * 1.2)
        out[:, 0] += v * pl
        out[:, 1] += v * (1 - pl)
    env = np.minimum(attack(t, att), np.clip((dur - t) / rel, 0, 1))
    return out * env[:, None] * vel * 0.5


def bass(f, dur, vel=1.0):
    """丸いベース。サイン波 + 少しの倍音、頭にふくらみ。"""
    t = taxis(dur)
    y = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
         + 0.1 * np.sin(2 * np.pi * 3 * f * t))
    y *= attack(t, 0.006) * (0.5 + 0.5 * np.exp(-t / 0.25)) * vel
    return release(y, 0.04)


# ---------------------------------------------------------------- 打楽器
def shaker(vel=1.0):
    t = taxis(0.1)
    y = bandpass(noise(0.1), 5000, 13000) * attack(t, 0.012) * np.exp(-t / 0.028)
    return release(y * vel * 2.0, 0.01)


def hat(vel=1.0, tau=0.018):
    t = taxis(0.12)
    y = highpass(noise(0.12), 7500) * np.exp(-t / tau) * attack(t, 0.001)
    return release(y * vel, 0.01)


def kick(vel=1.0, soft=True):
    t = taxis(0.35)
    y = sweep_sine(120 if soft else 150, 48, 0.03, 0.35) * np.exp(-t / 0.11)
    return release(y * attack(t, 0.002) * vel, 0.02)


def rim(vel=1.0):
    """カホン/リムショット風の「トッ」。"""
    t = taxis(0.12)
    y = (bandpass(noise(0.12), 1500, 4500) * np.exp(-t / 0.015)
         + 0.6 * np.sin(2 * np.pi * 220 * t) * np.exp(-t / 0.03))
    return release(y * attack(t, 0.001) * vel, 0.01)


def clap(vel=1.0):
    t = taxis(0.25)
    n = bandpass(noise(0.25), 900, 3500)
    env = np.zeros_like(t)
    for off, a in ((0.0, 1.0), (0.011, 0.8), (0.022, 0.7)):
        i = int(off * SR)
        env[i:] += a * np.exp(-(t[: len(t) - i]) / 0.006)
    env += 0.5 * np.exp(-t / 0.07) * (t > 0.03)
    return release(n * env * vel, 0.02)


# ---------------------------------------------------------------- エフェクト
def make_ir(rt60=1.6, damp=5500, predelay=0.012):
    """合成のインパルス応答(ノイズ減衰型)。ステレオ(n,2)。"""
    n = int((rt60 * 1.15 + predelay) * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-6.9 * t / rt60)[:, None]
    ir = lowpass(ir, damp)
    pd = int(predelay * SR)
    ir[:pd] = 0
    ir[pd:pd + 200] *= np.linspace(0, 1, 200)[:, None]  # 立ち上がりをなめらかに
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, rt60=1.6, damp=5500, predelay=0.012):
    """リバーブ(ウェット成分のみ)。x はステレオ(n,2)。同じ長さで返す。"""
    ir = make_ir(rt60, damp, predelay)
    out = np.zeros_like(x)
    for c in range(2):
        out[:, c] = signal.oaconvolve(x[:, c], ir[:, c])[: len(x)]
    return out  # IR は単位エネルギーなので、入力と同程度の大きさ。量は呼び出し側で調整


def to_stereo(x, pan=0.0):
    """モノラルをステレオ化(等パワーパン)。すでに2chならそのまま。"""
    x = np.asarray(x)
    if x.ndim == 2:
        return x
    ang = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)], axis=1) * np.sqrt(2)


class Mix:
    """時間位置を指定して音を足していくミキサー。

    ループ用に、末尾からはみ出した余韻(リバーブ含む)を先頭に折り返して足す。
    これにより「最後 -> 最初」がなめらかにつながる。
    """

    def __init__(self, seconds, tail=5.0):
        self.n = int(round(seconds * SR))
        self.tail = int(tail * SR)
        self.dry = np.zeros((self.n + self.tail, 2))
        self.send = np.zeros_like(self.dry)

    def add(self, sig, t, gain=1.0, pan=0.0, send=0.0):
        """sig を t 秒の位置に足す。send はリバーブへ送る量(0~1)。"""
        st = to_stereo(sig, pan) * gain
        i = int(round(t * SR))
        if i < 0 or i >= len(self.dry):
            return
        j = min(len(self.dry), i + len(st))
        self.dry[i:j] += st[: j - i]
        if send > 0:
            self.send[i:j] += st[: j - i] * send

    def render(self, rt60=1.8, damp=5000):
        """リバーブを足し、ハイパスをかけ、末尾を先頭へ折り返した(n,2)を返す。"""
        full = self.dry + reverb(self.send, rt60, damp)
        full = highpass(full, 35)
        out = full[: self.n].copy()
        tail = full[self.n: self.n + self.tail]
        out[: len(tail)] += tail
        return out


# ---------------------------------------------------------------- ラウドネス・ピーク
def lufs(x, fs=SR):
    """ITU-R BS.1770 の K特性を使った簡易ラウドネス(ゲーティング無し)。"""
    def biquad(G, Q, fc, shelf):
        K = np.tan(np.pi * fc / fs)
        Vh = 10 ** (G / 20)
        Vb = Vh ** 0.4996667741545416
        a0 = 1 + K / Q + K * K
        if shelf:
            b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0,
                 (Vh - Vb * K / Q + K * K) / a0]
        else:
            b = [1.0, -2.0, 1.0]
        a = [1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
        return b, a

    x = x if x.ndim == 2 else x[:, None]
    b1, a1 = biquad(3.999843853973347, 0.7071752369554196, 1681.9744509555319, True)
    b2, a2 = biquad(0.0, 0.5003270373238773, 38.13547087602444, False)
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)
    return -0.691 + 10 * np.log10(np.sum(np.mean(y ** 2, axis=0)) + 1e-12)


def soft_clip(x, thr=0.6):
    """thr を超えた部分だけをなめらかに丸める(最大でも ±1 未満)。"""
    a = np.abs(x)
    over = a > thr
    y = x.copy()
    y[over] = np.sign(x[over]) * (thr + (1 - thr) * np.tanh((a[over] - thr) / (1 - thr)))
    return y


def peak_normalize(x, db=-3.0):
    """最大振幅を db dBFS に合わせる。"""
    p = np.max(np.abs(x))
    return x * (10 ** (db / 20) / p) if p > 0 else x


def loudness_normalize(x, target=-18.0, peak_db=-3.0):
    """目標LUFSに合わせ、ピークが peak_db を超える場合は丸めてから下げる。"""
    x = x * 10 ** ((target - lufs(x)) / 20)
    limit = 10 ** (peak_db / 20)
    if np.max(np.abs(x)) > limit:
        x = soft_clip(x, thr=limit * 0.75)
        if np.max(np.abs(x)) > limit:
            x = x * (limit / np.max(np.abs(x)))
    return x


def fade_edges(x, fin=0.002, fout=0.012):
    """先頭・末尾にごく短いフェードをかけてクリックを防ぐ(SE用)。"""
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    x[:a] *= np.linspace(0, 1, a).reshape((-1,) + (1,) * (x.ndim - 1))
    x[-b:] *= np.linspace(1, 0, b).reshape((-1,) + (1,) * (x.ndim - 1))
    return x


# ---------------------------------------------------------------- 書き出し
def save_ogg(path, x, quality=4):
    """float配列(n,) か (n,2) を ogg Vorbis で保存する。ffmpeg が必要。"""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg が見つかりません。PATH に追加してください。")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "tmp.wav")
        wavfile.write(wav, SR, x.astype(np.float32))
        subprocess.run(
            [ffmpeg, "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis",
             "-q:a", str(quality), path],
            check=True,
        )
