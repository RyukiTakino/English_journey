/**
 * 単語まわりの操作の処理
 *
 * 層：application
 * 担当：フロント
 *
 * 単語の意味を調べる、単語帳に保存・削除する、を行います。
 */
import { EVENTS } from "../events.js";

export class WordActions {
  #api;
  #events;
  #profile;
  /** 調べた結果のキャッシュ。同じ単語を何度も問い合わせない */
  #lookups = new Map();

  /**
   * @param {import("../../infrastructure/api/ApiClient.js").ApiClient} api
   * @param {import("../events.js").EventBus} events
   * @param {import("./ProfileActions.js").ProfileActions} profile 単語数のバッジを渡す先
   */
  constructor(api, events, profile) {
    this.#api = api;
    this.#events = events;
    this.#profile = profile;
  }

  /**
   * 単語の意味を調べる。
   * @param {string} word
   * @returns {Promise<{word: string, pos: string, meaning: string, lang: ""|"ja"|"en"}>}
   */
  lookup(word) {
    const key = word.toLowerCase();
    if (!this.#lookups.has(key)) {
      // 失敗したときはキャッシュに残さない（次にタップしたとき、もう一度問い合わせられるように）
      this.#lookups.set(
        key,
        this.#api.lookupWord(word).catch((e) => {
          this.#lookups.delete(key);
          throw e;
        })
      );
    }
    return this.#lookups.get(key);
  }

  /**
   * 単語帳の一覧。
   * @returns {Promise<import("../../domain/models.js").SavedWord[]>}
   */
  list() {
    return this.#api.getWords();
  }

  /**
   * 単語帳に保存する。単語数のバッジが取れたときは、演出の出来事で知らせる。
   * @param {import("../../domain/models.js").SavedWord} word
   */
  async save(word) {
    const res = await this.#api.saveWord(word);
    await this.#profile.applyRewards(res.rewards);
    this.#events.emit(EVENTS.WORD_SAVED, { word: word.word });
  }

  /**
   * 単語帳から消す。
   * @param {string} word
   */
  async remove(word) {
    await this.#api.deleteWord(word);
    await this.#profile.loadMe(true);
  }
}
