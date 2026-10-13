import sqlite3

# データベースに接続
conn = sqlite3.connect("database/english.db")

# 外部キー制約を有効化
conn.execute("PRAGMA foreign_keys = ON")

cursor = conn.cursor()

# 国ごとの観光地データ
trips_by_country = {
    "Australia": [
        ("シドニー・オペラハウス", "Sydney Opera House", "Sydney Opera House"),
        ("グレート・バリア・リーフ", "Great Barrier Reef", "Great Barrier Reef"),
        ("ウルル", "Uluru", "Uluru")
    ],
    "Canada": [
        ("ナイアガラの滝", "Niagara Falls", "Niagara Falls"),
        ("CNタワー", "CN Tower", "CN Tower"),
        ("バンフ国立公園", "Banff National Park", "Banff National Park")
    ],
    "France": [
        ("エッフェル塔", "Eiffel Tower", "Eiffel Tower"),
        ("凱旋門", "Arc de Triomphe", "Arc de Triomphe"),
        ("ヴェルサイユ宮殿", "Palace of Versailles", "Palace of Versailles")
    ],
    "United Kingdom": [
        ("ビッグ・ベン", "Big Ben", "Big Ben"),
        ("ロンドン塔", "Tower of London", "Tower of London"),
        ("ストーンヘンジ", "Stonehenge", "Stonehenge")
    ]
}

total = 0

# 国を順番に処理
for country_name, spots in trips_by_country.items():

    # 国のIDを取得
    cursor.execute("""
    SELECT id FROM countries
    WHERE country_name_en = ?
    """, (country_name,))

    country = cursor.fetchone()

    # 国が存在しない場合
    if country is None:
        print("国が見つかりません:", country_name)
        continue

    country_id = country[0]

    # 観光地を順番に登録
    for trip_ja, trip_en, wiki_title in spots:

        cursor.execute("""
        INSERT INTO trips (
            trip_name_ja,
            trip_name_en,
            country_id,
            wiki_page_title
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT DO NOTHING
        """, (trip_ja, trip_en, country_id, wiki_title))

        total += cursor.rowcount

# 変更を確定
conn.commit()

# 接続終了
conn.close()

print("新規登録件数:", total)