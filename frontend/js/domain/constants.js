/**
 * アプリ全体で使う定数
 *
 * 層：domain（他のファイルに依存しない）
 * 担当：フロント
 *
 * 画面のあちこちで使う固定の値は、ここに1か所だけ書きます。
 * 文字列を直接書くとタイプミスに気づけないので、必ずこの定数経由で使います。
 *
 * （C# の static class Constants / const、C++ の constexpr を並べたヘッダーに近いものです）
 */

export const APP_NAME = "English journey";

/**
 * 英語のレベル（CEFR という国際的な基準）。記事の難しさに使う。
 * id は API でやりとりする値、label は画面に出す文言。
 *
 * TODO(Backend): API で使うレベルの値（"A2" / "B1" / "B2"）が、この3つで合っているか確認する。
 */
export const LEVELS = Object.freeze([
  { id: "A2", label: "初級" },
  { id: "B1", label: "中級" },
  { id: "B2", label: "中上級" }
]);

/**
 * 記事のカテゴリ。キーは API でやりとりする値（Trip.category）、label は画面に出す文言。
 * Object.freeze は「あとから書き換え不可」にする（C# の readonly に近い）。
 *
 * TODO(Backend): API のカテゴリの値（"sight" / "culture"）が合っているか確認する。
 */
export const CATEGORY = Object.freeze({
  sight: { label: "観光名所" },
  culture: { label: "文化" }
});

/** 地図の地域ボタン。center は [緯度, 経度]、zoom は拡大の度合い */
export const REGIONS = Object.freeze([
  { id: "all", name: "すべて", center: [25, 20], zoom: 2 },
  { id: "europe", name: "ヨーロッパ", center: [48, 6], zoom: 4 },
  { id: "africa", name: "アフリカ", center: [10, 20], zoom: 3 },
  { id: "oceania", name: "オセアニア", center: [-25, 140], zoom: 3 },
  { id: "americas", name: "アメリカ大陸", center: [38, -98], zoom: 3 }
]);

/** スタンプがもらえる正答率の表示用の文言。判定そのものはサーバー（LocalApi）が行う */
export const STAMP_RULE_TEXT = "6割以上";

/**
 * 国 id → 国のカード画像のファイル名（assets/images/cards/ の中）。
 * 星の評価つきは "-rating" を付けたもの。
 * 国を増やしたら、ここに足す（無い国は、画像なしの表示になる）。
 */
export const COUNTRY_CARD_IMAGES = Object.freeze({
  uk: "card-uk.png",
  france: "card-france.png",
  canada: "card-canada.png",
  australia: "card-australia.png"
});

/** 国 id → スタンプの画像（assets/images/stamps/）。UK だけ専用の絵が無いので、飛行機のスタンプを使う。無い国は、国の色の丸い枠で代わりに表示する */
export const COUNTRY_STAMP_IMAGES = Object.freeze({
  uk: "stamp-plane.png",
  france: "stamp-france.png",
  canada: "stamp-canada.png",
  australia: "stamp-australia.png"
});

/** バッジ id → バッジの画像（assets/images/badges/） */
export const BADGE_IMAGES = Object.freeze({
  "first-step": "badge-map-pin.png",
  perfect: "badge-crown.png",
  streak: "badge-mountain.png",
  words: "badge-books.png",
  listener: "badge-camera.png",
  reader: "badge-suitcase.png",
  explorer: "badge-wheel.png",
  "world-tour": "badge-globe.png"
});
