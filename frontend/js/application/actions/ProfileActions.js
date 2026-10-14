/**
 * 自分の学習記録まわりの操作の処理
 *
 * 層：application
 * 担当：フロント
 *
 * 学習記録（スタンプ・履歴・行きたいリスト・バッジなど）の読み込みと変更を行います。
 * 採点などで新しく手に入ったスタンプ・バッジは applyRewards() で受け取り、演出の出来事に変えて知らせます。
 */
import { EVENTS } from "../events.js";

export class ProfileActions {
  #api;
  #store;
  #events;

  /**
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
   * 学習記録を読み込む。
   * @param {boolean} [force] true なら、読み込み済みでも読み直す（採点のあとなど、記録が変わったとき）
   * @returns {Promise<import("../../domain/models.js").Me>}
   */
  async loadMe(force = false) {
    if (this.#store.me && !force) return this.#store.me;
    const me = await this.#api.getMe();
    this.#store.setMe(me);
    this.#events.emit(EVENTS.ME_CHANGED, me);
    return me;
  }

  /**
   * バッジの一覧を読み込む（取っていないものも含む）。
   * @param {boolean} [force]
   * @returns {Promise<import("../../domain/models.js").Badge[]>}
   */
  async loadBadges(force = false) {
    if (this.#store.badges && !force) return this.#store.badges;
    const badges = await this.#api.getBadges();
    this.#store.setBadges(badges);
    return badges;
  }

  /**
   * 表示名・英語レベルを変える。
   * @param {{displayName?: string, level?: "A2"|"B1"|"B2"}} patch
   */
  async updateProfile(patch) {
    await this.#api.updateMe(patch);
    await this.loadMe(true);
  }

  /**
   * 「行きたい」の入れ替え（入っていれば外し、入っていなければ入れる）。
   * @param {string} tripId
   * @returns {Promise<boolean>} 入れ替えたあとに「行きたい」になっているか
   */
  async toggleWant(tripId) {
    const wanted = this.#store.me?.wants.includes(tripId) ?? false;
    if (wanted) await this.#api.removeWant(tripId);
    else await this.#api.addWant(tripId);
    await this.loadMe(true);
    this.#events.emit(EVENTS.WANT_CHANGED, { tripId, wanted: !wanted });
    return !wanted;
  }

  /** 学習記録をすべて消す */
  async resetProgress() {
    await this.#api.resetProgress();
    await Promise.all([this.loadMe(true), this.loadBadges(true)]);
  }

  /**
   * 採点などで手に入ったスタンプ・バッジを受け取り、演出の出来事として知らせる。
   * 記録が変わっているので、Store の学習記録とバッジも読み直す。
   * @param {import("../../domain/models.js").Rewards|null|undefined} rewards
   */
  async applyRewards(rewards) {
    await Promise.all([this.loadMe(true), this.loadBadges(true)]);
    if (rewards?.stamp) this.#events.emit(EVENTS.STAMP_EARNED, rewards.stamp);
    for (const badge of rewards?.badges ?? []) this.#events.emit(EVENTS.BADGE_EARNED, { badge });
  }
}
