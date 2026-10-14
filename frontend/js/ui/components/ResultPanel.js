/**
 * 採点結果の表示（リーディング・リスニングで共通）
 *
 * 層：ui
 * 担当：フロント
 *
 * サーバーから届いた GradeResult を見せるだけ（正誤や解説は、すべてサーバーが決めたもの）。
 * 間違えても責めない言い方にする（「おしい！」「もう一度読んでみましょう」）。
 *
 * 出すもの：見出し、点数、問題ごとの ○× と正解・解説、要約の採点（あれば）、次の行き先のボタン。
 * スタンプやバッジの演出は、actions が出来事で知らせて別の部品が出すので、ここでは何もしない。
 *
 * これらは「HTML の文字列を返す関数」。イベント（もう一度解く）は呼ぶ側（QuizFlow）が付ける。
 *   - 「もう一度解く」ボタンには data-retry が付いている
 */
import { resultHeadline } from "../../domain/progress.js";
import { img } from "../assets.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

/** この割合以上ならイラストを明るいものにする（見た目だけ。スタンプの判定はサーバー） */
const PASS_RATE = 0.6;

/**
 * 結果の全体。
 * @param {object} p
 * @param {import("../../domain/models.js").Question[]} p.questions 出題した問題（選択肢の文字を出すため）
 * @param {import("../../domain/models.js").GradeResult} p.result
 * @param {{href: string, label: string, primary?: boolean}[]} [p.links] 次の行き先のボタン（href は呼ぶ側が作った値。ここで esc する）
 * @param {string} [p.extraHtml] 結果の下に足す部品（ニュースの要約など。呼ぶ側で esc 済みの HTML だけ）
 * @returns {string} HTML
 */
export function resultPanel({ questions, result, links = [], extraHtml = "" }) {
  const rate = result.total ? result.correct / result.total : 0;
  const bird = rate === 1 ? "bird-happy.png" : rate >= PASS_RATE ? "bird-cheer.png" : "bird-think.png";
  const items = result.results
    .map((r, i) => {
      const q = questions[i];
      const chosen = r.chosen === null ? "未回答" : q.choices[r.chosen];
      return `
        <li class="result__item ${r.correct ? "is-ok" : "is-ng"}">
          <div class="result__mark" aria-hidden="true">${r.correct ? icon("check", 22) : icon("close", 22)}</div>
          <div class="result__main">
            <p class="result__q"><span class="result__no">Q${i + 1}</span> ${esc(q.text)}</p>
            <p class="result__state"><strong>${r.correct ? "正解です" : "おしい！"}</strong><span class="sr-only">${r.correct ? "（正解）" : "（不正解）"}</span></p>
            ${r.correct ? "" : `<p class="result__line"><span class="result__tag">あなたの答え</span>${esc(chosen)}</p>`}
            <p class="result__line"><span class="result__tag result__tag--ok">正解</span><strong>${esc(q.choices[r.answer])}</strong></p>
            ${r.explanation ? `<p class="result__explain">${esc(r.explanation)}</p>` : ""}
          </div>
        </li>`;
    })
    .join("");
  return `
    <section class="result" aria-labelledby="result-title" tabindex="-1">
      <div class="result__top">
        ${img(`mascot/${bird}`, { cls: "result__bird", width: 110 })}
        <div>
          <h2 class="result__title" id="result-title">${esc(resultHeadline(result.correct, result.total))}</h2>
          <p class="result__score"><span class="result__num">${esc(result.correct)}</span> / ${esc(result.total)} 問 正解</p>
          ${result.streak > 1 ? `<p class="muted small">${icon("flame", 14)} ${esc(result.streak)} 日連続で学習中です</p>` : ""}
        </div>
      </div>
      <ol class="result__list">${items}</ol>
      ${result.summary ? summaryResult(result.summary) : ""}
      ${extraHtml}
      <div class="result__actions">
        <button type="button" class="btn btn--ghost" data-retry>${icon("refresh", 18)} もう一度解く</button>
        ${links.map((l) => `<a class="btn ${l.primary ? "" : "btn--ghost"}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
      </div>
    </section>`;
}

/**
 * 要約の講評。
 * @param {NonNullable<import("../../domain/models.js").GradeResult["summary"]>} s
 */
function summaryResult(s) {
  const list = (items) => (items?.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "");
  return `
    <div class="summary-result card">
      <h3>${icon("star", 18)} 要約の講評</h3>
      <p class="summary-result__score"><span class="result__num">${esc(s.score)}</span> / 100 点</p>
      ${s.good?.length ? `<h4>よかったところ</h4>${list(s.good)}` : ""}
      ${s.improve?.length ? `<h4>もっとよくするには</h4>${list(s.improve)}` : ""}
      ${
        s.matchedKeywords?.length || s.missedKeywords?.length
          ? `<div class="summary-result__kw">
              ${(s.matchedKeywords || []).map((k) => `<span class="chip chip--ok">${icon("check", 12)} ${esc(k)}</span>`).join("")}
              ${(s.missedKeywords || []).map((k) => `<span class="chip">${esc(k)}</span>`).join("")}
            </div>`
          : ""
      }
      ${s.rewrite ? `<h4>書き直しの例</h4><p class="summary-result__en">${esc(s.rewrite)}</p>` : ""}
      ${s.modelSummary ? `<h4>お手本の要約</h4><p class="summary-result__en">${esc(s.modelSummary)}</p>` : ""}
    </div>`;
}
