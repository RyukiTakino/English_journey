import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "english.db"

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON")
cursor = conn.cursor()


regions_by_country ={
    "Australia": [
        ("シドニー", "Sydney"),
        ("メルボルン", "Melbourne"),
        ("ブリスベン", "Brisbane")
    ],

    "Canada" :[
        ("トロント","Toronto"),
        ("バンクーバー","Vancouver"),
        ("モントリオール","Montreal")    
    ],

    "France" :[
        ("パリ","Paris"),
        ("リヨン","Lyon"),
        ("マルセイユ","Marseille")
    ],

    "United Kingdom" :[
        ("ロンドン","London"),
        ("エディンバラ","Edinburgh"),
        ("マンチェスター","Manchester")
    ],

        "United States": [
        ("ニューヨーク", "New York"),
        ("ロサンゼルス", "Los Angeles"),
        ("サンフランシスコ", "San Francisco")
    ],

    "Singapore": [
        ("シンガポール中心部", "Downtown Core"),
        ("セントーサ", "Sentosa"),
        ("ジュロン", "Jurong")
    ],

    "New Zealand": [
        ("オークランド", "Auckland"),
        ("ウェリントン", "Wellington"),
        ("クライストチャーチ", "Christchurch")
    ]
}

for country_name, regions in regions_by_country.items():
    cursor.execute("""
    SELECt id
    FROM countries
    WHEre country_name_en = ?
    """, (country_name,))

    result = cursor.fetchone()
    if result is not None:
        country_id = result[0]

        for region_ja, regions_en in regions:
            cursor.execute("""
            INSERT INTO regions (
            region_name_ja,
            region_name_en,
            country_id
            )
            VALUES (?,?,?)
            ON CONFLICT DO NOTHING
            """,(region_ja, regions_en, country_id)
            )
        
    else:
        print(country_name, "は登録されていません")

conn.commit()
conn.close()