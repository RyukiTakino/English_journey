/**
 * 単語をタップしたときに出る「意味の吹き出し」（PC は単語のそば、スマホは画面の下から）
 *
 * 層：ui
 * 担当：フロント
 *
 * 流れ：英文の単語（<span class="w" data-word>）をタップ
 *   → ctx.actions.words.lookup(word) で意味を取得 → 表示
 *   → 「単語帳に保存」→ ctx.actions.words.save({...})（スタンプ・バッジの演出は actions が出来事で知らせる）
 *
 * 使い方（画面側）:
 *   const pop = new WordPopover(ctx, { speech, getSource: () => "Big Ben" });
 *   pop.attach(root);                    // root の中の .w が反応するようになる
 *   this.onCleanup(() => pop.destroy()); // 画面を離れるときに後片付け
 *
 * TODO(API): いまは単語だけで意味を引く。文脈に合った意味にするには、lookup に文（context）も渡す API が要る。
 * TODO(Backend): GET /api/words/lookup?word=…&context=… を用意してもらう。
 */
import { esc } from "./html.js";
import { icon } from "./icons.js";

/** この幅以上なら「単語のそばに出す吹き出し」、未満なら「下から出るシート」にする */
const DESKTOP_MIN = 721;

export class WordPopover {
  #ctx;
  #speech;
  #getSource;
  /** 今表示している吹き出しの要素（無ければ null） */
  #el = null;
  /** 今開いている単語の要素（閉じたときにフォーカスを戻す） */
  #target = null;
  /** 古い問い合わせの結果を捨てるための番号（別の単語を押したら増える） */
  #seq = 0;
  /** 単語帳に保存済みの単語（小文字）。保存ボタンの「保存済み」表示に使う */
  #saved = new Set();
  #root = null;
  #listeners = [];

