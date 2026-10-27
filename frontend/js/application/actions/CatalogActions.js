/**
 * 国・観光地まわりの操作の処理
 *
 * 層：application
 * 担当：フロント
 *
 * 画面から呼ばれて「通信する → Store に入れる → 出来事を知らせる」を行います。
 * 画面は api や store を書き換えず、必ずこのクラスのメソッドを呼びます。
 *   画面 → CatalogActions → ApiClient（通信）
 *                         → Store（結果を保存）
 *                         → EventBus（出来事を通知）
 *
 * （ゲーム開発でいう、UI から呼ばれるコマンド / ユースケースのクラスに近いものです）
 */
import { EVENTS } from "../events.js";

export class CatalogActions {
  #api;
  #store;
  #events;
  /** 画像の URL のキャッシュ。同じ画像を何度も問い合わせない。キー → Promise<string|null> */
  #photos = new Map();

  /**
   * 必要な道具を外から受け取る（依存性の注入）。自分で new しないので、テストや差し替えが楽になる。
   * main.js で組み立てるときに渡す。
   * @param {import("../../infrastructure/api/ApiClient.js").ApiClient} api
   * @param {import("../store.js").Store} store
   * @param {import("../events.js").EventBus} events
   */
  constructor(api, store, events) {
    this.#api = api;
    this.#store = store;
    this.#events = events;
  }

  /**
   * 国の一覧を読み込む。
   * 読み込み済みなら通信せず、Store の内容をそのまま返す（画面を行き来しても通信しない）。
   * @returns {Promise<import("../store.js").Country[]>}
   * @throws {import("../../infrastructure/api/ApiClient.js").ApiError} 通信に失敗したとき（呼び出した画面で表示する）
   */
  async loadCountries() {
    // すでに読み込み済みなら、通信を省く
    if (this.#store.countries) return this.#store.countries;

    const countries = await this.#api.getCountries();
    this.#store.setCountries(countries);
    // 「読み込んだ」と知らせる。受け取りたい部品が自由に on で聞ける
    this.#events.emit(EVENTS.COUNTRIES_LOADED, countries);
    return countries;
  }

  /**
   * 国の詳細（説明文 info を含む）を取得する。
   * 詳細は画面ごとに1回見るだけなので、Store には保存せず、そのまま返す。
   * @param {string} countryId 例: "uk"
   * @returns {Promise<import("../../domain/models.js").CountryDetail>}
   * @throws {import("../../infrastructure/api/ApiClient.js").ApiError} 存在しない id や通信失敗のとき
   */
  getCountry(countryId) {
    return this.#api.getCountry(countryId);
  }

    /** Wikipedia記事のカテゴリ一覧を取得する */
  async getCategories() {
    return await this.#api.getCategories();
  }

  /** Wikipediaの記事一覧を検索する。countryは英語の国名、keywordは英語の検索語。 */
  searchArticles(country, keyword) {
    return this.#api.getArticles(country, keyword);
  }

  /** Wikipediaの記事本文を取得する。 */
  getArticle(title) {
    return this.#api.getArticle(title);
  }

  /**
   * 観光地の写真の URL を取る。同じものは1回しか問い合わせない。見つからなくても例外は投げず null を返す。
   * @param {string} key Trip.imageKey
   * @param {boolean} [large] true なら大きい画像
   * @returns {Promise<string|null>}
   */
  photoUrl(key, large = false) {
    const cacheKey = `${key}|${large}`;
    if (!this.#photos.has(cacheKey)) {
      this.#photos.set(cacheKey, this.#api.imageUrl(key, large).catch(() => null));
    }
    return this.#photos.get(cacheKey);
  }

    // ---------- YouTube学習 ----------

  /** 選択都市の最近のYouTubeニュースを検索する */
  searchYoutubeNews(country, city) {
    return this.#api.searchYoutubeNews(country, city);
  }

  /**
   * YouTube動画の音声をOpenAIで分析する
   * @param {string} url YouTube動画のURL
   * @param {string} title 動画タイトル
   */
  analyzeYoutubeVideo(url, title = "YouTube Video") {
    return this.#api.analyzeYoutubeVideo(url, title);
  }

  /**
   * 動画の分析結果からクイズを生成する
   * @param {string} videoId YouTube動画ID
   */
  generateYoutubeQuiz(videoId) {
    return this.#api.generateYoutubeQuiz(videoId);
  }

  /**
   * 動画の内容を基準に英語の要約を採点する
   * @param {string} videoId YouTube動画ID
   * @param {string} summary ユーザーが書いた英語の要約
   */
  gradeYoutubeSummary(videoId, summary) {
    return this.#api.gradeYoutubeSummary(videoId, summary);
  }
}
