import requests
from flask import Flask, jsonify, request
from services.gemini_services import generate_quiz, grade_summary
from database.queries import (
    get_categories,
    get_countries,
    get_regions_by_country,
)
from services.wikipedia_service import (
    search_wikipedia,
    get_wikipedia_article,
)

app = Flask(__name__)


# 国一覧を取得するAPI
@app.route("/api/countries", methods=["GET"])
def countries():
    country_list = get_countries()

    return jsonify(country_list)


# 国ごとの地域（都市）一覧を取得するAPI
# 例: /api/regions?country=カナダ
@app.route("/api/regions", methods=["GET"])
def regions():
    # URLから国名（日本語）を取得
    country = request.args.get("country", "").strip()

    # 国名が指定されていない場合
    if not country:
        return jsonify({
            "error": "国名を指定してください"
        }), 400

    region_list = get_regions_by_country(country)

    return jsonify(region_list)


# カテゴリ一覧を取得するAPI
@app.route("/api/categories", methods=["GET"])
def categories():
    category_list = get_categories()

    return jsonify(category_list)


# Wikipedia記事を検索するAPI
@app.route("/api/articles", methods=["GET"])
def articles():
    # URLから国名を取得
    country = request.args.get("country", "").strip()

    # URLから追加の検索キーワードを取得
    keyword = request.args.get("keyword", "").strip()

    # 国名が指定されていない場合
    if not country:
        return jsonify({
            "error": "国名を指定してください"
        }), 400

    try:
        # Wikipedia記事を検索
        article_list = search_wikipedia(
            country_name=country,
            keyword=keyword,
        )

        # 検索結果をJSON形式で返す
        return jsonify(article_list)

    except requests.RequestException:
        # Wikipediaとの通信に失敗した場合
        app.logger.exception("Wikipedia API request failed")

        return jsonify({
            "error": "Wikipedia APIとの通信に失敗しました"
        }), 502

@app.route("/api/article", methods=["GET"])
def article():
    # URLから記事タイトルを取得
    title = request.args.get("title", "").strip()

    # タイトルが指定されていない場合
    if not title:
        return jsonify({
            "error": "記事タイトルを指定してください"
        }), 400

    try:
        # Wikipediaから記事本文を取得
        result = get_wikipedia_article(title)

        # 記事が存在しない場合
        if result is None:
            return jsonify({
                "error": "記事が見つかりませんでした"
            }), 404

        # 記事本文を返す
        return jsonify(result)

    except requests.RequestException:
        app.logger.exception("Wikipedia article request failed")

        return jsonify({
            "error": "Wikipedia APIとの通信に失敗しました"
        }), 502

@app.route("/api/quiz", methods=["POST"])
def create_quiz():
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return jsonify({
            "error": "記事タイトルと本文を指定してください"
        }), 400

    try:
        quiz = generate_quiz(title, content)
        return jsonify(quiz)

    except Exception:
        app.logger.exception("Quiz generation failed")
        return jsonify({
            "error": "問題の生成に失敗しました"
        }), 502

@app.route("/api/summary/grade", methods=["POST"])
def grade_article_summary():
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    summary = data.get("summary", "").strip()

    if not title or not content or not summary:
        return jsonify({
            "error": "記事タイトル・記事本文・英語の要約を入力してください"
        }), 400

    if len(summary) > 5000:
        return jsonify({
            "error": "要約は5000文字以内で入力してください"
        }), 400

    try:
        result = grade_summary(title, content, summary)
        return jsonify(result)

    except Exception:
        app.logger.exception("Summary grading failed")
        return jsonify({
            "error": "要約の採点に失敗しました。もう一度お試しください。"
        }), 502

if __name__ == "__main__":
    app.run(debug=True)