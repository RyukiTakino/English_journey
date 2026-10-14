"""モック用の初期教材（frontend/data/seed.json）を作る。

使い方:
    python tools/data/make_seed.py

何をするか:
    「行きたい国」は、Python の DB（database/insert_countries.py と insert_trips.py）に入っているものだけにする。
    DB にあるのは 4 か国・12 か所の観光地の「名前」だけで、記事・問題・ニュースは入っていない。
    そこで、モックの画面を動かすために、次のように教材を用意する。
      - プロトタイプの教材（_proto_seed.json）に、DB と同じ観光地があれば、その記事と問題を使う
      - 無いもの（ロンドン塔・凱旋門・ヴェルサイユ宮殿・ウルル・ナイアガラの滝・CN タワー・バンフ国立公園）は、
        このファイルの NEW_TRIPS に、モック用の記事と問題を書いてある
      - 観光地の名前・国の名前は、DB の値に合わせる

    ※ 記事・問題・ニュースは「画面を作るための仮の教材」。本物は API 担当が生成する（Wikipedia＋Gemini）。
       ニュースは学習用に作った架空の内容。

TODO(API): 本物の教材（記事・問題・ニュース）が出来たら、この仮の教材は不要になる。
TODO(Backend): DB に category（観光名所／文化）・city・level などの列が無い。必要なら列を足すか、別の取得元を決める。
"""
import json
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PROTO = os.path.join(HERE, "_proto_seed.json")
OUT = os.path.join(ROOT, "frontend", "data", "seed.json")
DB = os.path.join(ROOT, "database", "english.db")

# DB の国（database/insert_countries.py と同じ）。DB のファイルが無い環境でも作れるように、ここにも写しておく
DB_COUNTRIES = [
    ("オーストラリア", "Australia"),
    ("カナダ", "Canada"),
    ("フランス", "France"),
    ("イギリス", "United Kingdom"),
]
# DB の観光地（database/insert_trips.py と同じ）: 国の英語名 → [(日本語名, 英語名, wiki のページ名)]
DB_TRIPS = {
    "Australia": [("シドニー・オペラハウス", "Sydney Opera House", "Sydney Opera House"), ("グレート・バリア・リーフ", "Great Barrier Reef", "Great Barrier Reef"), ("ウルル", "Uluru", "Uluru")],
    "Canada": [("ナイアガラの滝", "Niagara Falls", "Niagara Falls"), ("CNタワー", "CN Tower", "CN Tower"), ("バンフ国立公園", "Banff National Park", "Banff National Park")],
    "France": [("エッフェル塔", "Eiffel Tower", "Eiffel Tower"), ("凱旋門", "Arc de Triomphe", "Arc de Triomphe"), ("ヴェルサイユ宮殿", "Palace of Versailles", "Palace of Versailles")],
    "United Kingdom": [("ビッグ・ベン", "Big Ben", "Big Ben"), ("ロンドン塔", "Tower of London", "Tower of London"), ("ストーンヘンジ", "Stonehenge", "Stonehenge")],
}

# 観光地の英語名 → モックで使う id（URL に使う）と、プロトタイプ教材の id（あれば）
TRIP_IDS = {
    "Big Ben": ("bigben", "bigben"), "Tower of London": ("tower-of-london", None), "Stonehenge": ("stonehenge", "stonehenge"),
    "Eiffel Tower": ("eiffel", "eiffel"), "Arc de Triomphe": ("arc-de-triomphe", None), "Palace of Versailles": ("versailles", None),
    "Niagara Falls": ("niagara", None), "CN Tower": ("cn-tower", None), "Banff National Park": ("banff", None),
    "Sydney Opera House": ("opera", "opera"), "Great Barrier Reef": ("reef", "reef"), "Uluru": ("uluru", None),
}
COUNTRY_IDS = {"United Kingdom": "uk", "France": "france", "Canada": "canada", "Australia": "australia"}
# 世界一周の順番
TOUR_ORDER = ["uk", "france", "canada", "australia"]

