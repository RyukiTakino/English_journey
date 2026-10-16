import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "english.db"

conn = sqlite3.connect(DB_PATH) 
cursor = conn.cursor()


categories =[
    ("食事", "Food"),
    ("建築", "Architecture"),
    ("文化", "Culture")
]

for category_ja, category_en in categories:
   cursor.execute("""
   INSERT INTO categories (
   category_name_ja,
   category_name_en
   )
   VALUES (?,?)
   ON CONFLICT DO NOTHING
   """, (category_ja, category_en)
   )

conn.commit()
conn.close()