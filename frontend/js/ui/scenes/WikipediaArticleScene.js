import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { icon } from "../components/icons.js";

/** Wikipediaの記事本文を表示する専用画面 */
export class WikipediaArticleScene extends BaseScene {
  #article = null;
  #error = "";
  #countryId = "";

  async load() {
    const [countryId, encodedTitle] = this.params;
    this.#countryId = decodeURIComponent(countryId);
    const title = decodeURIComponent(encodedTitle);
    this.#article = await this.ctx.actions.catalog.getArticle(title);
    if (!this.#article?.content) this.#error = "記事本文を取得できませんでした。";
  }

  render() {
    const article = this.#article;
    return `
      <main class="study study--read wikipedia-reading">
        <a class="back-link" href="#/country/${esc(this.#countryId)}">${icon("back", 16)} 記事一覧に戻る</a>
        <article class="reading-article card" aria-labelledby="wiki-article-title">
          <div class="meta-row"><span class="chip chip--news">Wikipedia</span></div>
          <h1 class="reading-article__title" id="wiki-article-title" lang="en">${esc(article?.title ?? "記事")}</h1>
          ${this.#error ? `<p class="muted" role="alert">${esc(this.#error)}</p>` : `
            <div class="reading-article__body study-text wikipedia-article-content" lang="en">${esc(article.content).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>
            ${article.url ? `<p class="small muted"><a href="${esc(article.url)}" target="_blank" rel="noopener noreferrer">Wikipediaで原文を開く ↗</a></p>` : ""}`}
          <a class="btn btn--teal" href="#/country/${esc(this.#countryId)}">記事一覧に戻る</a>
        </article>
      </main>`;
  }
}
