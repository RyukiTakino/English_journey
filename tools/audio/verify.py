"""生成した ogg を ffmpeg でデコードし直して検査する。

長さ・ピーク・クリップの有無を表示し、BGM はループのつなぎ目(最後->最初)の
段差が、通常のサンプル間差分と比べて不自然でないかを調べる。

使い方: python verify.py
"""
import glob
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile

import synth as S

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "..", "frontend", "assets", "audio")


def decode(path):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "a.wav")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-c:a",
                        "pcm_f32le", wav], check=True)
        sr, x = wavfile.read(wav)
    return sr, x.astype(np.float64)


def main():
    for kind in ("se", "bgm"):
        for p in sorted(glob.glob(os.path.join(BASE, kind, "*.ogg"))):
            sr, x = decode(p)
            x2 = x if x.ndim == 2 else x[:, None]
            peak = np.max(np.abs(x2))
            line = (f"[{kind}] {os.path.basename(p):14s} {len(x2) / sr:6.2f}s "
                    f"{os.path.getsize(p) / 1024:6.0f}KB peak {20 * np.log10(peak):5.1f}dBFS "
                    f"{'CLIP!' if peak >= 0.999 else 'ok'}")
            if kind == "bgm":
                line += f" LUFS~{S.lufs(x2):.1f}"
                # つなぎ目: 末尾->先頭の段差 と、曲中の最大の隣接差分を比較
                step = np.max(np.abs(x2[0] - x2[-1]))
                diffs = np.abs(np.diff(x2, axis=0))
                typical = np.percentile(diffs, 99.9)
                head = np.max(np.abs(x2[:441]))
                tail = np.max(np.abs(x2[-441:]))
                line += (f" | loop step {step:.4f} (99.9%diff {typical:.4f}) "
                         f"first10ms max {head:.3f} last10ms max {tail:.3f}")
            print(line)


if __name__ == "__main__":
    main()
