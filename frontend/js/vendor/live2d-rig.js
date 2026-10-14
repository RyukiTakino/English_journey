// 出典：D:\WineEngine\Tools\Live2D\Ituki\viewer\ituki-rig.js（自作の Live2D 風リグ。WebGL のみ。外部ライブラリ無し）
// 改造あり（v2）：顔・前髪・横髪・後ろ髪などの「オブジェクトごとの層」に対応するため、deform の振り分けに hairFront と face を足した。
// Live2D-style rig for the Itsuki pictures: plain WebGL, no libraries.
// Every part is a grid mesh whose vertices are moved each frame by Live2D-like parameters
// (head angle, eye open, eye ball, breath) plus wind and spring physics for the long hair.
// All coordinates are base-image pixels (y down).

// The positions (head, neck, hair root, eyes, ...) come from the model JSON ("rig", see rig.json next to
// each picture), so the same code drives every picture.
const DEFAULT_CELL = 12; // mesh cell size in base pixels for the small parts

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function rot(x, y, cx, cy, deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const dx = x - cx, dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

class Spring {
  constructor(freq, damp, gain, limit = 40) {
    const w = 2 * Math.PI * freq;
    this.k = w * w; this.c = 2 * damp * w; this.g = gain; this.lim = limit; this.x = 0; this.v = 0;
  }
  step(drive, dt) {
    this.v += (-this.k * this.x - this.c * this.v - drive * this.g) * dt;
    this.x = clamp(this.x + this.v * dt, -this.lim, this.lim);
  }
}

// ---------------------------------------------------------------- parameters & idle motion
export function createAnimator() {
  const P = {
    angleX: 0, angleY: 0, angleZ: 0, eyeOpen: 1, eyeBallX: 0, eyeBallY: 0, breath: 0,
    bodyZ: 0, bodyX: 0, hand: 0, gust: 1, mouthOpen: 0, mouthForm: 0,
  };
  let nextBlink = 1.5, smileFrom = 9, smileTo = -1, hum = { from: 6, to: -1 };
  // idle gaze: the eyes jump to a spot and rest there (saccades), the head drifts after them
  const gaze = { x: 0, y: 0, next: 0.8 };
  const noise = (t, a, b) => Math.sin(t * a) * 0.6 + Math.sin(t * b + 1.3) * 0.4;

  function update(t, dt, look) {
    if (!look && t > gaze.next) {
      // mostly small hops near the middle, now and then a longer look aside
      const far = Math.random() < 0.25;
      gaze.x = clamp((far ? 0.55 : 0.25) * (Math.random() * 2 - 1) + noise(t, 0.05, 0.08) * 0.15, -0.7, 0.7);
      gaze.y = clamp((far ? 0.35 : 0.15) * (Math.random() * 2 - 1), -0.5, 0.5);
      gaze.next = t + (far ? 2.5 : 0.9) + Math.random() * 2.2;
    }
    const dir = look ?? { x: gaze.x, y: gaze.y };
    // small life on top of the gaze: the head never stops completely
    const micro = { x: noise(t, 0.53, 0.89) * 0.08, y: noise(t, 0.47, 0.77) * 0.06 };
    const target = {
      angleX: (dir.x + micro.x) * 30, angleY: (dir.y + micro.y) * 26,
      angleZ: -dir.x * 4 + noise(t, 0.17, 0.29) * 3.5,
      eyeBallX: clamp(dir.x * 1.25, -1, 1), eyeBallY: clamp(dir.y * 1.25, -1, 1),
      breath: 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 3.8), eyeOpen: 1,
      bodyZ: noise(t, 0.21, 0.13) * 0.5 + dir.x * 0.4, bodyX: dir.x * 0.6 + noise(t, 0.16, 0.23) * 0.3,
      hand: noise(t, 0.7, 1.13) * 0.8 + Math.sin(t * 0.37) * 0.3,
      // the wind comes in gusts
      gust: clamp(0.8 + 0.3 * Math.sin(t * 0.19) + 0.15 * Math.sin(t * 0.47 + 1), 0.4, 1.3),
    };
    // the mouth: a smile that comes and goes a little, and now and then a few soft moving words (humming)
    target.mouthForm = Math.max(0, 0.25 * noise(t, 0.13, 0.31)); // at rest the line lies exactly where it was drawn
    target.mouthOpen = 0;
    if (t > hum.from && hum.to < 0) hum.to = t + 1.2 + Math.random() * 1.6;
    if (hum.to > 0 && t < hum.to) {
      const k = Math.min(1, (t - hum.from) / 0.2, (hum.to - t) / 0.25);
      target.mouthOpen = k * Math.max(0, 0.18 + 0.22 * Math.sin(t * 9.5) + 0.12 * Math.sin(t * 15.3 + 1));
    } else if (hum.to > 0) { hum.to = -1; hum.from = t + 12 + Math.random() * 14; }
    // now and then a happy squint (a smile with the eyes, and the mouth smiles more)
    if (t > smileFrom && smileTo < 0) smileTo = t + 1.4 + Math.random();
    if (smileTo > 0 && t < smileTo) { target.eyeOpen = 0.55; target.mouthForm = 0.8; }
    else if (smileTo > 0) { smileTo = -1; smileFrom = t + 10 + Math.random() * 12; }
    // blink (sometimes twice)
    const bt = t - nextBlink;
    if (bt > 0) {
      if (bt < 0.07) target.eyeOpen = Math.min(target.eyeOpen, 1 - bt / 0.07);
      else if (bt < 0.12) target.eyeOpen = 0;
      else if (bt < 0.28) target.eyeOpen = Math.min(target.eyeOpen, (bt - 0.12) / 0.16);
      else nextBlink = Math.random() < 0.2 ? t + 0.3 : t + 2.2 + Math.random() * 4;
    }
    const fast = 1 - Math.exp(-dt * 40), slow = 1 - Math.exp(-dt * 5), eyes = 1 - Math.exp(-dt * 14), soft = 1 - Math.exp(-dt * 2);
    for (const k of Object.keys(P)) {
      // the eyes lead (quick), the head follows (slower), the body last (slowest)
      const r = k === "mouthOpen" ? 1 - Math.exp(-dt * 18) : k === "eyeOpen" ? (target.eyeOpen < P.eyeOpen - 0.3 || P.eyeOpen < 0.5 ? fast : eyes)
        : k.startsWith("eyeBall") ? 1 - Math.exp(-dt * 22) : k.startsWith("angle") ? 1 - Math.exp(-dt * 3.2)
        : k === "gust" || k === "bodyZ" || k === "bodyX" ? soft : slow;
      P[k] = lerp(P[k], target[k], r);
    }
    return P;
  }
  return { update };
}

