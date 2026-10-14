/**
 * 演出の指揮者（出来事を聞いて、効果音・BGM・キャラクターの反応を出す）
 *
 * 層：ui
 * 担当：フロント
 *
 * 採点やスタンプの処理は、演出を直接呼びません。「採点した」「スタンプを獲得した」という出来事を
 * EventBus に知らせるだけです。ここがそれを聞いて、音とキャラクターを動かします。
 * 演出を足したり変えたりするときは、このファイルだけを直せば済みます。
 *
 * （Unity でいう、ゲームの出来事を購読して SE・VFX・アニメを出す「FeedbackManager」のようなものです）
 */
import { EVENTS } from "../../application/events.js";
import { BGM, SE } from "../../infrastructure/sound.js";

/**
 * 画面の種類ごとの、BGM とキャラクターの出し方。
 * 画面（ROUTES の name）を足したら、ここにも1行足す。足さなければ DEFAULT_SCENE になる。
 * guide: hero＝大きく / corner＝隅に小さく / hidden＝隠す
 */
const SCENES = {
  home: { bgm: BGM.HOME, guide: "hero" },
  country: { bgm: BGM.HOME, guide: "corner" },
  read: { bgm: BGM.STUDY, guide: "corner" },
  listen: { bgm: BGM.STUDY, guide: "corner" },
  map: { bgm: BGM.HOME, guide: "hidden" },       // 地図は広く使うので、キャラクターは隠す
  tour: { bgm: BGM.HOME, guide: "corner" },
  words: { bgm: BGM.STUDY, guide: "corner" },
  me: { bgm: BGM.HOME, guide: "corner" }
};
const DEFAULT_SCENE = { bgm: BGM.HOME, guide: "corner" };

/** 正解率がこれ以上なら「よくできた」扱いにする（スタンプがもらえる基準と同じ。判定そのものはバックエンドの仕事） */
const PASS_RATE = 0.6;

export class EffectsDirector {
  #events;
  #sound;
  #guide;

  /**
   * @param {import("../../application/events.js").EventBus} events
   * @param {import("../../infrastructure/sound.js").Sound} sound
   * @param {import("../components/Guide.js").Guide} guide
   */
  constructor(events, sound, guide) {
    this.#events = events;
    this.#sound = sound;
    this.#guide = guide;
  }

  /** 出来事を聞き始める */
  start() {
    this.#unlockOnFirstGesture();
    this.#clickSounds();

    this.#events.on(EVENTS.ROUTE_CHANGED, ({ name }) => {
      const scene = SCENES[name] ?? DEFAULT_SCENE;
      // hero のときは、画面の中の置き場所（data-guide-slot）に移る。無ければ隅に出す
      this.#guide.setMode(scene.guide, document.querySelector("[data-guide-slot]"));
      this.#guide.hush();
      this.#sound.playBgm(scene.bgm);
      this.#sound.play(SE.PAGE);
    });

    this.#events.on(EVENTS.ANSWER_SELECTED, () => this.#sound.play(SE.SELECT));
    this.#events.on(EVENTS.HINT_OPENED, () => this.#sound.play(SE.HINT));
    this.#events.on(EVENTS.WORD_SAVED, () => this.#sound.play(SE.WORD_SAVE));

    this.#events.on(EVENTS.GRADED, ({ correct, total }) => {
      const passed = total > 0 && correct / total >= PASS_RATE;
      this.#sound.play(passed ? SE.CORRECT : SE.WRONG);
      this.#guide.react(passed ? "happy" : "sad");
      this.#guide.say(passed ? `${correct} / ${total} 問 正解！` : `${correct} / ${total} 問。もう一度読んでみよう。`);
    });

    this.#events.on(EVENTS.STAMP_EARNED, () => {
      this.#sound.play(SE.STAMP);
      this.#guide.react("happy", 3600);
    });
    this.#events.on(EVENTS.BADGE_EARNED, () => this.#sound.play(SE.BADGE));
  }

  /**
   * ブラウザは、操作の前には音を鳴らさせてくれない。最初のクリック・タップ・キー操作で、音を鳴らせる状態にする。
   */
  #unlockOnFirstGesture() {
    const unlock = () => {
      this.#sound.unlock();
      for (const type of ["pointerdown", "keydown"]) removeEventListener(type, unlock, true);
    };
    for (const type of ["pointerdown", "keydown"]) addEventListener(type, unlock, true);
  }

  /** ボタンやリンクを押したときの音。画面ごとに書かず、ここで1か所にまとめて鳴らす */
  #clickSounds() {
    document.addEventListener("click", (e) => {
      const el = e.target instanceof Element ? e.target.closest("button, a[href], [role=button]") : null;
      if (!el || el.hasAttribute("data-silent")) return;
      this.#sound.play(SE.CLICK);
    });
  }
}
