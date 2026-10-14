/**
 * 起動・組み立て
 *
 * 層：（最外周。各層の部品を作ってつなぐ）
 * 担当：フロント
 *
 * ここでだけ「どの実装を使うか」を決める。ほかのファイルは実装の違いを知らない。
 */
import { EventBus, EVENTS } from "./application/events.js";
import { Store } from "./application/store.js";
import { CatalogActions } from "./application/actions/CatalogActions.js";
import { ApiClient } from "./infrastructure/api/ApiClient.js";
import { LocalApi } from "./infrastructure/api/LocalApi.js";
// import { HttpApi } from "./infrastructure/api/HttpApi.js";

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

// ----- 動作確認用。画面（Scene）を作ったら、ここは消す -----

// 「国の一覧を読み込んだ」という出来事を受け取って、画面に表示する
events.on(EVENTS.COUNTRIES_LOADED, (countries) => {
  document.getElementById("app").textContent = countries.map((c) => c.name).join(", ");
});

// 操作を呼ぶ。通信に失敗したときは、エラーメッセージを表示する
actions.catalog.loadCountries().catch((e) => {
  document.getElementById("app").textContent = e.message;
});
