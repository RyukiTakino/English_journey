
#データベースの中身の確認
# import sqlite3

#  # データベースに接続
# conn = sqlite3.connect("database/english.db")
# cursor = conn.cursor()

#データベースの中身の確認
# cursor.execute("""
# SELECT
#     countries.country_name_ja,
#     trips.trip_name_ja,
#     trips.trip_name_en
# FROM countries
# INNER JOIN trips
# ON countries.id = trips.country_id
# ORDER BY countries.id, trips.id
# """)

# rows = cursor.fetchall()

# for row in rows:
#     print(row)

# print("合計:", len(rows), "件")

from queries import get_trips_by_country

country_name = input("国名を日本語で入力してください： ").strip()


trips = get_trips_by_country(country_name)

if trips:
    for trip in trips:
        print(trip)
else:
    print("存在しません")