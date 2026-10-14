"""画面の動作確認用：ブラウザを自動で操作して、スクリーンショットとコンソールのエラーを取る。

使い方（Python の playwright が入っている環境で）:
    python tools/dev/browse.py <スクリプトのファイル>.json

スクリプト（JSON）の例:
    {
      "base": "http://localhost:8800/index.html",
      "size": [1200, 900],
      "steps": [
        {"goto": "#/"},
        {"wait": 1500},
        {"shot": "home"},
        {"click": "a.country-card >> nth=0"},
        {"wait": 800},
        {"shot": "country"},
        {"fill": "textarea", "text": "hello"},
        {"eval": "document.title"}
      ]
    }
    操作: goto（# 以降。または完全な URL）/ wait（ミリ秒）/ click（CSS セレクタ。Playwright の書き方が使える）/
          fill（入力欄）/ press（キー）/ eval（JavaScript を実行して結果を表示）/ shot（スクリーンショット名）/
          scroll（ピクセル）/ hover / size（[幅, 高さ] に変更）
    出力: スクリーンショットは、環境変数 BROWSE_OUT のフォルダ（無ければ ./_shots）に <名前>.png で保存する。
          ページのコンソールのエラー・警告と、通信の失敗を、最後に一覧で表示する。

※ 開発用の道具。アプリ本体には含まれない。
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    out = os.environ.get("BROWSE_OUT", "_shots")
    os.makedirs(out, exist_ok=True)
    base = spec.get("base", "http://localhost:8800/index.html")
    w, h = spec.get("size", [1200, 900])
    problems = []

    with sync_playwright() as pw:
        # インストール済みの Chrome を使う（ブラウザの追加ダウンロードが要らない）
        browser = pw.chromium.launch(channel="chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=spec.get("scale", 1), has_touch=spec.get("touch", False), is_mobile=spec.get("mobile", False))
        page = ctx.new_page()
        page.on("console", lambda m: problems.append(f"[console.{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: problems.append(f"[pageerror] {e}"))
        page.on("requestfailed", lambda r: problems.append(f"[requestfailed] {r.url} {r.failure}"))
        page.on("response", lambda r: problems.append(f"[http {r.status}] {r.url}") if r.status >= 400 else None)

        for step in spec["steps"]:
            if "goto" in step:
                target = step["goto"]
                page.goto(target if target.startswith("http") else base + target)
            elif "wait" in step:
                page.wait_for_timeout(step["wait"])
            elif "click" in step:
                page.click(step["click"], timeout=step.get("timeout", 5000))
            elif "hover" in step:
                page.hover(step["hover"])
            elif "fill" in step:
                page.fill(step["fill"], step["text"])
            elif "press" in step:
                page.keyboard.press(step["press"])
            elif "scroll" in step:
                page.mouse.wheel(0, step["scroll"])
            elif "size" in step:
                page.set_viewport_size({"width": step["size"][0], "height": step["size"][1]})
            elif "eval" in step:
                print("eval:", json.dumps(page.evaluate(step["eval"]), ensure_ascii=False))
            elif "shot" in step:
                path = os.path.join(out, step["shot"] + ".png")
                page.screenshot(path=path, full_page=step.get("full", False))
                print("shot:", path)
        browser.close()

    print("--- 問題 ---" if problems else "--- 問題なし ---")
    for p in problems[:40]:
        print(p)


if __name__ == "__main__":
    sys.exit(main())
