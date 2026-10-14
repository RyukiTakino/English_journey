# frontend（English journey のフロント）

素の JavaScript（ES Modules。ビルド不要）で作った、英語学習アプリのフロントです。
サーバー（バックエンド）が無くても、ブラウザの中のモック（`LocalApi`）で、全画面が動きます。

## 動かし方

ES Modules は `file://` では動かないので、ローカルサーバーで開きます。

```
cd frontend
python -m http.server 8800
```

ブラウザで http://localhost:8800/ を開きます。スマホで見るときは、同じ Wi-Fi の端末から `http://<PC の IP アドレス>:8800/` を開きます。

- 学習の記録は、ブラウザの localStorage（キー `english-journey.local.v1`）に保存されます。消したいときは、マイページの「学習記録をリセット」か、ブラウザの開発者ツールから削除します。
- 音（効果音・BGM）は、最初の操作（クリックなど）のあとに鳴り始めます（ブラウザの自動再生の制限のため）。

## 本物のサーバーにつなぐ

`js/main.js` の 2 行を切り替えます。

```js
const api = new ApiClient(new LocalApi());                          // モック（今）
// const api = new ApiClient(new HttpApi("http://localhost:5000")); // 本物のサーバー
```

URL と JSON の形は `js/infrastructure/api/ApiClient.js`（メソッドごとに URL と型を書いてあります）と `js/domain/models.js` です。
`TODO(API)` / `TODO(Backend)` と書いてある所が、API 担当・バックエンド担当への依頼です。

```
grep -rn "TODO(" frontend/js frontend/data
```

## フォルダ

```
frontend/
├── index.html
├── css/        tokens（色・余白の変数）/ base / layout / components / guide / scenes / scene-*（画面ごと）
├── data/seed.json        モックの初期教材（DB の 4 か国・12 か所。tools/data/make_seed.py で作る）
├── assets/
│   ├── images/           画像（切り出し済みの素材。一覧は assets/images/README.md）
│   ├── characters/       案内キャラクター（Live2D 風のモデル。表情ごと）
│   └── audio/            効果音（se/）と BGM（bgm/）。tools/audio/ の Python で作った
├── dev/guide-test.html   キャラクターと演出の確認ページ（アプリ本体からはリンクしない）
└── js/
    ├── main.js           起動・組み立て
    ├── domain/           定数・型・表示のための計算
    ├── application/      Store・events・actions（操作の処理）
    ├── infrastructure/   ApiClient / LocalApi / HttpApi / Sound / Settings
    ├── ui/               scenes（画面）/ components（部品）/ effects（演出）/ router
    └── vendor/live2d-rig.js   案内キャラクターを動かす自作のリグ（WebGL）
```

コードの書き方は `docs/frontend-guide.md`、何を作るかは `docs/requirements.md` を見てください。

## 素材を作り直したいとき

| 素材 | どこで | 使う道具 |
|---|---|---|
| 効果音・BGM | `tools/audio/` | Python（numpy・scipy・ffmpeg）。`README.md` 参照 |
| 画像（切り出し） | `tools/assets/slice_sheets.py` | Python（Pillow・scipy・opencv） |
| 案内キャラクター | `D:\WineEngine\Tools\Live2D` と `tools/live2d/soften_alpha.py` | `docs/character-prompt.md` 参照 |
| モックの教材 | `tools/data/make_seed.py` | Python |
| 画面の自動確認 | `tools/dev/browse.py` | Playwright |
