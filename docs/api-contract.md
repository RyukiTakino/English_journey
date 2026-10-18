# API の約束（フロント ⇔ バックエンド）

フロントは、この形の API を呼びます。いまは、ブラウザの中のモック（`frontend/js/infrastructure/api/LocalApi.js`）が同じ形で動いているので、
**本物のサーバーを作るときは、この文書とモックの返す JSON に合わせてください**。形を変えたいときは、フロントに知らせてください（モックと型を直します）。

- URL の呼び出し側: `frontend/js/infrastructure/api/ApiClient.js`（メソッドごとに URL・型・`TODO` を書いてあります）
- 型の定義: `frontend/js/domain/models.js`
- 切り替え方: `frontend/js/main.js` の `new ApiClient(new LocalApi())` を `new ApiClient(new HttpApi("http://localhost:5000"))` にする

## 共通のルール

| 項目 | ルール |
|---|---|
| URL | すべて `/api/` から始める。名詞で表す |
| JSON のキー | `camelCase` |
| ログイン | **今は無い**（要件定義書「9. 未決事項」#1）。「誰の学習記録か」の決め方は 3 人で決める |
| 日付 | 日付は `"2026-10-14"`、日時は `"2026-10-14T20:15:00"` |
| 中身のない成功 | `204`（本文なし） |
| エラー | `{ "error": { "code": "NOT_FOUND", "message": "国が見つかりません。" } }`。`message` は、そのまま画面に出せる日本語 |
| 答え | 問題を返すときは、正解（`answer`）と解説（`explanation`）を**含めない**。採点結果で初めて返す |
| 報酬 | 採点などで新しく手に入ったスタンプ・バッジは `rewards` に入れて返す（フロントは、これを見て演出を出す） |
| CORS | フロントは別のポートから呼ぶので、開発中は CORS を許可する |
| 外部 API | キーが無い・失敗したときは、手書きの教材（seed）に自動で切り替える |

エラーの `code` の一覧は未決です（今使っているのは `NOT_FOUND` / `INVALID_WORD` / `NETWORK`（フロントの通信失敗））。

## エンドポイント一覧

| まとまり | メソッドと URL | 送る | 返る |
|---|---|---|---|
| その他 | `GET /api/status` | | `{ gemini, youtube }`（どちらも boolean） |
| 自分 | `GET /api/me` | | `Me` |
| | `PATCH /api/me` | `{ displayName?, level? }` | `{ ok: true }` |
| | `DELETE /api/me/progress` | | 204。スタンプ・履歴・単語帳・行きたい・バッジを消す |
| | `GET /api/badges` | | `Badge[]`（まだ取っていないものも含む） |
| 国 | `GET /api/countries` | | `Country[]`（`trips` を含む。世界一周の順） |
| | `GET /api/countries/{countryId}` | | `Country` ＋ `info: { extract, sourceUrl }` |
| | `GET /api/images?key=…&size=large` | | Wikipedia の画像へリダイレクト |
| 行きたい | `PUT /api/wants/{tripId}` | | 204（何度呼んでも同じ結果） |
| | `DELETE /api/wants/{tripId}` | | 204 |
| リーディング | `GET /api/trips/{tripId}/lesson` | | `Lesson`（答えと解説は含まない） |
| | `POST /api/lessons/{lessonId}/grade` | `{ answers: (number\|null)[], summary: { text, lang } \| null }` | `GradeResult` |
| リスニング | `GET /api/countries/{countryId}/news` | | `NewsItem` |
| | `POST /api/news/{newsId}/grade` | `{ answers: (number\|null)[] }` | `GradeResult`（`summary` は null） |
| 単語 | `GET /api/words/lookup?word=…` | | `{ word, pos, meaning, lang }`。`lang` は `"ja"`／英英辞書なら `"en"`／見つからなければ `""` |
| | `GET /api/words` | | `SavedWord[]` |
| | `POST /api/words` | `{ word, pos, meaning, source }` | `{ ok: true, rewards }`（単語数のバッジが取れることがある） |
| | `DELETE /api/words/{word}` | | 204 |

## 主な JSON の形

