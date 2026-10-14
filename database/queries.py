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


def get_trips_by_country(country_name):
    """指定した国の観光地一覧を取得する"""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                countries.country_name_ja,
                trips.trip_name_ja,
                trips.trip_name_en,
                trips.wiki_page_title
            FROM countries
            INNER JOIN trips
                ON countries.id = trips.country_id
            WHERE countries.country_name_ja = ?
        """, (country_name,))

        trips = [dict(row) for row in cursor.fetchall()]

    return trips