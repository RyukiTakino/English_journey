/**
 * データの形（API が返す JSON の形）
 *
 * 層：domain
 * 担当：フロント（形を変えるときは、バックエンド・API 担当と相談する）
 *
 * ここには実行するコードはなく、JSDoc の型だけを書いています。
 * エディタ（VS Code）で補完が効くようになり、どの画面がどの値を使えるかが分かります。
 * 使う側は、次のように型を参照します。
 *   @param {import("../domain/models.js").Country} country
 *
 * （C# の class / record / struct の定義、C++ の struct の定義に近いものです。
 *   ただし JS には型の強制が無いので、これは「約束事の説明」で、間違っていても実行時には検出されません）
 *
 * TODO(Backend): ここに書いた形（キー名と型）が、実際の API のレスポンスと一致しているか確認する。
 *            違っていたら、フロントに知らせる。
 */

/**
 * 観光名所・文化の記事1本分の情報（Country.trips の1件）
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} countryId
 * @property {string} name              日本語名
 * @property {string} nameEn            英語名
 * @property {"sight"|"culture"} category
 * @property {string} city              都市名
 * @property {string} tip               旅のメモ（一般的な情報）
 * @property {string} description       ひとことの説明
 * @property {"A2"|"B1"|"B2"} level
 * @property {number} minutes           読むのにかかる時間（分）
 * @property {string} imageKey          画像の取得に使うキー（Wikipedia のページ名。"fr:Tour_Eiffel" のように言語を付けられる）
 *
 * TODO(API): 記事の項目（旅のメモ、画像キーなど）の最終形を決める。
 */

/**
 * 国。GET /api/countries の1件
 * @typedef {Object} Country
 * @property {string} id                例: "uk"
 * @property {string} name              日本語名
 * @property {string} nameEn            英語名
 * @property {string} code              国コード（"GB" など）
 * @property {"europe"|"africa"|"oceania"|"americas"|"asia"} region  地域（地図の絞り込みに使う）
 * @property {number} lat               緯度（地図のピン）
 * @property {number} lng               経度
 * @property {string} color             その国のイメージ色（"#2f5d8a"）
 * @property {number} tourOrder         世界一周の順番（1 から）
 * @property {string} capital           首都
 * @property {string} language          言語
 * @property {string} currency          通貨
 * @property {{local: string, ja: string}} phrase  ひとこと旅フレーズ（現地語と日本語訳）
 * @property {string} description       ひとことの説明
 * @property {Trip[]} trips             その国の記事の一覧
 */

/**
 * 国の地域（都市）。GET /api/regions?country=…（DB の regions）
 * @typedef {Object} Region
 * @property {string} name              日本語名（例: "トロント"）
 * @property {string} nameEn            英語名（例: "Toronto"）
 */

/**
 * 記事のカテゴリ。GET /api/categories（DB の categories）
 * @typedef {Object} Category
 * @property {number} id
 * @property {string} name              日本語名（食事・建築・文化）
 * @property {string} nameEn            英語名（Food・Architecture・Culture）
 */

/**
 * 国の詳細。GET /api/countries/{countryId}
 * 一覧の項目に加えて、説明文が付く。
 * @typedef {Country & {regions: Region[], info: {extract: string, sourceUrl: string|null}}} CountryDetail
 *   regions         その国の地域（都市）の一覧（DB 由来。無ければ空）
 *   info.extract    説明文（Wikipedia 由来）
 *   info.sourceUrl  出典の URL
 */

/**
 * 自分の学習記録 1 件ぶんの履歴
 * @typedef {Object} HistoryItem
 * @property {"read"|"listen"} kind
 * @property {string} refId             読んだ記事の tripId、またはニュースの countryId
 * @property {string} countryId
 * @property {string} title
 * @property {number} correct           正解した数
 * @property {number} total             問題の数
 * @property {number|null} summaryScore 要約の点数（要約を書かなかったら null）
 * @property {string} createdAt         "2026-10-14T20:15:00"
 */

/**
 * 自分の情報と学習記録。GET /api/me
 * @typedef {Object} Me
 * @property {{displayName: string, level: "A2"|"B1"|"B2"}} user
 * @property {{countryId: string, earnedAt: string}[]} stamps   獲得したスタンプ
 * @property {string[]} wants           行きたいリスト（tripId）
 * @property {HistoryItem[]} history    新しい順
 * @property {number} streak            連続学習日数
 * @property {number} wordCount         単語帳の数
 * @property {number} badgeCount        取ったバッジの数
 */

/**
 * バッジ。GET /api/badges
 * @typedef {Object} Badge
 * @property {string} id                "first-step" など
 * @property {string} name
 * @property {string} description       取得条件
 * @property {string|null} earnedAt     まだ取っていなければ null
 */

/**
 * 問題 1 問。答え（answer）と解説（explanation）は、採点結果（GradeResult）で初めて返る
 * @typedef {Object} Question
 * @property {string} text
 * @property {string[]} choices         4 択
 * @property {string} hint
 */

/**
 * リーディングの記事と問題。GET /api/trips/{tripId}/lesson
 * @typedef {Object} Lesson
 * @property {string} id
 * @property {string} tripId
 * @property {"seed"|"ai"} source       手書きの教材か、AI が作ったか
 * @property {"A2"|"B1"|"B2"} level
 * @property {{title: string, paragraphs: string[]}} article
 * @property {Question[]} questions
 * @property {string[]} highlightWords  辞書にある単語（画面で下線を引く。小文字）
 * @property {boolean} canRegenerate    「別の文章で解く」が使えるか
 */

/**
 * リスニングのニュース。GET /api/countries/{countryId}/news
 * @typedef {Object} NewsItem
 * @property {string} id
 * @property {string} countryId
 * @property {"seed"|"ai"|"youtube"} source
 * @property {{id: string, title: string}|null} video   動画。無ければ null（その場合は script を読み上げる）
 * @property {string} headline          見出し（英語）
 * @property {string} script            原稿（英語）
 * @property {string} summaryJa         内容の要約（日本語）
 * @property {string} summaryEn         内容の要約（英語）
 * @property {Question[]} questions
 * @property {string[]} highlightWords
 * @property {boolean} canRegenerate
 */

/**
 * 採点で新しく手に入ったもの
 * @typedef {Object} Rewards
 * @property {{countryId: string, earnedAt: string}|null} stamp
 * @property {{id: string, name: string, description: string, earnedAt: string}[]} badges
 */

/**
 * 採点結果。POST /api/lessons/{lessonId}/grade、POST /api/news/{newsId}/grade
 * @typedef {Object} GradeResult
 * @property {number} correct
 * @property {number} total
 * @property {{correct: boolean, answer: number, chosen: number|null, explanation: string}[]} results
 * @property {{score: number, gradedBy: string, good: string[], improve: string[], rewrite: string,
 *             matchedKeywords: string[], missedKeywords: string[], modelSummary: string}|null} summary  要約の採点（無ければ null）
 * @property {Rewards} rewards
 * @property {number} streak
 */

/**
 * 単語帳の 1 語
 * @typedef {Object} SavedWord
 * @property {string} word
 * @property {string} pos               品詞（"名" "動" "形" "副" など。無ければ ""）
 * @property {string} meaning
 * @property {string} source            どの記事で調べたか
 */

export {}; // このファイルを「モジュール」として扱わせるための印（import で型を参照できるようにする）
