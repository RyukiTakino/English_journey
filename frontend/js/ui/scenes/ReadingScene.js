/**
 * リーディング画面（記事を読んで 4 択に答える）
 *
 * 層：ui
 * 担当：フロント
 *
 * URL: #/read/{tripId}   （params[0] = tripId）
 *
 * 画面の流れ（スマホでも PC でも同じ縦並び）：
 *   ヘッダー（観光地の名前・レベル・目安の時間）
 *   → 英文の記事（単語をタップすると意味が出る / 読み上げ）
 *   → 問題（QuizFlow：回答 → 採点 → 結果）
 *
 * 部品の役割：
 *   WordPopover    … 単語をタップしたときの意味の吹き出し
 *   SpeechControls … 記事の読み上げ（再生・停止・速さ）
 *   QuizFlow       … 問題・採点・結果・やり直し（QuestionPanel / ResultPanel / SummaryBox を使う）
 *
 * 採点・スタンプ・バッジの判定はサーバー側。ここは結果を見せるだけ。
 *
 * TODO(API): lesson.canRegenerate が true のとき「別の文章で解く」ボタン（FR-15）を出す。いまは常に false。
 * TODO(フロント): 読み上げ中の文を本文の中でハイライトする（Speech の onboundary で位置はわかる）。
 */
import { BaseScene } from "./BaseScene.js";
import { esc, tokenize } from "../components/html.js";
import { icon } from "../components/icons.js";
import { categoryChip } from "../components/cards.js";
import { SpeechControls } from "../components/SpeechControls.js";
import { WordPopover } from "../components/WordPopover.js";
import { QuizFlow } from "../components/QuizFlow.js";
import { hydratePhotos, img } from "../assets.js";
import { Speech } from "../../infrastructure/speech.js";

export class ReadingScene extends BaseScene {
  /** @type {import("../../domain/models.js").Lesson | null} */
  #lesson = null;
  /** @type {import("../../domain/models.js").Trip | undefined} */
  #trip = undefined;
  /** @type {import("../../domain/models.js").Country | undefined} */
  #country = undefined;

  async load() {
    const [tripId] = this.params;
    const { actions, store } = this.ctx;
    // 国の一覧（観光地の名前・国の色・次の記事を知るため）と、記事を同時に取る。
    // Promise.all は「全部終わるまで待つ」。C# の Task.WhenAll と同じ。
    const [, lesson] = await Promise.all([actions.catalog.loadCountries(), actions.study.openLesson(tripId)]);
    this.#lesson = lesson;
    this.#trip = store.findTrip(tripId); // 一覧に無くても記事は読めるよう、無くてもエラーにはしない
    this.#country = this.#trip ? store.findCountry(this.#trip.countryId) : undefined;
  }

  render() {
    const lesson = this.#lesson;
    const trip = this.#trip;
    const country = this.#country;
    const hl = new Set(lesson.highlightWords);
    const backHref = country ? `#/country/${esc(country.id)}` : "#/";
    const backLabel = country ? `${esc(country.name)}に戻る` : "ホームに戻る";
    const paragraphs = lesson.article.paragraphs.map((p) => `<p>${tokenize(p, hl)}</p>`).join("");

    return `
      <div class="study study--read">
        <a class="back-link" href="${backHref}">${icon("back", 16)} ${backLabel}</a>

        <header class="reading-hero" ${trip ? `data-photo="${esc(trip.imageKey)}"` : ""} style="--c:${esc(country?.color ?? "#1e4d7b")}">
          <div class="reading-hero__text">
            <div class="meta-row">
              ${trip ? categoryChip(trip.category) : ""}
              <span class="chip">${esc(lesson.level)}</span>
              ${trip ? `<span class="chip">約 ${esc(trip.minutes)} 分</span>` : ""}
            </div>
            <h1 class="reading-hero__title">${esc(trip?.name ?? lesson.article.title)}</h1>
            ${trip ? `<p class="reading-hero__en">${esc(trip.nameEn)}</p>` : ""}
          </div>
        </header>

        <article class="reading-article card" aria-labelledby="reading-title">
          <div class="reading-article__tools" data-speech></div>
          <h2 class="reading-article__title" id="reading-title" lang="en">${esc(lesson.article.title)}</h2>
          <div class="reading-article__body study-text" lang="en">${paragraphs}</div>
          <p class="reading-article__tip">${img("mascot/bird-read.png", { width: 44 })}<span>下線の単語や、気になる単語をタップすると意味が見られます。</span></p>
          <a class="btn btn--teal reading-article__go" href="#reading-quiz" data-go-quiz>${icon("next", 18)} 問題に進む</a>
        </article>

        <section class="reading-quiz" id="reading-quiz" aria-labelledby="reading-quiz-title" tabindex="-1">
          <h2 class="study-heading" id="reading-quiz-title">${img("icons/icon-notes.png", { width: 36 })} 問題にチャレンジ</h2>
          <div data-quiz></div>
        </section>
      </div>`;
  }

  mount(root) {
    const lesson = this.#lesson;
    const { ctx } = this;
    hydratePhotos(root, ctx);

    // --- 音声（記事の読み上げと、単語の発音で 1 つを共有する） ---
    const speech = new Speech();
    const title = /[.!?]$/.test(lesson.article.title.trim()) ? lesson.article.title : `${lesson.article.title}.`;
    const text = [title, ...lesson.article.paragraphs].join("\n");
    const controls = new SpeechControls(speech, { getText: () => text, label: "記事を読み上げる" });
    const tools = root.querySelector("[data-speech]");
    tools.innerHTML = controls.render();
    controls.mount(tools);

    // --- 単語の意味 ---
    const popover = new WordPopover(ctx, { speech, getSource: () => this.#trip?.nameEn ?? lesson.article.title });
    popover.attach(root.querySelector(".study"));

    // --- 問題 ---
    const country = this.#country;
    const trips = country?.trips ?? [];
    const next = trips[trips.findIndex((t) => t.id === lesson.tripId) + 1];
    const links = [];
    if (next) links.push({ href: `#/read/${next.id}`, label: `次の記事へ：${next.name}`, primary: true });
    links.push(
      country
        ? { href: `#/country/${country.id}`, label: `${country.name}のページへ戻る`, primary: !next }
        : { href: "#/", label: "ホームへ戻る", primary: !next }
    );
    const flow = new QuizFlow(ctx, {
      questions: lesson.questions,
      withSummary: true,
      links,
      // 採点は actions に任せる。画面は結果を受け取って見せるだけ
      submit: (answers, summary) => ctx.actions.study.submitLesson(lesson, answers, summary),
      onResult: () => controls.stop() // 結果を見るときは、読み上げを止める
    });
    flow.mount(root.querySelector("[data-quiz]"));

    // 「問題に進む」：ページ内リンク（#reading-quiz）は URL が変わって Router と衝突するので、スクロールで代用する
    root.querySelector("[data-go-quiz]").addEventListener("click", (e) => {
      e.preventDefault();
      const quiz = root.querySelector("#reading-quiz");
      const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      quiz.scrollIntoView({ behavior, block: "start" });
      quiz.focus({ preventScroll: true });
    });

    // --- 後片付け：画面を離れるとき、読み上げを止めて、吹き出しのイベントを外す ---
    this.onCleanup(() => {
      controls.destroy();
      speech.stop();
      popover.destroy();
    });
  }
}
