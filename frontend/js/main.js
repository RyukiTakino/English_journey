/**
 * 起動・組み立て
 *
 * 層：（最外周。各層の部品を作ってつなぐ）
 * 担当：フロント
 *
 * ここでだけ「どの実装を使うか」を決める。ほかのファイルは実装の違いを知らない。
 */
import { EventBus, EVENTS } from "./application/events.js";
import { ApiClient } from "./infrastructure/api/ApiClient.js";
import { LocalApi } from "./infrastructure/api/LocalApi.js";
// import { HttpApi } from "./infrastructure/api/HttpApi.js";

// 出来事の通知係
const events = new EventBus();

// 通信の窓口。ここの1行を差し替えるだけで、モックと本物のサーバーを切り替えられる
// TODO(Backend): サーバーが動くようになったら、HttpApi に切り替えて動作確認する。
const api = new ApiClient(new LocalApi());
// const api = new ApiClient(new HttpApi("http://localhost:5000"));

// ----- 動作確認用。画面（Scene）を作ったら、ここは消す -----

// 「国の一覧を読み込んだ」という出来事を受け取って、画面に表示する
events.on(EVENTS.COUNTRIES_LOADED, (countries) => {
  document.getElementById("app").textContent = countries.map((c) => c.name).join(", ");
});

// API から国の一覧を取って、出来事として知らせる
api.getCountries().then((countries) => {
  events.emit(EVENTS.COUNTRIES_LOADED, countries);
});
