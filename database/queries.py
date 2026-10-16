import sqlite3
from pathlib import Path

# データベースファイルの場所を取得する
DB_PATH = Path(__file__).resolve().parent / "english.db"


def get_countries():
    """登録されている国の一覧を取得する"""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, country_name_ja, country_name_en
            FROM countries
            ORDER BY id
        """)

        countries = [dict(row) for row in cursor.fetchall()]

    return countries


def get_regions_by_country(country_name):
    """指定した国の地域一覧を取得する"""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
             countries.country_name_ja,
                regions.region_name_ja,
                regions.region_name_en
            FROM countries
            INNER JOIN regions
                ON countries.id = regions.country_id
            WHERE countries.country_name_ja = ?
            ORDER BY regions.id
        """, (country_name,))

        regions = [dict(row) for row in cursor.fetchall()]

    return regions

def get_categories():
    """登録されているカテゴリ一覧を取得する"""  

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
        SELECT id, category_name_ja,category_name_en
        FROM categories
        ORDER BY id
        """)

        categories = [dict(row) for row in cursor.fetchall()]

    return categories