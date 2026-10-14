/**
 * 4 択問題のパネル（リーディング・リスニングで共通）
 *
 * 層：ui
 * 担当：フロント
 *
 * ■ 設計の判断
 *  - 全問を 1 つの画面に縦に並べる（ステップ式にしない）。
 *    記事を見直しながら答えを選べるし、スマホでもスクロールだけで済むため。
 *  - 全問に答えるまで「採点する」は押せない（未回答があると採点の意味が薄いので）。
 *    代わりに「n / N 問に回答」を出して、あと何問かをわかるようにしている。
 *  - 選択肢は本物のラジオボタン（<input type="radio">）。キーボードの矢印キーでも選べて、スクリーンリーダーにも伝わる。
 *  - 選ぶと ANSWER_SELECTED、ヒントを初めて開くと HINT_OPENED を ctx.events で知らせる（音は EffectsDirector が鳴らす）。
 *
 * 正解や解説はここには無い（採点するまでサーバーが教えない）。
 *
 * 使い方:
 *   const panel = new QuestionPanel(ctx, lesson.questions, { extraHtml: "<details>…</details>" });
 *   container.innerHTML = panel.render();
 *   panel.mount(container, { onSubmit: () => … });
 *   panel.answers  // (number|null)[]
 */
import { EVENTS } from "../../application/events.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export class QuestionPanel {
  #ctx;
  #questions;
  #extra;
  /** 選んだ選択肢の番号。まだなら null（Python の None / C# の int? に相当） */
  #answers;
  /** ヒントを開いたことがある問題の番号（HINT_OPENED を 1 問につき 1 回だけ知らせるため） */
  #hinted = new Set();
  #root = null;

  /**
   * @param {object} ctx
   * @param {import("../../domain/models.js").Question[]} questions
   * @param {{extraHtml?: string}} [options] extraHtml … 採点ボタンの上に入れる部品（要約ボックスなど。信頼できる HTML だけ）
   */
  constructor(ctx, questions, { extraHtml = "" } = {}) {
    this.#ctx = ctx;
    this.#questions = questions;
    this.#extra = extraHtml;
    this.#answers = questions.map(() => null);
  }

  /** 選んだ答えのコピー（外から書き換えられないよう、配列を複製して返す） */
  get answers() {
    return [...this.#answers];
  }

  get allAnswered() {
    return this.#answers.every((a) => a !== null);
  }

  render() {
    const items = this.#questions
      .map(
        (q, i) => `
        <li class="qp__q" data-q="${i}">
          <fieldset class="qp__fieldset">
            <legend class="qp__legend"><span class="qp__no">Q${i + 1}</span><span class="qp__text">${esc(q.text)}</span></legend>
            <div class="qp__choices">
              ${q.choices
                .map(
                  (c, j) => `
                <label class="qp__choice">
                  <input class="qp__radio" type="radio" name="q${i}" value="${j}">
                  <span class="qp__face"><span class="qp__letter" aria-hidden="true">${LETTERS[j]}</span><span class="qp__label">${esc(c)}</span></span>
                </label>`
                )
                .join("")}
            </div>
          </fieldset>
          ${
            q.hint
              ? `<button type="button" class="qp__hint-btn" data-hint="${i}" aria-expanded="false" aria-controls="qp-hint-${i}">${icon("bulb", 16)} ヒントを見る</button>
                 <p class="qp__hint" id="qp-hint-${i}" hidden>${esc(q.hint)}</p>`
              : ""
          }
        </li>`
      )
      .join("");
    return `
      <form class="qp" novalidate>
        <div class="qp__progress"><span data-count aria-live="polite"></span><div class="qp__bar"><i data-fill></i></div></div>
        <ol class="qp__list">${items}</ol>
        ${this.#extra}
        <div class="qp__submit">
          <button type="submit" class="btn btn--lg" data-submit disabled>採点する</button>
          <p class="muted small" data-submit-help>すべての問題に答えると、採点できます。</p>
        </div>
      </form>`;
  }

  /**
   * @param {HTMLElement} container render() の HTML が入っている要素
   * @param {{onSubmit: () => void, onChange?: () => void}} handlers
   */
  mount(container, { onSubmit, onChange }) {
    const root = container.querySelector(".qp");
    this.#root = root;
    this.#updateProgress();

    // 選択肢：change イベントは、ラジオが選ばれたとき（クリックでもキー操作でも）に 1 回だけ来る
    root.addEventListener("change", (e) => {
      const input = e.target.closest?.(".qp__radio");
      if (!input) return;
      const q = Number(input.name.slice(1));
      this.#answers[q] = Number(input.value);
      this.#ctx.events.emit(EVENTS.ANSWER_SELECTED, { questionIndex: q, choiceIndex: this.#answers[q] });
      this.#updateProgress();
      onChange?.();
    });

    // ヒント：押すたびに開閉。出来事は、その問題で最初に開いたときだけ
    root.querySelectorAll("[data-hint]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.hint);
        const box = root.querySelector(`#qp-hint-${i}`);
        const open = box.hidden; // 今は隠れている＝これから開く
        box.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        btn.lastChild.textContent = open ? " ヒントをとじる" : " ヒントを見る";
        if (open && !this.#hinted.has(i)) {
          this.#hinted.add(i);
          this.#ctx.events.emit(EVENTS.HINT_OPENED, { questionIndex: i });
        }
      });
    });

    root.addEventListener("submit", (e) => {
      e.preventDefault(); // ページ遷移（フォーム送信）を止める
      if (this.allAnswered) onSubmit();
    });
  }

  /** 採点中は、ボタンを押せなくして二重送信を防ぐ */
  setBusy(busy) {
    const btn = this.#root?.querySelector("[data-submit]");
    if (!btn) return;
    btn.disabled = busy || !this.allAnswered;
    btn.textContent = busy ? "採点しています…" : "採点する";
    this.#root.querySelectorAll(".qp__radio").forEach((r) => (r.disabled = busy));
  }

  #updateProgress() {
    const root = this.#root;
    const done = this.#answers.filter((a) => a !== null).length;
    const total = this.#answers.length;
    root.querySelector("[data-count]").textContent = `${done} / ${total} 問に回答`;
    root.querySelector("[data-fill]").style.width = `${total ? (done / total) * 100 : 0}%`;
    root.querySelector("[data-submit]").disabled = !this.allAnswered;
    root.querySelector("[data-submit-help]").hidden = this.allAnswered;
  }
}
