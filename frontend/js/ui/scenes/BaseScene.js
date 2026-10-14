/**
 * 画面（シーン）の土台
 *
 * 層：ui
 * 担当：フロント
 *
 * すべての画面はこのクラスを継承し、Router から次の順番で呼ばれます。
 *   1. load()      … 画面に必要なデータを取る（actions を通して）。失敗したら例外を投げる
 *   2. render()    … 画面の HTML（文字列）を返す
 *   3. mount(root) … ボタンなどにイベントを付ける。root は画面の HTML が入った要素
 *   4. unmount()   … 別の画面に移るときの後片付け（onCleanup で登録したものが自動で呼ばれる）
 *
 * （Unity の MonoBehaviour でいう Awake/Start → 表示 → OnDestroy の流れに近いものです。
 *   継承して必要なメソッドだけ上書き＝override するところも同じです）
 */
export class BaseScene {
  /** 後片付けの関数の一覧。# 付きは private */
  #cleanups = [];

  /**
   * @param {{store: import("../../application/store.js").Store,
   *          events: import("../../application/events.js").EventBus,
   *          actions: object}} ctx
   *        main.js で組み立てた「画面が使ってよい道具一式」。api は含めない（通信は actions 経由）
   * @param {string[]} params URL から取り出した値。例: "#/country/uk" なら ["uk"]
   */
  constructor(ctx, params = []) {
    this.ctx = ctx;
    this.params = params;
  }

  /** データを取る。必要な画面だけ上書きする（C# の virtual メソッドに相当） */
  async load() {}

  /** 画面の HTML を返す。上書きして使う */
  render() {
    return "";
  }

  /** HTML が画面に入った後に呼ばれる。ボタンのイベント登録などをここでする */
  mount(_root) {}

  /**
   * 画面を離れるときに実行する処理を登録する（イベントの解除、タイマーの停止など）。
   * events.on の戻り値（解除する関数）を、そのまま渡せる。
   * @param {() => void} fn
   */
  onCleanup(fn) {
    this.#cleanups.push(fn);
  }

  /** Router が呼ぶ。登録された後片付けを全部実行する */
  unmount() {
    // splice(0) で一覧を空にしつつ中身を取り出す。二重に呼ばれても2回実行されない
    this.#cleanups.splice(0).forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }
}
