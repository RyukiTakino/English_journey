/**
 * リスニング画面（ニュースを聞いて 4 択に答える）
 *
 * 層：ui
 * 担当：フロント
 *
 * URL: #/listen/{countryId}   （params[0] = countryId）
 *
 * 画面の流れ：
 *   ヘッダー（国の名前）
 *   → NewsPlayer（動画、または英文の読み上げ。原稿は「原稿を見る」で開く）
 *   → 問題（QuizFlow：回答 → 採点 → 結果）
 *   → 採点後：原稿を自動で開き、日本語・英語の要約を出す
 *
 * 音声合成が使えないブラウザでは、NewsPlayer が原稿を最初から出して理由を書く。
 *
 * TODO(API): 動画（news.video）の取得は YouTube Data API 次第。無い国は読み上げの練習用ニュースになる。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { icon } from "../components/icons.js";
import { NewsPlayer } from "../components/NewsPlayer.js";
import { WordPopover } from "../components/WordPopover.js";
import { QuizFlow } from "../components/QuizFlow.js";
import { img } from "../assets.js";
import { Speech } from "../../infrastructure/speech.js";

export class ListeningScene extends BaseScene {
  /** @type {import("../../domain/models.js").NewsItem | null} */
  #news = null;
  /** @type {import("../../domain/models.js").Country | undefined} */
  #country = undefined;
  #speech = new Speech();
  #player = null;

  async load() {
    const [countryId] = this.params;
    const { actions, store } = this.ctx;
    const [, news] = await Promise.all([actions.catalog.loadCountries(), actions.study.openNews(countryId)]);
    this.#news = news;
    this.#country = store.findCountry(countryId);
    this.#player = new NewsPlayer(news, this.#speech);
  }

  render() {
    const c = this.#country;
    return `
      <div class="study study--listen">
        <a class="back-link" href="${c ? `#/country/${esc(c.id)}` : "#/"}">${icon("back", 16)} ${c ? `${esc(c.name)}に戻る` : "ホームに戻る"}</a>
        <header class="listening-head">
          <h1 class="listening-head__title">${img("icons/icon-headphones.png", { width: 44 })}<span>${c ? `${esc(c.name)}のニュース` : "ニュース"}</span></h1>
          ${c ? `<p class="muted">${esc(c.nameEn)} ・ 聞いてから、問題に答えましょう</p>` : ""}
        </header>
        <div data-player>${this.#player.render()}</div>
        <section class="listening-quiz" id="listening-quiz" aria-labelledby="listening-quiz-title">
          <h2 class="study-heading" id="listening-quiz-title">${img("icons/icon-notes.png", { width: 36 })} 問題にチャレンジ</h2>
          <div data-quiz></div>
        </section>
      </div>`;
  }

  mount(root) {
    const { ctx } = this;
    const news = this.#news;
    const c = this.#country;
    this.#player.mount(root.querySelector("[data-player]"));

    // 単語の意味（原稿を開いたときの単語タップ用）
    const popover = new WordPopover(ctx, { speech: this.#speech, getSource: () => news.headline });
    popover.attach(root.querySelector(".study"));

    const links = [
      { href: c ? `#/country/${c.id}` : "#/", label: c ? `${c.name}のページへ戻る` : "ホームへ戻る", primary: true }
    ];
    const flow = new QuizFlow(ctx, {
      questions: news.questions,
      links,
      submit: (answers) => ctx.actions.study.submitNews(news, answers),
      // 採点後：ニュースの要約（日本語・英語）を結果に足す
      resultExtra: () => `
        <div class="news-summary card">
          <h3>${icon("bulb", 18)} ニュースの内容</h3>
          <p>${esc(news.summaryJa)}</p>
          <p class="news-summary__en" lang="en">${esc(news.summaryEn)}</p>
        </div>`,
      onResult: () => {
        this.#speech.stop();
        this.#player.showScript(true); // 答え合わせのために原稿を開く
      }
    });
    flow.mount(root.querySelector("[data-quiz]"));

    this.onCleanup(() => {
      this.#player.destroy();
      this.#speech.stop();
      popover.destroy();
    });
  }
}
