/**
 * 地図の画面（地域で絞って国を選ぶ）
 *
 * 層：ui
 * 担当：フロント
 *
 * URL: #/map
 *   Leaflet（index.html で CDN から読み込む global の L）で世界地図を出し、国のピンを立てる。
 *   - 地域ボタンで、地図をその地域へ移動し、ピン・一覧を絞り込む
 *   - ピンを押すと吹き出し（国名＋国のページへのボタン）
 *   - 地図の下に、国の一覧（地図が使えなくても国を選べる）
 *   見た目は css/scene-world.css（.map-…）。
 *
 * TODO(フロント): オフライン時は地図タイル（OpenStreetMap の画像）が出ない。ピンと一覧は使える。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { errorView } from "../components/states.js";
import { icon } from "../components/icons.js";
import { stampsById, tourStops } from "../../domain/progress.js";
import { REGIONS } from "../../domain/constants.js";

/** 地図のタイルの URL と、OpenStreetMap のライセンス上必須の著作権表示 */
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

export class MapScene extends BaseScene {
  /** 今えらんでいる地域の id */
  #region = "all";
  /** Leaflet の地図本体（画面を離れるとき remove する） */
  #map = null;
  /** 国 id → Leaflet のマーカー */
  #markers = new Map();
  /** マーカーをまとめて入れておく層（表示・非表示を一括で切り替える） */
  #layer = null;
  #root = null;

  async load() {
    await Promise.all([this.ctx.actions.catalog.loadCountries(), this.ctx.actions.profile.loadMe()]);
  }

  render() {
    const { countries } = this.ctx.store;
    const chips = REGIONS.map(
      (r) => `<button type="button" class="map-chip ${r.id === this.#region ? "is-on" : ""}" data-region="${esc(r.id)}" aria-pressed="${r.id === this.#region}">${esc(r.name)}</button>`
    ).join("");
    return `
      <section class="map-page">
        <h1 class="map-title">${icon("pin", 26)} 地図で国をさがす</h1>
        <p class="muted map-lead">ピンを押すと国の名前が出ます。地域のボタンで、見たい場所に移動できます。</p>
        <div class="map-filter" role="group" aria-label="地域でしぼる">${chips}</div>
        <div class="map-frame">
          <div class="map-canvas" id="map-canvas" role="region" aria-label="世界地図"></div>
        </div>
        <ul class="map-list" aria-label="国の一覧">${this.#listItems(countries)}</ul>
      </section>`;
  }

  mount(root) {
    this.#root = root;
    const canvas = root.querySelector("#map-canvas");

    // Leaflet の CDN が読み込めていないとき（オフラインなど）は、エラー表示にして「もう一度」で再試行できるようにする。
    // window.L の有無で調べる（未定義の変数をそのまま書くと ReferenceError になるので window 経由にする）。
    if (!window.L) {
      canvas.innerHTML = errorView("地図のライブラリを読み込めませんでした。通信を確認してください。");
      canvas.querySelector("[data-reload]")?.addEventListener("click", () => location.reload());
      this.#bindUi(root);
      return;
    }

    this.#createMap(canvas);
    this.#bindUi(root);

    // 画面のアニメーションの途中で大きさが決まるため、描画が落ち着いてから大きさを測り直す
    // 大きさが確定したら、表示範囲も合わせ直す（最初の測定が小さいと、ズームが引きすぎになるため）
    const refit = () => {
      this.#map?.invalidateSize();
      this.#applyRegion(false);
    };
    requestAnimationFrame(refit);
    const timer = setTimeout(refit, 350);
    this.onCleanup(() => clearTimeout(timer));

    // 画面を離れるときに地図を壊す。壊さないと、イベントやタイルがメモリに残り続ける
    this.onCleanup(() => {
      this.#map?.remove();
      this.#map = null;
      this.#markers.clear();
    });
  }

  // ---------- 地図 ----------

