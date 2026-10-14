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
import { ProfileActions } from "./application/actions/ProfileActions.js";
import { StudyActions } from "./application/actions/StudyActions.js";
import { WordActions } from "./application/actions/WordActions.js";
import { ApiClient } from "./infrastructure/api/ApiClient.js";
import { LocalApi } from "./infrastructure/api/LocalApi.js";
// import { HttpApi } from "./infrastructure/api/HttpApi.js";
import { Settings } from "./infrastructure/storage.js";
import { Sound } from "./infrastructure/sound.js";
import { Guide } from "./ui/components/Guide.js";
import { AppShell } from "./ui/components/AppShell.js";
import { Toast } from "./ui/components/Toast.js";
import { Modal } from "./ui/components/Modal.js";
import { Confetti } from "./ui/effects/Confetti.js";
import { EffectsDirector } from "./ui/effects/EffectsDirector.js";
import { RewardPresenter } from "./ui/effects/RewardPresenter.js";
import { Router } from "./ui/router.js";
import { HomeScene } from "./ui/scenes/HomeScene.js";
import { CountryScene } from "./ui/scenes/CountryScene.js";
import { ReadingScene } from "./ui/scenes/ReadingScene.js";
import { ListeningScene } from "./ui/scenes/ListeningScene.js";
import { MapScene } from "./ui/scenes/MapScene.js";
import { TourScene } from "./ui/scenes/TourScene.js";
import { WordsScene } from "./ui/scenes/WordsScene.js";
import { MyPageScene } from "./ui/scenes/MyPageScene.js";

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
const profile = new ProfileActions(api, store, events);
const actions = {
  catalog: new CatalogActions(api, store, events),
  profile,
  study: new StudyActions(api, events, profile),
  words: new WordActions(api, events, profile)
};

// 端末に保存する設定、音、案内キャラクター（どれもアプリ全体で1つだけ作る）
const settings = new Settings();
const sound = new Sound(settings);
const guide = new Guide(document.getElementById("guide"));
const toast = new Toast(document.getElementById("toast"));
const modal = new Modal();

// 画面に渡す道具一式。api は渡さない（画面は actions 経由で通信する）
const ctx = { store, events, actions, settings, sound, guide, toast, modal };

// ----- URL と画面の対応表。画面を増やすときは、ここに1行足す -----
// pattern は URL の # 以降に対する正規表現。() で囲んだ部分が、画面の params として渡される
//   例: #/country/uk なら、下の2つ目に一致して params = ["uk"]
// name は演出の切り替えに使う画面の種類（ui/effects/EffectsDirector.js の SCENES と対応）
const ROUTES = [
  { name: "home", pattern: /^\/$/, scene: HomeScene },
  { name: "country", pattern: /^\/country\/([^/]+)$/, scene: CountryScene },
  { name: "read", pattern: /^\/read\/([^/]+)$/, scene: ReadingScene },
  { name: "listen", pattern: /^\/listen\/([^/]+)$/, scene: ListeningScene },
  { name: "map", pattern: /^\/map$/, scene: MapScene },
  { name: "tour", pattern: /^\/tour$/, scene: TourScene },
  { name: "words", pattern: /^\/words$/, scene: WordsScene },
  { name: "me", pattern: /^\/me$/, scene: MyPageScene }
];

// 外枠（ナビ・学習の記録・音のボタン）
new AppShell(ctx, {
  nav: document.getElementById("nav"),
  tabbar: document.getElementById("tabbar"),
  hud: document.getElementById("hud"),
  sound: document.getElementById("sound-toggles")
}).start();

// 出来事を聞いて、音とキャラクターを動かす係
new EffectsDirector(events, sound, guide).start();

// スタンプ・バッジを獲得したときの、ウィンドウと紙吹雪
new RewardPresenter(ctx, modal, new Confetti(document.getElementById("fx-layer"))).start();

// キャラクターの描画を始める（読み込みを待たずに、画面の表示を先に進める）
guide.start();

new Router(ctx, ROUTES, document.getElementById("app")).start();
