/**
 * 英文の読み上げ（ブラウザの音声合成 = Web Speech API の speechSynthesis を包んだ小さなクラス）
 *
 * 層：infrastructure（端末の機能との接続）
 * 担当：フロント
 *
 * 使うところ：リーディングの「読み上げ」、リスニングのニュース再生、単語の発音ボタン。
 *
 * ■ 作りの方針
 *  - 文章は「1文ずつ」に区切って順番に読む。
 *    （Chrome は長い文章を 1 回で読ませると途中で止まることがあるため。区切ると、進み具合も取りやすい）
 *  - 一時停止（pause）は、ブラウザの pause ではなく「止めた位置を覚えて、再開で続きから読み直す」方式。
 *    ブラウザの pause/resume は端末によって動かないことがあるため、こちらの方が確実。
 *  - 音声合成が無いブラウザ・音声が1つも無い環境でも例外は出さない（isSupported が false、または onend("error") で知らせる）。
 *
 * （C# の SpeechSynthesizer を 1 クラスで包んだもの、と考えるとわかりやすいです。
 *   イベントは C# の event ではなく、コールバック関数＝デリゲートを引数で渡します）
 *
 * TODO(フロント): 声の選択（男性・女性、en-US / en-GB の切り替え）を設定画面に出す。
 * TODO(API): 本物の音声ファイル（サーバーで作った音声）を使うなら、この Speech と同じ形の別クラスに差し替える。
 */

/** 1回に読ませる最大の文字数。これより長い文は、スペースの位置で区切る */
const MAX_CHUNK = 180;
/** 読み始めの合図（onstart）がこの時間を過ぎても来なければ、「この環境では読めない」と判断する（ミリ秒） */
const START_TIMEOUT = 4000;

/**
 * 文章を「文」ごとの断片に分ける。それぞれの断片が、元の文章の何文字目から始まるかも持つ。
 * @param {string} text
 * @param {number} from この文字位置より後ろだけを対象にする
 * @returns {{text: string, start: number}[]}
 */
