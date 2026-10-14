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