CANADA = {
    "id": "canada", "name": "カナダ", "nameEn": "Canada", "code": "CA", "region": "americas",
    "lat": 56.1, "lng": -106.3, "color": "#9b3d3d", "wikiJa": "カナダ", "capital": "オタワ",
    "language": "英語・フランス語", "currency": "カナダ・ドル",
    "phrase": {"local": "Have a good one!", "ja": "よい一日を！（別れぎわのあいさつ）"},
    "desc": "ロッキー山脈の湖や大瀑布、大都市トロントなど、広い国土に自然と街が広がる国。英語とフランス語の両方が使われています。",
    "news": {
        "headline": "Toronto Adds New Bike Lanes Along the Lake",
        "script": "Good evening. Toronto is building new bike lanes along the edge of Lake Ontario. The city says the lanes will connect the waterfront with the downtown area. Work starts next month and should finish before winter. Many residents welcome the plan, but some shop owners worry about fewer parking spaces. The city promises to listen to their concerns.",
        "summaryJa": "トロントで、オンタリオ湖沿いに新しい自転車レーンが作られます。来月に工事が始まり、冬までに終わる予定です。歓迎する人が多い一方、駐車スペースが減ることを心配する店主もいます。",
        "summaryEn": "Toronto is building new bike lanes along the lake. Work starts next month. Some shop owners worry about parking.",
        "questions": [
            {"q": "Where are the new bike lanes being built?", "choices": ["Along Lake Ontario", "Inside a national park", "Around an airport", "On a mountain road"], "answer": 0, "hint": "最初の文を聞き取りましょう。", "explain": "原稿の最初に「オンタリオ湖のふち（edge of Lake Ontario）に作っている」とあります。"},
            {"q": "When should the work finish?", "choices": ["Next week", "Before winter", "In ten years", "Last month"], "answer": 1, "hint": "work starts next month のあとの文です。", "explain": "「冬になる前（before winter）に終わる予定」と言っています。"},
            {"q": "What do some shop owners worry about?", "choices": ["Too many tourists", "Higher prices", "Fewer parking spaces", "Noisy construction"], "answer": 2, "hint": "worry about を探しましょう。", "explain": "一部の店主は「駐車スペースが減ること（fewer parking spaces）」を心配しています。"},
        ],
    },
}

