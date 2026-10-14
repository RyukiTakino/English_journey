/**
 * 出来事の通知（イベントバス）
 *
 * 層：application
 * 担当：フロント
 *
 * 「国の一覧を読み込んだ」「スタンプを獲得した」などの出来事を、関係する部品に知らせる仕組みです。
 * 通知する側は emit するだけ、受け取る側は on で登録するだけで、お互いの存在を知りません。
 * こうしておくと、演出などを足しても通知する側のコードを触らずに済みます。
 *
 * （C# の event / UnityEvent、C++ の std::function を並べたリスナー一覧に近い仕組みです）
 */

/**
 * 出来事の名前の一覧。新しい出来事を足すときはここに追加する。
 * 文字列を直接書くとタイプミスに気づけないので、必ずこの定数経由で使う。
 * Object.freeze は「あとから書き換え不可」にする。C# の static readonly に近い。
 */
export const EVENTS = Object.freeze({
  /** 国の一覧を読み込んだ（payload: Country[]） */
  COUNTRIES_LOADED: "catalog:countries-loaded"
});

export class EventBus {
  /** 出来事の名前 → 登録された関数の集合。# 付きは本物の private（クラスの外から触れない） */
  #handlers = new Map();

  /**
   * 出来事を受け取る関数を登録する。
   * @param {string} name 出来事の名前（EVENTS の値）
   * @param {(payload?: any) => void} fn 出来事が起きたときに呼ばれる関数
   * @returns {() => void} 呼ぶと登録を解除する関数（C# の -= の代わり）
   */
  on(name, fn) {
    // この名前の登録が初めてなら、空の Set を用意する
    if (!this.#handlers.has(name)) this.#handlers.set(name, new Set());
    this.#handlers.get(name).add(fn);
    // 解除用の関数を返す。画面を閉じるときにこれを呼んで後片付けする
    return () => this.#handlers.get(name).delete(fn);
  }

  /**
   * 出来事を知らせる。登録されている関数を全部呼ぶ。
   * @param {string} name 出来事の名前（EVENTS の値）
   * @param {any} [payload] 受け手に渡すデータ
   */
  emit(name, payload) {
    // 誰も登録していなければ空配列として扱う（何も起きない）
    (this.#handlers.get(name) || []).forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        // 1つの受け手が失敗しても、他の受け手には通知を届ける
        console.error(`[events] ${name}`, e);
      }
    });
  }
}
