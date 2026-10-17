/**
 * 国の詳細画面
 *
 * 層：ui
 * 担当：フロント
 *
 * URL: #/country/{countryId}
 *   国のヘッダー（名前・基本情報・旅フレーズ）、説明文、スタンプの状態、
 *   記事の一覧（各記事に「行きたい」ハート）、ニュースへの入口。
 *   見た目は css/scene-world.css（.country-…）。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { tripCard, newsCard } from "../components/cards.js";
import { stampView } from "../components/StampView.js";
import { icon } from "../components/icons.js";
import { hydratePhotos } from "../assets.js";
import { stampsById } from "../../domain/progress.js";
import { CATEGORY, STAMP_RULE_TEXT } from "../../domain/constants.js";

export class CountryScene extends BaseScene {
  /**
   * 取得した国の詳細。load で入れて、render で使う
   * @type {import("../../domain/models.js").CountryDetail | null}
   */
  #country = null;
  #selectedCity = "";
  #selectedCategory = "";
  #showArticles = false;
  #categories = [];

  async load() {
  const [countryId] = this.params;
  const { catalog, profile } = this.ctx.actions;

  const [country, , , categories] = await Promise.all([
    catalog.getCountry(countryId),
    catalog.loadCountries(),
    profile.loadMe(),
    catalog.getCategories()
  ]);

  this.#country = country;
  this.#categories = categories;
}

  render() {
    const c = this.#country;
    if (!this.#showArticles) return this.#selectionScreen(c);
    const { me } = this.ctx.store;
    const earnedAt = stampsById(me)[c.id] ?? null;
    const info = c.info ?? {};
    return `
      <button type="button" class="back-link" data-selection-back="category">${icon("back", 16)} カテゴリ選択に戻る</button>

      <header class="country-hero" style="--c:${esc(c.color)}">
        <div class="country-hero__main">
          <span class="country-hero__code">${esc(c.code)}</span>
          <h1 class="country-title">${esc(c.name)} <span class="country-title__en">${esc(c.nameEn)}</span></h1>
          <p class="country-hero__desc">${esc(c.description)}</p>
        </div>
        <div class="country-hero__stamp ${earnedAt ? "is-earned" : ""}">
          ${earnedAt ? stampView(c, { earnedAt, size: "md" }) : `${stampView(c, { size: "sm" })}`}
        </div>
      </header>

      <dl class="country-facts">
        ${this.#fact("首都", c.capital, "pin")}
        ${this.#fact("言語", c.language, "volume")}
        ${this.#fact("通貨", c.currency, "star")}
      </dl>

      ${c.phrase ? `
        <div class="country-phrase card">
          <span class="country-phrase__label">旅フレーズ</span>
          <p class="country-phrase__local">${esc(c.phrase.local)}</p>
          <p class="country-phrase__ja muted">${esc(c.phrase.ja)}</p>
        </div>` : ""}

      <section class="country-about card" aria-labelledby="country-about-title">
        <h2 id="country-about-title" tabindex="-1">${esc(c.name)}について</h2>
        <p class="country-extract">${esc(info.extract || c.description)}</p>
        ${info.sourceUrl ? `<p class="small muted">出典：<a href="${esc(info.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>` : ""}
      </section>

      <p class="country-rule">${icon("stamp", 18)}
        <span>${earnedAt ? "この国のスタンプを獲得済みです。" : `記事かニュースの問題で ${esc(STAMP_RULE_TEXT)} 正解すると、この国のスタンプがもらえます。`}</span></p>

      ${this.#articleSelector(c, me)}

      <section class="country-section" aria-labelledby="country-news-title">
        <h2 id="country-news-title" class="world-heading">${icon("volume", 22)} ニュースを聴く</h2>
        <div class="country-news">${newsCard(c, me)}</div>
      </section>`;
  }

  mount(root) {
    hydratePhotos(root, this.ctx);

    const onSelect = (e) => {
      const cityButton = e.target.closest("[data-city]");
      const categoryButton = e.target.closest("[data-category]");
      const backButton = e.target.closest("[data-selection-back]");
      if (backButton) {
        this.#showArticles = false;
        this.#selectedCategory = "";
        if (backButton.dataset.selectionBack === "city") this.#selectedCity = "";
        this.#refreshArticleSelector(root);
        return;
      }
      const showButton = e.target.closest("[data-show-articles]");
      if (showButton && !showButton.disabled && this.#selectedCity && this.#selectedCategory) {
        this.#showArticles = true;
        this.#refreshArticleSelector(root);
        root.querySelector("#country-about-title")?.focus();
        return;
      }
      if (cityButton) {
        this.#selectedCity = cityButton.dataset.city;
        this.#selectedCategory = "";
        this.#showArticles = false;
        this.#refreshArticleSelector(root);
      } else if (categoryButton) {
        this.#selectedCategory = categoryButton.dataset.category;
        this.#showArticles = false;
        this.#refreshArticleSelector(root);
      }
    };
    root.addEventListener("click", onSelect);
    this.onCleanup(() => root.removeEventListener("click", onSelect));

    // 「行きたい」ハート。li ごとにイベントを付けず、親（ul）で 1 回だけ受ける（イベント委譲）。
    // 子要素をクリックしても親まで伝わる（バブリング）ので、closest で押されたボタンを探す。
    const onWant = async (e) => {
      const btn = e.target.closest("[data-want]");
      if (!btn || btn.disabled) return;
      const li = btn.closest(".country-trip");
      const tripId = btn.dataset.want;
      btn.disabled = true; // 通信中の二度押しを防ぐ
      try {
        const wanted = await this.ctx.actions.profile.toggleWant(tripId);
        this.#refreshTrip(li, tripId);
        this.ctx.toast.show(wanted ? "「行きたい」に入れました" : "「行きたい」から外しました");
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        this.ctx.toast.show("うまく保存できませんでした。もう一度お試しください");
      }
    };
    root.addEventListener("click", onWant);
    this.onCleanup(() => root.removeEventListener("click", onWant));
  }

  // ---------- 部分ごとの HTML ----------

  /** 条件の変更時には記事を隠し、表示ボタンを押したときだけ一覧を描画する。 */
  #refreshArticleSelector(root) {
    root.innerHTML = this.render();
    hydratePhotos(root, this.ctx);
    root.querySelector("[data-selection-title]")?.focus();
    window.scrollTo(0, 0);
  }

  #selectionScreen(country) {
    const trips = country.trips ?? [];

    const cities = (country.regions ?? []).map(
      (region) => region.name
    );
    const categories = this.#categories;
    const categoryLabel = CATEGORY[this.#selectedCategory]?.label ?? this.#selectedCategory;
    const title = !this.#selectedCity ? "都市を選んでください" : !this.#selectedCategory ? "カテゴリを選んでください" : "選択した内容で記事を表示";
    return `
      ${!this.#selectedCity ? `<a class="back-link" href="#/">${icon("back", 16)} 国の選択に戻る</a>` : `<button type="button" class="back-link" data-selection-back="${this.#selectedCategory ? "category" : "city"}">${icon("back", 16)} ${this.#selectedCategory ? "カテゴリ" : "都市"}の選択に戻る</button>`}
      <section class="country-section country-selector card" aria-labelledby="selection-title">
        <p class="muted">${esc(country.name)}${this.#selectedCity ? ` → ${esc(this.#selectedCity)}` : ""}${this.#selectedCategory ? ` → ${esc(categoryLabel)}` : ""}</p>
        <p class="country-selector__step">${!this.#selectedCity ? "1 / 3 · 都市" : !this.#selectedCategory ? "2 / 3 · カテゴリ" : "3 / 3 · 確認"}</p>
        <h1 id="selection-title" class="world-heading" data-selection-title tabindex="-1">${esc(title)}</h1>
        ${!this.#selectedCity ? `
          <div class="map-filter country-selector__options" role="group" aria-label="都市">
            ${cities.map((city) => `<button type="button" class="map-chip" data-city="${esc(city)}">${esc(city)} ${icon("next", 16)}</button>`).join("")}
          </div>
          ${!cities.length ? `<p class="muted">この国の記事は準備中です。</p>` : ""}` : !this.#selectedCategory ? `
          <div class="map-filter country-selector__options" role="group" aria-label="カテゴリ">
            ${categories.map((category) => `
              <button
                type="button"
                class="map-chip"
                data-category="${esc(category.nameEn)}"
              >
                ${esc(category.name)}
                ${icon("next", 16)}
              </button>
            `).join("")}
          </div>
          ${!categories.length ? `<p class="muted">この都市の記事は準備中です。</p>` : ""}` : `
          <p>ボタンを押すと、Wikipediaの説明と選択した条件の記事を表示します。</p>
          <button type="button" class="btn btn--teal" data-show-articles>記事を表示 ${icon("next", 16)}</button>`}
      </section>`;
  }

  #articleSelector(country, me) {
    const filtered = (country.trips ?? []).filter((trip) => trip.city === this.#selectedCity && trip.category === this.#selectedCategory);
    const categoryLabel = CATEGORY[this.#selectedCategory]?.label ?? this.#selectedCategory;
    return `
      <section class="country-section country-selector card" aria-labelledby="country-trips-title">
        <h2 id="country-trips-title" class="world-heading">${esc(this.#selectedCity)} · ${esc(categoryLabel)}の記事（${filtered.length}件）</h2>
        ${filtered.length ? `<ul class="country-trips">${filtered.map((trip) => this.#tripItem(trip, country, me)).join("")}</ul>` : `<p class="muted">選択した条件の記事はありません。</p>`}
      </section>`;
  }

  /** 基本情報の 1 項目 */
  #fact(label, value, iconName) {
    return `<div class="country-fact"><dt>${icon(iconName, 16)} ${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  }

  /** 記事 1 件（記事カード＋ハートのボタン）。ボタンは <a> の外に置く（a の中に button は入れられない） */
  #tripItem(trip, country, me) {
    return `
      <li class="country-trip">
        <div class="country-trip__card">${tripCard(trip, country, me)}</div>
        ${this.#wantButton(trip.id, me)}
      </li>`;
  }

  #wantButton(tripId, me) {
    const wanted = me?.wants.includes(tripId) ?? false;
    return `<button type="button" class="country-want ${wanted ? "is-on" : ""}" data-want="${esc(tripId)}" aria-pressed="${wanted}">
      ${icon("heart", 20)}<span>${wanted ? "行きたい" : "行きたい？"}</span></button>`;
  }

  /** ハートを押した後、その記事のカードとボタンだけを描き直す（画面全体は読み込み直さない） */
  #refreshTrip(li, tripId) {
    const { me } = this.ctx.store;
    const trip = this.#country.trips.find((t) => t.id === tripId);
    if (!li || !trip) return;
    li.querySelector(".country-trip__card").innerHTML = tripCard(trip, this.#country, me);
    // outerHTML への代入で、ボタンを新しい状態のものに差し替える（古いボタンは消える）
    li.querySelector("[data-want]").outerHTML = this.#wantButton(tripId, me);
    // 描き直したカードの写真を、もう一度重ねる（URL はキャッシュされているのですぐ出る）
    hydratePhotos(li, this.ctx);
    li.querySelector("[data-want]")?.focus(); // キーボード操作でフォーカスが消えないように戻す
  }
}