  #createMap(canvas) {
    const L = window.L;
    const { countries } = this.ctx.store;
    const start = REGIONS.find((r) => r.id === this.#region) ?? REGIONS[0];
    const map = L.map(canvas, {
      center: start.center,
      zoom: start.zoom,
      minZoom: 0,
      zoomSnap: 0.25, // 小数の拡大率を許す（「すべて」で全部のピンをぴったり収めるため）
      worldCopyJump: true,
      zoomControl: false,
      scrollWheelZoom: false // ページをスクロールしている最中に、地図が勝手に拡大しないようにする
    });
    L.control.zoom({ position: "bottomright" }).addTo(map); // 吹き出しと重ならないよう、ズームボタンは右下に置く
    L.tileLayer(TILE_URL, { maxZoom: 18, attribution: ATTRIBUTION }).addTo(map);
    this.#map = map;
    this.#layer = L.layerGroup().addTo(map);

    // 地図を一度クリック（タップ）したらホイールでの拡大を有効にし、外へ出たら無効に戻す（PC 向け）
    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    const stamps = stampsById(this.ctx.store.me);
    for (const c of countries) {
      const marker = L.marker([c.lat, c.lng], {
        icon: this.#pinIcon(c, Boolean(stamps[c.id])),
        title: c.name,
        alt: `${c.name}のピン`,
        keyboard: true
      });
      // 吹き出しの中身は HTML 文字列。サーバー由来の文字なので esc を通す
      marker.bindPopup(this.#popupHtml(c, Boolean(stamps[c.id])), { closeButton: true, minWidth: 180 });
      marker.on("click", () => this.#highlight(c.id));
      this.#markers.set(c.id, marker);
    }
    this.#applyRegion(false);
  }

  /** 国の色のピン（DivIcon＝HTML で描くアイコン）。スタンプ済みはチェックつきで見た目を変える */
  #pinIcon(c, stamped) {
    return window.L.divIcon({
      className: "map-pin-wrap", // Leaflet 標準の白い四角を消すため、専用のクラス名にする
      html: `<span class="map-pin ${stamped ? "is-stamped" : ""}" style="--c:${esc(c.color)}"><b>${esc(c.code)}</b>${stamped ? `<i aria-hidden="true">✓</i>` : ""}</span>`,
      iconSize: [48, 56],
      iconAnchor: [24, 54], // ピンの先端が、座標の位置に来るようにする
      popupAnchor: [0, -52]
    });
  }

  #popupHtml(c, stamped) {
    return `
      <div class="map-popup">
        <strong class="map-popup__name">${esc(c.name)}</strong>
        <span class="map-popup__en">${esc(c.nameEn)}</span>
        ${stamped ? `<span class="map-popup__stamp">スタンプ獲得済み</span>` : ""}
        <a class="btn btn--sm" href="#/country/${esc(c.id)}">${esc(c.name)}のページへ</a>
      </div>`;
  }

  /** 今の地域に合うマーカーだけを地図に出し、地図をその地域へ動かす */
  #applyRegion(animate = true) {
    if (!this.#map) return;
    const region = REGIONS.find((r) => r.id === this.#region) ?? REGIONS[0];
    this.#layer.clearLayers();
    for (const c of this.ctx.store.countries) {
      if (this.#region === "all" || c.region === this.#region) this.#layer.addLayer(this.#markers.get(c.id));
    }
    this.#map.closePopup();
    if (this.#region === "all") {
      // 「すべて」は、画面の幅に関係なく全部のピンが入るように、ピンの範囲に合わせて表示する
      const bounds = window.L.latLngBounds(this.ctx.store.countries.map((c) => [c.lat, c.lng]));
      const opts = { padding: [40, 40], maxZoom: 4 };
      if (animate) this.#map.flyToBounds(bounds, { ...opts, duration: 0.9 });
      else this.#map.fitBounds(bounds, { ...opts, animate: false });
    } else if (animate) this.#map.flyTo(region.center, region.zoom, { duration: 0.9 });
    else this.#map.setView(region.center, region.zoom, { animate: false });
  }

  // ---------- 一覧・ボタン ----------

  /** 今の地域に合う国の一覧 */
  #listItems(countries) {
    const stamps = stampsById(this.ctx.store.me);
    const shown = tourStops(countries).concat(countries.filter((c) => !c.tourOrder));
    const list = shown.filter((c) => this.#region === "all" || c.region === this.#region);
    if (!list.length) return `<li class="map-empty muted">この地域には、まだ国がありません。</li>`;
    return list
      .map(
        (c) => `
        <li>
          <a class="map-item ${stamps[c.id] ? "is-stamped" : ""}" href="#/country/${esc(c.id)}" data-country="${esc(c.id)}" style="--c:${esc(c.color)}">
            <span class="map-item__code">${esc(c.code)}</span>
            <span class="map-item__text"><strong>${esc(c.name)}</strong><small>${esc(c.nameEn)}</small></span>
            ${stamps[c.id] ? `<span class="map-item__ok">${icon("check", 16)}<span class="sr-only">スタンプ獲得済み</span></span>` : icon("next", 16)}
          </a>
        </li>`
      )
      .join("");
  }

  #bindUi(root) {
    // 地域ボタン（イベント委譲：親で 1 回受けて、押されたボタンを closest で探す）
    root.querySelector(".map-filter").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-region]");
      if (!btn) return;
      this.#region = btn.dataset.region;
      root.querySelectorAll(".map-chip").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      // 一覧だけ描き直す（地図は作り直さず、flyTo で動かす）
      root.querySelector(".map-list").innerHTML = this.#listItems(this.ctx.store.countries);
      this.#applyRegion();
    });
  }

  /** ピンを押したとき、同じ国を一覧の中でも目立たせる */
  #highlight(countryId) {
    this.#root?.querySelectorAll(".map-item").forEach((el) => el.classList.toggle("is-picked", el.dataset.country === countryId));
  }
}
