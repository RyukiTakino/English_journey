import json
import re

from google import genai
from dotenv import load_dotenv
import os


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "環境変数 GEMINI_API_KEY が設定されていません。"
    )

client = genai.Client(api_key=API_KEY)

MODEL = "gemini-3.8-flash"

# 動画の分析結果をメモリに保存する
# 同じ動画を再分析せず、クイズと採点で再利用する
_video_cache = {}


def extract_video_id(url):
    """YouTube URLから動画IDを取得する"""

    patterns = [
        r"(?:youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, url)

        if match:
            return match.group(1)

    raise ValueError("有効なYouTube動画URLを入力してください。")


def analyze_youtube_video(url, title="YouTube Video"):
    """
    YouTube動画をGeminiで分析する。
    分析結果をキャッシュし、後続処理で再利用する。
    """

    video_id = extract_video_id(url)

    # 分析済みならAPIを呼び出さない
    if video_id in _video_cache:
        return _video_cache[video_id]

    prompt = f"""
You are an English learning assistant.

Analyze the following YouTube video.

Video title: {title}

Create learning material based on the actual video content.

Return ONLY valid JSON in the following format:

{{
    "title": "Video title",
    "summary": "A detailed English summary of the video.",
    "key_points": [
        "Important point 1",
        "Important point 2",
        "Important point 3",
        "Important point 4",
        "Important point 5"
    ],
    "vocabulary": [
        {{
            "word": "example",
            "meaning_ja": "日本語の意味",
            "example_sentence": "An English example sentence."
        }}
    ]
}}

Requirements:
- Use information actually supported by the video.
- Write the summary in clear English.
- Include important facts, explanations, and events.
- Provide 5 to 10 key points.
- Provide 5 useful English vocabulary items if possible.
- Do not invent details that are not supported by the video.
- Return JSON only, without Markdown code fences.
"""

    response = client.interactions.create(
        model=MODEL,
        input=[
            {
                "type": "text",
                "text": prompt
            },
            {
                "type": "video",
                "uri": f"https://www.youtube.com/watch?v={video_id}"
            }
        ]
    )

    output_text = response.output_text

    if not output_text or not output_text.strip():
        raise ValueError("Geminiから動画の分析結果が返されませんでした。")

    output_text = output_text.strip()

    # MarkdownのJSONコードブロックを除去
    if output_text.startswith("```"):
        output_text = re.sub(
            r"^```(?:json)?\s*",
            "",
            output_text
        )
        output_text = re.sub(
            r"\s*```$",
            "",
            output_text
        )

    result = json.loads(output_text)

    # 必須項目の確認
    if not isinstance(result, dict):
        raise ValueError("動画の分析結果が正しい形式ではありません。")

    if not isinstance(result.get("summary"), str):
        raise ValueError("動画の要約を取得できませんでした。")

    if not isinstance(result.get("key_points"), list):
        raise ValueError("動画の重要ポイントを取得できませんでした。")

    result["video_id"] = video_id
    result["video_url"] = (
        f"https://www.youtube.com/watch?v={video_id}"
    )

    # 次回以降は分析結果を再利用
    _video_cache[video_id] = result

    return result


def get_cached_video(video_id):
    """キャッシュ済みの動画分析結果を取得する"""

    return _video_cache.get(video_id)