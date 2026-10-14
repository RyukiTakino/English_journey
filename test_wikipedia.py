import requests

# 英語版WikipediaのAPI
API_URL = "https://en.wikipedia.org/w/api.php"

# 検索条件
params = {
    "action": "query",
    "list": "search",
    "srsearch": "Australia",
    "srlimit": 5,
    "format": "json",
}

# Wikipedia APIにリクエストを送信
response = requests.get(
    API_URL,
    params=params,
    headers={
        "User-Agent": "EnglishJourney/1.0 (educational project)"
    },
    timeout=10,
)

# 通信エラーなどがあれば例外を発生させる
response.raise_for_status()

# JSONをPythonの辞書に変換
data = response.json()

# 検索結果を取得
articles = data["query"]["search"]

# 記事のタイトルと概要を表示
for article in articles:
    print("タイトル:", article["title"])
    print("概要:", article["snippet"])
    print("-" * 50)