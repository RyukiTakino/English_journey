/**
 * 搭乗券風の「次の目的地」パネル
 *
 * 層：ui
 * 担当：フロント（ホームで使う）
 *
 * 左に「出発地 → 目的地」、右（半券）に国のカード画像（無い国は国コード）を置き、
 * 下に出発ボタンを出します。画像（ui/ticket-blank.png）は小さいので、見た目は CSS で作っています。
 */
import { COUNTRY_CARD_IMAGES } from "../../domain/constants.js";
import { img } from "../assets.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

/**
 * @param {{to: import("../../domain/models.js").Country,
 *          from: import("../../domain/models.js").Country|null,
 *          stampCount: number, total: number}} p
 *   to＝次の目的地、from＝直前に訪れた国（無ければ日本から出発）
 * @returns {string} HTML
 */
export function boardingPass({ to, from, stampCount, total }) {
  const file = COUNTRY_CARD_IMAGES[to.id];
  const fromCode = from?.code ?? "JP";
  const fromName = from?.name ?? "日本";
  return `
    <article class="boarding" style="--c:${esc(to.color)}">
      <div class="boarding__main">
        <p class="boarding__kicker">BOARDING PASS<span> ・ 次の目的地</span></p>
        <div class="boarding__route" aria-label="${esc(fromName)}から${esc(to.name)}へ">
          <div class="boarding__place">
            <span class="boarding__label">FROM</span>
            <span class="boarding__code">${esc(fromCode)}</span>
            <span class="boarding__city">${esc(fromName)}</span>
          </div>
          <span class="boarding__plane" aria-hidden="true">${icon("next", 22)}</span>
          <div class="boarding__place boarding__place--to">
            <span class="boarding__label">TO</span>
            <span class="boarding__code">${esc(to.code)}</span>
            <span class="boarding__city">${esc(to.name)}</span>
          </div>
        </div>
        <p class="boarding__meta">スタンプ <strong>${stampCount} / ${total}</strong> ・ ${esc(to.nameEn)}</p>
        <a class="btn btn--lg boarding__go" href="#/country/${esc(to.id)}">${esc(to.name)}へ出発 ${icon("next", 18)}</a>
      </div>
      <div class="boarding__stub" aria-hidden="true">
        ${file ? img(`cards/${file}`, { cls: "boarding__img" }) : `<span class="boarding__stubcode">${esc(to.code)}</span>`}
      </div>
    </article>`;
}
