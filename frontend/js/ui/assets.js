/**
 * 画像の表示（ゲーム素材と、観光地の写真）
 *
 * 層：ui
 * 担当：フロント
 *
 * ■ ゲーム素材（assets/images/ 以下。docs/image-assets.md と、切り出し済みの素材。一覧は assets/images/README.md）
 *   img("icons/icon-home.png", { alt: "ホーム", cls: "nav-icon" }) のように使います。
 *   ファイルの場所は、このファイルを基準に決めるので、どのページから使っても同じ場所を指します。
 *
 * ■ 観光地の写真（Wikipedia）
 *   <div data-photo="Big_Ben"></div> のように書いておき、画面を描いたあとに hydratePhotos(root, ctx) を呼ぶと、
 *   サーバー（ApiClient.imageUrl）から URL を取って、読み込めた写真を重ねて表示します。
 *   写真が無い・読み込めないときは、元の要素（色つきの背景）がそのまま見えます。
 */
import { esc } from "./components/html.js";

const BASE = new URL("../../assets/images/", import.meta.url).href;

/**
 * 画像のファイルの URL を返す。
 * @param {string} path assets/images/ からの場所（例: "stamps/stamp-france.png"）
 * @returns {string}
 */
export function imageUrl(path) {
  return BASE + path;
}

/**
 * ゲーム素材の <img> を作る。
 * @param {string} path assets/images/ からの場所
 * @param {{alt?: string, cls?: string, width?: number, height?: number}} [options]
 *   alt が空のときは「飾りの画像」として、読み上げ対象から外す
 * @returns {string} HTML
 */
export function img(path, { alt = "", cls = "", width, height } = {}) {
  const size = (width ? ` width="${width}"` : "") + (height ? ` height="${height}"` : "");
  return `<img class="${esc(cls)}" src="${esc(BASE + path)}" alt="${esc(alt)}"${size} loading="lazy" decoding="async" draggable="false">`;
}

/**
 * root の中の「観光地の写真」を読み込んで重ねる。画面を描いたあとに1回呼ぶ。
 * @param {HTMLElement} root
 * @param {{actions: {catalog: import("../application/actions/CatalogActions.js").CatalogActions}}} ctx
 */
export function hydratePhotos(root, ctx) {
  root.querySelectorAll("[data-photo]:not([data-ready])").forEach(async (el) => {
    el.dataset.ready = "1";
    const url = await ctx.actions.catalog.photoUrl(el.dataset.photo, el.dataset.size === "lg").catch(() => null);
    if (!url || !el.isConnected) return;
    const photo = new Image();
    photo.alt = "";
    photo.className = "photo-img";
    // 読み込めたときだけ重ねて、ふわっと出す（読み込めなければ、背景のままにする）
    photo.onload = () => {
      el.appendChild(photo);
      requestAnimationFrame(() => photo.classList.add("in"));
    };
    photo.src = url;
  });
}
