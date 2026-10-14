/**
 * ニュースプレーヤー（リスニング画面の上の部分）
 *
 * 層：ui
 * 担当：フロント
 *
 * ・動画（news.video）があれば YouTube の埋め込み（プライバシー強化ドメイン youtube-nocookie.com）を 16:9 で出す
 * ・無ければ、原稿（news.script）をブラウザの音声合成で読み上げる（SpeechControls）
 * ・「原稿を見る」は最初は隠す（聞き取りの練習なので）。開くと、単語をタップして意味が見られる
 *   （単語のタップは、画面側で WordPopover.attach(root) していれば自動で効く）
 * ・音声合成が使えないブラウザでは、原稿を最初から出して、理由を書く
 *
 * 使い方:
 *   const player = new NewsPlayer(news, speech);
 *   root.innerHTML = player.render();  player.mount(root);  player.destroy();
 *
 * TODO(API): 本物のニュース音声（サーバーで作った音声ファイル）が使えるなら、<audio> に切り替える。
 * TODO(API): 動画は YouTube Data API 側の取得結果（news.video）次第。動画が無い国は読み上げになる。
 */
import { SpeechControls } from "./SpeechControls.js";
import { esc, tokenize } from "./html.js";
import { icon } from "./icons.js";
import { img } from "../assets.js";

export class NewsPlayer {
  #news;
  #controls;
  #root = null;
  #hl;

  /**
   * @param {import("../../domain/models.js").NewsItem} news
   * @param {import("../../infrastructure/speech.js").Speech} speech
   */
  constructor(news, speech) {
    this.#news = news;
    this.#hl = new Set(news.highlightWords);
    // 見出しも含めて読み上げる。句点が無い見出しは、文の区切りになるよう "." を足す
    const head = /[.!?]$/.test(news.headline.trim()) ? news.headline : `${news.headline}.`;
    this.#controls = new SpeechControls(speech, { getText: () => `${head}\n${news.script}`, label: "ニュースを聞く", big: true });
  }

  render() {
    const n = this.#news;
    const hasVideo = !!n.video;
    // 動画が無く、読み上げも使えないときだけ「原稿を最初から出す」
    const scriptOpen = !hasVideo && !this.#controls.isSupported;
    return `
      <section class="np card" aria-label="ニュース">
        <div class="np__head">
          ${img("mascot/bird-listen.png", { cls: "np__bird", width: 96 })}
          <div>
            <span class="chip chip--news">Listening</span>
            <h2 class="np__headline">${esc(n.headline)}</h2>
          </div>
        </div>
        ${
          hasVideo
            ? `<div class="np__video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(n.video.id)}" title="${esc(n.video.title)}"
                 loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
            : `<div data-controls>${this.#controls.render()}</div>`
        }
        ${scriptOpen ? "" : `<p class="np__hint muted small">まず聞いてみましょう。聞き取れなかったときは「原稿を見る」で確かめられます。</p>`}
        <button type="button" class="btn btn--ghost btn--sm np__toggle" data-toggle aria-expanded="${scriptOpen}" aria-controls="np-script">
          ${icon("bulb", 16)}<span data-toggle-label>${scriptOpen ? "原稿をかくす" : "原稿を見る"}</span>
        </button>
        <div class="np__script study-text" id="np-script" data-script ${scriptOpen ? "" : "hidden"}>
          ${n.script
            .split(/\n+/)
            .map((p) => `<p>${tokenize(p, this.#hl)}</p>`)
            .join("")}
          <p class="muted small np__script-tip">単語をタップすると、意味が見られます。</p>
        </div>
      </section>`;
  }

  /** @param {HTMLElement} root render() の HTML が入っている要素 */
  mount(root) {
    this.#root = root;
    const c = root.querySelector("[data-controls]");
    if (c) this.#controls.mount(c);
    root.querySelector("[data-toggle]")?.addEventListener("click", () => this.#setScript(root.querySelector("[data-script]").hidden));
  }

  /** 原稿を出す／隠す（採点後に自動で出すときにも使う） */
  showScript(show = true) {
    this.#setScript(show);
  }

  destroy() {
    this.#controls.destroy();
    this.#root = null;
  }

  #setScript(show) {
    const root = this.#root;
    if (!root) return;
    root.querySelector("[data-script]").hidden = !show;
    const btn = root.querySelector("[data-toggle]");
    btn.setAttribute("aria-expanded", String(show));
    btn.querySelector("[data-toggle-label]").textContent = show ? "原稿をかくす" : "原稿を見る";
  }
}
