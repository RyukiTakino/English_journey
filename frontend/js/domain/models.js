/**
 * データの形（API が返す JSON の形）
 *
 * 層：domain
 * 担当：フロント（形を変えるときは、バックエンド・API 担当と相談する）
 *
 * ここには実行するコードはなく、JSDoc の型だけを書いています。
 * エディタ（VS Code）で補完が効くようになり、どの画面がどの値を使えるかが分かります。
 * 使う側は、次のように型を参照します。
 *   @param {import("../domain/models.js").Country} country
 *
 * （C# の class / record / struct の定義、C++ の struct の定義に近いものです。
 *   ただし JS には型の強制が無いので、これは「約束事の説明」で、間違っていても実行時には検出されません）
 *
 * TODO(Backend): ここに書いた形（キー名と型）が、実際の API のレスポンスと一致しているか確認する。
 *            違っていたら、フロントに知らせる。
 */

/**
 * 観光名所・文化の記事1本分の情報（Country.trips の1件）
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} name              日本語名
 * @property {string} nameEn            英語名
 * @property {"sight"|"culture"} category
 * @property {"A2"|"B1"|"B2"} level
 * @property {number} minutes           読むのにかかる時間（分）
 *
 * TODO(API): 実際の trips の項目（都市名、説明文、画像のキーなど）を決める。ここは仮の形。
 */

/**
 * 国。GET /api/countries の1件
 * @typedef {Object} Country
 * @property {string} id                例: "uk"
 * @property {string} name              日本語名
 * @property {string} nameEn            英語名
 * @property {Trip[]} trips             その国の記事の一覧
 */

/**
 * 国の詳細。GET /api/countries/{countryId}
 * 一覧の項目に加えて、説明文が付く。
 * @typedef {Country & {info: {extract: string, sourceUrl: string}}} CountryDetail
 *   info.extract    説明文（Wikipedia 由来の予定）
 *   info.sourceUrl  出典の URL
 */

export {}; // このファイルを「モジュール」として扱わせるための印（import で型を参照できるようにする）
