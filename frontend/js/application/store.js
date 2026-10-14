/**
 * 今の状態の入れ物（ストア）
 *
 * 層：application
 * 担当：フロント
 *
 * 画面を作るのに必要なデータ（国の一覧など）を、1か所にまとめて持ちます。
 * 画面は、ここから読むだけにします。書き換えるのは actions（application/actions/）だけです。
 * こうしておくと「データを誰が変えたか」を追いかけやすくなります。
 *
 * ここは入れ物なので、通信はしません（通信は actions が ApiClient 経由で行い、結果をここに入れます）。
 * 状態が変わったことの通知も、ここでは行いません（events.js の EventBus で actions が知らせます）。
 *
 * （ゲーム開発でいう、GameState のようなデータだけを持つクラスに近いものです）
 */

/** @typedef {import("../domain/models.js").Country} Country */

export class Store {
  /**
   * 国の一覧。まだ読み込んでいないときは null、読み込み済みなら配列。
   * 「空の配列（国が0件）」と「まだ読み込んでいない」を区別するために null を使う。
   * （C# の List<Country>? に近い。未読み込みの null を画面側で判定して「読み込み中」を出せる）
   * @type {Country[] | null}
   */
  #countries = null;

  /** 読み込み済みの国の一覧。未読み込みなら null */
  get countries() {
    return this.#countries;
  }

  /**
   * 国の一覧を入れ替える。呼んでよいのは actions だけ。
   * @param {Country[]} countries
   */
  setCountries(countries) {
    this.#countries = countries;
  }

  /**
   * id から国を探す。見つからなければ undefined。
   * @param {string} countryId 例: "uk"
   * @returns {Country | undefined}
   */
  findCountry(countryId) {
    // ?. は、左が null / undefined のときに何もせず undefined を返す書き方（C# の ?. と同じ）
    return this.#countries?.find((c) => c.id === countryId);
  }
}
