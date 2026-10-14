/**
 * 単語帳の画面（#/words）
 *
 * 層：ui
 * 担当：フロント（単語帳）
 *
 * - 保存した単語の一覧（絞り込み・読み上げ・削除）
 * - 「カードで復習」モード（FlashCards）
 * 読み込みは ctx.actions.words.list() 経由。画面は通信しない。
 *
 * ■ 作り
 *   描き直したい部分（件数・一覧）だけを #paintList() で書き換える。検索欄は作り直さないので、入力中のカーソルが消えない。
 *   ボタンのイベントは、画面の外枠 1か所で受け取る（イベント委譲：data-action を見て振り分ける）。
 *   外枠（.words-scene）を使うのは、#app 自体は他の画面と共有で、そこにイベントを付けると残ってしまうため。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";
import { icon } from "../components/icons.js";
import { emptyView } from "../components/states.js";
import { wordCard } from "../components/WordCard.js";
import { FlashCards } from "../components/FlashCards.js";
import { cancelSpeech, speak } from "../components/speech.js";

export class WordsScene extends BaseScene {
  /** @type {import("../../domain/models.js").SavedWord[]} */
  #words = [];
  #query = "";
  /** @type {HTMLElement|null} この画面の外枠 */
  #el = null;
  /** @type {FlashCards|null} 復習中だけ入っている */
  #flash = null;

  async load() {
    this.#words = await this.ctx.actions.words.list();
  }

  render() {
    // 空のときは、検索欄も復習ボタンも出さず、案内だけ出す
    return `<div class="words-scene">${this.#words.length ? this.#listShellHtml() : this.#emptyHtml()}</div>`;
  }

  mount(root) {
    this.#el = root.querySelector(".words-scene");
    if (!this.#el) return;
    if (this.#words.length) this.#paintList();
    const onClick = (e) => this.#onClick(e);
    const onInput = (e) => {
      if (e.target.matches(".words-search__input")) {
        this.#query = e.target.value;
        this.#paintList();
      }
    };
    this.#el.addEventListener("click", onClick);
    this.#el.addEventListener("input", onInput);
    this.onCleanup(() => {
      this.#el?.removeEventListener("click", onClick);
      this.#el?.removeEventListener("input", onInput);
      this.#flash?.destroy(); // 復習中に画面を離れたとき
      this.#flash = null;
      cancelSpeech(); // 読み上げ中なら止める
    });
  }

  // ---------- HTML ----------

  #emptyHtml() {
    return `
      <h1 class="words-head__title">単語帳</h1>
      ${emptyView({
        title: "単語帳はまだ空です",
        text: "記事を読んで、気になる単語をタップして保存しましょう。",
        action: `<a class="btn" href="#/">${icon("play", 16)} 記事を読みにいく</a>`
      })}`;
  }

  /** 見出し・検索欄・一覧の枠（件数と一覧の中身は #paintList で入れる） */
  #listShellHtml() {
    return `
      <header class="words-head">
        <div>
          <h1 class="words-head__title">単語帳</h1>
          <p class="words-head__count muted" data-words-count aria-live="polite"></p>
        </div>
        <button type="button" class="btn btn--lg words-head__review" data-action="review">${icon("play", 18)} カードで復習</button>
      </header>
      <div class="words-search">
        <label class="sr-only" for="words-search-input">単語を絞り込む</label>
        <input id="words-search-input" class="words-search__input" type="search" placeholder="単語・意味・記事名で絞り込む" value="${esc(this.#query)}" autocomplete="off">
      </div>
      <ul class="words-list" data-words-list></ul>`;
  }

  /** 絞り込み後の語を、カードの HTML にする */
  #itemsHtml() {
    const list = this.#filtered();
    if (!list.length) return `<li class="words-none muted">「${esc(this.#query)}」に合う単語はありません。</li>`;
    return list.map(wordCard).join("");
  }

  #filtered() {
    const q = this.#query.trim().toLowerCase();
    if (!q) return this.#words;
    return this.#words.filter((w) => [w.word, w.meaning, w.source].some((s) => (s || "").toLowerCase().includes(q)));
  }

  // ---------- 描き直し ----------

  /** 件数と一覧だけを書き換える */
  #paintList() {
    const list = this.#el.querySelector("[data-words-list]");
    const count = this.#el.querySelector("[data-words-count]");
    if (!list || !count) return;
    const shown = this.#filtered().length;
    count.textContent = this.#query.trim() ? `${this.#words.length} 語のうち ${shown} 語を表示` : `保存した単語：${this.#words.length} 語`;
    list.innerHTML = this.#itemsHtml();
  }

  /** 一覧モードを最初から描く（復習から戻ったとき・全部消したとき） */
  #paintAll() {
    this.#el.innerHTML = this.#words.length ? this.#listShellHtml() : this.#emptyHtml();
    if (this.#words.length) this.#paintList();
  }

  // ---------- 操作 ----------

  #onClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, word } = btn.dataset;
    if (action === "speak") speak(word);
    else if (action === "delete") this.#confirmDelete(word);
    else if (action === "review") this.#startReview();
  }

  #startReview() {
    this.#flash?.destroy();
    this.#el.classList.add("is-reviewing");
    // 復習モード：外枠の中身を FlashCards に任せる。戻るときに一覧を描き直す
    this.#flash = new FlashCards(this.#el, this.#words, () => this.#exitReview());
    window.scrollTo({ top: 0 });
  }

  #exitReview() {
    this.#flash?.destroy();
    this.#flash = null;
    this.#el.classList.remove("is-reviewing");
    this.#paintAll();
  }

  /** 消す前に確認する（Modal の onMount でボタンにイベントを付ける） */
  #confirmDelete(word) {
    const target = this.#words.find((w) => w.word === word);
    if (!target) return;
    this.ctx.modal.open(
      `<div class="words-confirm">
        <h2>単語帳から消しますか？</h2>
        <p><strong class="words-confirm__word">${esc(target.word)}</strong><br><span class="muted">${esc(target.meaning)}</span></p>
        <div class="words-confirm__actions">
          <button type="button" class="btn btn--ghost" data-close>やめる</button>
          <button type="button" class="btn btn--danger" data-ok>${icon("trash", 16)} 消す</button>
        </div>
      </div>`,
      {
        onMount: (wrap) => {
          wrap.querySelector("[data-close]")?.focus();
          wrap.querySelector("[data-ok]").addEventListener("click", async (ev) => {
            ev.currentTarget.disabled = true; // 二重送信を防ぐ
            try {
              await this.ctx.actions.words.remove(target.word);
              this.#words = this.#words.filter((w) => w.word !== target.word);
              this.ctx.toast.show(`「${target.word}」を消しました`);
              // 消している間に別の画面へ移っていたら、描き直さない
              if (this.#el?.isConnected && !this.#flash) this.#words.length ? this.#paintList() : this.#paintAll();
            } catch (err) {
              console.error(err);
              this.ctx.toast.show("消せませんでした。もう一度お試しください");
            }
            this.ctx.modal.close();
          });
        }
      }
    );
  }
}
