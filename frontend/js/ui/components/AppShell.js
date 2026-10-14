/**
 * 画面の外枠：ヘッダーのナビ、スマホの下のタブバー、学習の記録（HUD）、音のオン・オフ
 *
 * 層：ui
 * 担当：フロント
 *
 * 外枠の HTML の骨組みは index.html にあります。ここは、その中の動く部分（ナビの並び、
 * 今いる画面の強調、連続日数やスタンプ数の表示、音のボタン）を受け持ちます。
 * 各画面（scene）の中身は <main id="app"> に入るので、ここは関知しません。
 */
import { tourStops } from "../../domain/progress.js";
import { EVENTS } from "../../application/events.js";
import { img } from "../assets.js";
import { esc } from "./html.js";
import { icon } from "./icons.js";

/** ナビの項目。key は、画面の種類（ROUTES の name）から対応づける */
const NAV = [
  { key: "home", href: "#/", label: "ホーム", icon: "icons/icon-home.png" },
  { key: "map", href: "#/map", label: "地図", icon: "icons/icon-map.png" },
  { key: "tour", href: "#/tour", label: "世界一周", icon: "icons/icon-globe.png" },
  { key: "words", href: "#/words", label: "単語帳", icon: "icons/icon-book.png" },
  { key: "me", href: "#/me", label: "マイページ", icon: "icons/icon-award.png" }
];

/** 画面の種類（ROUTES の name）→ ナビのどの項目を光らせるか */
const NAV_OF = { home: "home", country: "home", read: "home", listen: "home", map: "map", tour: "tour", words: "words", me: "me" };

export class AppShell {
  #ctx;
  #navEl;
  #tabbarEl;
  #hudEl;
  #soundEl;

  /**
   * @param {object} ctx 画面に渡す道具一式（store, events, actions, sound）
   * @param {{nav: HTMLElement, tabbar: HTMLElement, hud: HTMLElement, sound: HTMLElement}} els index.html の各要素
   */
  constructor(ctx, els) {
    this.#ctx = ctx;
    this.#navEl = els.nav;
    this.#tabbarEl = els.tabbar;
    this.#hudEl = els.hud;
    this.#soundEl = els.sound;
  }

  /** 外枠を描いて、出来事を聞き始める */
  start() {
    const { events, actions } = this.#ctx;
    this.#renderNav("home");
    this.#renderHud();
    this.#renderSound();

    events.on(EVENTS.ROUTE_CHANGED, ({ name }) => this.#renderNav(NAV_OF[name] ?? "home"));
    events.on(EVENTS.ME_CHANGED, () => this.#renderHud());
    events.on(EVENTS.COUNTRIES_LOADED, () => this.#renderHud());

    // 音のボタン（押したらオン・オフを入れ替えて、見た目を描き直す）
    this.#soundEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sound]");
      if (!btn) return;
      const { sound } = this.#ctx;
      if (btn.dataset.sound === "se") sound.setSeEnabled(!sound.seEnabled);
      else sound.setBgmEnabled(!sound.bgmEnabled);
      this.#renderSound();
    });

    // 学習記録を先に読んでおく（HUD に出すため）。失敗しても、画面の表示は止めない
    actions.profile.loadMe().catch(() => {});
    actions.catalog.loadCountries().catch(() => {});
  }

  #renderNav(activeKey) {
    const link = (n, large) => `
      <a href="${n.href}" class="${n.key === activeKey ? "is-on" : ""}" ${n.key === activeKey ? 'aria-current="page"' : ""}>
        ${img(n.icon, { cls: "nav-icon", width: large ? 30 : 36 })}<span>${esc(n.label)}</span>
      </a>`;
    this.#navEl.innerHTML = NAV.map((n) => link(n, true)).join("");
    this.#tabbarEl.innerHTML = NAV.map((n) => link(n, false)).join("");
  }

  /** 連続日数・スタンプ数・バッジ数 */
  #renderHud() {
    const { me, countries } = this.#ctx.store;
    if (!me) {
      this.#hudEl.innerHTML = "";
      return;
    }
    const total = countries ? tourStops(countries).length : 0;
    this.#hudEl.innerHTML = `
      <a class="hud__item" href="#/me" title="連続学習日数">${icon("flame", 18)}<strong>${esc(me.streak)}</strong><span>日</span></a>
      <a class="hud__item" href="#/tour" title="スタンプ">${icon("stamp", 18)}<strong>${esc(me.stamps.length)}</strong>${total ? `<span>/${total}</span>` : ""}</a>
      <a class="hud__item" href="#/me" title="バッジ">${icon("medal", 18)}<strong>${esc(me.badgeCount)}</strong></a>`;
  }

  #renderSound() {
    const { sound } = this.#ctx;
    const btn = (kind, on, label) => `
      <button type="button" class="icon-btn" data-sound="${kind}" data-silent aria-pressed="${on}" aria-label="${label}（${on ? "オン" : "オフ"}）" title="${label}">
        ${icon(kind === "se" ? (on ? "volume" : "mute") : "music", 20)}${on ? "" : '<span class="icon-btn__slash"></span>'}
      </button>`;
    this.#soundEl.innerHTML = btn("se", sound.seEnabled, "効果音") + btn("bgm", sound.bgmEnabled, "BGM");
  }
}
