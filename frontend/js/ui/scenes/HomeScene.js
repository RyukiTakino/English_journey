/**
 * ホーム画面
 *
 * 層：ui
 * 担当：フロント
 *
 * 上から順に
 *   1. ウェルカム（案内キャラクターの置き場所 data-guide-slot つき）
 *   2. 次の目的地（搭乗券風）
 *   3. 世界一周のルート進捗
 *   4. 国のカード一覧
 *   5. 続きから（まだ解いていない記事）／ニュース
 * を並べます。見た目は css/scene-world.css（.home-…）。
 *
 * TODO(API): 「おすすめ」は今は未学習の記事を世界一周の順に出すだけ。レベル（me.user.level）に合う記事を優先するなど、
 *            おすすめの基準はバックエンドと相談して決める。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { countryCard, tripCard, newsCard } from "../components/cards.js";
import { boardingPass } from "../components/BoardingPass.js";
import { routeProgress } from "../components/RouteProgress.js";
import { icon } from "../components/icons.js";
import { img, hydratePhotos } from "../assets.js";
import { stampsById, nextStop, lastVisited, tourStops, isDone } from "../../domain/progress.js";
import { APP_NAME } from "../../domain/constants.js";

/** 「続きから」に並べる記事の最大数 */
const MAX_CONTINUE = 3;

/** 配列を元の配列を壊さずにシャッフルする（Fisher-Yates） */
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class HomeScene extends BaseScene {
  /** 画面に必要なデータを取る。ここで投げた例外は Router がエラー表示にする */
  async load() {
    // Promise.all は「全部同時に始めて、全部終わるまで待つ」（C# の Task.WhenAll と同じ）
    await Promise.all([this.ctx.actions.catalog.loadCountries(), this.ctx.actions.profile.loadMe()]);
  }

  /** load の後に呼ばれる。Store から読むだけにする */
  render() {
    const { countries, me } = this.ctx.store;
    const stops = tourStops(countries);
    const stamps = stampsById(me);
    const next = nextStop(countries, me);
    const stampCount = stops.filter((c) => stamps[c.id]).length;

    return `
      ${this.#hero(me, stampCount, stops.length)}
      ${this.#nextPanel(next, lastVisited(countries, me), stampCount, stops.length)}
      <section class="home-section" aria-labelledby="home-route-title">
        <h2 id="home-route-title" class="world-heading">${icon("stamp", 22)} 世界一周ルート</h2>
        <div class="card home-route">${routeProgress(stops, stamps, next)}</div>
      </section>
      <section class="home-section" aria-labelledby="home-countries-title">
        <h2 id="home-countries-title" class="world-heading">${icon("pin", 22)} 行き先をえらぶ</h2>
        <ul class="grid grid--cards home-countries">
          ${countries.map((c) => `<li>${countryCard(c, { stamped: Boolean(stamps[c.id]), current: next?.id === c.id })}</li>`).join("")}
        </ul>
        <p class="home-more"><a href="#/map">${icon("pin", 16)} 地図から国をさがす ${icon("next", 14)}</a></p>
      </section>
      ${this.#continueRow(countries, me, next)}
      ${this.#newsRow(countries, me, next)}`;
  }

  mount(root) {
    // 観光地の写真を読み込む（読み込めなければ色つきの背景のまま）
    hydratePhotos(root, this.ctx);
  }

  // ---------- 部分ごとの HTML（# 付きは private メソッド） ----------

  /** ウェルカム。右（スマホでは下）に案内キャラクターが入る */
  #hero(me, stampCount, total) {
    const name = me?.user?.displayName;
    return `
      <section class="home-hero">
        <div class="home-hero__text">
          <p class="home-hero__kicker">${icon("flame", 16)} 連続 ${esc(me?.streak ?? 0)} 日</p>
          <h1 class="home-hero__title">${esc(APP_NAME)}</h1>
          <p class="home-lead">${name ? `${esc(name)}さん、` : ""}行きたい国を選んで、英語で旅しよう。<br>記事を読んで、ニュースを聴いて、スタンプを集めよう。</p>
          <p class="home-hero__stamps"><span>${icon("stamp", 18)} スタンプ</span><strong>${stampCount} / ${total}</strong></p>
        </div>
        <!-- 案内キャラクターがここに来る（EffectsDirector が移す） -->
        <div class="home-hero__guide" data-guide-slot></div>
      </section>`;
  }

  /** 次の目的地。全部そろっていたら、お祝いのパネルにする */
  #nextPanel(next, from, stampCount, total) {
    if (!next) {
      return `
        <section class="home-section">
          <div class="home-done card">
            ${img("banners/banner-world-map.png", { cls: "home-done__img", alt: "" })}
            <div>
              <h2>世界一周コンプリート！</h2>
              <p class="muted">${total}か国すべてのスタンプがそろいました。パスポートを見返してみましょう。</p>
              <a class="btn" href="#/tour">パスポートを開く ${icon("next", 16)}</a>
            </div>
          </div>
        </section>`;
    }
    return `<section class="home-section" aria-label="次の目的地">${boardingPass({ to: next, from, stampCount, total })}</section>`;
  }

  /**
   * 続きから：まだ解いていない記事（世界一周の順、次の目的地の国を先頭に）。
   * 全部解いていれば、この行は出さない。
   */
  #continueRow(countries, me, next) {
    // 国・記事の固定順ではなく、未読記事の中から毎回ランダムに選ぶ。
    // flatMap：国ごとの記事の配列を、1本の配列につなげる（C# の SelectMany）
    const todo = tourStops(countries)
      .flatMap((c) => c.trips.map((t) => ({ t, c })))
      .filter(({ t }) => !isDone(me, "read", t.id));
    if (!todo.length) return "";
    const picked = shuffled(todo).slice(0, MAX_CONTINUE);
    return `
      <section class="home-section" aria-labelledby="home-continue-title">
        <h2 id="home-continue-title" class="world-heading">${icon("play", 22)} 続きから・おすすめの記事</h2>
        <ul class="home-rail">${picked.map(({ t, c }) => `<li>${tripCard(t, c, me)}</li>`).join("")}</ul>
      </section>`;
  }

  /** ニュース（リスニング）への入口。次の目的地の国、無ければ最初の国 */
  #newsRow(countries, me, next) {
    const target = next ?? tourStops(countries)[0] ?? countries[0];
    if (!target) return "";
    return `
      <section class="home-section" aria-labelledby="home-news-title">
        <h2 id="home-news-title" class="world-heading">${icon("volume", 22)} ニュースを聴く</h2>
        <div class="home-news">${newsCard(target, me)}</div>
      </section>`;
  }
}