function splitChunks(text, from = 0) {
  const chunks = [];
  // 「. ! ? 改行」までを1文とする。終わりの記号が無い最後の部分も拾う
  for (const m of text.matchAll(/[^.!?\n]+[.!?]*["”')\]]*|\n+/g)) {
    let start = m.index;
    let piece = m[0];
    if (start + piece.length <= from) continue; // すでに読んだ部分
    if (start < from) {
      piece = piece.slice(from - start);
      start = from;
    }
    // 長すぎる文は、MAX_CHUNK 以内でスペースの位置を探して区切る
    while (piece.length > MAX_CHUNK) {
      let cut = piece.lastIndexOf(" ", MAX_CHUNK);
      if (cut < 20) cut = MAX_CHUNK;
      chunks.push({ text: piece.slice(0, cut), start });
      piece = piece.slice(cut);
      start += cut;
    }
    if (piece.trim()) chunks.push({ text: piece, start });
  }
  return chunks;
}

export class Speech {
  /** 使える声の候補（読み込みは非同期なので、あとから更新される） */
  #voice = null;
  /** 読み上げの「世代」番号。stop や新しい speak のたびに増やし、古い読み上げのコールバックを無視するために使う */
  #token = 0;
  #timer = 0;
  /** @type {"idle"|"playing"|"paused"} */
  #state = "idle";
  #text = "";
  #opts = {};
  /** 今読んでいる（または止めた）位置。text の何文字目か */
  #offset = 0;

  constructor() {
    if (this.isSupported) {
      this.#pickVoice();
      // 声の一覧は、ページを開いた直後は空のことがある。届いたら選び直す
      speechSynthesis.addEventListener?.("voiceschanged", () => this.#pickVoice());
    }
  }

  /** 音声合成が使えるブラウザか（静的な判定。使えなければ他のメソッドは何もしない） */
  get isSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  /** 今の状態："idle"（止まっている） / "playing"（読んでいる） / "paused"（一時停止） */
  get state() {
    return this.#state;
  }

  /** 止めた・読んでいる位置（文字数）。再生速度を変えて読み直すときなどに使う */
  get offset() {
    return this.#offset;
  }

  /**
   * 文章を読み上げる。すでに読んでいるものがあれば、それは止める。
   *
   * @param {string} text 読む英文
   * @param {object} [opts]
   * @param {number} [opts.rate=1] 速さ（0.8〜1.2 くらい）
   * @param {number} [opts.from=0] 文章の何文字目から読むか
   * @param {() => void} [opts.onstart] 読み始めたとき
   * @param {(e: {charIndex: number, total: number}) => void} [opts.onboundary]
   *   読んでいる位置が進んだとき。charIndex は text 全体の中の位置（単語ごと、または文の頭）
   * @param {(reason: "ended"|"stopped"|"paused"|"error") => void} [opts.onend]
   *   読み終わった・止められた・一時停止された・失敗したとき
   */
  speak(text, opts = {}) {
    // 前の読み上げを止める（止められたことを、前の持ち主にも知らせる）
    this.#halt("stopped");
    if (!this.isSupported || !text?.trim()) {
      opts.onend?.("error");
      return;
    }
    this.#text = text;
    this.#opts = opts;
    this.#offset = opts.from ?? 0;
    this.#start();
  }

  /** 読み上げを止めて、最初の状態に戻す */
  stop() {
    this.#halt("stopped");
    this.#offset = 0;
  }

  /** 一時停止する。位置を覚えておき、resume() で続きから読む */
  pause() {
    if (this.#state !== "playing") return;
    this.#halt("paused");
    this.#state = "paused";
  }

  /** 一時停止していたら、続きから読む */
  resume() {
    if (this.#state !== "paused") return;
    this.#start();
  }

  // ---------- ここから内部の処理 ----------

  /** this.#offset から読み始める */
  #start() {
    const tok = ++this.#token;
    this.#state = "playing";
    const chunks = splitChunks(this.#text, this.#offset);
    if (!chunks.length) {
      this.#finish(tok, "ended");
      return;
    }
    // ブラウザによっては、前の読み上げが残っていると新しい読み上げが始まらないので、念のため空にする
    speechSynthesis.cancel();

    let started = false;
    // 一定時間たっても読み始められなければ（音声が1つも無い環境など）、失敗として知らせる
    this.#timer = setTimeout(() => {
      if (!started) this.#finish(tok, "error");
    }, START_TIMEOUT);

    const speakChunk = (i) => {
      if (tok !== this.#token) return; // 古い読み上げなら何もしない
      if (i >= chunks.length) {
        this.#finish(tok, "ended");
        return;
      }
      const chunk = chunks[i];
      this.#offset = chunk.start;
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.lang = this.#voice?.lang || "en-US";
      if (this.#voice) u.voice = this.#voice;
      u.rate = this.#opts.rate ?? 1;
      u.onstart = () => {
        if (tok !== this.#token) return;
        if (!started) {
          started = true;
          clearTimeout(this.#timer);
          this.#opts.onstart?.();
        }
        // 文の頭にも位置を知らせる（単語ごとの合図が来ない声でも、文ごとには進み具合がわかる）
        this.#opts.onboundary?.({ charIndex: chunk.start, total: this.#text.length });
      };
      u.onboundary = (e) => {
        if (tok !== this.#token) return;
        this.#offset = chunk.start + e.charIndex;
        this.#opts.onboundary?.({ charIndex: this.#offset, total: this.#text.length });
      };
      u.onend = () => speakChunk(i + 1);
      u.onerror = (e) => {
        if (tok !== this.#token) return;
        // 自分で cancel() したときの "canceled" / "interrupted" は失敗ではない
        if (e.error === "canceled" || e.error === "interrupted") return;
        this.#finish(tok, "error");
      };
      speechSynthesis.speak(u);
    };
    speakChunk(0);
  }

  /** 自然に終わった・失敗したときの後始末 */
  #finish(tok, reason) {
    if (tok !== this.#token) return;
    clearTimeout(this.#timer);
    this.#token++;
    this.#state = "idle";
    if (reason === "ended") this.#offset = 0;
    if (reason === "error") speechSynthesis.cancel();
    const onend = this.#opts.onend;
    onend?.(reason);
  }

  /** 読み上げを途中で止める（stop / pause / 別の読み上げに切り替えるとき） */
  #halt(reason) {
    if (this.#state === "idle" || this.#state === "paused") {
      // 動いていないときは、状態だけを整える（paused のまま別の読み上げが始まる場合など）
      if (this.#state === "paused" && reason === "stopped") {
        this.#token++;
        this.#state = "idle";
        const onend = this.#opts.onend;
        onend?.("stopped");
      }
      return;
    }
    clearTimeout(this.#timer);
    this.#token++; // これで、進行中の読み上げのコールバックはすべて無視される
    if (this.isSupported) speechSynthesis.cancel();
    this.#state = "idle";
    const onend = this.#opts.onend;
    onend?.(reason);
  }

  /** en-US / en-GB の声を探す（自然な声が使えるなら、それを優先する） */
  #pickVoice() {
    const voices = speechSynthesis.getVoices?.() ?? [];
    const en = voices.filter((v) => /^en([-_](US|GB))?/i.test(v.lang));
    this.#voice =
      en.find((v) => /^en[-_](US|GB)/i.test(v.lang) && /Google|Natural|Online/i.test(v.name)) ||
      en.find((v) => /^en[-_](US|GB)/i.test(v.lang)) ||
      en[0] ||
      null;
  }
}
