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
 * info は国の詳細だけに付く説明文（本物では Wikipedia から取得する予定）。
 */
const COUNTRIES = [
  {
    id: "uk",
    name: "イギリス",
    nameEn: "United Kingdom",
    trips: [],
    info: { extract: "ヨーロッパ北西部の島国。ロンドンの街並みや歴史ある建物で知られる。", sourceUrl: "" }
  },
  {
    id: "usa",
    name: "アメリカ",
    nameEn: "United States",
    trips: [],
    info: { extract: "北アメリカにある連邦国家。多様な文化と大都市で知られる。", sourceUrl: "" }
  }
];

/** 一覧用には、詳細にだけ付く info を除いた形で返す */
const toListItem = ({ info, ...rest }) => rest; // { info, ...rest } は「info 以外」を rest に集める書き方

/**
 * 対応表。1件が「メソッド・パスの正規表現・返す値を作る関数」。
 * パスの () で囲んだ部分は、関数に引数として渡される（例: /api/countries/uk なら "uk"）。
 * エンドポイントを足すときは、ApiClient にメソッドを足して、ここに1件足す。
 */
const ROUTES = [
  { method: "GET", pattern: /^\/api\/status$/, handle: () => ({ gemini: false, youtube: false }) },
  { method: "GET", pattern: /^\/api\/countries$/, handle: () => COUNTRIES.map(toListItem) },
  {
    method: "GET",
    pattern: /^\/api\/countries\/([^/]+)$/,
    handle: (countryId) => {
      // URL に入っていた文字（%E3 など）を元に戻してから探す
      const country = COUNTRIES.find((c) => c.id === decodeURIComponent(countryId));
      // 本物のサーバーも、存在しない id には 404 を返す約束
      if (!country) throw new ApiError("NOT_FOUND", "国が見つかりません。", 404);
      return country;
    }
  }
];

export class LocalApi {
  /**
   * HttpApi.request と同じ形で呼べる。
   * @param {string} method
   * @param {string} path
   * @returns {Promise<any>}
   * @throws {ApiError} 対応表に無い API を呼んだとき、または handle が投げたとき
   */
  async request(method, path /* , body */) {
    // 対応表から、メソッドとパスが合うものを探す。m は正規表現の結果（m[1] 以降が () の中身）
    const found = ROUTES.map((route) => ({ route, m: path.match(route.pattern) })).find(
      (x) => x.route.method === method && x.m
    );
    if (!found) throw new ApiError("NOT_FOUND", `未対応の API です：${method} ${path}`, 404);

    // 本物の通信っぽく少し待つ（読み込み中の表示を確認するため）。C# の await Task.Delay(100) に相当
    await new Promise((resolve) => setTimeout(resolve, 100));

    // JS のオブジェクトは参照渡し。そのまま返すと、受け取った側の変更が元データに反映されてしまう。
    // structuredClone でコピーを作って返す（C++ の値返しと同じ状態にする）
    return structuredClone(found.route.handle(...found.m.slice(1)));
  }
}
