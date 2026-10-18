/**
 * URL と画面の対応づけ、画面の切り替え
 *
 * 層：ui
 * 担当：フロント
 *
 * URL の # 以降（例: #/country/uk）を見て、対応する画面（Scene）を表示します。
 * # 以降で切り替える方式（ハッシュルーティング）なので、サーバー側の設定なしで
 * GitHub Pages のような静的な場所でも動きます。
 *
 * 画面を増やすときは、main.js の ROUTES に1行足すだけです。
 *
 * （Unity の SceneManager.LoadScene に近い役割です。シーン名の代わりに URL で指定します）
 */
import { esc } from "./components/html.js";
import { EVENTS } from "../application/events.js";
import { applyTranslations } from "../application/i18n.js";

export class Router {
  /** 画面切り替えの通し番号。読み込み中に別の画面へ移ったかを判定するのに使う */
  #token = 0;
  /** 今表示している画面 */
  #current = null;

  /**
   * @param {object} ctx 画面に渡す道具一式
   * @param {{name: string, pattern: RegExp, scene: typeof import("./scenes/BaseScene.js").BaseScene}[]} routes
   *        name は画面の種類（演出の切り替えに使う）。pattern に一致した URL に対応する画面クラス。
   *        pattern の () で囲んだ部分が params になる
   * @param {HTMLElement} appEl 画面を描く場所（#app）
   */
  constructor(ctx, routes, appEl) {
    this.ctx = ctx;
    this.routes = routes;
    this.appEl = appEl;
  }

  /** 起動する。以後 URL（#以降）が変わるたびに画面を切り替える */
  start() {
    window.addEventListener("hashchange", () => this.go());
    window.addEventListener("languagechange", () => this.go());
    return this.go();
  }

  /** URL の指す画面を表示する */
  async go() {
    // この切り替えの番号を取る。await のあとで番号が変わっていたら、別の切り替えが始まっている
    const token = ++this.#token;

    // 今の画面の後片付け。開いたままのウィンドウ（スタンプ獲得など）も、画面を移るときに閉じる
    this.#current?.unmount();
    this.#current = null;
    this.ctx.modal?.close();

    // "#/country/uk" → "/country/uk"。何も無ければ "/"
    const path = location.hash.replace(/^#/, "") || "/";

    // 一致する画面を探す。m は正規表現の結果で、m[1] 以降が () の中身
    const found = this.routes
      .map((route) => ({ route, m: path.match(route.pattern) }))
      .find((x) => x.m);
    if (!found) {
      // 知らない URL はホームに戻す（hashchange が起きて、もう一度 go が呼ばれる）
      location.hash = "#/";
      return;
    }

    const scene = new found.route.scene(this.ctx, found.m.slice(1));

    // 画面に必要なデータを取る。失敗したらエラー表示にする
    try {
      await scene.load();
    } catch (err) {
      if (token !== this.#token) return; // 待っている間に別の画面へ移っていたら何もしない
      this.#paintError(err.message || "エラーが発生しました");
      return;
    }
    if (token !== this.#token) return; // 同上

    this.appEl.innerHTML = scene.render();
    applyTranslations(this.appEl);
    this.#current = scene;
    scene.mount(this.appEl);
    window.scrollTo(0, 0);
    // 画面が出たことを知らせる（BGM やキャラクターの切り替えは、これを聞いた EffectsDirector が行う）
    this.ctx.events.emit(EVENTS.ROUTE_CHANGED, { path, name: found.route.name });
  }

  /**
   * エラー表示と「再読み込み」ボタン。
   * TODO(フロント): 見た目は、共通の部品（ui/components）を作ったときに差し替える。
   */
  #paintError(message) {
    this.appEl.innerHTML = `
      <div class="state state--error">
        <p>${esc(message)}</p>
        <button type="button" class="btn" data-reload>再読み込み</button>
      </div>`;
    this.appEl.querySelector("[data-reload]").addEventListener("click", () => this.go());
  }
}
