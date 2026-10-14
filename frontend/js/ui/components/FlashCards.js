/**
 * 単語の復習カード（フラッシュカード）
 *
 * 層：ui
 * 担当：フロント（単語帳）
 *
 * 遊び方：表に英単語 → タップでめくって意味 → 「覚えた」か「もう一度」を選ぶ。
 * 全部終わると結果が出て、「もう一度」だけをやり直せる。
 *
 * ■ 作り
 *   - このクラスは「渡された要素（container）の中身」だけを書き換える。画面の他の部分は知らない。
 *   - 状態（今何枚目か、めくったか）はフィールドに持ち、変わるたびに #paint() で描き直す。
 *     （状態を変えるたびに UI を丸ごと作り直す、シンプルな方式）
 *   - 描き直すたびに要素が新しくなるので、イベントは container 1か所で受ける（イベント委譲）。
 */
import { esc } from "./html.js";
import { icon } from "./icons.js";
import { img } from "../assets.js";
import { cancelSpeech, speak, speechSupported } from "./speech.js";

export class FlashCards {
  #container;
  #onExit;
  /** 今回の出題（シャッフル済み） */
  #deck = [];
  #index = 0;
  #flipped = false;
  /** 「覚えた」「もう一度」を選んだ語 */
  #known = [];
  #again = [];
  /** イベントを外すための関数の一覧 */
  #detach = [];

