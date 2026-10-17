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

  #get(path) {
    return this.#transport.request("GET", path);
  }

  // ---------- その他 ----------

  /**
   * GET /api/status … 外部API（Gemini・YouTube）が使えるか
   * @returns {Promise<{gemini: boolean, youtube: boolean}>}
   *
   * TODO(API): 実際に使える外部APIを判定して返す（キーの有無など）。
   * TODO(Backend): このURLでエンドポイントを用意する。
   */
  getStatus() {
    return this.#get("/api/status");
  }

  // ---------- 自分（ログインは無し。1人分の学習記録） ----------

  /**
   * GET /api/me … 自分の情報と学習記録
   * @returns {Promise<import("../../domain/models.js").Me>}
   *
   * TODO(Backend): ログインが無い間の「誰の記録か」の決め方を、3人で決める（要件定義書「9. 未決事項」の #1）。
   */
  getMe() {
    return this.#get("/api/me");
  }

  /**
   * PATCH /api/me … 表示名・英語レベルの変更
   * @param {{displayName?: string, level?: "A2"|"B1"|"B2"}} patch
   */
  updateMe(patch) {
    return this.#transport.request("PATCH", "/api/me", patch);
  }

  /** DELETE /api/me/progress … スタンプ・履歴・単語帳・行きたいリスト・バッジを消す（204） */
  resetProgress() {
    return this.#transport.request("DELETE", "/api/me/progress");
  }

  /**
   * GET /api/badges … バッジの一覧（まだ取っていないものも含む）
   * @returns {Promise<import("../../domain/models.js").Badge[]>}
   */
  getBadges() {
    return this.#get("/api/badges");
  }

  // ---------- 国・観光地 ----------

  /**
   * GET /api/countries … 国と、その国の記事の一覧（世界一周の順）
   * @returns {Promise<import("../../domain/models.js").Country[]>}
   *
   * TODO(Backend): このURLでエンドポイントを用意する。JSON のキーは camelCase にする。
   * TODO(API): 初期データ（seed）を用意する。形は domain/models.js の Country と Trip。
   */
  getCountries() {
    return this.#get("/api/countries");
  }

  /**
   * GET /api/categories … 記事のカテゴリの一覧（食事・建築・文化）
   * @returns {Promise<import("../../domain/models.js").Category[]>}
   *
   * TODO(Backend): GET /api/categories は用意済み（app.py）。返すキーを camelCase（name / nameEn）にしてほしい。
   */
  getCategories() {
    return this.#get("/api/categories");
  }

  /**
   * GET /api/countries/{countryId} … 国の詳細（一覧の内容 + 説明文 info）
   * @param {string} countryId 例: "uk"
   * @returns {Promise<import("../../domain/models.js").CountryDetail>}
   * @throws {ApiError} 存在しない id のとき（code: "NOT_FOUND", status: 404）
   *
   * TODO(Backend): このURLでエンドポイントを用意する。存在しない id は 404 を返す。
   * TODO(API): info（Wikipedia の説明文 extract と、出典の sourceUrl）を取得して返す。
   */
  getCountry(countryId) {
    // id に / や ? が含まれても URL が壊れないよう、encodeURIComponent で変換する
    return this.#get(`/api/countries/${encodeURIComponent(countryId)}`);
  }

  /**
   * 観光地の画像の URL を返す（Wikipedia の代表画像）。
   * @param {string} key 画像のキー（Trip.imageKey）。"fr:Tour_Eiffel" のように言語を付けられる
   * @param {boolean} [large] true なら大きい画像
   * @returns {Promise<string|null>} 見つからなければ null
   *
   * TODO(Backend): GET /api/images?key=…&size=large を用意し、Wikipedia の画像へ転送（リダイレクト）する。
   * TODO(API): 画像の取得元（Wikipedia）との連携。
   */
  imageUrl(key, large = false) {
    return this.#transport.imageUrl(key, large);
  }

  // ---------- 行きたいリスト ----------

  /** PUT /api/wants/{tripId} … 行きたいに入れる（何度呼んでも同じ結果。204） */
  addWant(tripId) {
    return this.#transport.request("PUT", `/api/wants/${encodeURIComponent(tripId)}`);
  }

  /** DELETE /api/wants/{tripId} … 行きたいから外す（204） */
  removeWant(tripId) {
    return this.#transport.request("DELETE", `/api/wants/${encodeURIComponent(tripId)}`);
  }

  // ---------- リーディング ----------

  /**
   * GET /api/trips/{tripId}/lesson … 記事と問題。答えと解説は含まない
   * @returns {Promise<import("../../domain/models.js").Lesson>}
   *
   * TODO(Backend): 保存済みの記事があればそれを返し、無ければ API 担当の生成を呼ぶ。
   * TODO(API): 記事と問題の生成（Wikipedia＋Gemini）。使えないときは seed の手書き教材を返す。
   */
  getLesson(tripId) {
    return this.#get(`/api/trips/${encodeURIComponent(tripId)}/lesson`);
  }

  /**
   * POST /api/lessons/{lessonId}/grade … 採点する
   * @param {string} lessonId
   * @param {{answers: (number|null)[], summary?: {text: string, lang: string}|null}} payload
   * @returns {Promise<import("../../domain/models.js").GradeResult>}
   *
   * TODO(Backend): 採点・スタンプ・バッジの判定をサーバーで行い、結果と rewards を返す。
   * TODO(API): 要約の採点と講評（Gemini）。使えないときはキーワードによる簡易採点でよい。
   */
  gradeLesson(lessonId, payload) {
    return this.#transport.request("POST", `/api/lessons/${encodeURIComponent(lessonId)}/grade`, payload);
  }

  // ---------- リスニング ----------

  /**
   * GET /api/countries/{countryId}/news … ニュース（動画または練習用の読み上げ）と問題
   * @returns {Promise<import("../../domain/models.js").NewsItem>}
   *
   * TODO(API): 動画を使うかを決める（要件定義書「9. 未決事項」の #3）。使わないなら video は null のままでよい。
   */
  getNews(countryId) {
    return this.#get(`/api/countries/${encodeURIComponent(countryId)}/news`);
  }

  /**
   * POST /api/news/{newsId}/grade … ニュースの問題を採点する
   * @param {string} newsId
   * @param {{answers: (number|null)[]}} payload
   * @returns {Promise<import("../../domain/models.js").GradeResult>} summary は null
   */
  gradeNews(newsId, payload) {
    return this.#transport.request("POST", `/api/news/${encodeURIComponent(newsId)}/grade`, payload);
  }

  // ---------- 単語 ----------

  /**
   * GET /api/words/lookup … 単語の意味を調べる
   * @param {string} word
   * @returns {Promise<{word: string, pos: string, meaning: string, lang: ""|"ja"|"en"}>}
   *          lang は意味の言語。見つからなければ ""（meaning も空）
   *
   * TODO(API): 辞書にない単語の意味を、文脈（context）に合わせて返す（Gemini）。context の送り方を決める。
   */
  lookupWord(word) {
    return this.#get(`/api/words/lookup?word=${encodeURIComponent(word)}`);
  }

  /**
   * GET /api/words … 単語帳
   * @returns {Promise<import("../../domain/models.js").SavedWord[]>}
   */
  getWords() {
    return this.#get("/api/words");
  }

  /**
   * POST /api/words … 単語帳に保存する
   * @param {import("../../domain/models.js").SavedWord} word
   * @returns {Promise<{ok: boolean, rewards: import("../../domain/models.js").Rewards}>} 単語数のバッジが取れることがある
   */
  saveWord(word) {
    return this.#transport.request("POST", "/api/words", word);
  }

  /** DELETE /api/words/{word} … 単語帳から消す（204） */
  deleteWord(word) {
    return this.#transport.request("DELETE", `/api/words/${encodeURIComponent(word)}`);
  }
}
