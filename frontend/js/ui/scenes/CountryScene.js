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
import { STAMP_RULE_TEXT } from "../../domain/constants.js";

export class CountryScene extends BaseScene {
  /**
   * 取得した国の詳細。load で入れて、render で使う
   * @type {import("../../domain/models.js").CountryDetail | null}
   */
  #country = null;

  async load() {
    // params は URL の () で囲んだ部分。#/country/uk なら ["uk"]
    const [countryId] = this.params;
    const { catalog, profile } = this.ctx.actions;
    // 国の詳細・一覧・学習記録を同時に取る（一覧と記録は、読み込み済みなら通信しない）
    const [country] = await Promise.all([catalog.getCountry(countryId), catalog.loadCountries(), profile.loadMe()]);
    this.#country = country;
  }

  render() {
    const c = this.#country;
    const { me } = this.ctx.store;
    const earnedAt = stampsById(me)[c.id] ?? null;
    const info = c.info ?? {};
    return `
      <a class="back-link" href="#/">${icon("back", 16)} ホームに戻る</a>

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
        <h2 id="country-about-title">${esc(c.name)}について</h2>
        <p class="country-extract">${esc(info.extract || c.description)}</p>
        ${info.sourceUrl ? `<p class="small muted">出典：<a href="${esc(info.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>` : ""}
      </section>

      <p class="country-rule">${icon("stamp", 18)}
        <span>${earnedAt ? "この国のスタンプを獲得済みです。" : `記事かニュースの問題で ${esc(STAMP_RULE_TEXT)} 正解すると、この国のスタンプがもらえます。`}</span></p>

      <section class="country-section" aria-labelledby="country-trips-title">
        <h2 id="country-trips-title" class="world-heading">${icon("pin", 22)} 記事で旅する</h2>
        <ul class="country-trips">
          ${c.trips.map((t) => this.#tripItem(t, c, me)).join("")}
        </ul>
      </section>

      <section class="country-section" aria-labelledby="country-news-title">
        <h2 id="country-news-title" class="world-heading">${icon("volume", 22)} ニュースを聴く</h2>
        <div class="country-news">${newsCard(c, me)}</div>
      </section>`;
  }

  mount(root) {
    hydratePhotos(root, this.ctx);

    // 「行きたい」ハート。li ごとにイベントを付けず、親（ul）で 1 回だけ受ける（イベント委譲）。
    // 子要素をクリックしても親まで伝わる（バブリング）ので、closest で押されたボタンを探す。
    root.querySelector(".country-trips")?.addEventListener("click", async (e) => {
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
    });
  }

  // ---------- 部分ごとの HTML ----------

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
