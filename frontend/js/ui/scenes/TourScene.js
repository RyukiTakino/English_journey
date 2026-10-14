/**
 * 世界一周の画面（パスポートとスタンプ）
 *
 * 層：ui
 * 担当：フロント
 *
 * URL: #/tour
 *   パスポートの表紙と「n / 全部」の進み具合、ルート、スタンプ帳（取れた国はスタンプ、未取得は点線の枠）、
 *   次の目的地へのボタン、スタンプのもらい方。全部そろったらお祝いの表示。
 *   スタンプを与えるかどうかの判定はサーバー側。ここは結果を見せるだけ。
 *   見た目は css/scene-world.css（.tour-…、.passport-…）。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { icon } from "../components/icons.js";
import { routeProgress } from "../components/RouteProgress.js";
import { passportBook } from "../components/PassportBook.js";
import { img } from "../assets.js";
import { stampsById, nextStop, tourStops } from "../../domain/progress.js";
import { STAMP_RULE_TEXT } from "../../domain/constants.js";

export class TourScene extends BaseScene {
  async load() {
    await Promise.all([this.ctx.actions.catalog.loadCountries(), this.ctx.actions.profile.loadMe()]);
  }

  render() {
    const { countries, me } = this.ctx.store;
    const stops = tourStops(countries);
    const stamps = stampsById(me);
    const next = nextStop(countries, me);
    const count = stops.filter((c) => stamps[c.id]).length;
    const total = stops.length;
    const finished = total > 0 && count === total;
    const percent = total ? Math.round((count / total) * 100) : 0;

    return `
      <section class="tour-head ${finished ? "is-finished" : ""}">
        ${img("passport/passport-cover.png", { cls: "tour-head__cover", alt: "" })}
        <div class="tour-head__text">
          <p class="tour-head__kicker">PASSPORT</p>
          <h1 class="tour-head__title">世界一周パスポート</h1>
          <p class="tour-head__count" aria-label="スタンプ ${count} 個、全部で ${total} 個">
            <strong>${count}</strong><span> / ${total}</span><small>スタンプ</small>
          </p>
          <div class="tour-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count}" aria-label="スタンプの進み具合">
            <span class="tour-bar__fill" style="width:${percent}%"></span>
          </div>
        </div>
      </section>

      ${finished ? this.#finished() : this.#nextCta(next)}

      <section class="tour-section" aria-labelledby="tour-route-title">
        <h2 id="tour-route-title" class="world-heading">${icon("pin", 22)} ルート</h2>
        <div class="card tour-route">${routeProgress(stops, stamps, next)}</div>
      </section>

      <section class="tour-section" aria-labelledby="tour-book-title">
        <h2 id="tour-book-title" class="world-heading">${icon("stamp", 22)} スタンプ帳</h2>
        ${passportBook(stops, stamps)}
      </section>

      <section class="tour-section tour-howto card" aria-labelledby="tour-howto-title">
        <h2 id="tour-howto-title">${icon("bulb", 22)} スタンプのもらい方</h2>
        <ol class="tour-howto__list">
          <li>行きたい国を選んで、記事（リーディング）かニュース（リスニング）を開く。</li>
          <li>英文を読む・聴いて、問題に答える。</li>
          <li>${esc(STAMP_RULE_TEXT)} 正解すると、その国のスタンプがもらえる。</li>
        </ol>
        <p class="small muted">もう一度解いてもスタンプは増えません。別の国にも出かけてみましょう。</p>
      </section>`;
  }

  /** 次の目的地へのボタン */
  #nextCta(next) {
    if (!next) return "";
    return `
      <section class="tour-cta card" style="--c:${esc(next.color)}">
        <div class="tour-cta__text">
          <p class="tour-cta__kicker">次の目的地</p>
          <p class="tour-cta__name">${esc(next.name)} <small>${esc(next.nameEn)}</small></p>
        </div>
        <a class="btn btn--lg" href="#/country/${esc(next.id)}">${esc(next.name)}へ出発 ${icon("next", 18)}</a>
      </section>`;
  }

  /** 全部そろったときのお祝い（案内キャラクターのひとことは、別の仕組みが出す） */
  #finished() {
    return `
      <section class="tour-finished card" aria-label="世界一周コンプリート">
        ${img("banners/banner-world-map.png", { cls: "tour-finished__img", alt: "" })}
        <h2>世界一周コンプリート！</h2>
        <p>すべての国のスタンプがそろいました。ここまでの旅、おつかれさま。</p>
        <a class="btn" href="#/me">マイページでバッジを見る ${icon("next", 16)}</a>
      </section>`;
  }
}
