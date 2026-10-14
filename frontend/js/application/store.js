/**
 * 今の状態の入れ物（ストア）
 *
 * 層：application
 * 担当：フロント
 *
 * 画面を作るのに必要なデータ（国の一覧、自分の学習記録など）を、1か所にまとめて持ちます。
 * 画面は、ここから読むだけにします。書き換えるのは actions（application/actions/）だけです。
 * こうしておくと「データを誰が変えたか」を追いかけやすくなります。
 *
 * ここは入れ物なので、通信はしません（通信は actions が ApiClient 経由で行い、結果をここに入れます）。
 * 状態が変わったことの通知も、ここでは行いません（events.js の EventBus で actions が知らせます）。
 *
 * （ゲーム開発でいう、GameState のようなデータだけを持つクラスに近いものです）
 */

/** @typedef {import("../domain/models.js").Country} Country */
/** @typedef {import("../domain/models.js").Me} Me */
/** @typedef {import("../domain/models.js").Badge} Badge */

export class Store {
  /**
   * 国の一覧。まだ読み込んでいないときは null、読み込み済みなら配列。
   * 「空の配列（国が0件）」と「まだ読み込んでいない」を区別するために null を使う。
   * （C# の List<Country>? に近い。未読み込みの null を画面側で判定して「読み込み中」を出せる）
   * @type {Country[] | null}
   */
  #countries = null;

  /**
   * 自分の情報と学習記録。まだ読み込んでいないときは null。
   * @type {Me | null}
   */
  #me = null;

  /**
   * バッジの一覧（まだ取っていないものも含む）。まだ読み込んでいないときは null。
   * @type {Badge[] | null}
   */
  #badges = null;

  /** 読み込み済みの国の一覧。未読み込みなら null */
  get countries() {
    return this.#countries;
  }

  /** 自分の学習記録。未読み込みなら null */
  get me() {
    return this.#me;
  }

  /** バッジの一覧。未読み込みなら null */
  get badges() {
    return this.#badges;
  }

  /**
   * 国の一覧を入れ替える。呼んでよいのは actions だけ。
   * @param {Country[]} countries
   */
  setCountries(countries) {
    this.#countries = countries;
  }

  /**
   * 学習記録を入れ替える。呼んでよいのは actions だけ。
   * @param {Me} me
   */
  setMe(me) {
    this.#me = me;
  }

  /**
   * バッジの一覧を入れ替える。呼んでよいのは actions だけ。
   * @param {Badge[]} badges
   */
  setBadges(badges) {
    this.#badges = badges;
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

  /**
   * id から記事（観光名所・文化）を探す。見つからなければ undefined。
   * @param {string} tripId 例: "bigben"
   * @returns {import("../domain/models.js").Trip | undefined}
   */
  findTrip(tripId) {
    return this.#countries?.flatMap((c) => c.trips).find((t) => t.id === tripId);
  }
}
