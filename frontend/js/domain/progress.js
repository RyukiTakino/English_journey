/**
 * 進み具合の計算（世界一周の順番、次の目的地、学習済みかどうか など）
 *
 * 層：domain（他のファイルに依存しない、純粋な関数だけ）
 * 担当：フロント
 *
 * ここにあるのは「表示のための計算」だけです。
 * スタンプやバッジを与えるかどうかの判定は、サーバー側（バックエンド）で行います。
 *
 * （C# の static な計算用クラス、C++ の自由関数をまとめた名前空間に近いものです）
 */

/**
 * 世界一周の順番に並べた国の一覧
 * @param {import("./models.js").Country[]} countries
 * @returns {import("./models.js").Country[]}
 */
export function tourStops(countries) {
  return countries.filter((c) => c.tourOrder).sort((a, b) => a.tourOrder - b.tourOrder);
}

/**
 * スタンプの配列を { 国id: 獲得日 } の形にする
 * @param {import("./models.js").Me|null} me
 * @returns {Record<string, string>}
 */
export function stampsById(me) {
  return Object.fromEntries((me?.stamps || []).map((s) => [s.countryId, s.earnedAt]));
}

/**
 * まだスタンプが無い、最初の国（＝次の目的地）。全部そろっていれば null
 * @param {import("./models.js").Country[]} countries
 * @param {import("./models.js").Me|null} me
 */
export function nextStop(countries, me) {
  const stamps = stampsById(me);
  return tourStops(countries).find((c) => !stamps[c.id]) || null;
}

/**
 * 直前にスタンプを取った国（出発地として表示する）。まだ無ければ null
 * @param {import("./models.js").Country[]} countries
 * @param {import("./models.js").Me|null} me
 */
export function lastVisited(countries, me) {
  const stamps = stampsById(me);
  return [...tourStops(countries)].reverse().find((c) => stamps[c.id]) || null;
}

/**
 * その記事（read）やニュース（listen）を、1回でも解いたか
 * @param {import("./models.js").Me|null} me
 * @param {"read"|"listen"} kind
 * @param {string} refId
 */
export function isDone(me, kind, refId) {
  return (me?.history || []).some((h) => h.kind === kind && h.refId === refId);
}

/**
 * これまでの正答率（%）。履歴が無ければ null
 * @param {import("./models.js").Me|null} me
 * @returns {number|null}
 */
export function accuracy(me) {
  const h = me?.history || [];
  const total = h.reduce((a, x) => a + x.total, 0);
  return total ? Math.round((h.reduce((a, x) => a + x.correct, 0) / total) * 100) : null;
}

/**
 * 全部の記事から、id でひとつ探す
 * @param {import("./models.js").Country[]} countries
 * @param {string} tripId
 * @returns {import("./models.js").Trip|undefined}
 */
export function findTrip(countries, tripId) {
  return countries.flatMap((c) => c.trips).find((t) => t.id === tripId);
}

/**
 * 正答率から、結果の見出しを作る（大げさな言い回しはしない）
 * @param {number} correct
 * @param {number} total
 * @returns {string}
 */
export function resultHeadline(correct, total) {
  const rate = total ? correct / total : 0;
  if (rate === 1) return "全問正解です。";
  if (rate >= 0.6) return "よくできました。";
  if (rate >= 0.34) return "あと少しです。";
  return "もう一度読んでみましょう。";
}
