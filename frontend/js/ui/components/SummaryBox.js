/**
 * 要約を書く箱（リーディングのみ。最初は閉じていて、任意で書く）
 *
 * 層：ui
 * 担当：フロント
 *
 * 書いた要約は、採点するときに { text, lang } として一緒にサーバーへ送る（actions.study.submitLesson の 3 つ目の引数）。
 * lang は書いた文字から自動で判定する："ja"（ひらがな・カタカナ・漢字を含む）か "en"。
 * 空のままなら、要約は送らない（null）。
 *
 * TODO(Backend): 要約の採点はサーバー側（Gemini）が行う予定。いまは LocalApi のキーワード判定で代用している。
 */
import { esc } from "./html.js";
import { icon } from "./icons.js";

const MAX_LENGTH = 600;

export class SummaryBox {
  #root = null;

  render() {
    return `
      <details class="summary-box">
        <summary class="summary-box__toggle">${icon("plus", 16)} 要約を書いてみる（任意）</summary>
        <div class="summary-box__body">
          <label class="summary-box__label" for="summary-text">この記事の内容を、1〜2 文でまとめましょう。英語でも日本語でも書けます。</label>
          <textarea id="summary-text" class="summary-box__text" rows="4" maxlength="${MAX_LENGTH}" placeholder="例：Big Ben is the nickname of the great bell in London…"></textarea>
          <div class="muted small summary-box__meta"><span data-lang>${esc("")}</span><span data-len>0 / ${MAX_LENGTH}</span></div>
        </div>
      </details>`;
  }

  /** @param {HTMLElement} container render() の HTML が入っている要素 */
  mount(container) {
    this.#root = container.querySelector(".summary-box");
    const ta = this.#root.querySelector("textarea");
    ta.addEventListener("input", () => {
      this.#root.querySelector("[data-len]").textContent = `${ta.value.length} / ${MAX_LENGTH}`;
      const v = this.value;
      this.#root.querySelector("[data-lang]").textContent = v ? (v.lang === "ja" ? "日本語として採点します" : "英語として採点します") : "";
    });
  }

  /**
   * 書いた要約。空なら null
   * @returns {{text: string, lang: "ja"|"en"}|null}
   */
  get value() {
    const text = this.#root?.querySelector("textarea").value.trim();
    if (!text) return null;
    // ひらがな・カタカナ・漢字が 1 文字でもあれば日本語とみなす（正規表現の文字範囲）
    return { text, lang: /[぀-ヿ一-龯]/.test(text) ? "ja" : "en" };
  }
}
