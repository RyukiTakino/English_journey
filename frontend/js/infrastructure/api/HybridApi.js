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

  /** @param {string} [baseUrl] サーバーの URL。同じオリジンから配信するときは "" */
  constructor(baseUrl = "") {
    this.#http = new HttpApi(baseUrl);
    this.#local = new LocalApi();
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
        // サーバーが落ちている・繋がらない → モックにまかせる。サーバーが「NOT_FOUND」などを返したときは、そのまま伝える
        if (!(e instanceof ApiError) || e.code === "NETWORK" || e.status === 502 || e.status === 0 || e.status >= 500) {
          console.warn("[api] サーバーを使えないので、モックを使います:", e.message);
          this.#downUntil = Date.now() + 15000;
        } else {
          throw e;
        }
      }
    }
    return this.#local.request(method, path, body);
  }

  imageUrl(key, large) {
    return this.#local.imageUrl(key, large);
  }

  /** パスに対応する「本物の取得処理」を返す。本物にしていない API は null */
  #route(path) {
    if (path === "/api/countries") return () => this.#countries();
    const m = path.match(/^\/api\/countries\/([^/]+)$/);
    if (m) return () => this.#country(decodeURIComponent(m[1]));
    return null;
  }

  /** 国の一覧：サーバー（DB）の国を、モックの詳しいデータと合わせる */
  async #countries() {
    const [server, mock] = await Promise.all([this.#http.request("GET", "/api/countries"), this.#local.request("GET", "/api/countries")]);
    const byEn = new Map(mock.map((c) => [c.nameEn, c]));
    const list = server.map((s, i) => {
      const base = byEn.get(s.country_name_en) ?? {};
      this.#idMap.set(String(s.id), base.id);
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
    const detail = await this.#local.request("GET", `/api/countries/${encodeURIComponent(countryId)}`);
    try {
      const article = await this.#http.request("GET", `/api/article?title=${encodeURIComponent(detail.nameEn)}`);
      if (article?.content) {
        detail.info = { extract: firstParagraph(article.content), sourceUrl: article.url ?? null };
      }
    } catch (e) {
      // 説明文が取れなくても、国の詳細は出せる（モックの説明文のまま）。サーバーが落ちているときだけ、上に伝える
      if (e instanceof ApiError && (e.code === "NETWORK" || e.status >= 500)) throw e;
    }
    return detail;
  }
}
