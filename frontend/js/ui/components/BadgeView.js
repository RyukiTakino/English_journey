/**
 * 実績バッジ（メダル）の表示
 *
 * 層：ui
 * 担当：フロント
 *
 * バッジの画像（assets/images/badges/）を使います。まだ取っていないバッジは、灰色にして鍵を重ねます。
 */
import { BADGE_IMAGES } from "../../domain/constants.js";
import { img } from "../assets.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

/**
 * @param {import("../../domain/models.js").Badge} badge
 * @param {{size?: "sm"|"md"|"lg", showText?: boolean}} [options]
 * @returns {string} HTML
 */
export function badgeView(badge, { size = "md", showText = true } = {}) {
  const locked = !badge.earnedAt;
  const file = BADGE_IMAGES[badge.id];
  return `
    <div class="badge badge--${size} ${locked ? "is-locked" : ""}" data-badge="${esc(badge.id)}">
      <div class="badge__medal">
        ${file ? img(`badges/${file}`, { cls: "badge__img" }) : `<span class="badge__fallback">${icon("medal", 36)}</span>`}
        ${locked ? `<span class="badge__lock">${icon("lock", 18)}</span>` : ""}
      </div>
      ${showText ? `<p class="badge__name">${esc(badge.name)}</p><p class="badge__desc">${esc(badge.description)}</p>` : ""}
    </div>`;
}
