/**
 * 「できた API だけ本物のサーバー、残りはモック」の混在版 transport
 *
 * 層：infrastructure
 * 担当：フロント
 */

import { ApiError } from "./ApiClient.js";
import { HttpApi } from "./HttpApi.js";
import { LocalApi } from "./LocalApi.js";

const KEEP_KEYS = new Set([
  "id", "tripId", "countryId", "refId", "code", "region", "color",
  "level", "category", "source", "imageKey", "wikiTitle",
  "createdAt", "earnedAt", "kind", "lang", "gradedBy",
  "sourceUrl", "url", "highlightWords", "pos"
]);

function testify(value, key = "") {
  if (typeof value === "string") {
    return KEEP_KEYS.has(key) ? value : "Test";
  }

  if (Array.isArray(value)) {
    return value.map((v) => testify(v, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, testify(v, k)])
    );
  }

  return value;
}

const EXTRACT_MAX = 420;

function firstParagraph(content) {
  const text =
    (content || "").split(/\n{1,}/).find((p) => p.trim().length > 60) ??
    content ??
    "";

  if (text.length <= EXTRACT_MAX) {
    return text.trim();
  }

  const cut = text.slice(0, EXTRACT_MAX);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));

  return (end > 120 ? cut.slice(0, end + 1) : cut).trim();
}

export class HybridApi {
  #http;
  #local;
  #downUntil = 0;
  #idMap = new Map();
  #mark;
  #serverCountry = new Map();

  constructor(baseUrl = "", { mark = false } = {}) {
    this.#http = new HttpApi(baseUrl);
    this.#local = new LocalApi();
    this.#mark = mark;
  }

  get usingServer() {
    return Date.now() >= this.#downUntil;
  }

  async request(method, path, body) {
    const pathname = new URL(path, "http://local").pathname;

    // YouTube APIはPOSTでも本物のサーバーへ直接送信する
    const youtubeRoutes = [
      "/api/youtube/analyze",
      "/api/youtube/quiz",
      "/api/youtube/summary/grade",
    ];

    if (method === "GET" && pathname === "/api/youtube/news") {
      return this.#http.request(method, path, body);
    }

    if (method === "POST" && youtubeRoutes.includes(pathname)) {
      return this.#http.request(method, path, body);
    }

    const route = method === "GET" ? this.#route(path) : null;

    if (route && this.usingServer) {
      try {
        return await route();
      } catch (e) {
        // Wikipedia検索・本文取得には同等のモックがないため、通信エラーは画面側へ返す
        if (pathname === "/api/articles" || pathname === "/api/article") {
          throw e;
        }

        const noApi =
          e instanceof ApiError && /^HTTP_(404|405)$/.test(e.code);

        if (
          !(e instanceof ApiError) ||
          noApi ||
          e.code === "NETWORK" ||
          e.status === 502 ||
          e.status === 0 ||
          e.status >= 500
        ) {
          console.warn(
            "[api] サーバーを使えないので、モックを使います:",
            e.message
          );

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

  #route(path) {
    const url = new URL(path, "http://local");
    const pathname = url.pathname;

    if (pathname === "/api/countries") {
      return () => this.#countries();
    }

    if (pathname === "/api/categories") {
      return () => this.#categories();
    }

    if (pathname === "/api/articles") {
      return () => this.#http.request("GET", path);
    }

    if (pathname === "/api/article") {
      return () => this.#http.request("GET", path);
    }

    if (pathname === "/api/regions") {
      return () => this.#http.request("GET", path);
    }

    const match = pathname.match(/^\/api\/countries\/([^/]+)$/);

    if (match) {
      return () => this.#country(decodeURIComponent(match[1]));
    }

    return null;
  }

  async #categories() {
    const server = await this.#http.request("GET", "/api/categories");

    return server.map((c) => ({
      id: c.id,
      name: c.category_name_ja,
      nameEn: c.category_name_en,
    }));
  }

  async #countries() {
    const [server, mock] = await Promise.all([
      this.#http.request("GET", "/api/countries"),
      this.#local.request("GET", "/api/countries"),
    ]);

    const byEn = new Map(mock.map((c) => [c.nameEn, c]));

    const list = server.map((s, i) => {
      const mockCountry = byEn.get(s.country_name_en) ?? {};
      const base = this.#mark ? testify(mockCountry) : mockCountry;

      this.#idMap.set(String(s.id), base.id);
      this.#serverCountry.set(base.id, s);

      return {
        ...base,
        id: base.id ?? String(s.id),
        name: s.country_name_ja,
        nameEn: s.country_name_en,
        code:
          base.code ??
          s.country_name_en.slice(0, 2).toUpperCase(),
        region: base.region ?? "all",
        lat: base.lat ?? 20,
        lng: base.lng ?? 0,
        color: base.color ?? "#2f5d8a",
        tourOrder: base.tourOrder ?? i + 1,
        trips: base.trips ?? [],
      };
    });

    return list.sort((a, b) => a.tourOrder - b.tourOrder);
  }

  async #country(countryId) {
    let detail = await this.#local.request(
      "GET",
      `/api/countries/${encodeURIComponent(countryId)}`
    );

    const real = this.#serverCountry.get(countryId);

    if (this.#mark) {
      detail = testify(detail);

      if (real) {
        detail.name = real.country_name_ja;
        detail.nameEn = real.country_name_en;
      }
    }

    if (real) {
      try {
        const regions = await this.#http.request(
          "GET",
          `/api/regions?country=${encodeURIComponent(real.country_name_ja)}`
        );

        detail.regions = regions.map((r) => ({
          name: r.region_name_ja,
          nameEn: r.region_name_en,
        }));
      } catch (e) {
        if (
          e instanceof ApiError &&
          (e.code === "NETWORK" || e.status >= 500)
        ) {
          throw e;
        }
      }
    }

    try {
      const article = await this.#http.request(
        "GET",
        `/api/article?title=${encodeURIComponent(
          real?.country_name_en ?? detail.nameEn
        )}`
      );

      if (article?.content) {
        detail.info = {
          extract: firstParagraph(article.content),
          sourceUrl: article.url ?? null,
        };
      }
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.code === "NETWORK" || e.status >= 500)
      ) {
        throw e;
      }
    }

    return detail;
  }
}