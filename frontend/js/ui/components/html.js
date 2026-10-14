/**
 * HTML を組み立てるときの小物
 *
 * 層：ui
 * 担当：フロント
 */

/** 特殊文字 → 安全な表記 の対応表 */
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/**
 * 文字列を HTML に埋め込んでも安全な形にする（< や & などを変換する）。
 *
 * 画面は HTML の「文字列」を組み立てて innerHTML に入れる方式なので、
 * サーバーから来たデータをそのまま埋め込むと、データの中の <script> などが
 * 本物の HTML として実行されてしまう（XSS という攻撃）。
 * サーバーやユーザー入力由来の文字列は、必ずこの関数を通してから埋め込む。
 *
 *   NG: `<li>${c.name}</li>`
 *   OK: `<li>${esc(c.name)}</li>`
 *
 * @param {unknown} value 文字列でなくてもよい（null / undefined は空文字になる）
 * @returns {string}
 */
export function esc(value) {
  // ?? は「左が null / undefined のときだけ右を使う」演算子（C# の ?? と同じ）
  // 正規表現で特殊文字を1文字ずつ見つけて、対応表の安全な表記に置き換える
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}
