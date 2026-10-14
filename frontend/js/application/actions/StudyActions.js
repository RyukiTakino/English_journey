/**
 * 学習（リーディング・リスニング）の操作の処理
 *
 * 層：application
 * 担当：フロント
 *
 * 記事・ニュースを開く、採点する、を行います。
 * 採点の結果は GRADED の出来事として知らせるだけで、演出は直接呼びません
 * （効果音・キャラクターの反応は EffectsDirector が聞いて出します）。
 */
import { EVENTS } from "../events.js";

export class StudyActions {
  #api;
  #events;
  #profile;

  /**
   * @param {import("../../infrastructure/api/ApiClient.js").ApiClient} api
   * @param {import("../events.js").EventBus} events
   * @param {import("./ProfileActions.js").ProfileActions} profile 手に入ったスタンプ・バッジを渡す先
   */
  constructor(api, events, profile) {
    this.#api = api;
    this.#events = events;
    this.#profile = profile;
  }

  /**
   * 記事と問題を取得する。答えと解説は含まれない。
   * @param {string} tripId
   * @returns {Promise<import("../../domain/models.js").Lesson>}
   */
  openLesson(tripId) {
    return this.#api.getLesson(tripId);
  }

  /**
   * 記事の問題を採点する。
   * @param {import("../../domain/models.js").Lesson} lesson
   * @param {(number|null)[]} answers 選んだ選択肢の番号（選んでいない問題は null）
   * @param {{text: string, lang: string}|null} [summary] 書いた要約
   * @returns {Promise<import("../../domain/models.js").GradeResult>}
   */
  async submitLesson(lesson, answers, summary = null) {
    const result = await this.#api.gradeLesson(lesson.id, { answers, summary });
    await this.#afterGrade("read", result);
    return result;
  }

  /**
   * ニュースを取得する。
   * @param {string} countryId
   * @returns {Promise<import("../../domain/models.js").NewsItem>}
   */
  openNews(countryId) {
    return this.#api.getNews(countryId);
  }

  /**
   * ニュースの問題を採点する。
   * @param {import("../../domain/models.js").NewsItem} news
   * @param {(number|null)[]} answers
   * @returns {Promise<import("../../domain/models.js").GradeResult>}
   */
  async submitNews(news, answers) {
    const result = await this.#api.gradeNews(news.id, { answers });
    await this.#afterGrade("listen", result);
    return result;
  }

  /** 採点後の共通処理：手に入ったものを受け取り、「採点した」と知らせる */
  async #afterGrade(kind, result) {
    await this.#profile.applyRewards(result.rewards);
    this.#events.emit(EVENTS.GRADED, { kind, correct: result.correct, total: result.total });
  }
}
