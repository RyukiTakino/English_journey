/**
 * 読み込み中・エラー・何もないときの表示
 *
 * 層：ui
 * 担当：フロント
 *
 * 渡り鳥のイラスト（assets/images/mascot/）を使います。
 */
import { img } from "../assets.js";
import { esc } from "./html.js";

/**
 * 読み込み中の表示。
 * @param {string} [text]
 */
export function loadingView(text = "読み込んでいます") {
  return `<div class="state state--loading">${img("mascot/bird-read.png", { cls: "state__illust", width: 140 })}<p><span class="spinner"></span> ${esc(text)}</p></div>`;
}

/**
 * エラーの表示。「もう一度読み込む」ボタン（data-reload）は、Router が押されたときの処理をつなぐ。
 * @param {string} message 画面にそのまま出せる日本語
 */
export function errorView(message) {
  return `<div class="state state--error card">${img("mascot/bird-sleep.png", { cls: "state__illust", width: 130 })}<h2>読み込めませんでした</h2><p class="muted">${esc(message)}</p><button type="button" class="btn btn--ghost" data-reload>もう一度読み込む</button></div>`;
}

/**
 * 「まだ何もない」ときの表示（単語帳が空のときなど）。
 * @param {{image?: string, title: string, text: string, action?: string}} options
 *   image は assets/images/ からの場所（省略すると、ひよこの絵）。action はボタンなどの HTML（信頼できる固定の HTML だけ）
 */
export function emptyView({ image = "mascot/bird-chin.png", title, text, action = "" }) {
  return `<div class="state card">${img(image, { cls: "state__illust", width: 130 })}<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>${action}</div>`;
}
