import os
from google import genai

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("APIキーが設定されていません")
    raise SystemExit(1)

client = genai.Client(api_key=api_key)

try:
    response = client.interactions.create(
        model="gemini-3.8-flash",
        input="Say hello in English."
    )

    print(response.output_text)

except Exception as e:
    print("エラー:", e)

