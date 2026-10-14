/**
 * 効果音と BGM の再生
 *
 * 層：infrastructure
 * 担当：フロント
 *
 * Web Audio API で、効果音は「すぐ鳴る」ように、BGM は「つなぎ目なくループする」ように再生します。
 * 音のファイルは assets/audio/se/*.ogg と assets/audio/bgm/*.ogg（tools/audio/ の Python で作ったもの）。
 *
 * ■ ブラウザの自動再生の制限
 *   ユーザーが何も操作していないうちは、ブラウザは音を鳴らさせてくれません。
 *   そのため、最初のクリック・タップ・キー操作（unlock）のあとに、音を鳴らし始めます。
 *   それまでに頼まれた BGM は覚えておき、unlock の直後に再生します。
 *
 * （Unity の AudioSource / AudioMixer を 1 つにまとめた SoundManager のようなものです）
 */

/** 効果音の名前の一覧（ファイル名と同じ） */
export const SE = Object.freeze({
  CLICK: "click",
  SELECT: "select",
  CORRECT: "correct",
  WRONG: "wrong",
  STAMP: "stamp",
  BADGE: "badge",
  COMPLETE: "complete",
  WORD_SAVE: "word-save",
  PAGE: "page",
  HINT: "hint"
});

/** BGM の名前の一覧（ファイル名と同じ） */
export const BGM = Object.freeze({ HOME: "home", STUDY: "study", RESULT: "result" });

/** 音のファイルの置き場所。このファイルの場所を基準にするので、どのページから使っても同じ場所を指す */
const AUDIO_DIR = new URL("../../assets/audio", import.meta.url).href;
/** BGM を切り替えるときの、音量の変わる長さ（秒） */
const FADE_SEC = 0.8;

export class Sound {
  /** @type {import("./storage.js").Settings} */
  #settings;
  /** @type {AudioContext | null} */
  #ctx = null;
  #seGain = null;
  #bgmGain = null;
  /** 読み込み済みの音。名前 → Promise<AudioBuffer|null>（失敗しても null にして、アプリは止めない） */
  #buffers = new Map();
  /** 再生中の BGM。{ name, source, gain } */
  #bgm = null;
  /** 今ほしい BGM の名前（unlock 前に頼まれたものも含む） */
  #wantedBgm = null;
  #unlocked = false;

  /** @param {import("./storage.js").Settings} settings */
  constructor(settings) {
    this.#settings = settings;
  }

  /** 最初の操作で呼ぶ。音を鳴らせる状態にする */
  async unlock() {
    if (this.#unlocked) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.#ctx = new Ctor();
    this.#seGain = this.#ctx.createGain();
    this.#bgmGain = this.#ctx.createGain();
    this.#seGain.connect(this.#ctx.destination);
    this.#bgmGain.connect(this.#ctx.destination);
    this.#applyVolumes();
    try {
      await this.#ctx.resume();
    } catch {
      return;
    }
    this.#unlocked = true;
    // 効果音は先に読み込んでおく（初回のクリック音が遅れないように）
    Object.values(SE).forEach((name) => this.#load("se", name));
    if (this.#wantedBgm) this.playBgm(this.#wantedBgm);
  }

  /**
   * 効果音を1回鳴らす。
   * @param {string} name SE の値
   */
  async play(name) {
    if (!this.#unlocked || !this.#settings.get("se")) return;
    const buffer = await this.#load("se", name);
    if (!buffer) return;
    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.#seGain);
    source.start();
  }

  /**
   * BGM を切り替える（今と同じなら何もしない）。前の曲は、ゆっくり小さくして止める。
   * @param {string|null} name BGM の値。null なら止める
   */
  async playBgm(name) {
    this.#wantedBgm = name;
    if (!this.#unlocked) return;
    if (this.#bgm?.name === name) return;
    this.#stopBgm();
    if (!name || !this.#settings.get("bgm")) return;

    const buffer = await this.#load("bgm", name);
    // 読み込み中に、別の曲を頼まれていたら、鳴らさない
    if (!buffer || this.#wantedBgm !== name || this.#bgm) return;

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // Web Audio の loop は、つなぎ目の隙間が出ない
    const gain = this.#ctx.createGain();
    gain.gain.setValueAtTime(0, this.#ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.#ctx.currentTime + FADE_SEC);
    source.connect(gain).connect(this.#bgmGain);
    source.start();
    this.#bgm = { name, source, gain };
  }

  /** @param {boolean} on */
  setSeEnabled(on) {
    this.#settings.set("se", on);
  }

  /** @param {boolean} on */
  setBgmEnabled(on) {
    this.#settings.set("bgm", on);
    if (on) this.playBgm(this.#wantedBgm);
    else this.#stopBgm();
  }

  get seEnabled() {
    return this.#settings.get("se");
  }

  get bgmEnabled() {
    return this.#settings.get("bgm");
  }

  // ---------------------------------------------------------------- 内部

  #applyVolumes() {
    this.#seGain.gain.value = this.#settings.get("seVolume");
    this.#bgmGain.gain.value = this.#settings.get("bgmVolume");
  }

  #stopBgm() {
    if (!this.#bgm) return;
    const { source, gain } = this.#bgm;
    this.#bgm = null;
    const now = this.#ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + FADE_SEC);
    source.stop(now + FADE_SEC + 0.05);
  }

  /** 音のファイルを読み込んで、デコードする。同じ音は1回だけ読み込む */
  #load(kind, name) {
    const key = `${kind}/${name}`;
    if (!this.#buffers.has(key)) {
      this.#buffers.set(
        key,
        fetch(`${AUDIO_DIR}/${key}.ogg`)
          .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
          .then((data) => this.#ctx.decodeAudioData(data))
          .catch((e) => {
            console.warn(`[sound] ${key} を読み込めません`, e);
            return null;
          })
      );
    }
    return this.#buffers.get(key);
  }
}
