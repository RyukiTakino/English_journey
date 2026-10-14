/**
 * 起動・組み立て
 *
 * 層：（最外周。各層の部品を作ってつなぐ）
 * 担当：フロント
 *
 * ここでだけ「どの実装を使うか」を決める。ほかのファイルは実装の違いを知らない。
 */
import { EventBus } from "./application/events.js";
import { Store } from "./application/store.js";
import { CatalogActions } from "./application/actions/CatalogActions.js";
import { ApiClient } from "./infrastructure/api/ApiClient.js";
import { LocalApi } from "./infrastructure/api/LocalApi.js";
// import { HttpApi } from "./infrastructure/api/HttpApi.js";
import { Router } from "./ui/router.js";
import { HomeScene } from "./ui/scenes/HomeScene.js";

// ----- 部品を作る（C# でいう DI コンテナの手動版） -----

// 出来事の通知係
const events = new EventBus();

// 今の状態の入れ物
const store = new Store();

// 通信の窓口。ここの1行を差し替えるだけで、モックと本物のサーバーを切り替えられる
// TODO(Backend): サーバーが動くようになったら、HttpApi に切り替えて動作確認する。
const api = new ApiClient(new LocalApi());
// const api = new ApiClient(new HttpApi("http://localhost:5000"));

// 操作の処理。必要な道具をここで渡す
const actions = {
  catalog: new CatalogActions(api, store, events)
};

// 画面に渡す道具一式。api は渡さない（画面は actions 経由で通信する）
const ctx = { store, events, actions };

// ----- URL と画面の対応表。画面を増やすときは、ここに1行足す -----
// pattern は URL の # 以降に対する正規表現。() で囲んだ部分が、画面の params として渡される
//   例: { pattern: /^\/country\/([^/]+)$/, scene: CountryScene }  → #/country/uk で params = ["uk"]
const ROUTES = [
  { pattern: /^\/$/, scene: HomeScene }
];

new Router(ctx, ROUTES, document.getElementById("app")).start();
