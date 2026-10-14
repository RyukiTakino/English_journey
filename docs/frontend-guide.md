# フロントの作り方ガイド（コードを書く人向け）

`frontend/` のコードを書く・直すときの約束事です。設計の考え方は `docs/architecture.md`（プロトタイプ由来）、
何を作るかは `docs/requirements.md` を見てください。

## 1. 層と依存の向き

```
ui（画面・部品・演出） ──▶ application（Store・actions・events） ──▶ domain（定数・型・計算）
                                  ▲
                    infrastructure（ApiClient / LocalApi / HttpApi / Sound / Settings）
```

| 層 | フォルダ | ルール |
|---|---|---|
| ui | `js/ui/` | DOM を触るのはここだけ。**`fetch` しない**。サーバー由来の文字列は**必ず `esc()`** を通して HTML に入れる |
| application | `js/application/` | 操作の処理（actions）、状態（Store）、出来事（events）。画面から呼ばれる |
| domain | `js/domain/` | 定数・型（JSDoc）・表示のための計算。他のファイルを import しない |
| infrastructure | `js/infrastructure/` | サーバー・端末との接続。画面は直接触らず、actions 経由で使う |

- 採点・スタンプ・バッジの**判定はサーバー側**。フロントは結果を見せるだけ。
- 演出（音・キャラクター・紙吹雪）は**出来事（`ctx.events.emit(...)`）を知らせるだけ**で、直接呼ばない。

## 2. 画面（Scene）の書き方

`js/ui/scenes/BaseScene.js` を継承します。Router が `load → render → mount → unmount` の順に呼びます。