// ---------------------------------------------------------------- deformation
function makeDeformer(R, phys, wind) {
  const ea = (R.eyeAxis * Math.PI) / 180, ec = Math.cos(ea), es = Math.sin(ea);
  const B = R.body, HD = R.head, HR = R.hair, AH = R.ahoge;

  // the breath lifts the shoulders (and everything above them)
  const breathY = (y, P) => P.breath * B.breath * clamp((B.breathFrom - y) / B.breathRange, 0, 1);
  // whole-body sway: a slow lean, more at the top
  function body(x, y, P) {
    const up = clamp((R.view[3] - y) / B.swayRange, 0, 1.4);
    x += P.bodyX * B.sway * up;
    y -= breathY(y, P);
    return rot(x, y, B.pivot[0], B.pivot[1], P.bodyZ);
  }

  // the head turns like a ball, not a flat card: a point on the face is lifted onto a sphere, the sphere is
  // turned (yaw for angleX, pitch for angleY) and the point is flattened back. The middle of the face moves
  // most, the outline hardly at all, and the side turning away gets narrower: the Live2D "angle" look.
  const yawMax = ((HD.yaw ?? 11) * Math.PI) / 180, pitchMax = ((HD.pitch ?? 8) * Math.PI) / 180;
  const sphere = HD.r * (HD.sphere ?? 1.25);
  function head(x, y, d, P) {
    const ax = P.angleX / 30, ay = P.angleY / 30;
    const nx = clamp((x - HD.x) / HD.r, -1.3, 1.3), ny = clamp((y - HD.y) / HD.r, -1.3, 1.3);
    // on the sphere
    const sx = (x - HD.x) / sphere, sy = (y - HD.y) / sphere;
    const z = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
    const yaw = ax * yawMax * d, pitch = ay * pitchMax * d;
    const x1 = sx * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -sx * Math.sin(yaw) + z * Math.cos(yaw);
    const y1 = sy * Math.cos(pitch) - z1 * Math.sin(pitch);
    x = HD.x + x1 * sphere; y = HD.y + y1 * sphere;
    // plus a small slide of the whole head (the neck turns with it)
    x += ax * HD.ampX * 0.5 * d * (1 - 0.4 * ny * ny);
    y -= ay * HD.ampY * 0.5 * d * (1 - 0.4 * nx * nx);
    return rot(x, y, R.neck.x, R.neck.y, P.angleZ * HD.tilt * d);
  }

  function eye(name, x, y, P) {
    const e = R.eyes[name.slice(-1)], o = clamp(P.eyeOpen, 0, 1);
    // into the eye's own frame
    const dx = x - e.cx, dy = y - e.cy;
    let lx = dx * ec + dy * es, ly = -dx * es + dy * ec;
    const closed = e.top + 0.72 * (e.bottom - e.top);
    if (name.startsWith("lash")) {
      // closing: the lash thins to a line and bends into the downward arc of a closed lid
      const c = 1 - o, h = e.bottom - e.top, u = clamp(lx / (h * 0.8), -1, 1);
      ly = e.top + (ly - e.top) * (1 - 0.55 * c) + c * (closed - 3 - e.top) + c * h * 0.18 * (1 - u * u);
    } else {
      ly = closed + (ly - closed) * o;
      // the iris moves in proportion to the eye (a fixed few pixels would vanish on a big picture)
      if (name.startsWith("iris")) { const h = e.bottom - e.top; lx += P.eyeBallX * h * 0.11; ly -= P.eyeBallY * h * 0.07 * o; }
    }
    return [e.cx + lx * ec - ly * es, e.cy + lx * es + ly * ec];
  }

  function hair(x, y, P, t) {
    const dx = x - HR.x, dy = y - HR.y, dist = Math.hypot(dx, dy) || 1;
    const follow = 1 - smooth((dist - HR.follow[0]) / HR.follow[1]);   // near the head: moves with the head
    let flow = smooth((dist - HR.flow[0]) / HR.flow[1]) ** 1.5;         // far out: wind and inertia (mostly the tips)
    if (HR.minY) flow *= smooth((y - HR.minY) / 300);                 // hair held up above this line stays put
    const tip = flow * flow;
    const ux = dx / dist, uy = dy / dist;                               // along the strands
    // bunches of strands are a little out of step with each other, but the hair moves as hair, not as seaweed:
    // a slow sway that is nearly in phase from root to tip, and only a faint ripple toward the tips
    const ang = Math.atan2(dy, dx);
    const ph = 0.6 * Math.sin(ang * 3 + 0.7) + 0.35 * Math.sin(ang * 7 + 2.1);
    const g = P.gust;
    const sway = Math.sin(t * 0.9 - dist * 0.0025 + ph) * 0.8 + 0.2 * Math.sin(t * 1.7 - dist * 0.004 + ph * 1.5);
    const ripple = Math.sin(t * 2.6 - dist * 0.012 + ph * 2) * 0.35 * tip;
    const amp = HR.amp * 1.4 * flow * wind * (0.55 + 0.45 * g);   // (x1.4: a little livelier than the first tuning)
    x += -uy * (sway + ripple) * amp + ux * (g - 0.85) * 4 * flow * wind;
    y += ux * (sway + ripple) * amp * 0.8 + uy * (g - 0.85) * 2 * flow * wind;
    x += phys.x.x * flow; y += phys.y.x * flow * 0.6;
    // the bangs and the crown: barely moving (stops above the eyes)
    const crown = smooth((HR.crownY - y) / 140) * (1 - smooth((dist - HR.crownDist) / 200));
    if (crown > 0) {
      x += crown * wind * (0.9 * Math.sin(t * 1.1 + x * 0.012) + phys.x.x * 0.12);
      y += crown * wind * 0.4 * Math.sin(t * 0.9 + x * 0.02);
    }
    // the tuft on top bobs around its root
    if (AH && y < AH.y && Math.abs(x - AH.x) < AH.half) {
      const w = smooth((AH.y - y) / (AH.y - AH.top));
      [x, y] = rot(x, y, AH.x, AH.y, w * (phys.ahoge.x * 1.0 + Math.sin(t * 1.6) * 1.1 * wind));
    }
    // the bangs hang in front of the face: when the head turns they swing a little further than the face
    // (parallax between the front hair and the face behind it)
    const fromFace = Math.hypot(x - HD.x, y - HD.y);
    const bangs = smooth((HD.y - y) / (HD.r * 0.35)) * (1 - smooth((fromFace - HD.r * 0.85) / (HD.r * 0.4)));
    return head(x, y, follow * (1 + (HD.bangs ?? 0.22) * bangs), P);
  }

  // ---- v2: the front hair (bangs, the crown, strands lying over the face) is its own layer. It moves with the head
  // as one piece (no follow gradient, so nothing in the face area is stretched), the bangs swing a little further
  // than the face (parallax), and only the strands hanging below the eyes sway a little.
  const eyeY = R.eyes ? Object.values(R.eyes).reduce((s, e) => s + e.cy, 0) / Object.values(R.eyes).length : HD.y;
  const chinY = HD.y + HD.r * 0.95;
  function hairFront(x, y, P, t) {
    // the tuft on top bobs around its root
    if (AH && y < AH.y && Math.abs(x - AH.x) < AH.half) {
      const w = smooth((AH.y - y) / (AH.y - AH.top));
      [x, y] = rot(x, y, AH.x, AH.y, w * (phys.ahoge.x * 1.0 + Math.sin(t * 1.6) * 1.1 * wind));
    }
    // the crown: a faint breathing sway
    const crown = smooth((HR.crownY - y) / 140);
    if (crown > 0) {
      x += crown * wind * (0.7 * Math.sin(t * 1.1 + x * 0.012) + phys.x.x * 0.1);
      y += crown * wind * 0.3 * Math.sin(t * 0.9 + x * 0.02);
    }
    // strands that hang below the eye line: the lower, the more they sway
    const low = smooth((y - eyeY) / Math.max(1, chinY - eyeY));
    if (low > 0) {
      x += low * wind * (1.6 * Math.sin(t * 1.3 + y * 0.01) + phys.x.x * 0.35);
      y += low * wind * 0.5 * Math.sin(t * 1.7 + x * 0.015);
    }
    const fromFace = Math.hypot(x - HD.x, y - HD.y);
    const bangs = smooth((HD.y - y) / (HD.r * 0.35)) * (1 - smooth((fromFace - HD.r * 0.85) / (HD.r * 0.4)));
    return head(x, y, 1 + (HD.bangs ?? 0.22) * bangs, P);
  }

  // the mouth: the line is the upper lip (it smiles: the corners rise), the inside hangs from it and opens down.
  // The line is a parabola through the corners: top(x) = top + curve * ((x - cx) / half)^2
  function mouth(name, x, y, P) {
    const M = R.mouth;
    const u = clamp((x - M.cx) / M.half, -1.2, 1.2);
    const line = M.top + M.curve * u * u;
    const lift = P.mouthForm * M.smile * u * u;             // corners up for a smile
    if (name === "mouth") return [M.cx + (x - M.cx) * (1 + 0.04 * P.mouthOpen), y - lift - P.mouthOpen * M.smile * 0.15];
    const o = clamp(P.mouthOpen, 0, 1);
    return [M.cx + (x - M.cx) * (0.85 + 0.15 * o), line - lift + (y - line) * o];
  }

  // a cloth part (its own layer, cut out by build_generic.py): it hangs from its pivot and swings as one piece,
  // the near end stays attached and the far end lags a little more (the cloth bends), like a pendulum
  function clothPart(name, x, y) {
    const st = phys.parts[name.slice(5)];
    if (!st) return [x, y];
    const c = st.c, dx = x - c.pivot[0], dy = y - c.pivot[1];
    const u = clamp(Math.hypot(dx, dy) / c.len, 0, 1);
    const deg = st.a * smooth(u / 0.3) + (st.tip - st.a) * u * u;
    return rot(x, y, c.pivot[0], c.pivot[1], deg);
  }

  // the skirt hem sways a little (the waist stays put)
  function skirt(x, y, P, t) {
    const S = R.skirt;
    const w = smooth((y - S.top) / (S.hem - S.top)) ** 2 * (1 - smooth((y - S.hem) / (S.end - S.hem)));
    if (w <= 0) return [x, y];
    x += w * (S.amp * wind * (0.7 * Math.sin(t * 1.3 + x * 0.012) + 0.3 * Math.sin(t * 2.1 + x * 0.03)) + phys.x.x * 0.12);
    y += w * S.amp * 0.3 * wind * Math.sin(t * 1.7 + x * 0.02);
    return [x, y];
  }

  const deform = function deform(name, x, y, P, t) {
    if (name === "hair_front") [x, y] = hairFront(x, y, P, t);
    else if (name.startsWith("hair")) [x, y] = hair(x, y, P, t);   // hair_side_L/R, hair_back (and the v1 "hair" sheet)
    else if (name === "face") [x, y] = head(x, y, 1, P);           // v2: the skin is one rigid piece with the head
    else if (name === "hand") {
      // a hand on its own: turns a little round the wrist and follows the head
      [x, y] = rot(x, y, R.hand.pivot[0], R.hand.pivot[1], P.hand);
      [x, y] = head(x, y, R.hand.head, P);
    } else if (name === "arm_front") {
      // the raised arm: the hand at the chin follows the head, the elbow stays
      const w = smooth((R.arm.from - y) / R.arm.len);
      [x, y] = head(x, y, R.arm.head * w, P);
    } else if (name === "mouth" || name === "mouth_inside") {
      [x, y] = mouth(name, x, y, P);
      [x, y] = head(x, y, 1, P);
    } else if (name.startsWith("follow_")) {
      // a part in front that goes with the head (a hand at the cheek), a little less than the face
      [x, y] = head(x, y, R.follow ?? 0.8, P);
    } else if (name.startsWith("part_")) {
      [x, y] = clothPart(name, x, y);
    } else if (name === "body" || name === "arm" || name.startsWith("still_")) {
      if (R.skirt && name === "body") [x, y] = skirt(x, y, P, t);
    } else {
      // eyes (the bang strands in front of them only follow the head)
      if (!name.includes("strands")) [x, y] = eye(name, x, y, P);
      [x, y] = head(x, y, 1, P);
    }
    return body(x, y, P);
  };
  deform.bodyAt = (x, y, P) => body(x, y, P);   // where a point of the body is (for the cloth's inertia)
  return deform;
}