```jsonc
// Country（GET /api/countries の 1 件）
{
  "id": "uk", "name": "イギリス", "nameEn": "United Kingdom", "code": "GB",
  "region": "europe", "lat": 52.5, "lng": -1.5, "color": "#2f5d8a", "tourOrder": 1,
  "capital": "ロンドン", "language": "英語", "currency": "ポンド",
  "phrase": { "local": "Cheers!", "ja": "ありがとう／乾杯（カジュアルな言い方）" },
  "description": "…",
  "trips": [
    { "id": "bigben", "countryId": "uk", "name": "ビッグ・ベン", "nameEn": "Big Ben",
      "category": "sight", "city": "ロンドン", "tip": "…（旅のメモ）", "description": "…",
      "level": "A2", "minutes": 4, "imageKey": "Big_Ben" }
  ]
}

// Me（GET /api/me）
{ "user": { "displayName": "たびびと", "level": "B1" },
  "stamps": [{ "countryId": "uk", "earnedAt": "2026-10-14" }],
  "wants": ["eiffel"],
  "history": [{ "kind": "read", "refId": "bigben", "countryId": "uk", "title": "ビッグ・ベン",
                "correct": 2, "total": 3, "summaryScore": 72, "createdAt": "2026-10-14T20:15:00" }],
  "streak": 3, "wordCount": 12, "badgeCount": 2 }

// Lesson（GET /api/trips/{tripId}/lesson）
{ "id": "bigben", "tripId": "bigben", "source": "seed", "level": "A2",
  "article": { "title": "…", "paragraphs": ["…", "…"] },
  "questions": [{ "text": "…", "choices": ["…", "…", "…", "…"], "hint": "…" }],
  "highlightWords": ["famous", "tradition"], "canRegenerate": false }

// GradeResult（採点）
{ "correct": 2, "total": 3,
  "results": [{ "correct": true, "answer": 1, "chosen": 1, "explanation": "…" }],
  "summary": { "score": 72, "gradedBy": "keyword", "good": [], "improve": [], "rewrite": "",
               "matchedKeywords": [], "missedKeywords": [], "modelSummary": "…" },
  "rewards": { "stamp": { "countryId": "uk", "earnedAt": "2026-10-14" },
               "badges": [{ "id": "perfect", "name": "全問正解", "description": "…", "earnedAt": "…" }] },
  "streak": 3 }
```

`NewsItem` と `Badge`、`SavedWord` の形は `frontend/js/domain/models.js` を見てください。

## ゲームのルール（サーバーの仕事）

フロントのモックが今やっている通りのルールです。サーバー側の仕様と違う場合は、相談してください。

| ルール | 内容 |
|---|---|
| スタンプ | 1 回の採点で**正答率 6 割以上**のとき、その国のスタンプがまだ無ければ与える（`STAMP_RATE = 0.6`） |
| 連続学習日数 | 今日（無ければ昨日）からさかのぼって、毎日学習した日数 |
| バッジ | 下の表。条件を満たしたとき、採点・単語保存の直後に判定して `rewards.badges` に入れる |
| 答えの扱い | 問題の取得（`lesson`・`news`）では `answer` と `explanation` を返さない |
| 選択肢の並び | 手書き教材は正解の位置が偏るので、記事 ID から決まる並び順に入れ替える（毎回同じ並び） |

| バッジ id | 名前 | 条件 |
|---|---|---|
| first-step | はじめの一歩 | はじめて問題を解いた |
| perfect | 全問正解 | 1 回の学習で全問正解した |
| streak | 3日続けて | 3 日続けて学習した |
| words | 単語コレクター | 単語帳に 10 語保存した |
| listener | 聞き取り上手 | ニュースを 3 本クリアした（6 割以上） |
| reader | 読書家 | 記事を 3 本クリアした（6 割以上） |
| explorer | 3か国の旅人 | 3 か国のスタンプを集めた |
| world-tour | 世界一周 | すべての国のスタンプを集めた |

> DB には「文化」の記事が無い（観光名所だけ）ので、プロトタイプの「文化に詳しい」バッジは、記事を 3 本クリアする「読書家」に変えています。

## DB との対応（いまのモックの教材）

`database/insert_countries.py` と `insert_trips.py` にある **4 か国・12 か所**だけを、画面に出しています。

