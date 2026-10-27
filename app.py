import requests
from flask import Flask, jsonify, request, send_from_directory
import os
from services.openai_services import generate_quiz, grade_summary
from database.queries import (
    get_categories,
    get_countries,
    get_regions_by_country,
)
from services.youtube_services import (
    analyze_youtube_video,
    grade_youtube_summary as grade_youtube_summary_from_audio,
    generate_youtube_quiz,
    get_cached_video,
    search_youtube_news,
)
from services.wikipedia_service import (
    search_wikipedia,
    get_wikipedia_article,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

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

@app.route("/api/youtube/analyze", methods=["POST"])
def analyze_youtube():
    data = request.get_json(silent=True) or {}

    url = data.get("url", "").strip()
    title = data.get("title", "YouTube Video").strip()

    if not url:
        return jsonify({
            "error": "YouTube動画のURLを入力してください。"
        }), 400

    try:
        result = analyze_youtube_video(url, title)

        return jsonify(result)

    except ValueError as e:
        return jsonify({
            "error": str(e)
        }), 400

    except Exception:
        app.logger.exception("YouTube analysis failed")

        return jsonify({
            "error": (
                "動画の分析に失敗しました。"
                "公開動画のURL、音声取得環境、OpenAI APIの利用状況を確認してください。"
            )
        }), 502

@app.route("/api/youtube/news", methods=["GET"])
def youtube_news():
    country = request.args.get("country", "").strip()
    city = request.args.get("city", "").strip()
    if not country or not city:
        return jsonify({"error": "国と都市を指定してください。"}), 400
    try:
        return jsonify(search_youtube_news(country, city))
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503
    except requests.RequestException:
        app.logger.exception("YouTube Data API request failed")
        return jsonify({"error": "YouTubeのニュース検索に失敗しました。時間をおいて再度お試しください。"}), 502

@app.route("/api/youtube/quiz", methods=["POST"])
def create_youtube_quiz():
    data = request.get_json(silent=True) or {}
    video_id = data.get("video_id", "").strip()

    if not video_id:
        return jsonify({
            "error": "分析済みのYouTube動画を指定してください。"
        }), 400

    try:
        return jsonify(generate_youtube_quiz(video_id))

    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    except Exception:
        app.logger.exception("YouTube quiz generation failed")
        return jsonify({
            "error": "動画の音声から問題を作成できませんでした。"
        }), 502

@app.route("/api/youtube/summary/grade", methods=["POST"])
def grade_youtube_summary():
    data = request.get_json(silent=True) or {}

    video_id = data.get("video_id", "").strip()
    summary = data.get("summary", "").strip()

    if not video_id or not summary:
        return jsonify({
            "error": "動画と英語の要約を入力してください。"
        }), 400

    if len(summary) > 5000:
        return jsonify({
            "error": "要約は5000文字以内で入力してください。"
        }), 400

    video = get_cached_video(video_id)

    if not video:
        return jsonify({
            "error": "動画の分析結果がありません。先に動画を分析してください。"
        }), 404

    try:
        result = grade_youtube_summary_from_audio(video_id, summary)

        return jsonify(result)

    except Exception:
        app.logger.exception("YouTube summary grading failed")

        return jsonify({
            "error": "動画の要約採点に失敗しました。"
        }), 502

if __name__ == "__main__":
    app.run(debug=True)