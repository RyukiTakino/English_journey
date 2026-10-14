/**
 * 国・記事・ニュースのカード（ホーム・国の詳細・地図・世界一周で使う）
 *
 * 層：ui
 * 担当：フロント
 *
 * どれも HTML の文字列を返します。サーバー由来の文字列は、必ず esc() を通して埋め込みます。
 * 観光地の写真は <div data-photo="…"> を置いておき、画面を描いたあとに hydratePhotos(root, ctx) で読み込みます。
 */
import { CATEGORY, COUNTRY_CARD_IMAGES } from "../../domain/constants.js";
import { isDone } from "../../domain/progress.js";
import { img } from "../assets.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

/**
 * カテゴリの札（観光名所／文化）
 * @param {"sight"|"culture"} category
 */
export function categoryChip(category) {
  const c = CATEGORY[category];
  return `<span class="chip chip--${esc(category)}">${esc(c?.label ?? category)}</span>`;
}

/**
 * 国のカード。押すと国の詳細（#/country/{id}）へ。
 * 国のカード画像があれば、それを大きく見せる。無い国は、国の色の背景に名前だけを出す。
 * @param {import("../../domain/models.js").Country} country
 * @param {{stamped?: boolean, current?: boolean}} [state] stamped＝スタンプ獲得済み、current＝次の目的地
 */
export function countryCard(country, { stamped = false, current = false } = {}) {
  const file = COUNTRY_CARD_IMAGES[country.id];
  return `
    <a class="country-card ${stamped ? "is-stamped" : ""} ${current ? "is-current" : ""}" href="#/country/${esc(country.id)}" style="--c:${esc(country.color)}">
      <div class="country-card__visual">
        ${file ? img(`cards/${file}`, { alt: "", cls: "country-card__img" }) : `<span class="country-card__code">${esc(country.code)}</span>`}
        ${stamped ? `<span class="pill pill--ok">${icon("check", 14)} スタンプ</span>` : current ? `<span class="pill pill--next">次の目的地</span>` : ""}
      </div>
      <div class="country-card__body">
        <div class="country-card__name">${esc(country.name)}</div>
        <div class="country-card__name-en">${esc(country.nameEn)}</div>
      </div>
    </a>`;
}

/**
 * 記事カード。押すとリーディング（#/read/{tripId}）へ。
 * @param {import("../../domain/models.js").Trip} trip
 * @param {import("../../domain/models.js").Country} country 記事がある国（色に使う）
 * @param {import("../../domain/models.js").Me|null} me 学習済み・行きたいの表示に使う
 */
export function tripCard(trip, country, me) {
  const done = isDone(me, "read", trip.id);
  const wanted = me?.wants.includes(trip.id) ?? false;
  return `
    <a class="trip-card" href="#/read/${esc(trip.id)}">
      <div class="trip-card__thumb" data-photo="${esc(trip.imageKey)}" style="--c:${esc(country.color)}">
        <span class="trip-card__label">${esc(trip.nameEn)}</span>
        ${done ? `<span class="pill pill--ok">${icon("check", 14)} 学習済み</span>` : wanted ? `<span class="pill pill--want">${icon("heart", 14)} 行きたい</span>` : ""}
      </div>
      <div class="trip-card__body">
        <div class="meta-row">
          ${categoryChip(trip.category)}
          <span class="chip">${esc(trip.level)}</span>
          <span class="muted small">${esc(trip.minutes)}分</span>
          <span class="muted small trip-card__city">${icon("pin", 13)}${esc(trip.city)}</span>
        </div>
        <h3>${esc(trip.name)}</h3>
        <p class="muted small">${esc(trip.description)}</p>
      </div>
    </a>`;
}

/**
 * ニュースカード。押すとリスニング（#/listen/{countryId}）へ。
 * @param {import("../../domain/models.js").Country} country
 * @param {import("../../domain/models.js").Me|null} me
 */
export function newsCard(country, me) {
  const done = isDone(me, "listen", country.id);
  return `
    <a class="trip-card trip-card--news" href="#/listen/${esc(country.id)}">
      <div class="trip-card__thumb" data-photo="${esc(country.trips[0]?.imageKey ?? "")}" style="--c:${esc(country.color)}">
        <span class="trip-card__play">${icon("play", 24)}</span>
        <span class="trip-card__tag">NEWS</span>
        ${done ? `<span class="pill pill--ok">${icon("check", 14)} 学習済み</span>` : ""}
      </div>
      <div class="trip-card__body">
        <div class="meta-row"><span class="chip chip--news">ニュース</span></div>
        <h3>${esc(country.name)}のニュースを聴く</h3>
        <p class="muted small">ニュースを聴いて、内容の問題に答えます。</p>
      </div>
    </a>`;
}
