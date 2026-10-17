/**
 * 「できた API だけ本物のサーバー、残りはモック」の混在版 transport
 *
 * 層：infrastructure
 * 担当：フロント
 *
 * バックエンドは少しずつ出来上がっていく。出来た分だけを本物に切り替えられるように、
 * リクエストごとに「本物のサーバーに聞く」か「モック（LocalApi）に聞く」かを、ここで振り分ける。
 * サーバーに繋がらないとき（NETWORK / 502）は、自動でモックに切り替える。画面は、どちらが答えたかを知らない。
 *
 * ■ いま本物にしているもの（バックエンド担当が作った API。app.py）
 *   GET /api/countries          … 国の一覧（DB）。足りない項目（国コード・座標など）は、モックの値で補う
 *   GET /api/countries/{id}     … 国の詳細。説明文（info.extract）を、GET /api/article（Wikipedia の本文）から作る
 *
 * ■ 本物にする予定のもの（まだ無い API）は、REAL_ROUTES に足していく。
 *   足し方: 「メソッド 正規表現」と、結果をフロントの形に直す関数を書く。
 *
 * TODO(Backend): GET /api/countries に、code / region / lat / lng / color / tourOrder / capital / language / currency /
 *            phrase / description / trips を足す（DB の列を増やす）。そうなったら、ここの「モックで補う」処理は要らなくなる。
 *            キー名も camelCase（name / nameEn）にしてほしい（今は country_name_ja / country_name_en）。
 * TODO(Backend): GET /api/countries/{countryId}（国の詳細）と、国ごとの観光地の一覧 API を用意する。
 *            （database/queries.py の get_trips_by_country はあるが、URL が無い）
 */
import { ApiError } from "./ApiClient.js";
import { HttpApi } from "./HttpApi.js";
import { LocalApi } from "./LocalApi.js";

/**
 * 確認モード（mark）で、文字のままにしておくキー。
 * ID・区分・URL・日付など、画面の動きに必要で、「文章」ではないもの。これ以外の文字列が、モック由来なら "Test" になる。
 */
const KEEP_KEYS = new Set([
  "id", "tripId", "countryId", "refId", "code", "region", "color", "level", "category", "source", "imageKey", "wikiTitle",
  "createdAt", "earnedAt", "kind", "lang", "gradedBy", "sourceUrl", "url", "highlightWords", "pos"
]);

/**
 * モックが返した JSON の「文章」を、すべて "Test" に置き換えたコピーを返す。
 * 「どこまでが本物のサーバーから取れていて、どこからがモックか」を、画面で見分けるための開発用。
 * KEEP_KEYS のキーの値は、そのまま残す。数値・真偽値・null も、そのまま。
 */
function testify(value, key = "") {
  if (typeof value === "string") return KEEP_KEYS.has(key) ? value : "Test";
  if (Array.isArray(value)) return value.map((v) => testify(v, key));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, testify(v, k)]));
  return value;
}

/** 説明文の最大の長さ（Wikipedia の本文は長いので、最初の数文だけを使う） */
const EXTRACT_MAX = 420;

/**
 * Wikipedia の本文から、最初のまとまり（数文）を取り出す。
 * @param {string} content
 */
function firstParagraph(content) {
  const text = (content || "").split(/\n{1,}/).find((p) => p.trim().length > 60) ?? content ?? "";
  if (text.length <= EXTRACT_MAX) return text.trim();
  // 長すぎるときは、最大の長さの手前の文の終わりで切る
  const cut = text.slice(0, EXTRACT_MAX);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  return (end > 120 ? cut.slice(0, end + 1) : cut).trim();
}

export class HybridApi {
  #http;
  #local;
  /** サーバーに繋がるか。一度失敗したら、しばらくモックだけにする（毎回待たされないように） */
  #downUntil = 0;
  /** サーバーの国（id が数字）→ モックの国（id が "uk" など）の対応。国の一覧を読んだときに作る */
  #idMap = new Map();

  /** 確認モード：モック由来の文章を "Test" にする */
  #mark;
  /** サーバーが返した国（id は数字）。国の詳細で、本物の名前を使うために覚えておく。モックの id（"uk"）→ サーバーの国 */
  #serverCountry = new Map();

  /**
   * @param {string} [baseUrl] サーバーの URL。同じオリジンから配信するときは ""
   * @param {{mark?: boolean}} [options] mark: モック由来の文章を "Test" にする（どこが本物か見分けるための確認モード）
   */
  constructor(baseUrl = "", { mark = false } = {}) {
    this.#http = new HttpApi(baseUrl);
    this.#local = new LocalApi();
    this.#mark = mark;
  }

  /** 今、本物のサーバーを使っているか（開発用の表示に使える） */
  get usingServer() {
    return Date.now() >= this.#downUntil;
  }

