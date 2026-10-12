import sqlite3

from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "english.db"

def get_trips_by_country(country_name):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        country_name_ja,
        trip_name_ja,
        trip_name_en,
        wiki_page_title

    FROM countries
    INNER JOIN trips
    ON countries.id = trips.country_id
    WHERE countries.country_name_ja = ?

        """,(country_name,))
    rows = cursor.fetchall()
    conn.close()
    return rows