/**
 * 出来事の通知（イベントバス）
 *
 * 層：application
 * 担当：フロント
 *
 * 「採点した」「スタンプを獲得した」などの出来事を、関係する部品に知らせる仕組みです。
 * 通知する側は emit するだけ、受け取る側は on で登録するだけで、お互いを知りません。
 */

/** 出来事の名前の一覧。新しい出来事を足すときはここに追加する */
export const EVENTS = Object.freeze({
  /** ログイン・ログアウトした */
  SESSION_CHANGED: "session:changed"
});

export class EventBus {
  #handlers = new Map(); // 出来事の名前 → 登録された関数の集合

  /** 出来事を受け取る関数を登録する。戻り値を呼ぶと解除できる */
  on(name, fn) {
    if (!this.#handlers.has(name)) this.#handlers.set(name, new Set());
    this.#handlers.get(name).add(fn);
    return () => this.#handlers.get(name).delete(fn);
  }

  /** 出来事を知らせる。1つの受け手が失敗しても、他の受け手には届ける */
  emit(name, payload) {
    (this.#handlers.get(name) || []).forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[events] ${name}`, e);
      }
    });
  }
}
