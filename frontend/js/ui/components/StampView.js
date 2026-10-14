/**
 * パスポートのスタンプの表示
 *
 * 層：ui
 * 担当：フロント
 *
 * 国のスタンプ画像（assets/images/stamps/）に、国名と日付を重ねます。
 * まだ取っていない国は、点線の丸い枠にします。
 */
import { COUNTRY_STAMP_IMAGES } from "../../domain/constants.js";
import { img } from "../assets.js";
import { esc, formatDate } from "./html.js";

/**
 * @param {import("../../domain/models.js").Country} country
 * @param {{earnedAt?: string|null, size?: "sm"|"md"|"lg", tilt?: number}} [options]
 *   earnedAt が無ければ「未獲得」の枠にする。tilt はスタンプの傾き（度）
 * @returns {string} HTML
 */
export function stampView(country, { earnedAt = null, size = "md", tilt = -8 } = {}) {
  if (!earnedAt) {
    return `<div class="stamp stamp--${size} is-empty"><span class="stamp__ring"></span><span class="stamp__name">${esc(country.name)}</span></div>`;
  }
  const file = COUNTRY_STAMP_IMAGES[country.id];
  return `
    <div class="stamp stamp--${size}" style="--c:${esc(country.color)};--r:${Number(tilt)}deg">
      ${file ? img(`stamps/${file}`, { cls: "stamp__img" }) : `<span class="stamp__ring stamp__ring--solid"></span>`}
      <span class="stamp__name">${esc(country.name)}</span>
      <span class="stamp__date">${esc(formatDate(earnedAt))}</span>
    </div>`;
}
