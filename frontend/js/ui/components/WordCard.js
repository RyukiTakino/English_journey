/**
 * 単語帳の 1 語ぶんのカード（一覧用）
 *
 * 層：ui
 * 担当：フロント（単語帳）
 *
 * HTML の文字列を返すだけ。ボタンのイベントは、WordsScene が data-action で受け取る（イベント委譲）。
 */
import { esc } from "./html.js";
import { icon } from "./icons.js";
import { speechSupported } from "./speech.js";

/**
 * @param {import("../../domain/models.js").SavedWord} w
 * @returns {string} HTML
 */
export function wordCard(w) {
  const word = esc(w.word);
  return `
    <li class="word-card">
      <div class="word-card__main">
        <div class="word-card__head">
          <h3 class="word-card__word">${word}</h3>
          ${w.pos ? `<span class="chip word-card__pos">${esc(w.pos)}</span>` : ""}
        </div>
        <p class="word-card__meaning">${esc(w.meaning)}</p>
        ${w.source ? `<p class="word-card__source muted small">${icon("pin", 13)}<span>${esc(w.source)}</span></p>` : ""}
      </div>
      <div class="word-card__actions">
        ${speechSupported ? `<button type="button" class="word-icon-btn" data-action="speak" data-word="${word}" aria-label="${word} を読み上げる">${icon("volume", 20)}</button>` : ""}
        <button type="button" class="word-icon-btn word-icon-btn--danger" data-action="delete" data-word="${word}" aria-label="${word} を単語帳から消す">${icon("trash", 20)}</button>
      </div>
    </li>`;
}
