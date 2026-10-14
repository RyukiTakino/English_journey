/**
 * 案内キャラクター（Live2D 風に動く）
 *
 * 層：ui
 * 担当：フロント
 *
 * まばたき・視線のマウス追従・髪の揺れ・呼吸で動く旅人のキャラクターです。
 * 表情ごとに別の絵（モデル）を用意してあり、切り替えるときは重ねて、ふわっと入れ替えます。
 *   neutral（基本） / happy（喜び） / sad（困り顔）
 *
 * ■ 画面ごとに作り直さない
 *   WebGL の描画面（コンテキスト）は数が限られ、作り直しは重いので、アプリ全体で 1 つだけ作って常駐させます
 *   （main.js で作り、ctx.guide として画面に渡す）。画面は setMode() で「大きく出す／隅に出す／隠す」を切り替えます。
 *
 * ■ 描画の仕組み
 *   動かす本体は js/vendor/live2d-rig.js（自作のリグ。WebGL）。ここはそれを呼んで、置き場所と表情の切り替えを行います。
 *   絵の作り方・動きの確認方法は docs/character-prompt.md と、D:\WineEngine\Tools\Live2D の README を参照。
 *
 * （Unity でいう、Animator を持った常駐の GameObject＋表情ごとの Prefab を切り替えるコンポーネントに近いものです）
 */
import { startItukiRig } from "../../vendor/live2d-rig.js";
import { esc } from "./html.js";

/**
 * 表情 → モデルの場所。キーは setExpression() で使う名前。
 * このファイルの場所（import.meta.url）を基準にするので、どのページから使っても同じ場所を指す。
 * （C# でいう、実行ファイルの場所を基準にしたパスに近い）
 */
const assetUrl = (path) => new URL(`../../../assets/${path}`, import.meta.url).href;
const MODELS = {
  neutral: assetUrl("characters/guide/guide.json"),
  happy: assetUrl("characters/guide_happy/guide_happy.json"),
  sad: assetUrl("characters/guide_sad/guide_sad.json")
};

/**
 * 表示モードごとの「絵のどの範囲を見せるか」。単位は元の絵（1731×2596）のピクセル。
 *   hero   … 大きく。胸から上（ホームなど）
 *   corner … 隅に小さく。顔と肩（学習中など）
 */
const CROPS = {
  hero: { x0: 120, y0: 120, x1: 1620, y1: 1680 },
  corner: { x0: 330, y0: 180, x1: 1430, y1: 1420 }
};

/** 表情を切り替える長さ（ミリ秒）。CSS の transition と合わせる */
const FADE_MS = 280;

export class Guide {
  #root;
  #stage;
  #bubble;
  /** 表情ごとの { canvas, handle, ready } */
  #layers = new Map();
  #expression = "neutral";
  #mode = "hero";
  #pointer = null;
  #revertTimer = 0;
  #bubbleTimer = 0;
  #destroyed = false;
  #unbind = [];

