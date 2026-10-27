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
  #youtubeAnalysis = null;
  #youtubeQuestions = [];
  #youtubeAnswers = {};
  #youtubeQuizScore = null;
  #youtubeSummary = "";
  #youtubeGrade = null;
  #cityEn = "";
  #youtubeNews = [];
  #youtubeSelectedNews = null;
  #youtubeNewsLoading = false;
  #youtubeNewsError = "";
  #youtubeError = "";
  #youtubeQuizError = "";
  #youtubeBusy = false;
  #youtubeQuizBusy = false;
  #youtubeGradeBusy = false;

  async load() {
    const [countryId, encodedCity] = this.params;
    const { actions, store } = this.ctx;
    await actions.catalog.loadCountries();
    this.#country = store.findCountry(countryId);
    if (encodedCity) {
      this.#cityEn = decodeURIComponent(encodedCity);
      this.#youtubeNewsLoading = true;
      try {
        this.#youtubeNews = await actions.catalog.searchYoutubeNews(
          this.#country.nameEn,
          this.#cityEn
        );
      } catch (error) {
        this.#youtubeNewsError = error?.message || "YouTubeニュースを検索できませんでした。";
      } finally {
        this.#youtubeNewsLoading = false;
      }
      return;
    }

    this.#news = await actions.study.openNews(countryId);
    this.#player = new NewsPlayer(this.#news, this.#speech);
  }

  render() {
    const c = this.#country;
    if (this.#cityEn) {
      return `
        <div class="study study--listen">
          <a class="back-link" href="#/country/${esc(c.id)}">${icon("back", 16)} 都市選択に戻る</a>
          <header class="listening-head">
            <h1 class="listening-head__title">${img("icons/icon-headphones.png", { width: 44 })}<span>${esc(this.#cityEn)}の最新ニュース</span></h1>
            <p class="muted">${esc(c.name)} ・ YouTubeの新着動画から選んで学習</p>
          </header>
          ${this.#renderCityNews()}
          <div data-youtube-learning>${this.#renderYoutubeLearning()}</div>
        </div>`;
    }
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

  #renderCityNews() {
    if (this.#youtubeNewsLoading) {
      return `<section class="youtube-study card"><p role="status">${esc(this.#cityEn)}の最近のニュースを検索しています...</p></section>`;
    }
    return `
      <section class="youtube-study card" aria-labelledby="youtube-news-title">
        <header class="youtube-study__head">
          <div><span class="chip chip--news">YouTube News</span><h2 id="youtube-news-title">最近の動画</h2></div>
        </header>
        ${this.#youtubeNewsError ? `<p class="youtube-study__error" role="alert">${esc(this.#youtubeNewsError)}</p>` : ""}
        ${!this.#youtubeNewsError && !this.#youtubeNews.length ? `<p class="muted">直近30日以内のニュース動画が見つかりませんでした。</p>` : ""}
        <div class="youtube-news-list">
          ${this.#youtubeNews.map((video) => `
            <article class="youtube-news-item">
              ${video.thumbnail ? `<img class="youtube-news-item__image" src="${esc(video.thumbnail)}" alt="" loading="lazy">` : ""}
              <div class="youtube-news-item__body">
                <h3>${esc(video.title)}</h3>
                <p class="muted small">${esc(video.channelTitle)} · ${esc(new Date(video.publishedAt).toLocaleDateString())}</p>
                <p class="small">${esc(video.description)}</p>
                <button type="button" class="btn btn--teal" data-youtube-video="${esc(video.videoId)}" ${this.#youtubeBusy ? "disabled" : ""}>この動画で学習 ${icon("next", 16)}</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>`;
  }

  #renderYoutubeLearning() {
    if (!this.#youtubeSelectedNews) return "";
    const video = this.#youtubeAnalysis;
    return `
      <section class="youtube-study card" aria-labelledby="youtube-study-title">
        <header class="youtube-study__head">
          <div>
            <span class="chip chip--news">YouTube Audio</span>
            <h2 id="youtube-study-title">${esc(this.#youtubeSelectedNews?.title ?? "動画の音声で学習")}</h2>
          </div>
        </header>
        ${this.#youtubeSelectedNews ? `<p class="muted">${esc(this.#youtubeSelectedNews.channelTitle)} · ${esc(new Date(this.#youtubeSelectedNews.publishedAt).toLocaleDateString())}</p>` : ""}
        <div class="youtube-study__video">
          <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.#youtubeSelectedNews.videoId)}" title="${esc(this.#youtubeSelectedNews.title)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
        ${this.#youtubeBusy || this.#youtubeQuizBusy ? `<p role="status">動画の音声を分析しています...</p>` : ""}
        ${this.#youtubeError ? `<p class="youtube-study__error" role="alert">${esc(this.#youtubeError)}</p>` : ""}
        ${video ? `
          <section class="youtube-study__analysis" aria-label="音声分析結果">
            <h3>${esc(video.title)}</h3>
            <h4>動画の内容</h4>
            <p lang="ja">${esc(video.summary_ja)}</p>
            <p class="youtube-study__english" lang="en">${esc(video.summary)}</p>
            <h4>重要なポイント</h4>
            <ul>${(video.key_points ?? []).map((point) => `<li>${esc(point)}</li>`).join("")}</ul>
          </section>
          ${this.#renderYoutubeQuiz()}
          ${this.#renderYoutubeSummaryGrade()}
        ` : ""}
      </section>`;
  }

  #renderYoutubeQuiz() {
    if (this.#youtubeQuizBusy) return `<p role="status">音声の内容から問題を作成中...</p>`;
    if (!this.#youtubeQuestions.length) {
      return this.#youtubeQuizError ? `<p class="youtube-study__error" role="alert">${esc(this.#youtubeQuizError)}</p>` : "";
    }

    return `
      <form data-youtube-quiz-form class="youtube-study__quiz">
        <h3>理解度チェック</h3>
        ${this.#youtubeQuestions.map((question, questionIndex) => `
          <fieldset class="youtube-study__question">
            <legend>${questionIndex + 1}. ${esc(question.question)}</legend>
            <div class="youtube-study__choices">
              ${question.choices.map((choice, choiceIndex) => {
                const isSelected = this.#youtubeAnswers[questionIndex] === choiceIndex;
                const isCorrect = question.answer === choiceIndex;
                const state = this.#youtubeQuizScore === null ? "" : isCorrect ? " is-correct" : isSelected ? " is-incorrect" : "";
                return `<label class="youtube-study__choice${state}"><input type="radio" name="answer-${questionIndex}" value="${choiceIndex}" ${isSelected ? "checked" : ""} required ${this.#youtubeQuizScore !== null ? "disabled" : ""}><span>${esc(choice)}</span></label>`;
              }).join("")}
            </div>
            ${this.#youtubeQuizScore !== null ? `<p class="youtube-study__explanation">${esc(question.explanation)}</p>` : ""}
          </fieldset>
        `).join("")}
        ${this.#youtubeQuizScore === null
          ? `<button class="btn btn--teal" type="submit">答え合わせ</button>`
          : `<p class="youtube-study__score" role="status">${this.#youtubeQuestions.length}問中 ${this.#youtubeQuizScore}問正解</p>`}
      </form>`;
  }

  #renderYoutubeSummaryGrade() {
    const result = this.#youtubeGrade;
    return `
      <form data-youtube-summary-form class="youtube-study__summary-form">
        <label for="youtube-summary">動画の内容を英語で要約</label>
        <textarea id="youtube-summary" name="youtube-summary" rows="5" maxlength="5000" required placeholder="Write a short summary in English.">${esc(this.#youtubeSummary)}</textarea>
        <button class="btn btn--ghost" type="submit" ${this.#youtubeGradeBusy ? "disabled" : ""}>${this.#youtubeGradeBusy ? "採点中..." : "要約を採点"}</button>
      </form>
      ${result ? `
        <section class="youtube-study__grade" aria-label="要約の採点結果" aria-live="polite">
          <h3>要約の採点結果: ${result.total_score} / 100</h3>
          <p>${esc(result.feedback)}</p>
          ${result.improvements.length ? `<ul>${result.improvements.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}
          <h4>改善例</h4>
          <p class="youtube-study__english" lang="en">${esc(result.corrected_summary)}</p>
        </section>
      ` : ""}
    `;
  }

  #refreshYoutubeLearning(container) {
    container.innerHTML = this.#renderYoutubeLearning();
  }

  async #analyzeYoutube(item, container) {
    this.#youtubeSelectedNews = item;
    this.#youtubeBusy = true;
    this.#youtubeError = "";
    this.#youtubeQuizError = "";
    this.#youtubeAnalysis = null;
    this.#youtubeQuestions = [];
    this.#youtubeAnswers = {};
    this.#youtubeQuizScore = null;
    this.#youtubeGrade = null;
    this.#refreshYoutubeLearning(container);
    try {
      this.#youtubeAnalysis = await this.ctx.actions.catalog.analyzeYoutubeVideo(item.url, item.title);
      this.#youtubeQuestions = [];
      this.#youtubeAnswers = {};
      this.#youtubeQuizScore = null;
      this.#youtubeSummary = "";
      this.#youtubeGrade = null;
    } catch (error) {
      this.#youtubeError = error?.message || "動画の音声を分析できませんでした。";
    } finally {
      this.#youtubeBusy = false;
      this.#refreshYoutubeLearning(container);
    }

    if (!this.#youtubeAnalysis) return;
    this.#youtubeQuizBusy = true;
    this.#refreshYoutubeLearning(container);
    try {
      const result = await this.ctx.actions.catalog.generateYoutubeQuiz(this.#youtubeAnalysis.video_id);
      this.#youtubeQuestions = result.questions ?? [];
    } catch (error) {
      this.#youtubeQuizError = error?.message || "問題を作成できませんでした。";
    } finally {
      this.#youtubeQuizBusy = false;
      this.#refreshYoutubeLearning(container);
    }
  }

  #checkYoutubeQuiz(form, container) {
    const formData = new FormData(form);
    this.#youtubeAnswers = Object.fromEntries(
      this.#youtubeQuestions.map((_, index) => [index, Number(formData.get(`answer-${index}`))])
    );
    this.#youtubeQuizScore = this.#youtubeQuestions.reduce(
      (score, question, index) => score + (this.#youtubeAnswers[index] === question.answer ? 1 : 0),
      0
    );
    this.#refreshYoutubeLearning(container);
  }

  async #gradeYoutubeSummary(form, container) {
    this.#youtubeSummary = new FormData(form).get("youtube-summary")?.toString().trim() ?? "";
    this.#youtubeGradeBusy = true;
    this.#youtubeError = "";
    this.#refreshYoutubeLearning(container);
    try {
      this.#youtubeGrade = await this.ctx.actions.catalog.gradeYoutubeSummary(
        this.#youtubeAnalysis.video_id,
        this.#youtubeSummary
      );
    } catch (error) {
      this.#youtubeError = error?.message || "要約を採点できませんでした。";
    } finally {
      this.#youtubeGradeBusy = false;
      this.#refreshYoutubeLearning(container);
    }
  }

  mount(root) {
    const { ctx } = this;
    if (this.#cityEn) {
      const panel = root.querySelector("[data-youtube-learning]");
      const onSubmit = (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.matches("[data-youtube-quiz-form]")) {
          event.preventDefault();
          this.#checkYoutubeQuiz(form, panel);
        } else if (form.matches("[data-youtube-summary-form]")) {
          event.preventDefault();
          void this.#gradeYoutubeSummary(form, panel);
        }
      };
      const onClick = (event) => {
        const button = event.target.closest("[data-youtube-video]");
        if (!button || button.disabled) return;
        const item = this.#youtubeNews.find((video) => video.videoId === button.dataset.youtubeVideo);
        if (item) void this.#analyzeYoutube(item, panel);
      };
      root.addEventListener("submit", onSubmit);
      root.addEventListener("click", onClick);
      this.onCleanup(() => {
        root.removeEventListener("submit", onSubmit);
        root.removeEventListener("click", onClick);
        this.#speech.stop();
      });
      return;
    }

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
