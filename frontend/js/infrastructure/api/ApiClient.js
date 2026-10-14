/**
 * サーバーとの通信の窓口
 *
 * 層：infrastructure
 * 担当：フロント
 *
 * 画面や操作の処理（application/actions）は、必ずこのクラスのメソッドを通して通信します。
 * 画面の中で直接 fetch しません。
 *
 * 実際の通信は「transport（運び役）」に任せます。transport は main.js で選びます。
 *   - HttpApi  … バックエンドのサーバーに fetch で問い合わせる
 *   - LocalApi … サーバーなしで、ブラウザの中でサーバーの代わりをする（開発用モック）
 * どちらを使っても、このクラスのメソッドの使い方と返ってくる形は同じです。
 * （C# でいう interface を注入する形。ここでは ApiClient が窓口、transport が実装です）
 *
 * メソッドは「エンドポイント1つ＝メソッド1つ」。必要になった時点で足していきます。
 *
 * TODO(API): 外部API（Wikipedia / Gemini / YouTube）を使う機能が増えたら、メソッドを足す前に
 *            URL と JSON の形をフロントと合意する。
 * TODO(Backend): ここに書いたメソッドと URL は、バックエンドの実装と一致させる。
 *            URL や JSON の形を変えるときは、フロントに知らせる。
 */

/**
 * API がエラーを返したときの例外。code で処理を分け、message はそのまま画面に出せる。
 * （C# の class ApiError : Exception に相当）
 */
export class ApiError extends Error {
  /**
   * @param {string} code     エラーの種類。例: "NOT_FOUND", "NETWORK"
   * @param {string} message  日本語のメッセージ（画面にそのまま出せる文章）
   * @param {number} status   HTTP ステータス（通信できなかったときは 0）
   *
   * TODO(Backend): エラーの code の一覧を決めて、この文書かAPI仕様に書く。
   */
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class ApiClient {
  /** 運び役。# 付きは private（外から差し替えられない） */
  #transport;

  /**
   * @param {{request: (method: string, path: string, body?: object) => Promise<any>}} transport
   *        request() を持っていれば何でも渡せる（JS には interface が無いので、形だけを約束する）
   */
  constructor(transport) {
    this.#transport = transport;
  }

  /**
   * GET /api/status … 外部API（Gemini・YouTube）が使えるか
   * @returns {Promise<{gemini: boolean, youtube: boolean}>}
   *
   * TODO(API): 実際に使える外部APIを判定して返す（キーの有無など）。
   * TODO(Backend): このURLでエンドポイントを用意する。
   */
  getStatus() {
    return this.#transport.request("GET", "/api/status");
  }

  /**
   * GET /api/countries … 国と、その国の記事の一覧
   * @returns {Promise<Array<{id: string, name: string, nameEn: string, trips: object[]}>>}
   *
   * TODO(Backend): このURLでエンドポイントを用意する。JSON のキーは camelCase にする。
   * TODO(API): 初期データ（seed）を用意する。trips（記事の一覧）の中身の形は未確定。
   */
  getCountries() {
    return this.#transport.request("GET", "/api/countries");
  }
}
