/**
 * 学習履歴の一覧（マイページ）
 *
 * 層：ui
 * 担当：フロント（マイページ）
 *
 * 1 件 = 「読んだ記事」か「聴いたニュース」。正解数（correct/total）、要約の点数、日付を出す。
 */
import { esc, formatDate } from "./html.js";
import { icon } from "./icons.js";

/** 履歴の種類 → 札の文言とクラス */
const KIND = {
  read: { label: "リーディング", cls: "chip--sight" },
  listen: { label: "リスニング", cls: "chip--news" }
};

/**
 * @param {import("../../domain/models.js").HistoryItem[]} items 新しい順
 * @param {(countryId: string) => import("../../domain/models.js").Country|undefined} findCountry 国名を引く関数
 * @returns {string} HTML（<li> の並び）
 */
export function historyItems(items, findCountry) {
  return items
    .map((h) => {
      const k = KIND[h.kind] ?? { label: h.kind, cls: "" };
      const country = findCountry(h.countryId);
      const full = h.total > 0 && h.correct === h.total;
      return `
        <li class="history-item">
          <div class="history-item__main">
            <div class="meta-row history-item__meta">
              <span class="chip ${k.cls}">${esc(k.label)}</span>
              ${country ? `<span class="muted small">${esc(country.name)}</span>` : ""}
              <span class="muted small history-item__date">${esc(formatDate(h.createdAt))}</span>
            </div>
            <div class="history-item__title">${esc(h.title)}</div>
          </div>
          <div class="history-item__score ${full ? "is-full" : ""}" aria-label="${esc(h.total)} 問中 ${esc(h.correct)} 問正解">
            ${full ? icon("star", 16) : ""}<strong>${esc(h.correct)}</strong><span>/${esc(h.total)}</span>
            ${h.summaryScore != null ? `<span class="history-item__summary">要約 ${esc(h.summaryScore)}点</span>` : ""}
          </div>
        </li>`;
    })
    .join("");
}