  async request(method, path, body) {
    const route = method === "GET" ? this.#route(path) : null;
    if (route && this.usingServer) {
      try {
        return await route();
      } catch (e) {
        // Wikipedia検索・本文取得には同等のモックがないため、通信エラーは画面側へ返す。
        const pathname = new URL(path, "http://local").pathname;
        if (pathname === "/api/articles" || pathname === "/api/article") throw e;
        const noApi = e instanceof ApiError && /^HTTP_(404|405)$/.test(e.code);
        if (!(e instanceof ApiError) || noApi || e.code === "NETWORK" || e.status === 502 || e.status === 0 || e.status >= 500) {
          console.warn("[api] サーバーを使えないので、モックを使います:", e.message);
          this.#downUntil = Date.now() + 15000;
        } else {
          throw e;
        }
      }
    }
    const mock = await this.#local.request(method, path, body);
    return this.#mark ? testify(mock) : mock;
  }

  imageUrl(key, large) {
    return this.#local.imageUrl(key, large);
  }

  /** パスに対応する「本物の取得処理」を返す。本物にしていない API は null */
  #route(path) {
    const url = new URL(path, "http://local");
    const pathname = url.pathname;
    if (pathname === "/api/countries") return () => this.#countries();
    if (pathname === "/api/categories") return () => this.#categories();
    if (pathname === "/api/articles") {
      return () => this.#http.request("GET", path);
    }
    if (pathname === "/api/article") {
      return () => this.#http.request("GET", path);
    }
    if (pathname === "/api/regions") {
      return () => this.#http.request("GET", path);
    }
    const m = pathname.match(/^\/api\/countries\/([^/]+)$/);
    if (m) return () => this.#country(decodeURIComponent(m[1]));
    return null;
  }

  async #categories() {
    const server = await this.#http.request("GET", "/api/categories");
    return server.map((c) => ({ id: c.id, name: c.category_name_ja, nameEn: c.category_name_en }));
  }

  /** 国の一覧：サーバー（DB）の国を、モックの詳しいデータと合わせる */
  async #countries() {
    const [server, mock] = await Promise.all([this.#http.request("GET", "/api/countries"), this.#local.request("GET", "/api/countries")]);
    const byEn = new Map(mock.map((c) => [c.nameEn, c]));
    const list = server.map((s, i) => {
      // モックで補う部分（文章）は、確認モードでは "Test" にする。サーバーから取った値（id・name・nameEn）は、そのまま
      const base = this.#mark ? testify(byEn.get(s.country_name_en) ?? {}) : byEn.get(s.country_name_en) ?? {};
      this.#idMap.set(String(s.id), base.id);
      this.#serverCountry.set(base.id, s);
      return {
        // サーバーの値を優先し、無い項目（コード・座標など）はモックで補う
        ...base,
        id: base.id ?? String(s.id),
        name: s.country_name_ja,
        nameEn: s.country_name_en,
        code: base.code ?? s.country_name_en.slice(0, 2).toUpperCase(),
        region: base.region ?? "all",
        lat: base.lat ?? 20,
        lng: base.lng ?? 0,
        color: base.color ?? "#2f5d8a",
        tourOrder: base.tourOrder ?? i + 1,
        trips: base.trips ?? []
      };
    });
    return list.sort((a, b) => a.tourOrder - b.tourOrder);
  }

  /** 国の詳細：モックの詳細に、サーバー（Wikipedia）の説明文を重ねる */
  async #country(countryId) {
    let detail = await this.#local.request("GET", `/api/countries/${encodeURIComponent(countryId)}`);
    const real = this.#serverCountry.get(countryId);   // 国の一覧で、サーバーから取った名前
    if (this.#mark) {
      detail = testify(detail);
      if (real) {   // 名前は、サーバーから取れている（国の一覧の API）
        detail.name = real.country_name_ja;
        detail.nameEn = real.country_name_en;
      }
    }
    if (real) {
      try {
        const regions = await this.#http.request("GET", `/api/regions?country=${encodeURIComponent(real.country_name_ja)}`);
        detail.regions = regions.map((r) => ({ name: r.region_name_ja, nameEn: r.region_name_en }));
      } catch (e) {
        if (e instanceof ApiError && (e.code === "NETWORK" || e.status >= 500)) throw e;
      }
    }
    try {
      const article = await this.#http.request("GET", `/api/article?title=${encodeURIComponent(real?.country_name_en ?? detail.nameEn)}`);
      if (article?.content) {
        detail.info = { extract: firstParagraph(article.content), sourceUrl: article.url ?? null };
      }
      // 注意：確認モードで、国の詳細の title には、本物の名前（国の一覧の API）を使う。説明文は Wikipedia（/api/article）
    } catch (e) {
      // 説明文が取れなくても、国の詳細は出せる（モックの説明文のまま）。サーバーが落ちているときだけ、上に伝える
      if (e instanceof ApiError && (e.code === "NETWORK" || e.status >= 500)) throw e;
    }
    return detail;
  }
}