# DB にあって、プロトタイプ教材に無い観光地のモック教材
NEW_TRIPS = {
    "tower-of-london": {
        "city": "ロンドン", "level": "B1", "minutes": 5,
        "tip": "王室の宝石（クラウン・ジュエルズ）が見られます。人気のため、時間帯の予約が必要かは公式サイトで確認しましょう。",
        "desc": "要塞・宮殿・牢獄として使われてきた、ロンドンの歴史的な城塞。",
        "article": {"title": "Tower of London: A Fortress with Many Stories", "paragraphs": [
            "The Tower of London stands beside the River Thames in the heart of London. William the Conqueror began building it after he became king of England in 1066. Over the centuries, it has been a royal palace, a fortress, and even a prison.",
            "Today, visitors can see the Crown Jewels there, including crowns and swords used in royal ceremonies. Guards called Yeoman Warders, often known as Beefeaters, live in the Tower and guide visitors with stories from its long history.",
            "The Tower is also famous for its ravens. An old legend says that if the ravens ever leave, the kingdom will fall. For this reason, the birds are looked after carefully. The site became a World Heritage Site in 1988."]},
        "questions": [
            {"q": "Who began building the Tower of London?", "choices": ["Queen Victoria", "William the Conqueror", "Winston Churchill", "King Arthur"], "answer": 1, "hint": "第1段落の2文目を読みましょう。", "explain": "「征服王ウィリアム（William the Conqueror）が建て始めた」と書かれています。"},
            {"q": "What can visitors see at the Tower today?", "choices": ["Dinosaur bones", "The Crown Jewels", "Modern paintings", "A zoo"], "answer": 1, "hint": "第2段落の最初の文です。", "explain": "現在は「王室の宝石（Crown Jewels）」が見られます。"},
            {"q": "Why are the ravens looked after carefully?", "choices": ["They are very rare", "They lay golden eggs", "A legend says the kingdom will fall if they leave", "They help guide visitors"], "answer": 2, "hint": "第3段落の2文目と3文目です。", "explain": "「カラスがいなくなると王国が滅びる」という言い伝えがあるため、大切に世話されています。"}],
        "summary": {"keywords": [["fortress", "palace", "要塞", "城塞", "宮殿"], ["Crown Jewels", "王冠", "宝石", "ジュエルズ"], ["ravens", "カラス", "ワタリガラス"], ["1066"], ["London", "ロンドン"]],
                    "model": "The Tower of London is an old fortress and palace in London. Visitors can see the Crown Jewels, and a legend says the kingdom will fall if the ravens leave."},
    },
    "arc-de-triomphe": {
        "city": "パリ", "level": "B1", "minutes": 4,
        "tip": "屋上の展望台からは、凱旋門を中心に 12 本の通りが広がる景色が見られます。階段で上るので、歩きやすい靴で行きましょう。",
        "desc": "ナポレオンの勝利を記念して建てられた、パリの象徴的な門。",
        "article": {"title": "The Arc de Triomphe: A Monument at the Center of Paris", "paragraphs": [
            "The Arc de Triomphe stands at the top of the Champs-Élysées in Paris. Napoleon ordered it to be built in 1806 to honor the soldiers of the French army. It was finished in 1836, many years after his order.",
            "The arch is about fifty meters tall, and twelve avenues meet around it in the shape of a star. From the top, visitors can enjoy a wide view of the city. Many people say it is one of the best places to see Paris.",
            "Under the arch lies the Tomb of the Unknown Soldier from the First World War. A flame is lit there every evening to remember the soldiers who gave their lives. Parades and national ceremonies are often held around the monument."]},
        "questions": [
            {"q": "Why did Napoleon order the arch to be built?", "choices": ["To honor the soldiers of the French army", "To welcome tourists", "To hold a market", "To protect the river"], "answer": 0, "hint": "第1段落の2文目です。", "explain": "「フランス軍の兵士たちをたたえるため」に建てるよう命じました。"},
            {"q": "How many avenues meet around the arch?", "choices": ["Two", "Six", "Twelve", "Twenty"], "answer": 2, "hint": "第2段落に数字が出てきます。", "explain": "「12 本の大通り（twelve avenues）」が星の形に集まっています。"},
            {"q": "What happens at the tomb every evening?", "choices": ["A flame is lit", "A bell rings", "A parade starts", "A market opens"], "answer": 0, "hint": "第3段落の2文目です。", "explain": "亡くなった兵士たちを思い出すために、毎晩「炎（flame）」がともされます。"}],
        "summary": {"keywords": [["Napoleon", "ナポレオン"], ["1806"], ["twelve", "12", "十二"], ["Unknown Soldier", "無名戦士"], ["flame", "炎"]],
                    "model": "Napoleon ordered the Arc de Triomphe in 1806. Twelve avenues meet around it, and a flame is lit every evening at the Tomb of the Unknown Soldier."},
    },
    "versailles": {
        "city": "ヴェルサイユ（パリ近郊）", "level": "B2", "minutes": 5,
        "tip": "パリ中心部から電車で約 1 時間。庭園は広く、1 日かけて歩くつもりで行くと楽しめます。定休日は公式サイトで確認しましょう。",
        "desc": "ルイ 14 世が築いた、豪華な鏡の間で知られる宮殿。",
        "article": {"title": "The Palace of Versailles: A Symbol of Royal Power", "paragraphs": [
            "The Palace of Versailles lies about twenty kilometers southwest of Paris. It began as a small hunting lodge of Louis XIII, but his son, Louis XIV, enlarged it dramatically. In 1682, he moved the royal court there, and the palace became the center of French politics for over a century.",
            "The most famous room is the Hall of Mirrors, a long gallery lined with hundreds of mirrors and tall windows that face the gardens. In the evening, candlelight made the room shine. In 1919, the treaty that ended the First World War was signed in this very hall.",
            "Outside, the vast gardens were designed by André Le Nôtre, who arranged fountains, flower beds, and long paths in perfect symmetry. The palace and its gardens were added to the World Heritage list in 1979, and they attract millions of visitors every year."]},
        "questions": [
            {"q": "What was the Palace of Versailles at first?", "choices": ["A hunting lodge", "A school", "A prison", "A church"], "answer": 0, "hint": "第1段落の2文目です。", "explain": "もともとはルイ 13 世の小さな狩猟用の館（hunting lodge）でした。"},
            {"q": "What is the Hall of Mirrors known for?", "choices": ["Its underground tunnels", "A long gallery with many mirrors and windows", "A royal zoo", "A library of rare books"], "answer": 1, "hint": "第2段落の最初の文を読みましょう。", "explain": "多くの鏡と大きな窓が並ぶ、長い回廊です。"},
            {"q": "Who designed the gardens?", "choices": ["Louis XIV", "Napoleon", "André Le Nôtre", "William the Conqueror"], "answer": 2, "hint": "第3段落の最初の文です。", "explain": "庭園を設計したのは、アンドレ・ル・ノートルです。"}],
        "summary": {"keywords": [["Louis XIV", "ルイ14世", "ルイ 14 世"], ["Hall of Mirrors", "鏡の間"], ["1682"], ["gardens", "庭園"], ["World Heritage", "世界遺産"]],
                    "model": "Louis XIV turned a hunting lodge into the grand Palace of Versailles. It is famous for the Hall of Mirrors and its large gardens, and it is a World Heritage site."},
    },
    "uluru": {
        "city": "ノーザンテリトリー（オーストラリア中央部）", "level": "B1", "minutes": 4,
        "tip": "日の出と日没のころ、岩の色が赤く変わって見えます。現地では、先住民アナング族の文化を尊重するルールを守りましょう。",
        "desc": "オーストラリア大陸の中央にそびえる、巨大な一枚岩。",
        "article": {"title": "Uluru: The Red Heart of Australia", "paragraphs": [
            "Uluru is a huge sandstone rock in the middle of Australia. It rises about 348 meters above the flat desert, and its base is more than nine kilometers around. Many visitors travel a long way to see it with their own eyes.",
            "The rock is sacred to the Anangu, the traditional owners of the land. For them, Uluru is not just a rock. It is connected to old stories and laws that have been passed down for thousands of years. Since 2019, climbing the rock has been banned out of respect for their culture.",
            "Uluru is famous for changing color during the day. At sunrise and sunset, it glows deep red and orange. Visitors often gather at special viewing areas to watch this beautiful change. The area is protected as a national park and a World Heritage Site."]},
        "questions": [
            {"q": "Where is Uluru?", "choices": ["On the coast of Sydney", "In the middle of Australia", "On a small island", "Beside a big city"], "answer": 1, "hint": "第1段落の最初の文です。", "explain": "ウルルは、オーストラリアの中央（in the middle of Australia）にある巨大な岩です。"},
            {"q": "Why has climbing the rock been banned since 2019?", "choices": ["It was too crowded", "The rock was too dangerous in winter", "To show respect for Anangu culture", "A new road was built"], "answer": 2, "hint": "第2段落の最後の文です。", "explain": "先住民アナング族の文化への敬意から、2019 年に登ることが禁止されました。"},
            {"q": "What happens to Uluru at sunrise and sunset?", "choices": ["It disappears in the fog", "It glows deep red and orange", "It turns white", "It becomes warm to touch"], "answer": 1, "hint": "第3段落の2文目です。", "explain": "日の出と日没のころに、深い赤やオレンジ色に輝きます。"}],
        "summary": {"keywords": [["sandstone", "砂岩"], ["Anangu", "アナング"], ["2019"], ["red", "赤"], ["World Heritage", "世界遺産"]],
                    "model": "Uluru is a huge sandstone rock in central Australia. It is sacred to the Anangu, climbing it has been banned since 2019, and it glows red at sunrise and sunset."},
    },
    "niagara": {
        "city": "ナイアガラ（オンタリオ州）", "level": "A2", "minutes": 4,
        "tip": "カナダ側から見ると、滝全体を正面から見渡せます。水しぶきでぬれるので、防水の上着があると安心です。",
        "desc": "カナダとアメリカの国境にある、世界的に有名な大瀑布。",
        "article": {"title": "Niagara Falls: Where Water Meets Thunder", "paragraphs": [
            "Niagara Falls is on the border between Canada and the United States. It is made up of three waterfalls. The biggest one is called Horseshoe Falls, because it has the shape of a horse's shoe. It is about fifty meters tall.",
            "Millions of people visit the falls every year. Many of them take a boat tour called the Maid of the Mist. The boat goes very close to the falls, and the visitors wear raincoats because of the spray. The sound of the water is as loud as thunder.",
            "The falls are also useful. Their strong water flow is used to make electricity for homes and factories. At night, colorful lights shine on the water, and the falls look different from the daytime."]},
        "questions": [
            {"q": "Where is Niagara Falls?", "choices": ["Between Canada and the United States", "Between France and England", "In the middle of Australia", "Between Egypt and Italy"], "answer": 0, "hint": "第1段落の最初の文です。", "explain": "ナイアガラの滝は、カナダとアメリカの国境にあります。"},
            {"q": "Why do visitors wear raincoats on the boat tour?", "choices": ["Because it rains every day", "Because of the spray from the falls", "Because it is a rule of the city", "Because the boat has no roof"], "answer": 1, "hint": "第2段落の3文目です。", "explain": "船が滝に近づくので、水しぶき（spray）でぬれるからです。"},
            {"q": "What is the water power of the falls used for?", "choices": ["Making ice", "Making electricity", "Washing boats", "Growing rice"], "answer": 1, "hint": "第3段落の2文目です。", "explain": "強い水の流れは、電気（electricity）を作るために使われています。"}],
        "summary": {"keywords": [["Canada", "カナダ"], ["three", "3つ", "三つ", "3本"], ["Horseshoe", "馬蹄", "ホースシュー"], ["boat", "船", "ボート"], ["electricity", "電気"]],
                    "model": "Niagara Falls is made up of three waterfalls on the border of Canada and the United States. Visitors take boat tours, and the water is used to make electricity."},
    },
    "cn-tower": {
        "city": "トロント", "level": "A2", "minutes": 4,
        "tip": "展望台の床の一部がガラスになっていて、真下が見えます。天気のよい日は、遠くのナイアガラ方面まで見えることがあります。",
        "desc": "トロントの空にそびえる、高さ約 553 メートルの塔。",
        "article": {"title": "The CN Tower: Toronto's Tall Landmark", "paragraphs": [
            "The CN Tower is a very tall tower in Toronto, Canada. It was completed in 1976 and is about 553 meters high. For many years, it was the tallest free-standing structure in the world.",
            "The tower was built to send television and radio signals across the city. Today, it is also a popular place for tourists. A fast elevator takes visitors to the observation deck in less than a minute. There is even a glass floor, and people can look straight down at the city below.",
            "Brave visitors can try the EdgeWalk, a walk around the outside of the tower, high above the ground. Others enjoy dinner at the revolving restaurant, which slowly turns and gives a full view of Toronto and Lake Ontario."]},
        "questions": [
            {"q": "When was the CN Tower completed?", "choices": ["In 1876", "In 1976", "In 2016", "In 1936"], "answer": 1, "hint": "第1段落の2文目です。", "explain": "塔は 1976 年に完成しました。"},
            {"q": "What was the tower first built for?", "choices": ["To send television and radio signals", "To protect the city from floods", "To hold a school", "To watch for ships"], "answer": 0, "hint": "第2段落の最初の文です。", "explain": "テレビやラジオの電波を、街じゅうに送るために建てられました。"},
            {"q": "What can visitors do at the top of the tower?", "choices": ["Swim in a pool", "Walk outside on the EdgeWalk", "Ride a roller coaster", "Go fishing"], "answer": 1, "hint": "第3段落の最初の文です。", "explain": "勇気のある人は、塔の外側を歩く EdgeWalk に挑戦できます。"}],
        "summary": {"keywords": [["Toronto", "トロント"], ["553"], ["1976"], ["glass floor", "ガラスの床", "ガラス"], ["EdgeWalk", "エッジウォーク"]],
                    "model": "The CN Tower in Toronto was completed in 1976 and is about 553 meters high. Visitors can stand on a glass floor or try the EdgeWalk."},
    },
    "banff": {
        "city": "アルバータ州（カナディアン・ロッキー）", "level": "B1", "minutes": 5,
        "tip": "夏は湖の色が最もきれいに見えます。野生動物（エルクやクマ）には近づかず、距離を保ちましょう。",
        "desc": "ロッキー山脈の青緑色の湖と雪山が広がる、カナダ最古級の国立公園。",
        "article": {"title": "Banff National Park: A Jewel of the Canadian Rockies", "paragraphs": [
            "Banff National Park is in the Rocky Mountains of Alberta, Canada. It was created in 1885 and is the oldest national park in the country. The park is known for its tall snowy mountains, thick forests, and clear blue-green lakes.",
            "Lake Louise and Moraine Lake are two of its most famous lakes. Their color comes from tiny pieces of rock, called rock flour, which are carried into the water by glaciers. When the sunlight hits the water, the lakes shine in a beautiful turquoise.",
            "Visitors enjoy hiking, skiing, and relaxing in hot springs. Wild animals such as elk and bears live in the park, so visitors must keep a safe distance from them. The area is part of a World Heritage Site called the Canadian Rocky Mountain Parks."]},
        "questions": [
            {"q": "Where is Banff National Park?", "choices": ["In the Rocky Mountains of Alberta", "On the coast of Nova Scotia", "In the city of Toronto", "On an island near Sydney"], "answer": 0, "hint": "第1段落の最初の文です。", "explain": "アルバータ州のロッキー山脈にあります。"},
            {"q": "Why do the lakes look turquoise?", "choices": ["Because of paint from the mountains", "Because of tiny pieces of rock carried by glaciers", "Because of colorful fish", "Because of lights at night"], "answer": 1, "hint": "第2段落の2文目です。", "explain": "氷河が運んでくる、細かな岩の粉（rock flour）が水に混ざっているためです。"},
            {"q": "What must visitors do when they see wild animals?", "choices": ["Feed them", "Take them home", "Keep a safe distance", "Chase them away"], "answer": 2, "hint": "第3段落の2文目です。", "explain": "野生動物とは安全な距離（safe distance）を保つ必要があります。"}],
        "summary": {"keywords": [["1885"], ["Rocky Mountains", "ロッキー"], ["Lake Louise", "ルイーズ湖", "湖"], ["glacier", "氷河"], ["World Heritage", "世界遺産"]],
                    "model": "Banff National Park, created in 1885, lies in the Canadian Rockies. Its turquoise lakes get their color from rock flour carried by glaciers, and it is a World Heritage site."},
    },
}

