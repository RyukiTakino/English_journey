/**
 * 読み上げの操作パネル（再生／一時停止・最初から・速さ・進み具合）
 *
 * 層：ui
 * 担当：フロント
 *
 * リーディングの「記事を読み上げる」と、リスニングの NewsPlayer の両方で使う共通部品。
 * Speech（infrastructure/speech.js）を操作して、状態を画面に映すだけで、音声そのものは扱わない。
 *
 * 使い方:
 *   const sc = new SpeechControls(speech, { getText: () => "英文", label: "記事を読み上げる", big: false });
 *   root.innerHTML = sc.render();   // HTML の文字列を返す
 *   sc.mount(root);                 // イベントを付ける（root は render の HTML を含む要素）
 *   sc.destroy();                   // 画面を離れるとき。読み上げを止める
 */
import { icon } from "./icons.js";
import { esc } from "./html.js";

/** 選べる速さ */
const RATES = [0.8, 1, 1.2];
/** 1 秒あたりに読む単語数の目安（所要時間の表示用。ざっくりでよい） */
const WORDS_PER_SEC = 2.6;

/** 秒 → "1:05" */
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export class SpeechControls {
  #speech;
  #getText;
  #label;
  #big;
  #root = null;
  #rate = 1;
  /** 読み上げの進み具合 0〜1 */
  #progress = 0;
  /** 今の自分の読み上げの状態。Speech は単語の発音でも使い回すので、自分用に持っておく */
  #state = "idle";
  /** 止めた位置（文字数）。再生ボタンで、ここから続きを読む */
  #pos = 0;
  /** 読み上げを始めるたびに増える番号。古い読み上げのコールバックを無視するために使う */
  #gen = 0;

  /**
   * @param {import("../../infrastructure/speech.js").Speech} speech
   * @param {{getText: () => string, label?: string, big?: boolean}} options
   *   getText … 読み上げる英文を返す関数 / big … 大きな再生ボタンにする（ニュース用）
   */
  constructor(speech, { getText, label = "読み上げ", big = false }) {
    this.#speech = speech;
    this.#getText = getText;
    this.#label = label;
    this.#big = big;
  }

  /** 音声合成が使えるか（使えないときの代わりの表示は、呼ぶ側で決める） */
  get isSupported() {
    return this.#speech.isSupported;
  }

  /** @returns {string} HTML */
  render() {
    if (!this.isSupported) {
      return `<div class="sc sc--off"><p class="sc__note" role="status">${icon("mute", 18)} このブラウザは音声の読み上げに対応していません。英文を目で読んでください。</p></div>`;
    }
    const rates = RATES.map(
      (r) => `<button type="button" class="sc__rate" data-rate="${r}" aria-pressed="${r === this.#rate}">${r === 1 ? "1.0" : r}x</button>`
    ).join("");
    return `
      <div class="sc ${this.#big ? "sc--big" : ""}">
        <div class="sc__main">
          <button type="button" class="sc__play" data-play aria-label="再生">${icon("play", this.#big ? 34 : 24)}</button>
          <div class="sc__info">
            <div class="sc__label">${esc(this.#label)}</div>
            <div class="sc__bar" role="progressbar" aria-label="再生の進み具合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-fill></i></div>
            <div class="sc__time muted small" data-time aria-hidden="true"></div>
          </div>
          <button type="button" class="sc__sub" data-restart aria-label="最初から">${icon("refresh", 20)}</button>
        </div>
        <div class="sc__rates" role="group" aria-label="読み上げの速さ"><span class="sc__rates-label muted small">速さ</span>${rates}</div>
        <p class="sc__note small" data-note role="status" hidden></p>
      </div>`;
  }

  /** @param {HTMLElement} root render() の HTML が入っている要素 */
  mount(root) {
    this.#root = root;
    this.#paint();
    root.querySelector("[data-play]")?.addEventListener("click", () => this.#toggle());
    root.querySelector("[data-restart]")?.addEventListener("click", () => this.#begin(0));
    root.querySelectorAll("[data-rate]").forEach((b) =>
      b.addEventListener("click", () => {
        this.#rate = Number(b.dataset.rate);
        // 動いている最中・一時停止中なら、新しい速さで今の位置から読み直す
        if (this.#state !== "idle") this.#begin(this.#pos);
        else this.#paint();
      })
    );
  }

  /** 読み上げを止めて位置も戻す（画面を離れるとき・別の操作のとき） */
  stop() {
    this.#gen++; // 進行中のコールバックを無効にする
    if (this.#state !== "idle") this.#speech.stop();
    this.#state = "idle";
    this.#pos = 0;
    this.#progress = 0;
    this.#paint();
  }

  /** 画面を離れるときに呼ぶ */
  destroy() {
    this.stop();
    this.#root = null;
  }

  // ---------- 内部 ----------

  /** 再生ボタン：停止中→再生、再生中→一時停止、一時停止中→再開 */
  #toggle() {
    if (this.#state === "playing") {
      this.#speech.pause();
    } else if (this.#state === "paused") {
      this.#speech.resume();
      this.#state = "playing";
      this.#paint();
    } else {
      this.#begin(this.#progress >= 1 ? 0 : this.#pos);
    }
  }

  /** 指定した文字位置から読み始める */
  #begin(from) {
    const gen = ++this.#gen;
    const text = this.#getText();
    this.#pos = from;
    this.#progress = text.length ? from / text.length : 0;
    this.#state = "playing";
    this.#note("");
    this.#paint();
    // ここから下のコールバックは、gen が変わっていたら（＝別の読み上げが始まっていたら）何もしない
    this.#speech.speak(text, {
      rate: this.#rate,
      from,
      onboundary: ({ charIndex, total }) => {
        if (gen !== this.#gen) return;
        this.#pos = charIndex;
        this.#progress = total ? charIndex / total : 0;
        this.#paint();
      },
      onend: (reason) => {
        if (gen !== this.#gen) return;
        if (reason === "ended") {
          this.#state = "idle";
          this.#pos = 0;
          this.#progress = 1;
        } else if (reason === "paused") {
          this.#state = "paused";
        } else if (reason === "error") {
          this.#state = "idle";
          this.#note("音声を再生できませんでした。この端末に英語の音声が入っていないかもしれません。");
        } else {
          this.#state = "idle"; // stopped（単語の発音など、別の読み上げに切り替わった）
        }
        this.#paint();
      }
    });
  }

  #note(text) {
    const el = this.#root?.querySelector("[data-note]");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  /** 状態を画面に反映する */
  #paint() {
    const root = this.#root;
    if (!root) return;
    const playing = this.#state === "playing";
    const play = root.querySelector("[data-play]");
    if (play) {
      play.innerHTML = icon(playing ? "pause" : "play", this.#big ? 34 : 24);
      play.setAttribute("aria-label", playing ? "一時停止" : this.#state === "paused" ? "再開" : this.#progress >= 1 ? "もう一度再生" : "再生");
      play.classList.toggle("is-playing", playing);
    }
    root.querySelectorAll("[data-rate]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.rate) === this.#rate)));
    const pct = Math.round(this.#progress * 100);
    const fill = root.querySelector("[data-fill]");
    if (fill) fill.style.width = `${pct}%`;
    root.querySelector(".sc__bar")?.setAttribute("aria-valuenow", String(pct));
    const time = root.querySelector("[data-time]");
    if (time) {
      const words = this.#getText().trim().split(/\s+/).length;
      const total = words / WORDS_PER_SEC / this.#rate; // 目安の長さ（秒）
      time.textContent = `${mmss(total * this.#progress)} / 約 ${mmss(total)}`;
    }
  }
}
