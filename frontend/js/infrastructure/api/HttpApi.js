/**
 * バックエンドのサーバーに fetch で問い合わせる transport（本番用）
 *
 * 層：infrastructure
 * 担当：フロント
 *
 * ApiClient から request(method, path, body) で呼ばれ、JSON を返します。
 * エラーのときは、サーバーが返す { "error": { "code": ..., "message": ... } } を ApiError にして投げます。
 *
 * TODO(Backend): エラー時のレスポンスを { "error": { "code": "...", "message": "..." } } の形に揃える。
 *            message は、そのまま画面に出せる日本語にする。
 */
import { ApiError } from "./ApiClient.js";

export class HttpApi {
  /**
   * @param {string} baseUrl サーバーの URL。例: "http://localhost:5000"
   *                         同じサーバーからフロントも配信するときは "" でよい
   *
   * TODO(Backend): 開発時の URL（ポート番号）を決めて、フロントに伝える。
   *            別のポートから呼ぶので、CORS（別オリジンからのアクセス許可）の設定も必要。
   */
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * サーバーにリクエストを送り、JSON を返す。
   * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} method
   * @param {string} path 例: "/api/countries"
   * @param {object} [body] 送る JSON（GET のときは不要）
   * @returns {Promise<any>} 返ってきた JSON。中身のない成功（204）のときは null
   * @throws {ApiError} 通信できないとき、またはサーバーがエラーを返したとき
   */
  async request(method, path, body) {
    let res;
    try {
      res = await fetch(this.baseUrl + path, {
        method,
        // body があるときだけ、JSON を送ると伝えるヘッダーを付ける
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      // サーバーが落ちている、ネットワークが無い、など（HTTP の返事すら来なかった）
      throw new ApiError("NETWORK", "サーバーに接続できません。通信状況を確認してください。", 0);
    }

    // 204 は「成功したが返す中身は無い」。JSON として読むとエラーになるので先に返す
    if (res.status === 204) return null;

    // JSON として読めなかったときは空のオブジェクトにして、下のエラー処理に流す
    const data = await res.json().catch(() => ({}));

    // 200 番台以外はエラー。サーバーが返したエラー内容を ApiError にして投げる
    if (!res.ok) {
      const err = data.error || {};
      const message = typeof err === "string" ? err : err.message;
      throw new ApiError(
        typeof err === "string" ? `HTTP_${res.status}` : err.code || `HTTP_${res.status}`,
        message || `エラーが発生しました（${res.status}）`,
        res.status
      );
    }
    return data;
  }

  /**
   * 観光地の画像の URL。サーバーが Wikipedia の画像へ転送してくれる。
   * @param {string} key
   * @param {boolean} large
   * @returns {Promise<string>}
   *
   * TODO(Backend): GET /api/images?key=…&size=large を用意する。
   */
  async imageUrl(key, large) {
    return `${this.baseUrl}/api/images?key=${encodeURIComponent(key)}${large ? "&size=large" : ""}`;
  }
}