  /**
   * @param {HTMLElement} root キャラクターを入れる要素（index.html の #guide）
   */
  constructor(root) {
    this.#root = root;
    this.#root.innerHTML = `
      <div class="guide__stage" aria-hidden="true"></div>
      <div class="guide__bubble" role="status" aria-live="polite" hidden></div>`;
    this.#stage = this.#root.querySelector(".guide__stage");
    this.#bubble = this.#root.querySelector(".guide__bubble");
    this.#applyMode();
  }

  /**
   * 描画を始める。まず基本の絵を出し、ほかの表情は後から読み込む。
   * WebGL が使えないときは何も出さずに終わる（アプリの動作は止めない）。
   * @returns {Promise<void>}
   */
  async start() {
    // マウス・タッチの位置。視線がこれを追う。ウィンドウから出たら、追うのをやめる
    const move = (e) => { this.#pointer = { x: e.clientX, y: e.clientY }; };
    const leave = () => { this.#pointer = null; };
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    this.#unbind.push(() => removeEventListener("pointermove", move), () => document.removeEventListener("pointerleave", leave));

    try {
      await this.#load("neutral");
    } catch (e) {
      console.warn("[guide] キャラクターを表示できません（WebGL が使えない可能性）", e);
      this.#root.hidden = true;
      return;
    }
    this.#show("neutral");
    // ほかの表情は、最初の絵が出たあとに少しずつ読み込む（初回表示を遅らせない）
    for (const name of ["happy", "sad"]) {
      await this.#load(name).catch((e) => console.warn(`[guide] ${name} を読み込めません`, e));
      this.#syncActive();
    }
  }

  /**
   * 表示モードを切り替える。
   * hero のときは、画面の中の置き場所（slot）に移って大きく出る。それ以外は、画面の隅（body 直下）に出る。
   * 要素を移しても、描画（WebGL）は作り直されず、そのまま続く。
   * @param {"hero"|"corner"|"hidden"} mode
   * @param {HTMLElement|null} [slot] hero のときの置き場所。無ければ隅に出す
   */
  setMode(mode, slot = null) {
    const inSlot = mode === "hero" && slot;
    this.#mode = mode === "hero" && !slot ? "corner" : mode;
    const parent = inSlot ? slot : document.body;
    if (this.#root.parentElement !== parent) parent.append(this.#root);
    this.#applyMode();
  }

  /**
   * 表情を切り替える。
   * @param {"neutral"|"happy"|"sad"} name
   */
  setExpression(name) {
    if (!MODELS[name] || !this.#layers.has(name)) return;
    clearTimeout(this.#revertTimer);
    this.#expression = name;
    this.#syncActive();
  }

  /**
   * ある表情を少しの間だけ見せて、基本の表情に戻す（正解・不正解の反応など）。
   * @param {"happy"|"sad"} name
   * @param {number} ms 見せる時間（ミリ秒）
   */
  react(name, ms = 2600) {
    this.setExpression(name);
    this.#root.classList.add("is-reacting");   // スマホでは、普段は隠れていて、反応するときだけ出る（guide.css）
    this.#revertTimer = setTimeout(() => {
      this.setExpression("neutral");
      this.#root.classList.remove("is-reacting");
    }, ms);
  }

  /**
   * ふきだしで一言しゃべる。
   * @param {string} text 画面に出せる短い文
   * @param {number} ms 表示する時間（ミリ秒）。0 なら出しっぱなし
   */
  say(text, ms = 3200) {
    clearTimeout(this.#bubbleTimer);
    this.#bubble.innerHTML = esc(text);
    this.#bubble.hidden = false;
    this.#root.classList.add("is-reacting");
    if (ms > 0) this.#bubbleTimer = setTimeout(() => { this.#bubble.hidden = true; this.#root.classList.remove("is-reacting"); }, ms);
  }

  /** ふきだしを消す */
  hush() {
    clearTimeout(this.#bubbleTimer);
    this.#bubble.hidden = true;
    this.#root.classList.remove("is-reacting");
  }

  /** 後片付け（描画を止める） */
  destroy() {
    this.#destroyed = true;
    clearTimeout(this.#revertTimer);
    clearTimeout(this.#bubbleTimer);
    this.#unbind.forEach((fn) => fn());
    for (const layer of this.#layers.values()) layer.handle?.stop();
    this.#layers.clear();
  }

  // ---------------------------------------------------------------- 内部

  /** 1つの表情ぶんのモデルを読み込んで、描画を始める */
  async #load(name) {
    if (this.#layers.has(name) || this.#destroyed) return;
    const canvas = document.createElement("canvas");
    canvas.className = "guide__canvas";
    this.#stage.append(canvas);
    const layer = { canvas, handle: null };
    this.#layers.set(name, layer);
    try {
      layer.handle = await startItukiRig(canvas, {
        modelUrl: MODELS[name],
        // 画面全体ではなく、この要素の中に収まるように置く（座標は要素の左上が原点）
        layout: (_w, _h, view) => this.#layout(view),
        // マウスの位置を、要素の左上を原点とした座標にして渡す
        look: () => this.#lookTarget(),
        // 絵の左右の端で体が切れているので、端をぼかして背景になじませる
        edges: (rig) => {
          const w = (rig.view[2] - rig.view[0]) * 0.1;
          return { left: w, right: w };
        },
        // 首・体は動かさず、目（視線・まばたき）と、ごく小さな顔のずれだけにする。顔は変形させず、平行に動かす（曲がって見えないように）。髪は、ほんの少し揺らす
        motion: { rigid: true, head: 0.7, tilt: 0, body: 0, mouth: 0 },
        wind: 0.5,
        maxDpr: 1.5
      });
    } catch (e) {
      canvas.remove();
      this.#layers.delete(name);
      throw e;
    }
    // 動きを減らす設定のときは、最初の1コマだけ描いて止める
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(() => layer.handle.setPaused(true), 600);
  }

  /** 絵の座標 → 要素内の座標への変換（live2d-rig の layout が受け取る形） */
  #layout(view) {
    const crop = CROPS[this.#mode] ?? CROPS.hero;
    const cw = this.#stage.clientWidth || 1;
    const ch = this.#stage.clientHeight || 1;
    const s = Math.min(cw / (crop.x1 - crop.x0), ch / (crop.y1 - crop.y0));
    // 横は中央に、縦は切り出した範囲の下端を要素の下端に合わせる
    const ox = (cw - (crop.x1 - crop.x0) * s) / 2 - crop.x0 * s;
    const oy = ch - crop.y1 * s;
    void view;
    return { s, ox, oy };
  }

  #lookTarget() {
    if (!this.#pointer || this.#mode === "hidden") return null;
    const r = this.#stage.getBoundingClientRect();
    return { x: this.#pointer.x - r.left, y: this.#pointer.y - r.top };
  }

  /** 今の表情だけを見せ、ほかは止める（止めると描画の負荷が減る） */
  #syncActive() {
    for (const [name, layer] of this.#layers) {
      const active = name === this.#expression;
      layer.canvas.classList.toggle("is-active", active);
      if (active) layer.handle?.setPaused(false);
      else setTimeout(() => {
        if (this.#expression !== name) layer.handle?.setPaused(true);
      }, FADE_MS + 40);
    }
  }

  #show(name) {
    this.#expression = name;
    this.#syncActive();
    this.#root.classList.add("is-ready");
  }

  #applyMode() {
    this.#root.classList.remove("guide--hero", "guide--corner", "guide--hidden");
    this.#root.classList.add(`guide--${this.#mode}`);
    this.#root.hidden = this.#mode === "hidden";
    // 隠れているあいだは描画を止める
    for (const layer of this.#layers.values()) layer.handle?.setPaused(this.#mode === "hidden" || !layer.canvas.classList.contains("is-active"));
  }
}
