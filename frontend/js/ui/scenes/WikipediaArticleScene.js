import { BaseScene } from "./BaseScene.js";
import { esc, tokenize } from "../components/html.js";
import { icon } from "../components/icons.js";
import { SpeechControls } from "../components/SpeechControls.js";
import { WordPopover } from "../components/WordPopover.js";
import { Speech } from "../../infrastructure/speech.js";

export class WikipediaArticleScene extends BaseScene {
  #article = null;
  #error = "";
  #countryId = "";

  // 読解クイズ
  #questions = [];
  #answers = {};
  #submitted = false;
  #loading = false;

  // 英語要約・採点
  #summary = "";
  #grading = false;
  #gradeResult = null;
  #gradeError = "";
  #root = null;
  #speech = null;
  #controls = null;
  #popover = null;

  async load() {
    const [countryId, encodedTitle] = this.params;

    this.#countryId = decodeURIComponent(countryId);
    const title = decodeURIComponent(encodedTitle);

    this.#article = await this.ctx.actions.catalog.getArticle(title);

    if (!this.#article?.content) {
      this.#error = "記事本文を取得できませんでした。";
    }
  }

  // =========================
  // 読解クイズ
  // =========================

  async generateQuiz() {
    if (this.#loading || this.#questions.length > 0) {
      return;
    }

    this.#loading = true;
    this.#error = "";
    this.#refresh();

    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: this.#article.title,
          content: this.#article.content
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "問題の生成に失敗しました。"
        );
      }

      if (!Array.isArray(data.questions) ||
          data.questions.length === 0) {
        throw new Error("問題を取得できませんでした。");
      }

      this.#questions = data.questions;
      this.#answers = {};
      this.#submitted = false;

    } catch (err) {
      this.#error =
        err.message || "問題の生成に失敗しました。";

    } finally {
      this.#loading = false;
      this.#refresh();
    }
  }

  // =========================
  // 英語要約の採点
  // =========================

  async gradeSummary() {
    if (this.#grading) {
      return;
    }

    const summary = this.#summary.trim();

    if (!summary) {
      this.#gradeError = "英語の要約を入力してください。";
      this.#refresh();
      return;
    }

    if (summary.length > 5000) {
      this.#gradeError =
        "要約は5000文字以内で入力してください。";
      this.#refresh();
      return;
    }

    if (!this.#article?.content) {
      this.#gradeError = "記事本文を取得できませんでした。";
      this.#refresh();
      return;
    }

    this.#grading = true;
    this.#gradeError = "";
    this.#gradeResult = null;

    this.#refresh();

    try {
      const response = await fetch("/api/summary/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: this.#article.title,
          content: this.#article.content,
          summary: summary
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "要約の採点に失敗しました。"
        );
      }

      // 採点結果の形式を確認
      if (
        typeof data.total_score !== "number" ||
        !data.scores ||
        typeof data.feedback !== "string" ||
        !Array.isArray(data.improvements) ||
        typeof data.corrected_summary !== "string"
      ) {
        throw new Error(
          "採点結果の形式が正しくありません。"
        );
      }

      this.#gradeResult = data;

    } catch (err) {
      this.#gradeError =
        typeof err.message === "string"
          ? err.message
          : "採点に失敗しました。もう一度お試しください。";

    } finally {
      this.#grading = false;
      this.#refresh();
    }
  }

  // =========================
  // 画面更新
  // =========================

  #refresh() {
    const root = document.querySelector("#app");

    if (!root) {
      return;
    }

    // rootに登録済みのイベントリスナーは維持する
    root.innerHTML = this.render();
    this.#mountReadingTools(root);

    window.scrollTo(0, 0);
  }

  // =========================
  // HTML描画
  // =========================

  render() {
    const article = this.#article;

    return `
      <main class="study study--read wikipedia-reading">

        <a
          class="back-link"
          href="#/country/${esc(this.#countryId)}"
        >
          ${icon("back", 16)} 記事一覧に戻る
        </a>

        <article class="reading-article card">

          <div class="reading-article__tools" data-speech></div>

          <div class="meta-row">
            <span class="chip chip--news">Wikipedia</span>
          </div>

          <h1
            class="reading-article__title"
            lang="en"
          >
            ${esc(article?.title ?? "記事")}
          </h1>

          ${article?.content ? `
            <p class="reading-article__tip">
              ${icon("bulb", 18)} 単語をクリックすると、意味と発音を確認できます。
            </p>
          ` : ""}

          ${this.#error ? `
            <p class="muted" role="alert">
              ${esc(this.#error)}
            </p>
          ` : ""}

          ${article?.content ? `
            <div
              class="reading-article__body study-text wikipedia-article-content"
              lang="en"
            >
              ${article.content
                .split(/\n\s*\n/)
                .map((p) => `<p>${tokenize(p.replace(/\n/g, " "))}</p>`)
                .join("")}
            </div>

            ${article.url ? `
              <p class="small muted">
                <a
                  href="${esc(article.url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wikipediaで原文を開く ↗
                </a>
              </p>
            ` : ""}
          ` : ""}

          ${article?.content ? this.#renderSummarySection() : ""}

          ${article?.content ? this.#renderQuizSection() : ""}

        </article>
      </main>
    `;
  }

  // =========================
  // 要約入力・採点結果
  // =========================

  #renderSummarySection() {
    const result = this.#gradeResult;

    return `
      <section class="summary-section">

        <h2>📝 英語要約チャレンジ</h2>

        <p>
          この記事の内容を英語で要約してみよう。
          AIが内容の正確さ、重要な情報の網羅性、
          文法、表現の自然さを評価するよ。
        </p>

        <label for="english-summary">
          <strong>あなたの英語要約</strong>
        </label>

        <textarea
          id="english-summary"
          class="summary-textarea"
          data-summary-input
          rows="10"
          maxlength="5000"
          placeholder="Write your summary in English..."
          ${this.#grading ? "disabled" : ""}
        >${esc(this.#summary)}</textarea>

        <p class="small muted">
          ${this.#summary.length} / 5000文字
        </p>

        ${this.#gradeError ? `
          <p class="muted" role="alert">
            ${esc(this.#gradeError)}
          </p>
        ` : ""}

        <button
          type="button"
          class="btn btn--teal"
          data-grade-summary
          ${this.#grading || !this.#summary.trim()
            ? "disabled"
            : ""}
        >
          ${this.#grading
            ? "AIが採点中..."
            : "AIに採点してもらう"}
        </button>

        ${result ? this.#renderGradeResult(result) : ""}

      </section>
    `;
  }

  #renderGradeResult(result) {
    const scores = result.scores;

    const scoreItems = [
      {
        key: "accuracy",
        label: "内容の正確さ",
        max: 40
      },
      {
        key: "coverage",
        label: "重要な情報の網羅性",
        max: 30
      },
      {
        key: "grammar",
        label: "英文法",
        max: 20
      },
      {
        key: "naturalness",
        label: "英語表現の自然さ",
        max: 10
      }
    ];

    return `
      <section class="card summary-result">

        <h2>📊 採点結果</h2>

        <div class="summary-total-score">
          <p>あなたのスコア</p>

          <p>
            <strong>
              ${esc(String(result.total_score))}
            </strong>
            <span> / 100点</span>
          </p>
        </div>

        <h3>採点の内訳</h3>

        <div class="summary-score-list">
          ${scoreItems.map(item => `
            <div class="summary-score-item">

              <div class="summary-score-label">
                <span>${esc(item.label)}</span>

                <strong>
                  ${esc(String(scores[item.key]))}
                  / ${item.max}点
                </strong>
              </div>

              <progress
                value="${Number(scores[item.key]) || 0}"
                max="${item.max}"
                aria-label="${esc(item.label)}"
              ></progress>

            </div>
          `).join("")}
        </div>

        <div class="summary-feedback">

          <h3>💬 AIからの講評</h3>

          <p>
            ${esc(result.feedback)}
          </p>

        </div>

        <div class="summary-improvements">

          <h3>📌 改善ポイント</h3>

          ${result.improvements.length > 0 ? `
            <ul>
              ${result.improvements.map(item => `
                <li>${esc(item)}</li>
              `).join("")}
            </ul>
          ` : `
            <p>大きな改善点はありません。</p>
          `}

        </div>

        <div class="summary-correction">

          <h3>✨ 修正版の英文</h3>

          <p lang="en">
            ${esc(result.corrected_summary)}
          </p>

        </div>

        <button
          type="button"
          class="btn btn--teal"
          data-retry-summary
        >
          要約を書き直して再採点
        </button>

      </section>
    `;
  }

  // =========================
  // 読解クイズ画面
  // =========================

  #renderQuizSection() {
    return `
      <section class="quiz-section">

        <h2>英語読解チャレンジ</h2>

        <p class="muted">
          この記事の内容から英語の読解問題を3問生成します。
        </p>

        ${this.#questions.length === 0 ? `
          <button
            type="button"
            class="btn btn--teal"
            data-generate-quiz
            ${this.#loading ? "disabled" : ""}
          >
            ${this.#loading
              ? "問題を生成中..."
              : "問題を生成する"}
          </button>
        ` : this.#renderQuestions()}

      </section>
    `;
  }

  #renderQuestions() {
    const questions = this.#questions;

    const score = questions.reduce((total, question, index) => {
      return total + (
        this.#answers[index] !== undefined &&
        Number(this.#answers[index]) ===
          Number(question.answer)
          ? 1
          : 0
      );
    }, 0);

    return `
      <div class="quiz-questions">

        ${questions.map((question, index) => `
          <section class="card quiz-question">

            <h3>
              Q${index + 1}. ${esc(question.question)}
            </h3>

            <div class="quiz-choices">

              ${question.choices.map((choice, choiceIndex) => {
                const selected =
                  this.#answers[index] === choiceIndex;

                const correct =
                  Number(question.answer) === choiceIndex;

                let stateClass = "";

                if (this.#submitted && correct) {
                  stateClass = " quiz-choice--correct";
                } else if (
                  this.#submitted &&
                  selected &&
                  !correct
                ) {
                  stateClass = " quiz-choice--incorrect";
                }

                return `
                  <label class="quiz-choice${stateClass}">

                    <input
                      type="radio"
                      name="question-${index}"
                      value="${choiceIndex}"
                      data-question="${index}"
                      ${selected ? "checked" : ""}
                      ${this.#submitted ? "disabled" : ""}
                    >

                    <span>${esc(choice)}</span>

                  </label>
                `;
              }).join("")}

            </div>

            ${this.#submitted ? `
              <div class="quiz-explanation">

                <p>
                  <strong>
                    ${
                      Number(question.answer) ===
                      Number(this.#answers[index])
                        ? "正解！"
                        : "不正解"
                    }
                  </strong>
                </p>

                <p>${esc(question.explanation)}</p>

              </div>
            ` : ""}

          </section>
        `).join("")}

      </div>

      ${!this.#submitted ? `
        <button
          type="button"
          class="btn btn--teal"
          data-submit-quiz
        >
          回答を確認する
        </button>
      ` : `
        <section class="card quiz-result">

          <h3>
            結果：${score} / ${questions.length} 問正解
          </h3>

          <p>
            お疲れさま！解説を読んで復習してみよう。
          </p>

        </section>
      `}
    `;
  }

  // =========================
  // イベント処理
  // =========================

  mount(root) {
    this.#root = root;
    this.#mountReadingTools(root);
    const onClick = async (event) => {

      // クイズ生成
      if (event.target.closest("[data-generate-quiz]")) {
        await this.generateQuiz();
        return;
      }

      // クイズ採点
      if (event.target.closest("[data-submit-quiz]")) {
        if (
          Object.keys(this.#answers).length !==
          this.#questions.length
        ) {
          this.#error = "すべての問題に回答してね。";
          this.#refresh();
          return;
        }

        this.#error = "";
        this.#submitted = true;
        this.#refresh();
        return;
      }

      // 要約採点
      if (event.target.closest("[data-grade-summary]")) {
        await this.gradeSummary();
        return;
      }

      // 要約を書き直す
      if (event.target.closest("[data-retry-summary]")) {
        this.#summary = "";
        this.#gradeResult = null;
        this.#gradeError = "";
        this.#refresh();

        const textarea = root.querySelector(
          "[data-summary-input]"
        );

        textarea?.focus();
      }
    };

    const onChange = (event) => {
      const input = event.target.closest("[data-question]");

      if (!input || this.#submitted) {
        return;
      }

      this.#answers[Number(input.dataset.question)] =
        Number(input.value);
    };

    const onInput = (event) => {
      const textarea = event.target.closest(
        "[data-summary-input]"
      );

      if (!textarea || this.#grading) {
        return;
      }

      this.#summary = textarea.value;

      // 入力のたびに画面を再描画しない
      const button = root.querySelector(
        "[data-grade-summary]"
      );

      if (button) {
        button.disabled = !this.#summary.trim();
      }

      const counter = textarea.parentElement.querySelector(
        ".summary-character-count"
      );

      if (counter) {
        counter.textContent =
          `${this.#summary.length} / 5000文字`;
      }
    };

    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
    root.addEventListener("input", onInput);

    this.onCleanup(() => {
      this.#controls?.destroy();
      this.#speech?.stop();
      this.#popover?.destroy();
      this.#controls = null;
      this.#speech = null;
      this.#popover = null;
      this.#root = null;
      root.removeEventListener("click", onClick);
      root.removeEventListener("change", onChange);
      root.removeEventListener("input", onInput);
    });
  }

  /** Wikipedia本文にも、通常記事と同じ読み上げ・単語クリックを接続する。 */
  #mountReadingTools(root) {
    this.#controls?.destroy();
    this.#speech?.stop();
    this.#popover?.destroy();
    if (!this.#article?.content) return;

    this.#speech = new Speech();
    const title = /[.!?]$/.test(this.#article.title.trim()) ? this.#article.title : `${this.#article.title}.`;
    const text = [title, this.#article.content].join("\n");
    this.#controls = new SpeechControls(this.#speech, { getText: () => text, label: "記事を読み上げる" });
    const tools = root.querySelector("[data-speech]");
    if (tools) {
      tools.innerHTML = this.#controls.render();
      this.#controls.mount(tools);
    }

    this.#popover = new WordPopover(this.ctx, { speech: this.#speech, getSource: () => this.#article.title });
    this.#popover.attach(root.querySelector(".wikipedia-reading"));
  }
}
