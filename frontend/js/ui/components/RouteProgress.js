/**
 * 世界一周のルート進捗（○─○─○─○ のステッパー）
 *
 * 層：ui
 * 担当：フロント（ホーム・世界一周の画面で使う）
 *
 * 画像（ui/progress-route.png）は解像度が低く、国の数も固定なので、
 * HTML + CSS で組みます。国が増えても自動で並びます。
 *   - 取得済み：国のスタンプ画像（無い国は✓）
 *   - 次の目的地：オレンジの丸で強調
 *   - まだ：点線の丸
 */
import { COUNTRY_STAMP_IMAGES } from "../../domain/constants.js";
import { img } from "../assets.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

/**
 * @param {import("../../domain/models.js").Country[]} stops 世界一周の順に並べた国（tourStops の結果）
 * @param {Record<string, string>} stamps { 国id: 獲得日 }（stampsById の結果）
 * @param {import("../../domain/models.js").Country|null} next 次の目的地
 * @param {{linkable?: boolean}} [options] linkable: 各国のページへのリンクにするか
 * @returns {string} HTML
 */
export function routeProgress(stops, stamps, next, { linkable = true } = {}) {
  const items = stops
    .map((c, i) => {
      const done = Boolean(stamps[c.id]);
      const isNext = next?.id === c.id;
      const state = done ? "is-done" : isNext ? "is-next" : "is-todo";
      const stampFile = COUNTRY_STAMP_IMAGES[c.id];
      // ノード（丸）の中身：取得済み → スタンプ画像 or ✓、それ以外 → 番号
      const node = done
        ? stampFile
          ? img(`stamps/${stampFile}`, { cls: "route__stamp" })
          : icon("check", 20)
        : `<span class="route__num">${i + 1}</span>`;
      const label = `<span class="route__name">${esc(c.name)}</span>`;
      const status = done ? "スタンプ獲得済み" : isNext ? "次の目的地" : "未訪問";
      const inner = `<span class="route__node">${node}</span>${label}<span class="sr-only">（${status}）</span>`;
      return `<li class="route__stop ${state}" style="--c:${esc(c.color)}" ${isNext ? 'aria-current="step"' : ""}>${
        linkable ? `<a href="#/country/${esc(c.id)}" class="route__link">${inner}</a>` : `<span class="route__link">${inner}</span>`
      }</li>`;
    })
    .join("");
  return `<ol class="route" aria-label="世界一周のルート">${items}</ol>`;
}
