import requests

WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"


def search_wikipedia(country_name, keyword="", limit=10):
    """
    指定した国に関連するWikipedia記事を検索する。

    country_name: 国名（例: Australia）
    keyword: 追加の検索キーワード（例: food）
    limit: 取得する記事数
    """

    # 検索キーワードを作る
    search_query = country_name

    if keyword:
        search_query = f"{country_name} {keyword}"

    # Wikipedia APIに送る検索条件
    params = {
        "action": "query",
        "list": "search",
        "srsearch": search_query,
        "srlimit": limit,
        "format": "json",
    }

    # Wikipedia APIにリクエストを送る
    response = requests.get(
        WIKIPEDIA_API_URL,
        params=params,
        headers={
            "User-Agent": "EnglishJourney/1.0 (educational project)"
        },
        timeout=10,
    )

    # HTTPエラーがあれば例外を発生させる
    response.raise_for_status()

    # JSONをPythonの辞書に変換
    data = response.json()

    # 検索結果を取得
    search_results = data.get("query", {}).get("search", [])

    # フロントエンドに返すデータを作る
    articles = []

    for result in search_results:
        title = result["title"]

        articles.append({
            "title": title,
            "description": result.get("snippet", ""),
            "url": (
                "https://en.wikipedia.org/wiki/"
                + requests.utils.quote(
                    title.replace(" ", "_"),
                    safe="()",
                )
            ),
        })

    return articles


def get_wikipedia_article(title):
    """
    Wikipediaの記事タイトルから本文を取得する。
    """

    params = {
        "action": "query",
        "prop": "extracts",
        "explaintext": 1,
        "titles": title,
        "format": "json",
        "redirects": 1,
    }

    response = requests.get(
        WIKIPEDIA_API_URL,
        params=params,
        headers={
            "User-Agent": "EnglishJourney/1.0 (educational project)"
        },
        timeout=10,
    )

    response.raise_for_status()

    data = response.json()

    pages = data.get("query", {}).get("pages", {})

    # 記事が見つからなかった場合
    if not pages:
        return None

    # 検索結果から記事を1件取得
    page = next(iter(pages.values()))

    # Wikipediaに存在しない記事の場合
    if "missing" in page:
        return None

    return {
        "title": page["title"],
        "content": page.get("extract", ""),
        "url": (
            "https://en.wikipedia.org/wiki/"
            + requests.utils.quote(
                page["title"].replace(" ", "_"),
                safe="()",
            )
        ),
    }