# 国の都市・説明など（プロトタイプに無い、カナダだけの追加分）は CANADA に書いた。ほかの国はプロトタイプの値を使う


def db_trip_rows():
    """DB に本当に入っている観光地を読む（DB が無ければ、上の写しを使う）。"""
    if not os.path.exists(DB):
        print("(database/english.db が無いので、スクリプト内の写しを使います)")
        return DB_COUNTRIES, DB_TRIPS
    conn = sqlite3.connect(DB)
    countries = conn.execute("SELECT country_name_ja, country_name_en FROM countries ORDER BY id").fetchall()
    trips = {}
    for ja, en in [(c[0], c[1]) for c in countries]:
        rows = conn.execute(
            "SELECT trip_name_ja, trip_name_en, wiki_page_title FROM trips JOIN countries ON countries.id = trips.country_id "
            "WHERE country_name_en = ? ORDER BY trips.id", (en,)).fetchall()
        trips[en] = rows
    conn.close()
    return countries, trips


def main():
    proto = json.load(open(PROTO, encoding="utf-8"))
    p_countries = {c["id"]: c for c in proto["countries"]}
    p_trips = {t["id"]: t for c in proto["countries"] for t in c["trips"]}
    db_countries, db_trips = db_trip_rows()

    out_countries = []
    for ja, en in db_countries:
        cid = COUNTRY_IDS[en]
        base = CANADA if cid == "canada" else dict(p_countries[cid])
        trips = []
        for t_ja, t_en, wiki in db_trips[en]:
            tid, proto_id = TRIP_IDS[t_en]
            if proto_id:
                t = dict(p_trips[proto_id])          # プロトタイプの教材を使う
            else:
                n = NEW_TRIPS[tid]                   # モック用に新しく書いた教材
                t = {"category": "sight", "city": n["city"], "tip": n["tip"], "desc": n["desc"], "level": n["level"],
                     "minutes": n["minutes"], "article": n["article"], "questions": n["questions"], "summary": n["summary"]}
            t.update({"id": tid, "name": t_ja, "nameEn": t_en, "wiki": wiki.replace(" ", "_"), "category": "sight"})
            trips.append(t)
        c = dict(base)
        c.update({"id": cid, "name": ja, "nameEn": en, "trips": trips, "tour_order": TOUR_ORDER.index(cid) + 1})
        out_countries.append(c)

    out = {"countries": sorted(out_countries, key=lambda c: c["tour_order"]), "glossary": proto["glossary"]}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("wrote", OUT, "|", len(out["countries"]), "countries,", sum(len(c["trips"]) for c in out["countries"]), "trips")


if __name__ == "__main__":
    sys.exit(main())
