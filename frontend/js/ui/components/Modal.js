/**
 * 画面の上に重ねて出すウィンドウ（スタンプ獲得、バッジ獲得、単語カード など）
 *
 * 層：ui
 * 担当：フロント
 *
 * open() は「閉じられたときに解決する Promise」を返します。
 * 演出を順番に出したいとき（スタンプ → バッジ）は、await で 1 つずつ出せます。
 * 中身（html）には、サーバー由来の文字列を入れるなら、呼ぶ側で esc() を通しておきます。
 */
export class Modal {
  #current = null;

  /**
   * @param {string} html 中身。data-close を付けたボタンを押すと閉じる
   * @param {{onMount?: (el: HTMLElement) => void, cls?: string}} [options]
   *   onMount は、出したあとに呼ばれる（ボタンのイベント登録などに使う）。cls は枠に付ける追加のクラス
   * @returns {Promise<void>} 閉じたときに解決する
   */
  open(html, { onMount, cls = "" } = {}) {
    this.close();
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "modal-backdrop";
      wrap.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
      const finish = () => {
        wrap.remove();
        document.removeEventListener("keydown", onKey);
        if (this.#current === wrap) this.#current = null;
        resolve();
      };
      // 背景か、data-close の付いた要素を押したら閉じる。Esc キーでも閉じる
      wrap.addEventListener("click", (e) => {
        if (e.target === wrap || e.target.closest("[data-close]")) finish();
      });
      const onKey = (e) => {
        if (e.key === "Escape") finish();
      };
      document.addEventListener("keydown", onKey);
      wrap._finish = finish;
      document.body.appendChild(wrap);
      this.#current = wrap;
      requestAnimationFrame(() => wrap.classList.add("show"));
      onMount?.(wrap);
    });
  }

  /** 開いているウィンドウを閉じる */
  close() {
    this.#current?._finish();
  }
}
