/**
 * 英語レベルの選択（A2 / B1 / B2 の 3 択ボタン）
 *
 * 層：ui
 * 担当：フロント（マイページ）
 *
 * 「どれか 1 つだけ選ぶ」ボタン群なので、ラジオボタンと同じ役割（role="radiogroup" / "radio"）を付けておく。
 * 押されたときの処理は、MyPageScene が data-level を見て行う（ここは HTML を返すだけ）。
 */
import { LEVELS } from "../../domain/constants.js";
import { esc } from "./html.js";

/**
 * @param {"A2"|"B1"|"B2"|string} current いま選んでいるレベル
 * @returns {string} HTML
 */
export function levelPicker(current) {
  const buttons = LEVELS.map((lv) => {
    const on = lv.id === current;
    return `
      <button type="button" class="level-opt ${on ? "is-on" : ""}" role="radio" aria-checked="${on}" data-level="${esc(lv.id)}">
        <span class="level-opt__id">${esc(lv.id)}</span>
        <span class="level-opt__label">${esc(lv.label)}</span>
      </button>`;
  }).join("");
  return `<div class="level-picker" role="radiogroup" aria-label="英語のレベル">${buttons}</div>`;
}
