import sqlite3

#データベースに接続
conn = sqlite3.connect("database/english.db")

#englsish.dbはsqliteで作成するデータベースのファイル名
#国、観光地のデータを入れる
conn.execute("PRAGMA foreign_keys = ON")
cursor = conn.cursor()

#cursorはデータベースへSQL分を送信して実行したり、検索結果を1件ずつ取得したりする

#SQLの実行
cursor.execute("""
CREATE TABLE IF NOT EXISTS countries(
id INTEGER PRIMARY KEY, 
country_name_ja TEXT NOT NULL UNIQUE,
country_name_en TEXT NOT NULL UNIQUE)
""")


cursor.execute("""
CREATE TABLE IF NOT EXISTS trips(
id INTEGER PRIMARY KEY,
trip_name_ja TEXT NOT NULL,
trip_name_en TEXT NOT NULL,
country_id INTEGER NOT NULL,
wiki_page_title TEXt,
FOREIGN KEY (country_id) REFERENCES countries(id),
UNIQUE(country_id,trip_name_ja),
UNIQUE(country_id,trip_name_en)
)
""")

#変更の確定
conn.commit()

cursor.execute("""
SELECT name
FROM sqlite_master
WHERE type = 'table'
""")

# print("テーブル一覧:", cursor.fetchall())

# cursor.execute("PRAGMA foreign_keys")
# print(cursor.fetchall())

# cursor.execute("PRAGMA table_info(countries)")
# print("countries:", cursor.fetchall())

# cursor.execute("PRAGMA table_info(trips)")
# print("trips:", cursor.fetchall())

# cursor.execute("PRAGMA index_list(trips)")
# print("UNIQUE情報:", cursor.fetchall())
#接続を終了
conn.close()

print("データベースの作成が完了しました")
