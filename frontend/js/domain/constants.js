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
