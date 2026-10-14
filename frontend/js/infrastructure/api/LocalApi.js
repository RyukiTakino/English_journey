/**
 * サーバーなしで動かすための、サーバーの代わり（モック）
 *
 * 層：infrastructure
 * 担当：フロント（バックエンドの API が出来上がるまでの開発用）
 *
 * HttpApi と同じ request(method, path, body) の形で、決め打ちのデータを返します。
 * これがあるので、バックエンドが未完成でもフロントの画面を作り進められます。
 * 返す JSON の形は、バックエンドと合意した「API の約束」に合わせます。
 *
 * TODO(Backend): 本物のAPIが出来たら、返す JSON の形がここと一致しているか確認する。
 *            違う場合は、フロントに知らせる（ここの形を直す）。
 * TODO(API): 国や記事の本物のデータ（seed）が出来たら、COUNTRIES を差し替えるか、
 *            seed.json を読み込む形にする。
 */
import { ApiError } from "./ApiClient.js";

/**
 * 仮の国データ。画面作りの確認用なので、最小限にしてある。
 * trips は、その国の記事（観光名所・文化）の一覧になる予定。
 */
const COUNTRIES = [
  { id: "uk", name: "イギリス", nameEn: "United Kingdom", trips: [] },
  { id: "usa", name: "アメリカ", nameEn: "United States", trips: [] }
];

/**
 * "メソッド パス" → 返す値を作る関数、の対応表。
 * エンドポイントを足すときは、ApiClient にメソッドを足して、ここに1行足す。
 * （C# でいう Dictionary<string, Func<object>> に相当）
 */
const ROUTES = {
  "GET /api/status": () => ({ gemini: false, youtube: false }),
  "GET /api/countries": () => COUNTRIES
};

export class LocalApi {
  /**
   * HttpApi.request と同じ形で呼べる。
   * @param {string} method
   * @param {string} path
   * @returns {Promise<any>}
   * @throws {ApiError} 対応表に無い API を呼んだとき
   */
  async request(method, path /* , body */) {
    // 対応表から、このリクエストに対応する関数を探す
    const handler = ROUTES[`${method} ${path}`];
    if (!handler) throw new ApiError("NOT_FOUND", `未対応の API です：${method} ${path}`, 404);

    // 本物の通信っぽく少し待つ（読み込み中の表示を確認するため）。C# の await Task.Delay(100) に相当
    await new Promise((resolve) => setTimeout(resolve, 100));

    // JS のオブジェクトは参照渡し。そのまま返すと、受け取った側の変更が元データに反映されてしまう。
    // structuredClone でコピーを作って返す（C++ の値返しと同じ状態にする）
    return structuredClone(handler());
  }
}