// ---------------------------------------------------------------- WebGL
const VS = `attribute vec2 aPos; attribute vec2 aUv; attribute float aFade; uniform vec2 uView; uniform vec3 uXf;
varying vec2 vUv; varying float vFade;
void main(){ vUv = aUv; vFade = aFade; vec2 p = (aPos * uXf.x + uXf.yz) / uView * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); }`;
const FS = `precision mediump float; varying vec2 vUv; varying float vFade; uniform sampler2D uTex; uniform float uAlpha;
void main(){ gl_FragColor = texture2D(uTex, vUv) * vFade * uAlpha; }`;
const FS_MASK = `precision mediump float; varying vec2 vUv; varying float vFade; uniform sampler2D uTex;
void main(){ if (texture2D(uTex, vUv).a < 0.5) discard; gl_FragColor = vec4(0.0); }`;

function compile(gl, vs, fs) {
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = () => rej(new Error("cannot load " + url)); im.src = url;
  });
}

function texture(gl, image) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** A grid mesh over one part. Positions are rewritten every frame. */
function buildMesh(L, cells) {
  const cell = cells?.[L.name] ?? DEFAULT_CELL;
  const nx = clamp(Math.round(L.w / cell), 2, 60), ny = clamp(Math.round(L.h / cell), 2, 70);
  const rest = [], uv = [], idx = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    rest.push(L.x + (i / nx) * L.w, L.y + (j / ny) * L.h);
    uv.push(i / nx, j / ny);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  return { name: L.name, rest: new Float32Array(rest), pos: new Float32Array(rest.length), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
}

/**
 * Fade toward the picture edges where the picture cuts her off (hair, arms), so a picture standing in the
 * middle of the screen has no straight vertical edge. The fade line wobbles a little, like loose strands.
 * edges: { left: px, right: px } fade widths in picture pixels (0 = no fade).
 */
function edgeFade(x, y, view, edges) {
  let k = 1;
  for (const side of ["left", "right"]) {
    const w = edges?.[side];
    if (!w) continue;
    const d = side === "left" ? x - view[0] : view[2] - x;
    const wob = w * (0.12 * Math.sin(y * 0.006 + (side === "left" ? 0 : 2)) + 0.05 * Math.sin(y * 0.021 + 1.3));
    const f = clamp((d - w * 0.05 + wob) / w, 0, 1);
    k = Math.min(k, f * f * f * (f * (f * 6 - 15) + 10)); // smootherstep: no visible start or end of the fade
  }
  return k;
}

/** Where the picture goes on the canvas (CSS px): fit `view` (a rect of the picture) into the canvas. */
export function fitLayout(cssW, cssH, opts = {}) {
  const view = opts.view;                           // the part of the picture to show (x0, y0, x1, y1)
  const s = Math.min(cssW / (view[2] - view[0]), cssH / (view[3] - view[1])) * (opts.zoom ?? 1);
  const w = (view[2] - view[0]) * s;
  const align = opts.align ?? "center";
  const margin = (opts.margin ?? 0) * cssW;
  const left = opts.centerX !== undefined ? cssW * opts.centerX - w / 2   // centred on a fraction of the width
    : align === "right" ? cssW - w - margin : align === "left" ? margin : (cssW - w) / 2;
  return { s, ox: left - view[0] * s, oy: cssH - view[3] * s }; // the bottom of the picture sits on the bottom edge
}

/**
 * Start the rig on a canvas. Resolves once the images are loaded and the first frame is queued.
 * options: {
 *   modelUrl,                 url of the model JSON (export_web.py)
 *   layout(cssW, cssH, view), -> {s, ox, oy}: picture px -> canvas CSS px (default: fitLayout centred);
 *                             view is the picture rect to show, from the model
 *   look(),                   -> {x, y} in canvas CSS px of the pointer, or null (idle)
 *   wind,                     hair wind strength (default 1)
 *   edges,                    {left, right}: fade widths (picture px) at picture edges that cut her off,
 *                             or a function (rig settings) -> {left, right}
 *   params,                   fixed parameter values (for testing)
 *   time,                     fixed time in seconds (for testing)
 * }
 * Returns { stop(), setPaused(bool) }.
 */
export async function startItukiRig(canvas, options) {
  const base = options.modelUrl.replace(/[^/]*$/, "");
  const model = await (await fetch(options.modelUrl)).json();
  const R = model.rig;
  // no MSAA: the parts are textures with soft alpha edges, and a screen-sized multisample buffer per picture
  // costs a lot of GPU memory
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, stencil: true, powerPreference: "low-power" });
  if (!gl) throw new Error("WebGL is not available");

  const program = (fs) => {
    const p = compile(gl, VS, fs);
    return { p, aPos: gl.getAttribLocation(p, "aPos"), aUv: gl.getAttribLocation(p, "aUv"), aFade: gl.getAttribLocation(p, "aFade"),
      uView: gl.getUniformLocation(p, "uView"), uXf: gl.getUniformLocation(p, "uXf"), uAlpha: gl.getUniformLocation(p, "uAlpha") };
  };
  const main = program(FS), mask = program(FS_MASK);
  let cur = main, view = [1, 1], xf = [1, 0, 0];
  const use = (pr) => {
    cur = pr; gl.useProgram(pr.p);
    gl.uniform2f(pr.uView, view[0], view[1]); gl.uniform3f(pr.uXf, xf[0], xf[1], xf[2]);
    gl.enableVertexAttribArray(pr.aPos); gl.enableVertexAttribArray(pr.aUv);
    if (pr.aFade >= 0) gl.enableVertexAttribArray(pr.aFade);
  };

  const images = await Promise.all(model.layers.map((L) => loadImage(base + L.file)));
  const edges = typeof options.edges === "function" ? options.edges(R) : options.edges;
  const meshes = model.layers.map((L, i) => {
    const m = buildMesh(L, R.cells);
    m.tex = texture(gl, images[i]);
    m.posBuf = gl.createBuffer(); m.uvBuf = gl.createBuffer(); m.idxBuf = gl.createBuffer(); m.fadeBuf = gl.createBuffer();
    const fade = new Float32Array(m.rest.length / 2);
    for (let k = 0; k < fade.length; k++) fade[k] = edgeFade(m.rest[2 * k], m.rest[2 * k + 1], R.view, edges);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.fadeBuf); gl.bufferData(gl.ARRAY_BUFFER, fade, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.uvBuf); gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    return m;
  });
  const byName = Object.fromEntries(meshes.map((m) => [m.name, m]));
  // the iris is drawn only where its eye white is (stencil = Live2D clipping)
  const whiteOf = { iris_L: "eye_white_L", iris_R: "eye_white_R" };

  const phys = {
    x: new Spring(1.0, 0.35, 0.06), y: new Spring(1.2, 0.4, 0.04), ahoge: new Spring(2.2, 0.25, 0.08, 10),
  };
  // each cloth part: a pendulum (angle a, degrees) and its tip that follows a little later
  phys.parts = Object.fromEntries(Object.entries(R.parts ?? {}).map(([n, c], i) => [n, { c, i, a: 0, v: 0, tip: 0, tv: 0 }]));
  const deform = makeDeformer(R, phys, options.wind ?? 1);
  const animator = createAnimator();
  const layout = options.layout ?? ((w, h, v) => fitLayout(w, h, { view: v }));

  let prevHead = null, prevVel = { x: 0, y: 0 }, acc = { x: 0, y: 0 };
  let prevBody = null, bodyVel = 0, bodyAcc = 0;
  let raf = 0, last = performance.now(), t = 0, running = true, paused = false;

  function draw(m, alpha = 1) {
    if (cur.uAlpha) gl.uniform1f(cur.uAlpha, alpha);
    gl.bindTexture(gl.TEXTURE_2D, m.tex);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.posBuf); gl.vertexAttribPointer(cur.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.uvBuf); gl.vertexAttribPointer(cur.aUv, 2, gl.FLOAT, false, 0, 0);
    if (cur.aFade >= 0) { gl.bindBuffer(gl.ARRAY_BUFFER, m.fadeBuf); gl.vertexAttribPointer(cur.aFade, 1, gl.FLOAT, false, 0, 0); }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idxBuf);
    gl.drawElements(gl.TRIANGLES, m.idx.length, gl.UNSIGNED_SHORT, 0);
  }

  function frame(now) {
    raf = 0;
    if (!running || paused) return;
    // ~40 frames a second is smooth for this kind of motion and halves the work of a 60 Hz loop
    if (now - last < 1000 / (options.fps ?? 40) - 2) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min((now - last) / 1000, 1 / 20); last = now; t += dt;
    const time = options.time ?? t;

    // the picture is laid out on the whole window, but the canvas only covers where she is (plus room for
    // her hair to move): a window-sized drawing buffer per picture would cost a lot of GPU memory
    const dpr = Math.min(window.devicePixelRatio || 1, options.maxDpr ?? 1.5); // the textures hold no more detail than this
    const cssW = window.innerWidth, cssH = window.innerHeight;
    const L = layout(cssW, cssH, R.view);
    const v = R.view, pad = 0.08 * (v[3] - v[1]) * L.s;
    const bx = Math.max(0, Math.floor(L.ox + v[0] * L.s - pad)), by = Math.max(0, Math.floor(L.oy + v[1] * L.s - pad));
    const bw = Math.min(cssW, Math.ceil(L.ox + v[2] * L.s + pad)) - bx, bh = Math.min(cssH, Math.ceil(L.oy + v[3] * L.s + pad)) - by;
    const key = `${bx},${by},${bw},${bh}`;
    if (canvas.dataset.box !== key) {
      Object.assign(canvas.style, { inset: "auto", left: bx + "px", top: by + "px", width: Math.max(1, bw) + "px", height: Math.max(1, bh) + "px" });
      canvas.dataset.box = key;
    }
    const w = Math.max(1, Math.round(bw * dpr)), h = Math.max(1, Math.round(bh * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    view = [w, h]; xf = [L.s * dpr, (L.ox - bx) * dpr, (L.oy - by) * dpr];

    // where she looks: the pointer direction from her face, -1..1 (+y up)
    let look = null;
    const p = options.look?.();
    if (p) {
      const fx = L.ox + R.head.x * L.s, fy = L.oy + R.head.y * L.s;
      look = { x: clamp((p.x - fx) / (cssW * 0.4), -1, 1), y: clamp(-(p.y - fy) / (cssH * 0.45), -1, 1) };
    }
    const P = animator.update(t, dt, look);
    // 動きの強さ（アプリ側の調整）。首・体の動きを抑えて、目と顔の動きを中心にする。
    //   head: 顔の向き（angleX/Y）の倍率  tilt: 首のかしげ（angleZ）の倍率  body: 体の揺れと呼吸の倍率
    if (options.motion) {
      const m = options.motion;
      P.angleX *= m.head ?? 1; P.angleY *= m.head ?? 1; P.angleZ *= m.tilt ?? 1;
      P.bodyX *= m.body ?? 1; P.bodyZ *= m.body ?? 1; P.breath *= m.body ?? 1;
    }
    if (options.params) Object.assign(P, options.params);

    // physics: the hair follows how fast the top of the head moves
    const hp = deform("eye_strands", R.head.x, R.head.y - R.head.r, P, time);
    if (prevHead) {
      const vx = (hp[0] - prevHead[0]) / dt, vy = (hp[1] - prevHead[1]) / dt;
      acc = { x: lerp(acc.x, (vx - prevVel.x) / dt, 0.5), y: lerp(acc.y, (vy - prevVel.y) / dt, 0.5) };
      prevVel = { x: vx, y: vy };
    }
    prevHead = hp;
    phys.x.step(acc.x, dt); phys.y.step(acc.y, dt); phys.ahoge.step(acc.x + acc.y * 0.4, dt);
    // the cloth lags behind the body's sway (a point on the chest)
    if (R.parts) {
      const bp = deform.bodyAt(R.head.x, R.neck.y + R.head.r, P);
      if (prevBody) {
        const v = (bp[0] - prevBody[0]) / dt;
        bodyAcc = lerp(bodyAcc, (v - bodyVel) / dt, 0.4); bodyVel = v;
      }
      prevBody = bp;
      const wind = options.wind ?? 1;
      for (const st of Object.values(phys.parts)) {
        const c = st.c, w0 = 2 * Math.PI * c.freq, w1 = w0 * 1.7;
        // where the breeze holds it: a slow, uneven lean (no steady wave)
        const breeze = wind * c.amp * (0.55 * Math.sin(time * 0.31 + st.i * 1.9) + 0.3 * Math.sin(time * 0.53 + st.i * 3.1)) * (0.5 + 0.5 * P.gust);
        // the body's sway throws it the other way (inertia)
        const push = -bodyAcc * c.amp * 0.0025;
        st.v += (-w0 * w0 * (st.a - breeze) - 2 * 0.14 * w0 * st.v + push * w0 * w0) * dt;
        st.a = clamp(st.a + st.v * dt, -c.amp * 3, c.amp * 3);
        st.tv += (-w1 * w1 * (st.tip - st.a) - 2 * 0.22 * w1 * st.tv) * dt;
        st.tip = clamp(st.tip + st.tv * dt, -c.amp * 4, c.amp * 4);
      }
    }

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    use(main);

    for (const m of meshes) {
      for (let k = 0; k < m.rest.length; k += 2) {
        const [x, y] = deform(m.name, m.rest[k], m.rest[k + 1], P, time);
        m.pos[k] = x; m.pos[k + 1] = y;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, m.posBuf); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.DYNAMIC_DRAW);
    }
    for (const m of meshes) {
      const white = whiteOf[m.name];
      if (white) {
        // write the eye white's shape into the stencil, then draw the iris only inside it
        gl.enable(gl.STENCIL_TEST);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.ALWAYS, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        use(mask);
        draw(byName[white]);
        use(main);
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.EQUAL, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        draw(m);
        gl.disable(gl.STENCIL_TEST);
      } else {
        // the inside of the mouth only shows once it is a little open
        draw(m, m.name === "mouth_inside" ? smooth(P.mouthOpen / 0.12) : 1);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return {
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    setPaused(v) {
      paused = !!v;
      if (!paused && running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
  };
}
