import sqlite3

from pathlib import Path

# このPythonファイルと同じフォルダのenglish.dbを指定
DB_PATH = Path(__file__).resolve().parent / "english.db"

# データベースに接続
conn = sqlite3.connect(DB_PATH)


#englsish.dbはsqliteで作成するデータベースのファイル名
# 国・地域・カテゴリのテーブルを作成する
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
CREATE TABLE IF NOT EXISTS regions(
id INTEGER PRIMARY KEY,
region_name_ja TEXT NOT NULL,
region_name_en TEXT NOT NULL,
country_id INTEGER NOT NULL,
FOREIGN KEY (country_id) REFERENCES countries(id),
UNIQUE(country_id, region_name_ja),
UNIQUE(country_id, region_name_en)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS categories(
id INTEGER PRIMARY KEY,
category_name_ja TEXT NOT NULL UNIQUE,
category_name_en TEXT NOT NULL UNIQUE
)
""")




#変更の確定
conn.commit()

cursor.execute("""
SELECT name
FROM sqlite_master
WHERE type = 'table'
""")

print("テーブル一覧:", cursor.fetchall())

# cursor.execute("PRAGMA foreign_keys")
# print(cursor.fetchall())

# cursor.execute("PRAGMA table_info(countries)")
# print("countries:", cursor.fetchall())


#接続を終了
conn.close()

print("データベースの作成が完了しました")