  /**
   * @param {object} ctx 画面に渡される道具一式
   * @param {{speech?: import("../../infrastructure/speech.js").Speech, getSource?: () => string}} [options]
   *   speech … 発音ボタンで使う。getSource … 単語帳に残す「どの記事で見つけたか」
   */
  constructor(ctx, { speech = null, getSource = () => "" } = {}) {
    this.#ctx = ctx;
    this.#speech = speech;
    this.#getSource = getSource;
    // 保存済みの単語を先に取っておく（失敗しても吹き出しは使えるので、エラーは無視する）
    ctx.actions.words
      .list()
      .then((list) => list.forEach((w) => this.#saved.add(w.word.toLowerCase())))
      .catch(() => {});
  }

  /**
   * root の中の単語（.w）を押せるようにする。
   * イベントは「イベント委譲」＝親（root）で受ける方式。単語ごとに登録せず、押された要素を e.target で調べる。
   * （単語は何百個もあるので、1個ずつ addEventListener するより軽い）
   * @param {HTMLElement} root
   */
  attach(root) {
    this.#root = root;
    this.#listen(root, "click", (e) => {
      const w = e.target.closest?.(".w");
      if (w && root.contains(w)) this.open(w);
    });
    // キーボード操作：Tab で単語に来て Enter / Space で開く（辞書にある単語 .kw だけが Tab で止まる）
    this.#listen(root, "keydown", (e) => {
      const w = e.target.closest?.(".w");
      if (w && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        this.open(w);
      }
    });
    // 辞書にある単語（.kw）をキーボードで選べるようにする
    root.querySelectorAll(".w.kw").forEach((w) => {
      w.tabIndex = 0;
      w.setAttribute("role", "button");
    });
    // 吹き出しの外を押したら閉じる。画面サイズが変わったら位置がずれるので閉じる
    this.#listen(document, "click", (e) => {
      if (this.#el && !e.target.closest?.(".wp, .w")) this.close();
    });
    this.#listen(document, "keydown", (e) => e.key === "Escape" && this.close());
    this.#listen(window, "resize", () => this.close());
  }

  /** 画面を離れるときに呼ぶ。登録したイベントを全部外す */
  destroy() {
    this.close(false);
    this.#listeners.splice(0).forEach(([t, type, fn]) => t.removeEventListener(type, fn));
  }

  /** イベントを登録し、あとで外せるように覚えておく */
  #listen(target, type, fn) {
    target.addEventListener(type, fn);
    this.#listeners.push([target, type, fn]);
  }

  /** 吹き出しを閉じる */
  close(restoreFocus = true) {
    this.#seq++;
    this.#el?.remove();
    this.#el = null;
    this.#target?.classList.remove("is-on");
    if (restoreFocus && this.#target?.isConnected && this.#target.tabIndex === 0) this.#target.focus();
    this.#target = null;
  }

  /**
   * 単語 target について、吹き出しを開く。
   * @param {HTMLElement} target 押された <span class="w">
   */
  async open(target) {
    if (target === this.#target) return; // 同じ単語をもう一度押しても、作り直さない
    this.close(false);
    const seq = this.#seq;
    const word = target.dataset.word;
    this.#target = target;
    target.classList.add("is-on");

    const el = document.createElement("div");
    el.className = "wp";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `${word} の意味`);
    el.innerHTML = this.#frame(word, `<p class="wp__meaning muted"><span class="spinner"></span> 調べています</p>`);
    document.body.appendChild(el);
    this.#el = el;
    this.#bindStatic(el, word);
    this.#place(el, target);

    // 通信して意味を取る。取れるまでの間に別の単語を押された（seq が変わった）ら、結果は捨てる
    let res;
    try {
      res = await this.#ctx.actions.words.lookup(word);
    } catch (e) {
      if (seq !== this.#seq) return;
      this.#setBody(el, `<p class="wp__meaning">意味を取得できませんでした。<br><span class="muted small">${esc(e?.message || "通信に失敗しました。")}</span></p>
        <div class="wp__actions"><button type="button" class="btn btn--ghost btn--sm" data-retry>もう一度調べる</button></div>`);
      el.querySelector("[data-retry]")?.addEventListener("click", () => {
        this.close(false);
        this.open(target);
      });
      return;
    }
    if (seq !== this.#seq) return;
    this.#showResult(el, res);
    this.#place(el, target); // 中身が入って高さが変わったので、置き直す
  }

  /** 吹き出しの外枠（単語・発音・閉じるボタン）。中身（#body）は後から差し替える */
  #frame(word, body) {
    return `
      <div class="wp__head">
        <strong class="wp__word">${esc(word)}</strong>
        <span class="wp__pos" data-pos hidden></span>
        <span class="grow"></span>
        ${this.#speech?.isSupported ? `<button type="button" class="wp__icon" data-speak aria-label="${esc(word)} を発音する">${icon("volume", 20)}</button>` : ""}
        <button type="button" class="wp__icon" data-close aria-label="閉じる">${icon("close", 20)}</button>
      </div>
      <div class="wp__body" data-body>${body}</div>`;
  }

  #setBody(el, html) {
    const body = el.querySelector("[data-body]");
    if (body) body.innerHTML = html;
  }

  /** 発音・閉じるボタンの動作 */
  #bindStatic(el, word) {
    el.querySelector("[data-close]")?.addEventListener("click", () => this.close());
    el.querySelector("[data-speak]")?.addEventListener("click", () => {
      this.#speech?.speak(word, { rate: 0.85 });
    });
  }

  /** lookup の結果を表示する（日本語 / 英語の説明 / 見つからない の3通り） */
  #showResult(el, res) {
    const word = (res.word || el.querySelector(".wp__word").textContent).toLowerCase();
    if (res.pos) {
      const pos = el.querySelector("[data-pos]");
      pos.textContent = res.pos;
      pos.hidden = false;
    }
    if (res.lang === "" || !res.meaning) {
      // 辞書に無かった単語（保存はできない）
      this.#setBody(el, `<p class="wp__meaning">辞書に見つかりませんでした。</p><p class="muted small">固有名詞や、少しめずらしい語かもしれません。</p>`);
      return;
    }
    // lang === "en" は英語の説明（英英辞書）なので、そうとわかる小さな注記を付ける
    const note = res.lang === "en" ? `<p class="muted small">英語の説明です（日本語の訳がまだありません）</p>` : "";
    this.#setBody(
      el,
      `<p class="wp__meaning ${res.lang === "en" ? "wp__meaning--en" : ""}">${esc(res.meaning)}</p>${note}
       <div class="wp__actions"><button type="button" class="btn btn--sm" data-save></button></div>`
    );
    const btn = el.querySelector("[data-save]");
    const paint = (state) => {
      btn.disabled = state !== "idle";
      btn.innerHTML =
        state === "saved" ? `${icon("check", 16)} 保存しました` : state === "saving" ? `保存しています…` : `${icon("plus", 16)} 単語帳に保存`;
    };
    paint(this.#saved.has(word) ? "saved" : "idle");
    btn.addEventListener("click", async () => {
      paint("saving");
      try {
        await this.#ctx.actions.words.save({ word, pos: res.pos || "", meaning: res.meaning, source: this.#getSource() });
        this.#saved.add(word);
        this.#ctx.toast.show(`「${word}」を単語帳に保存しました`);
        if (btn.isConnected) paint("saved");
      } catch (e) {
        this.#ctx.toast.show(e?.message || "保存できませんでした。もう一度お試しください。");
        if (btn.isConnected) paint("idle");
      }
    });
  }

  /** 置き場所を決める。PC は単語の上か下、スマホは画面の下に固定（CSS の .wp--sheet） */
  #place(el, target) {
    if (window.innerWidth < DESKTOP_MIN) {
      el.classList.add("wp--sheet");
      return;
    }
    const r = target.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // 横：単語の中央に合わせて、画面からはみ出さないように寄せる
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 12));
    // 縦：下に収まるなら下、無理なら上。スクロール量（scrollY）を足して、ページ上の絶対位置にする
    const below = r.bottom + 10 + h < window.innerHeight;
    el.style.left = `${left + window.scrollX}px`;
    el.style.top = `${(below ? r.bottom + 8 : r.top - h - 8) + window.scrollY}px`;
  }
}