  /**
   * @param {HTMLElement} container この中に描く
   * @param {import("../../domain/models.js").SavedWord[]} words 出題する語
   * @param {() => void} onExit 「単語帳に戻る」が押されたときに呼ぶ
   */
  constructor(container, words, onExit) {
    this.#container = container;
    this.#onExit = onExit;
    this.#start(words);

    const onClick = (e) => this.#onClick(e);
    const onKey = (e) => this.#onKey(e);
    container.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    this.#detach.push(
      () => container.removeEventListener("click", onClick),
      () => document.removeEventListener("keydown", onKey)
    );
  }

  /** 後片付け（イベント解除・読み上げ停止）。画面を離れるとき、モードを抜けるときに呼ぶ */
  destroy() {
    this.#detach.splice(0).forEach((fn) => fn());
    cancelSpeech();
  }

  // ---------- 状態の操作 ----------

  /** 出題をシャッフルして最初から */
  #start(words) {
    this.#deck = shuffle(words);
    this.#index = 0;
    this.#flipped = false;
    this.#known = [];
    this.#again = [];
    this.#paint();
  }

  #flip() {
    if (this.#index >= this.#deck.length) return;
    this.#flipped = !this.#flipped;
    this.#paint();
    this.#container.querySelector(".fc-flip")?.focus(); // 描き直しで要素が変わるので、フォーカスを戻す
  }

  /** 「覚えた」か「もう一度」を記録して、次のカードへ */
  #answer(isKnown) {
    if (!this.#flipped || this.#index >= this.#deck.length) return;
    (isKnown ? this.#known : this.#again).push(this.#deck[this.#index]);
    this.#index += 1;
    this.#flipped = false;
    cancelSpeech();
    this.#paint();
    this.#container.querySelector(".fc-flip, .fc-result .btn")?.focus();
  }

  // ---------- イベント ----------

  #onClick(e) {
    const btn = e.target.closest("[data-fc]");
    if (!btn) return;
    switch (btn.dataset.fc) {
      case "flip": return this.#flip();
      case "speak": return speak(this.#deck[this.#index]?.word);
      case "known": return this.#answer(true);
      case "again": return this.#answer(false);
      case "exit": return this.#onExit();
      case "restart": return this.#start([...this.#deck]);
      case "retry": return this.#start(this.#again);
    }
  }

  /** キーボード：Space/Enter は、ボタン標準の動き（めくる）。ここでは ← もう一度、→ 覚えた、S 読み上げ */
  #onKey(e) {
    if (e.target.closest?.("input, textarea") || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") this.#answer(false);
    else if (e.key === "ArrowRight") this.#answer(true);
    else if (e.key.toLowerCase() === "s" && this.#index < this.#deck.length) speak(this.#deck[this.#index].word);
  }

  // ---------- 描画 ----------

  #paint() {
    this.#container.innerHTML = this.#index >= this.#deck.length ? this.#resultHtml() : this.#cardHtml();
  }

  #cardHtml() {
    const w = this.#deck[this.#index];
    const total = this.#deck.length;
    const pct = Math.round((this.#index / total) * 100);
    const f = this.#flipped;
    return `
      <div class="fc">
        <div class="fc-top">
          <button type="button" class="btn btn--ghost btn--sm fc-exit" data-fc="exit">${icon("back", 16)} 単語帳へ</button>
          <span class="fc-count" aria-live="polite">${this.#index + 1} / ${total}</span>
        </div>
        <div class="fc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${this.#index}" aria-label="進み具合">
          <span style="width:${pct}%"></span>
        </div>

        <div class="fc-card ${f ? "is-flipped" : ""}">
          <div class="fc-face fc-face--front" ${f ? 'aria-hidden="true"' : ""}>
            <span class="fc-hint">タップして意味を見る</span>
            <p class="fc-word">${esc(w.word)}</p>
            ${w.pos ? `<span class="chip">${esc(w.pos)}</span>` : ""}
          </div>
          <div class="fc-face fc-face--back" ${f ? "" : 'aria-hidden="true"'}>
            <p class="fc-word fc-word--sm">${esc(w.word)}</p>
            <p class="fc-meaning">${esc(w.meaning)}</p>
            ${w.source ? `<p class="muted small">${esc(w.source)}</p>` : ""}
          </div>
          <!-- カード全体を覆う透明ボタン。押すと表と裏が入れ替わる -->
          <button type="button" class="fc-flip" data-fc="flip" aria-label="${f ? "英単語の面に戻す" : "カードをめくって意味を見る"}"></button>
          ${speechSupported ? `<button type="button" class="word-icon-btn fc-speak" data-fc="speak" aria-label="${esc(w.word)} を読み上げる">${icon("volume", 22)}</button>` : ""}
        </div>

        <div class="fc-actions">
          <button type="button" class="btn btn--ghost btn--lg fc-btn" data-fc="again" ${f ? "" : "disabled"}>${icon("refresh", 20)} もう一度</button>
          <button type="button" class="btn btn--teal btn--lg fc-btn" data-fc="known" ${f ? "" : "disabled"}>${icon("check", 20)} 覚えた</button>
        </div>
        <p class="muted small fc-keys">キーボード：Space でめくる ／ ← もう一度 ／ → 覚えた ／ S 読み上げ</p>
      </div>`;
  }

  #resultHtml() {
    const total = this.#deck.length;
    const k = this.#known.length;
    const perfect = k === total;
    const line = perfect ? "全部覚えました。" : k >= total / 2 ? "いい調子です。" : "くり返せば、きっと覚えられます。";
    const againList = this.#again.length
      ? `<div class="fc-result__again"><p class="small"><strong>もう一度の単語</strong></p><ul>${this.#again
          .map((w) => `<li><span class="fc-result__w">${esc(w.word)}</span> ${esc(w.meaning)}</li>`)
          .join("")}</ul></div>`
      : "";
    return `
      <div class="fc fc-result">
        ${img(perfect ? "mascot/bird-cheer.png" : "mascot/bird-happy.png", { cls: "fc-result__bird", width: 130 })}
        <h2>復習おつかれさま</h2>
        <p class="fc-result__score"><strong>${k}</strong> / ${total} 語 覚えた</p>
        <p class="muted">${line}</p>
        ${againList}
        <div class="fc-actions fc-actions--col">
          ${this.#again.length ? `<button type="button" class="btn btn--lg fc-btn" data-fc="retry">${icon("refresh", 20)} 「もう一度」だけ復習</button>` : ""}
          <button type="button" class="btn btn--ghost btn--lg fc-btn" data-fc="restart">最初からやり直す</button>
          <button type="button" class="btn btn--ghost btn--lg fc-btn" data-fc="exit">単語帳に戻る</button>
        </div>
      </div>`;
  }
}

/**
 * 配列をシャッフルした「コピー」を返す（Fisher-Yates 法）。元の配列は変えない。
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  const a = [...arr]; // スプレッドで浅いコピー（JS の配列は参照渡しなので、コピーしないと元の配列が壊れる）
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // 分割代入で入れ替え（C# のタプル swap と同じ）
  }
  return a;
}
