/**
 * 紙吹雪
 *
 * 層：ui
 * 担当：フロント
 *
 * 画面全体の上に重ねた <canvas> に、色とりどりの紙片を降らせます。スタンプ・バッジの獲得で使います。
 * 「動きを減らす」設定のときは、何もしません。
 *
 * （ゲームのパーティクルシステムを、canvas で素朴に作ったものです）
 */

const COLORS = ["#e2703a", "#d9a441", "#2f7d7b", "#1e4d7b", "#f5f1e8", "#c4453b"];

export class Confetti {
  #layer;

  /** @param {HTMLElement} layer index.html の #fx-layer（画面全体に固定された、操作を邪魔しない層） */
  constructor(layer) {
    this.#layer = layer;
  }

  /**
   * 紙吹雪を降らせる。
   * @param {{count?: number}} [options] count は紙片の数
   */
  burst({ count = 120 } = {}) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    this.#layer.appendChild(canvas);
    const g = canvas.getContext("2d");

    // 紙片 1 枚ごとの、位置・速さ・回転・色
    const pieces = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: -Math.random() * h * 0.4,
      vx: (Math.random() - 0.5) * 3 * dpr,
      vy: (2 + Math.random() * 4) * dpr,
      size: (6 + Math.random() * 8) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));

    const started = performance.now();
    const frame = (now) => {
      g.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05 * dpr; // 少しずつ加速（重力）
        p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      }
      // 3.5 秒たったら片付ける
      if (now - started < 3500) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  }
}
