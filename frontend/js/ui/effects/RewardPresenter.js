/**
 * スタンプ・バッジを獲得したときの演出（ウィンドウと紙吹雪）
 *
 * 層：ui
 * 担当：フロント
 *
 * 採点で、スタンプ・バッジが同時に手に入ることがあります。ウィンドウが重ならないように、
 * 1 つずつ順番に（前のウィンドウが閉じられてから）出します。
 * 出来事（STAMP_EARNED / BADGE_EARNED）を聞くだけで、採点の処理は、ここを知りません。
 */
import { EVENTS } from "../../application/events.js";
import { badgeView } from "../components/BadgeView.js";
import { esc } from "../components/html.js";
import { stampView } from "../components/StampView.js";

/** 採点の結果が先に見えるように、ウィンドウを出すまで待つ時間（ミリ秒） */
const DELAY_MS = 900;

export class RewardPresenter {
  #ctx;
  #modal;
  #confetti;
  /** 出す順番を待っている演出（Promise を返す関数の行列） */
  #queue = [];
  #running = false;

  /**
   * @param {object} ctx store と events を使う
   * @param {import("../components/Modal.js").Modal} modal
   * @param {import("./Confetti.js").Confetti} confetti
   */
  constructor(ctx, modal, confetti) {
    this.#ctx = ctx;
    this.#modal = modal;
    this.#confetti = confetti;
  }

  /** 出来事を聞き始める */
  start() {
    const { events } = this.#ctx;
    events.on(EVENTS.STAMP_EARNED, (stamp) => this.#enqueue(() => this.#showStamp(stamp)));
    events.on(EVENTS.BADGE_EARNED, ({ badge }) => this.#enqueue(() => this.#showBadge(badge)));
  }

  #enqueue(job) {
    this.#queue.push(job);
    if (!this.#running) this.#drain();
  }

  async #drain() {
    this.#running = true;
    await new Promise((r) => setTimeout(r, DELAY_MS));
    while (this.#queue.length) await this.#queue.shift()();
    this.#running = false;
  }

  #showStamp({ countryId, earnedAt }) {
    const country = this.#ctx.store.findCountry(countryId);
    if (!country) return Promise.resolve();
    this.#confetti.burst();
    return this.#modal.open(
      `<div class="reward">
        <p class="reward__kicker">スタンプを獲得しました</p>
        <div class="reward__stamp">${stampView(country, { earnedAt, size: "lg", tilt: -6 })}</div>
        <h2>${esc(country.name)}のスタンプ</h2>
        <p class="muted">パスポートに押されました。</p>
        <div class="reward__actions">
          <a class="btn" href="#/tour" data-close>世界一周を見る</a>
          <button type="button" class="btn btn--ghost" data-close>閉じる</button>
        </div>
      </div>`,
      { cls: "modal--reward" }
    );
  }

  #showBadge(badge) {
    this.#confetti.burst({ count: 70 });
    return this.#modal.open(
      `<div class="reward">
        <p class="reward__kicker">バッジを獲得しました</p>
        <div class="reward__badge">${badgeView(badge, { size: "lg", showText: false })}</div>
        <h2>${esc(badge.name)}</h2>
        <p class="muted">${esc(badge.description)}</p>
        <div class="reward__actions"><button type="button" class="btn" data-close>閉じる</button></div>
      </div>`,
      { cls: "modal--reward" }
    );
  }
}
