/**
 * 「問題に答える → 採点 → 結果 → もう一度」の流れをまとめた部品
 *
 * 層：ui
 * 担当：フロント
 *
 * リーディングとリスニングは、この流れがまったく同じなので、1 か所にまとめている。
 * 画面（Scene）は「どの問題か」「どの API で採点するか」だけを渡す。
 *
 *   const flow = new QuizFlow(ctx, {
 *     questions, submit: (answers, summary) => actions.study.submitLesson(...),
 *     withSummary: true, links: [...], onResult: (result) => { ... }
 *   });
 *   flow.mount(containerElement);
 *
 * ■ 失敗したとき：トーストで ApiError.message を出し、選んだ答えはそのまま残す（もう一度「採点する」を押せる）。
 * ■ 二重送信：採点中は #pending が true になり、ボタンも押せなくなる。
 *
 * TODO(Backend): 採点のルール（何割でスタンプか、など）はサーバー側。ここは結果を見せるだけ。
 */
import { QuestionPanel } from "./QuestionPanel.js";
import { SummaryBox } from "./SummaryBox.js";
import { resultPanel } from "./ResultPanel.js";

export class QuizFlow {
  #ctx;
  #opts;
  #container = null;
  #panel = null;
  #summary = null;
  #pending = false;

  /**
   * @param {object} ctx
   * @param {object} opts
   * @param {import("../../domain/models.js").Question[]} opts.questions
   * @param {(answers: (number|null)[], summary: {text: string, lang: string}|null) => Promise<import("../../domain/models.js").GradeResult>} opts.submit
   *   採点する関数。actions を呼んで GradeResult を返す
   * @param {boolean} [opts.withSummary] 要約ボックスを出すか（リーディングだけ）
   * @param {{href: string, label: string, primary?: boolean}[]} [opts.links] 結果の下に出す行き先
   * @param {(result: import("../../domain/models.js").GradeResult) => string} [opts.resultExtra] 結果に足す HTML を作る関数
   * @param {(result: import("../../domain/models.js").GradeResult) => void} [opts.onResult] 結果が出たときに呼ばれる
   * @param {() => void} [opts.onRetry] 「もう一度解く」を押したときに呼ばれる
   */
  constructor(ctx, opts) {
    this.#ctx = ctx;
    this.#opts = opts;
  }

  /** @param {HTMLElement} container 問題・結果を入れる要素 */
  mount(container) {
    this.#container = container;
    this.#showQuestions();
  }

  /** 問題の表示（最初と、「もう一度解く」のとき）。新しい QuestionPanel を作るので、答えもヒントも白紙に戻る */
  #showQuestions() {
    const { questions, withSummary } = this.#opts;
    this.#summary = withSummary ? new SummaryBox() : null;
    this.#panel = new QuestionPanel(this.#ctx, questions, { extraHtml: this.#summary?.render() ?? "" });
    this.#container.innerHTML = this.#panel.render();
    this.#summary?.mount(this.#container);
    this.#panel.mount(this.#container, { onSubmit: () => this.#submit() });
  }

  async #submit() {
    if (this.#pending) return; // 二重送信を防ぐ
    this.#pending = true;
    this.#panel.setBusy(true);
    try {
      const result = await this.#opts.submit(this.#panel.answers, this.#summary?.value ?? null);
      if (!this.#container?.isConnected) return; // 採点中に画面を離れていたら、何も表示しない
      this.#showResult(result);
      this.#opts.onResult?.(result);
    } catch (e) {
      // 失敗：選んだ答えは残したまま、もう一度押せるようにする
      this.#ctx.toast.show(e?.message || "採点できませんでした。もう一度お試しください。");
      this.#panel.setBusy(false);
    } finally {
      this.#pending = false;
    }
  }

  #showResult(result) {
    const { questions, links = [], resultExtra } = this.#opts;
    this.#container.innerHTML = resultPanel({ questions, result, links, extraHtml: resultExtra?.(result) ?? "" });
    // 結果へスクロールしてフォーカスを移す（スクリーンリーダーにも結果が伝わる）
    const section = this.#container.querySelector(".result");
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    section?.scrollIntoView({ behavior, block: "start" });
    section?.focus({ preventScroll: true });
    this.#container.querySelector("[data-retry]")?.addEventListener("click", () => {
      this.#opts.onRetry?.();
      this.#showQuestions();
      this.#container.scrollIntoView({ behavior, block: "start" });
    });
  }
}
