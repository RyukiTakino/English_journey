# frontend（English journey のフロント）

素の JavaScript（ES Modules。ビルド不要）で作った、英語学習アプリのフロントです。
サーバー（バックエンド）が無くても、ブラウザの中のモック（`LocalApi`）で、全画面が動きます。

## 動かし方（ビルドは不要）

素の JavaScript なので、**ビルドも `npm install` も要りません。** 静的なファイルを配信するだけです。
ES Modules は `file://` では動かないので、次のどちらかで、サーバー経由で開きます。

| 今いる場所 | コマンド |
|---|---|
| `frontend/` の中 | `python serve.py` |
| リポジトリの直下 | `python frontend/serve.py` |

どちらも、`http://localhost:8800/` で配信します。

ブラウザで http://localhost:8800/ を開きます。VS Code なら **F5**（`.vscode/` の設定。Edge で開く）でも同じです。

- **Python 3 だけが必要**です（追加のパッケージは不要）。
- `serve.py` は、`/api/` で始まる通信を、バックエンド（Flask。既定は `http://127.0.0.1:5000`）へ中継します（CORS の設定が要りません）。
  バックエンドを動かしていなければ、自動でモックに切り替わるので、**フロントだけでも全画面が動きます**。
- 単に `python -m http.server` でも開けます（その場合、バックエンドへの中継は無く、モックだけで動きます）。

### バックエンドもいっしょに動かす（本物のデータを見るとき）

```
pip install flask requests
python app.py                      # もう 1 つのターミナルで、リポジトリの直下から。http://127.0.0.1:5000
python frontend/serve.py           # フロント（frontend/ の中なら python serve.py）。/api/ は、上の Flask に中継される
```

画面の左下に赤い帯「API確認モード」が出て、**「Test」と表示される所がモック、それ以外の文章がサーバー（DB・Wikipedia）から取れた内容**です（`?mark=0` で消せます）。

- 学習の記録は、ブラウザの localStorage（キー `english-journey.local.v1`）に保存されます。消したいときは、マイページの「学習記録をリセット」か、ブラウザの開発者ツールから削除します。
- 音（効果音・BGM）は、最初の操作（クリックなど）のあとに鳴り始めます（ブラウザの自動再生の制限のため）。

## 本物のサーバーにつなぐ

URL の `?api=` で切り替えます（`js/main.js`）。

| URL | 動き |
|---|---|
| `http://localhost:8800/`（既定） | **hybrid**：できた API だけ本物のサーバー、残りはモック。サーバーが落ちていたら、自動でモック |
| `?api=local` | モックだけ（サーバー無しで全画面が動く） |
| `?api=http` | 本物のサーバーだけ（バックエンドが全部出来たら、これを既定にする） |

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