```js
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";

export class SomeScene extends BaseScene {
  #data = null;                          // load で取ったデータ（# 付きは private）
  async load() {                         // データを取る。例外を投げると Router がエラー表示にする
    const [tripId] = this.params;        // URL の () の部分（例: #/read/bigben → "bigben"）
    this.#data = await this.ctx.actions.study.openLesson(tripId);
  }
  render() {                             // HTML の「文字列」を返す。Store から読むだけにする
    return `<h1>${esc(this.#data.article.title)}</h1>`;
  }
  mount(root) {                          // HTML が入ったあとに呼ばれる。イベントを付ける
    root.querySelector("button")?.addEventListener("click", () => { /* ... */ });
    this.onCleanup(this.ctx.events.on(EVENTS.XXX, () => { /* ... */ }));  // 画面を離れるとき自動で解除
  }
}
```

- **`ctx`**（`this.ctx`）= `{ store, events, actions, settings, sound, guide, toast, modal }`。`api` は無い（通信は actions 経由）。
- 画面を足したら `js/main.js` の `ROUTES` に 1 行（`name` は演出の切り替えに使う種類名。`ui/effects/EffectsDirector.js` の `SCENES` も参照）。
- 写真を出すとき: `<div data-photo="${esc(trip.imageKey)}">` を置き、`mount()` で `hydratePhotos(root, this.ctx)`（`js/ui/assets.js`）。
- 画面の中で `innerHTML` を書き換えるときは、新しく入れた要素にイベントを付け直すこと。

## 3. 使える道具

### ctx.actions（`js/application/actions/`）

| まとまり | メソッド |
|---|---|
| `catalog` | `loadCountries()` → `Country[]`（Store に入る）／`getCountry(id)` → `CountryDetail`／`photoUrl(key, large?)` |
| `profile` | `loadMe(force?)` → `Me`／`loadBadges(force?)` → `Badge[]`／`updateProfile({displayName?, level?})`／`toggleWant(tripId)`／`resetProgress()`／`applyRewards(rewards)` |
| `study` | `openLesson(tripId)` → `Lesson`／`submitLesson(lesson, answers, summary?)` → `GradeResult`／`openNews(countryId)` → `NewsItem`／`submitNews(news, answers)` → `GradeResult` |
| `words` | `lookup(word)` → `{word,pos,meaning,lang}`／`list()` → `SavedWord[]`／`save(word)`／`remove(word)` |

`submitLesson` / `submitNews` は、内部で「採点 → 学習記録の読み直し → スタンプ・バッジの出来事 → `GRADED` の出来事」まで行います。画面は結果（`GradeResult`）を表示するだけです。

### ctx.store（読むだけ）

`countries`（`Country[]|null`）／`me`（`Me|null`）／`badges`（`Badge[]|null`）／`findCountry(id)`／`findTrip(id)`。
**画面の `load()` で、使う分を先に読み込む**（`await this.ctx.actions.catalog.loadCountries()` など）。書き換えるのは actions だけ。

### 出来事（`js/application/events.js` の `EVENTS`）

画面から知らせるもの: `ANSWER_SELECTED`（選択肢を選んだ）、`HINT_OPENED`（ヒントを開いた）。
`ctx.events.emit(EVENTS.ANSWER_SELECTED, { questionIndex, choiceIndex })` のように呼ぶだけで、効果音が鳴ります。
（`GRADED` / `STAMP_EARNED` / `BADGE_EARNED` / `WORD_SAVED` は actions が知らせるので、画面は emit しない）

### 部品（`js/ui/components/`・`js/ui/assets.js`）

| 道具 | 使い方 |
|---|---|
| `esc(v)` / `formatDate(s)` / `tokenize(text, highlightSet)` | `html.js`。`tokenize` は英文を単語ごとの `<span class="w" data-word>` に分ける（辞書にある語には `kw`） |
| `icon(name, size)` | `icons.js`。小さな SVG（check, back, next, close, pin, heart, play, pause, flame, stamp, medal, lock, star, volume, mute, music, bulb, refresh, plus, trash） |
| `img(path, {alt, cls, width, height})` / `imageUrl(path)` | `assets.js`。`assets/images/` の画像（一覧は `frontend/assets/images/README.md`） |
| `countryCard` / `tripCard` / `newsCard` / `categoryChip` | `cards.js` |
| `badgeView(badge, {size, showText})` / `stampView(country, {earnedAt, size})` | `BadgeView.js` / `StampView.js` |
| `loadingView` / `errorView` / `emptyView` | `states.js` |
| `ctx.modal.open(html, {cls, onMount})` → 閉じたら解決する Promise／`ctx.toast.show(text)` | `Modal.js` / `Toast.js` |
| `ctx.guide.say(text)` / `ctx.guide.react("happy"\|"sad")` / `ctx.guide.setMode(...)` | `Guide.js`（案内キャラクター。通常は EffectsDirector が自動で動かす） |
| `ctx.sound.play(SE.xxx)` | 通常は直接呼ばない（ボタンのクリック音は自動） |

### domain

`domain/constants.js`（`LEVELS`, `CATEGORY`, `REGIONS`, `COUNTRY_CARD_IMAGES`, `COUNTRY_STAMP_IMAGES`, `BADGE_IMAGES`, `APP_NAME`, `STAMP_RULE_TEXT`）、
`domain/models.js`（型）、`domain/progress.js`（`tourStops`, `nextStop`, `lastVisited`, `stampsById`, `isDone`, `accuracy`, `findTrip`, `resultHeadline`）。

## 4. 見た目（CSS）

- **色・余白・角丸は `css/tokens.css` の変数**（`var(--primary)` など）を使う。直接の値は書かない。
- 共通の部品のクラスは `css/components.css`（`.btn` `.btn--ghost` `.card` `.chip` `.grid` `.pill` `.state` `.modal` `.badge` `.stamp` など）。
- **画面ごとの CSS は、担当のファイルにだけ書く**（`css/scene-world.css` / `scene-study.css` / `scene-me.css`）。
  クラス名は画面名で始める（例: `.reading-article`、`.map-filter`）。共通ファイル（tokens / base / layout / components / guide / scenes.css）は、勝手に直さない。
- スマホ（幅 360〜500px）を先に考える。`@media (min-width: 761px)` で PC に広げる。タブバーは 761px 未満で出る。
- `prefers-reduced-motion` のときは動きを止める。
- 英文の記事は `font-family: var(--serif)`。

## 5. コメントの書き方

- ファイルの先頭に「役割・層・担当」を書く。
- **日本語で、多めに**。なぜそうしたか（理由）を書く。C# / C++ の経験者が読むので、JS 特有の挙動（参照渡し、`?.`、`async`、クロージャなど）が出るところは一言説明を添える。
- **他の担当にしてほしいこと**は `TODO(API): …` / `TODO(Backend): …`（フロントの未実装は `TODO(フロント): …`）。

## 6. 動作確認

- アプリは `http://localhost:8800/index.html#/` で見る（`frontend/` を `python -m http.server 8800` で配信済みのことが多い。使えなければ起動する）。
- 自動操作: `tools/dev/browse.py`（Playwright）。JSON の手順（goto / click / fill / wait / shot / eval）でクリックまで確認して、スクリーンショットとコンソールエラーを取る。
  ```
  BROWSE_OUT=<出力フォルダ> python tools/dev/browse.py steps.json
  ```
- **スクリーンショットは必ず目で確認する**（PC 幅 1200 と スマホ幅 390 の両方）。崩れ・文字の折れ・はみ出し・コントラスト不足を探す。
- コンソールにエラーが出ていないこと。
