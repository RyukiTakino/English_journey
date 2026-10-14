/**
 * 設定パネル（効果音・BGM のオン／オフ、学習記録のリセット）
 *
 * 層：ui
 * 担当：フロント（マイページ）
 *
 * HTML を返すだけ。スイッチは <button role="switch"> で作る（押すたびに aria-checked が変わる）。
 * 実際の切り替えは MyPageScene が ctx.sound.setSeEnabled / setBgmEnabled で行う。
 */
import { icon } from "./icons.js";

/**
 * スイッチ 1 行ぶん
 * @param {"se"|"bgm"} kind
 * @param {boolean} on
 * @param {string} title
 * @param {string} text
 * @param {string} iconOn
 * @param {string} iconOff
 */
function switchRow(kind, on, title, text, iconOn, iconOff) {
  return `
    <div class="setting-row">
      <span class="setting-row__icon" aria-hidden="true">${icon(on ? iconOn : iconOff, 22)}</span>
      <div class="setting-row__text">
        <div class="setting-row__title" id="set-${kind}-label">${title}</div>
        <div class="muted small">${text}</div>
      </div>
      <button type="button" class="switch ${on ? "is-on" : ""}" role="switch" aria-checked="${on}" aria-labelledby="set-${kind}-label" data-switch="${kind}">
        <span class="switch__knob"></span>
        <span class="switch__state">${on ? "オン" : "オフ"}</span>
      </button>
    </div>`;
}

/**
 * @param {{se: boolean, bgm: boolean}} state いまの音の設定
 * @returns {string} HTML
 */
export function settingsPanel({ se, bgm }) {
  return `
    <div class="card settings-panel">
      ${switchRow("se", se, "効果音", "ボタンや正解のときの音", "volume", "mute")}
      ${switchRow("bgm", bgm, "BGM", "画面ごとに流れる音楽", "music", "mute")}
    </div>
    <div class="card danger-zone">
      <h3 class="danger-zone__title">学習記録のリセット</h3>
      <p class="muted small">スタンプ・学習履歴・単語帳・行きたいリスト・バッジをすべて消して、最初からやり直します。元には戻せません。</p>
      <button type="button" class="btn btn--danger" data-action="reset">${icon("trash", 16)} 学習記録をリセット</button>
    </div>`;
}
