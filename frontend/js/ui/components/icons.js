/**
 * 小さなアイコン（インライン SVG）
 *
 * 層：ui
 * 担当：フロント
 *
 * 文字と並べて使う小さなアイコン用です。色は文字の色（currentColor）に合わせて変わります。
 * 大きな絵のアイコン（ホーム・地図などの四角いアイコン）は、assets/images/icons/ の画像を img() で使います。
 *
 * 使い方: icon("check", 18)
 */

/** アイコンの名前 → 24×24 の枠の中の線（path の d） */
const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  close: "M6 6l12 12M18 6L6 18",
  pin: "M12 21s6-5.6 6-11a6 6 0 10-12 0c0 5.4 6 11 6 11zM12 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  play: "M8 5.5v13l11-6.5z",
  pause: "M8 5v14M16 5v14",
  flame: "M12 3c.5 3-3 4.5-3 8a3 3 0 006 0c0-1-.4-1.8-1-2.6 3 1 5 3.6 5 6.6a7 7 0 11-14 0c0-5 5-6 7-12z",
  stamp: "M9 4h6v6l3 3v2H6v-2l3-3V4zM5 19h14",
  medal: "M12 14a5 5 0 100-10 5 5 0 000 10zM8.5 13.5L7 20l5-2.5 5 2.5-1.5-6.5",
  lock: "M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z",
  volume: "M5 9v6h3.5l5 4V5l-5 4H5zM17 9a4 4 0 010 6",
  mute: "M5 9v6h3.5l5 4V5l-5 4H5zM17 9l4 6M21 9l-4 6",
  music: "M9 18V6l10-2v12M9 18a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19 16a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z",
  refresh: "M20 6v5h-5M4 18v-5h5M19 11a7 7 0 00-12-3M5 13a7 7 0 0012 3",
  plus: "M12 5v14M5 12h14",
  trash: "M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13",
  sound: "M5 9v6h3.5l5 4V5l-5 4H5zM17 8.5a5 5 0 010 7"
};

/**
 * @param {keyof typeof PATHS} name
 * @param {number} [size] 一辺の大きさ（px）
 * @returns {string} HTML
 */
export function icon(name, size = 20) {
  const d = PATHS[name] ?? PATHS.star;
  return `<svg class="icon icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
