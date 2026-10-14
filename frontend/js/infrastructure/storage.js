/**
 * 端末に保存する設定（音のオン・オフなど）
 *
 * 層：infrastructure
 * 担当：フロント
 *
 * ブラウザの localStorage に、小さな設定だけを保存します（サーバーには送りません）。
 * プライベートブラウズなどで localStorage が使えなくても、アプリが止まらないように、
 * 読み書きは必ず try / catch で包み、失敗したら「保存しない」だけにします。
 *
 * （Unity の PlayerPrefs に近いものです）
 */

const KEY = "english-journey:settings";

/** 初期値。新しい設定を足すときは、ここに足す（古い保存データにも、足りない項目は初期値が入る） */
const DEFAULTS = Object.freeze({
  /** 効果音 */
  se: true,
  /** BGM。ブラウザの自動再生の制限があるので、最初は切にしておく人が多いが、初期は入にする */
  bgm: true,
  /** 音量（0〜1） */
  seVolume: 0.8,
  bgmVolume: 0.5
});

export class Settings {
  #values;

  constructor() {
    this.#values = { ...DEFAULTS, ...this.#read() };
  }

  /** @param {keyof typeof DEFAULTS} key */
  get(key) {
    return this.#values[key];
  }

  /**
   * 設定を変えて保存する。
   * @param {keyof typeof DEFAULTS} key
   * @param {boolean|number} value
   */
  set(key, value) {
    this.#values[key] = value;
    this.#write();
  }

  #read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") ?? {};
    } catch {
      return {};
    }
  }

  #write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.#values));
    } catch {
      /* 保存できなくても、今の画面では設定を使い続けられる */
    }
  }
}
