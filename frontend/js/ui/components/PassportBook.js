/**
 * パスポート（スタンプ帳）の見開き表示
 *
 * 層：ui
 * 担当：フロント（世界一周の画面で使う）
 *
 * 国ごとに 1 つ枠（スロット）を並べます。
 *   取得済み … stampView で、スタンプ画像・国名・日付
 *   未取得   … 点線の丸い空き枠
 * スタンプ画像が無い国（カナダ）は、国の色の二重丸＋国コードで代わりに表示します。
 */
import { COUNTRY_STAMP_IMAGES } from "../../domain/constants.js";
import { esc } from "./html.js";
import { stampView } from "./StampView.js";

/**
 * @param {import("../../domain/models.js").Country[]} stops 世界一周の順に並べた国
 * @param {Record<string, string>} stamps { 国id: 獲得日 }
 * @returns {string} HTML
 */
export function passportBook(stops, stamps) {
  const slots = stops
    .map((c, i) => {
      const earnedAt = stamps[c.id] ?? null;
      // 傾きを国ごとに少し変えて、手で押した感じにする（i が偶数なら左、奇数なら右に傾ける）
      const stamp = stampView(c, { earnedAt, size: "md", tilt: i % 2 ? 7 : -9 });
      // 画像が無い国のスタンプには、国コードを重ねる
      const code = earnedAt && !COUNTRY_STAMP_IMAGES[c.id] ? `<span class="passport__code" style="--c:${esc(c.color)}">${esc(c.code)}</span>` : "";
      return `
        <li class="passport__slot ${earnedAt ? "is-earned" : "is-empty"}">
          <span class="passport__no">No.${i + 1}</span>
          <div class="passport__stamp">${stamp}${code}</div>
        </li>`;
    })
    .join("");
  return `
    <div class="passport" role="group" aria-label="スタンプ帳">
      <div class="passport__spine" aria-hidden="true"></div>
      <ul class="passport__slots">${slots}</ul>
    </div>`;
}