| DB | API の項目 |
|---|---|
| `countries.country_name_ja` / `country_name_en` | `Country.name` / `nameEn` |
| `trips.trip_name_ja` / `trip_name_en` | `Trip.name` / `nameEn` |
| `trips.wiki_page_title` | 画像の取得と、説明文（`info`）の取得に使う |

DB に無い項目（`code`・`region`・`lat`・`lng`・`color`・`tourOrder`・`capital` など、`Trip` の `city`・`tip`・`level`・`minutes`）は、
今は `frontend/data/seed.json` の手書きの値です（`tools/data/make_seed.py` で作っています）。
**TODO(Backend)**: これらの列を DB に足すか、別の取得元（Wikipedia など）を決める。
**TODO(API)**: 記事・問題・ニュースを、Wikipedia と Gemini から作る（作れないときは seed の手書き教材）。


## 結合の状況（2026-10-17 更新）

フロントは、`frontend/js/infrastructure/api/HybridApi.js` で「できた API だけ本物、残りはモック」の混在版にしています
（`?api=local|hybrid|http` で切り替え。既定は `hybrid`。サーバーが落ちているときは、自動でモックに戻る）。
画面の左下の帯で、**「Test」と表示される所がモック、それ以外がサーバーから取れた内容**です。

| 機能 | 本物のサーバー | 状態 |
|---|---|---|
| `GET /api/countries`（国の一覧） | `app.py`（DB の `countries`） | **結合済み**。返す形がフロントと違うので、フロントで変換し、足りない項目（国コード・座標など）はモックで補っている |
| `GET /api/countries/{id}` の説明文 | `GET /api/article?title=`（Wikipedia） | **結合済み** |
| 国の **地域（都市）** | `GET /api/regions?country=`（DB の `regions`） | **結合済み**（国の詳細の「主な地域」） |
| **カテゴリ**（食事・建築・文化） | `GET /api/categories`（DB の `categories`） | **結合済み**（国の詳細の「記事のカテゴリ」） |
| `GET /api/articles`（Wikipedia の記事検索） | `app.py` | まだ使っていない |
| 国ごとの記事の一覧 | DB の `trips` は**廃止**された（地域×カテゴリに変更） | **未結合**。今の記事一覧は、モックの観光地 |
| 記事の本文・問題・採点、ニュース、単語、行きたい、学習記録、スタンプ・バッジ | まだ無い | **未結合**（モックが代わりに動作） |

### DB の更新（2026-10-17）に伴う変更点

- `trips`（観光地）テーブルは廃止され、`regions`（国ごとの都市）と `categories`（食事・建築・文化）が追加された。
- `database/english.db` は、git の管理から外れた。**各自、次の順で作る**（リポジトリの直下で）:
  ```
  py database/init_db.py
  py database/insert_countries.py
  py database/insert_regions.py
  py database/insert_categories.py
  ```
- `app.py` に、`GET /api/regions?country=<国名（日本語）>` と `GET /api/categories` を追加した（`database/queries.py` の関数を呼ぶだけ）。

### バックエンド担当へのお願い（`TODO(Backend)`）

1. `GET /api/countries` の返す形を、上の「Country」の形にする（`name` / `nameEn` / `code` / `region` / `lat` / `lng` / `color` / `tourOrder` / `capital` / `language` / `currency` / `phrase` / `description`）。キーは camelCase に。
2. `/api/regions` と `/api/categories` のキーも camelCase（`name` / `nameEn`）にしてほしい（今は `region_name_ja` など。フロントで変換している）。
3. **記事の一覧**：廃止した `trips` の代わりに、「国 × 地域 × カテゴリ」で記事（`Trip` の形）を返す API。
4. 記事（`/api/trips/{id}/lesson`）と採点（`/api/lessons/{id}/grade`）。

### 開発のやり方

- 開発サーバー（`frontend/serve.py`）が、`/api/` をバックエンド（既定は `http://127.0.0.1:5000`）へ中継します。CORS の設定は要りません。
- 初回セットアップ: `py -m venv .venv` のあと、`.venv\Scripts\python -m pip install flask requests openai python-dotenv google-genai`。
- バックエンドの起動: リポジトリの直下で `.venv\Scripts\python app.py`。
