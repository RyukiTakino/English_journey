/**
 * 画面の下に、短いメッセージを出す
 *
 * 層：ui
 * 担当：フロント
 *
 * 画面の中の要素（#toast）に、文字を入れて表示し、少しあとに消します。
 */
export class Toast {
  #el;
  #timer = 0;

  /** @param {HTMLElement} el index.html の #toast */
  constructor(el) {
    this.#el = el;
  }

  /**
   * @param {string} message 画面に出せる短い文
   */
  show(message) {
    this.#el.textContent = message;
    this.#el.classList.add("show");
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#el.classList.remove("show"), 2400);
  }
}
