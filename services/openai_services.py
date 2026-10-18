"""OpenAI-backed AI functions for English Journey."""
import json
import logging
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)
logger = logging.getLogger(__name__)
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise RuntimeError("OPENAI_API_KEY が .env に設定されていません。")

client = OpenAI(api_key=API_KEY)
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

QUIZ_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "choices": {"type": "array", "items": {"type": "string"}},
                    "answer": {"type": "integer"},
                    "explanation": {"type": "string"}
                },
                "required": ["question", "choices", "answer", "explanation"],
                "additionalProperties": False
            }
        }
    },
    "required": ["questions"],
    "additionalProperties": False
}

SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "total_score": {"type": "integer"},
        "scores": {
            "type": "object",
            "properties": {
                "accuracy": {"type": "integer"},
                "coverage": {"type": "integer"},
                "grammar": {"type": "integer"},
                "naturalness": {"type": "integer"}
            },
            "required": ["accuracy", "coverage", "grammar", "naturalness"],
            "additionalProperties": False
        },
        "feedback": {"type": "string"},
        "improvements": {"type": "array", "items": {"type": "string"}},
        "corrected_summary": {"type": "string"}
    },
    "required": ["total_score", "scores", "feedback", "improvements", "corrected_summary"],
    "additionalProperties": False
}


def _limit_words(text, max_words=5000):
    words = (text or "").split()
    return text if len(words) <= max_words else " ".join(words[:max_words])


def _request_json(name, schema, instructions, input_text):
    response = client.responses.create(
        model=MODEL,
        instructions=instructions,
        input=input_text,
        text={"format": {
            "type": "json_schema",
            "name": name,
            "strict": True,
            "schema": schema
        }}
    )
    raw = response.output_text
    if not raw or not raw.strip():
        raise RuntimeError("OpenAI APIから空の回答が返されました。")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.exception("OpenAI returned invalid JSON: %r", raw[:1000])
        raise RuntimeError("AIの回答をJSONとして読み取れませんでした。") from exc


def generate_quiz(title, content):
    if not title or not content:
        raise ValueError("記事タイトルと本文が必要です。")
    result = _request_json(
        "reading_quiz", QUIZ_SCHEMA,
        "Create exactly three English reading comprehension questions using only the article. "
        "Each question must have exactly four choices. 'answer' is the zero-based index "
        "of the correct choice (0-3). Write the explanation in Japanese. "
        "Include a clear explanation and avoid trick questions.",
        f"Article title: {title}\n\nArticle text:\n{_limit_words(content)}"
    )
    questions = result.get("questions")
    if not isinstance(questions, list) or len(questions) != 3:
        raise RuntimeError("AIが3問のクイズを生成できませんでした。")
    for q in questions:
        if (not isinstance(q, dict) or not isinstance(q.get("question"), str)
            or not isinstance(q.get("choices"), list) or len(q["choices"]) != 4
            or not isinstance(q.get("answer"), int) or isinstance(q.get("answer"), bool)
            or not 0 <= q["answer"] <= 3 or not isinstance(q.get("explanation"), str)):
            raise RuntimeError("クイズの回答形式が正しくありません。")
    return {"questions": questions}


def grade_summary(title, content, summary):
    if not title or not content or not summary:
        raise ValueError("記事タイトル・本文・要約が必要です。")
    result = _request_json(
        "summary_grade", SUMMARY_SCHEMA,
        "Grade the learner's English summary against the article. Use this rubric: "
        "accuracy 0-40, coverage 0-30, grammar 0-20, naturalness 0-10. "
        "Give constructive feedback and improvements in Japanese. corrected_summary "
        "must be natural English, preserve the learner's meaning, and use only facts "
        "supported by the article. total_score is the sum of the four rubric scores.",
        f"Article title: {title}\n\nArticle text:\n{_limit_words(content)}"
        f"\n\nLearner's summary:\n{summary}"
    )
    scores = result.get("scores", {})
    limits = {"accuracy": 40, "coverage": 30, "grammar": 20, "naturalness": 10}
    for key, maximum in limits.items():
        value = scores.get(key)
        if not isinstance(value, int) or isinstance(value, bool):
            raise RuntimeError(f"採点項目 {key} の値が整数ではありません。")
        scores[key] = max(0, min(maximum, value))
    result["scores"] = scores
    result["total_score"] = sum(scores.values())
    if (not isinstance(result.get("feedback"), str)
        or not isinstance(result.get("improvements"), list)
        or not isinstance(result.get("corrected_summary"), str)):
        raise RuntimeError("採点結果の形式が正しくありません。")
    return result
