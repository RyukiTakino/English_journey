import sqlite3

from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "english.db"

conn = sqlite3.connect(DB_PATH)

# 外部キー制約を有効化
conn.execute("PRAGMA foreign_keys = ON")

# SQLを実行するカーソルを作成
cursor = conn.cursor()

# 国の情報を登録

countries = [
    ("オーストラリア", "Australia"),
    ("カナダ", "Canada"),
    ("フランス", "France"),
    ("イギリス", "United Kingdom")
]


cursor.executemany(
    """
    INSERT INTO countries ( 
    country_name_ja,
    country_name_en
    )

    VALUES (?, ?)
    ON CONFLICT DO NOTHING
""", countries)

# 変更を確定
conn.commit()

# 接続を終了
conn.close()

print(f"新規登録件数: {cursor.rowcount}件")