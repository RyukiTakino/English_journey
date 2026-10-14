"""frontend/ を http://localhost:8800/ で配信する開発用サーバー（ビルドは不要。これを起動するだけ）。

使い方: python frontend/serve.py [ポート番号]   （リポジトリの直下で。どこからでも動く）
- ビルドは不要（素の JavaScript）。ファイルを配信するだけ。
- すでに同じポートで配信中なら、そのまま使う（エラーにしない）。
- キャッシュを無効にして配信する（ファイルを直して、再読み込みすれば、すぐ反映される）。
- /api/ で始まる URL は、バックエンド（Flask。既定は http://127.0.0.1:5000）へ中継する。
  フロントとバックエンドが同じ場所（同じオリジン）に見えるので、CORS の設定が要らない。
  バックエンドが動いていないときは 502 を返す（フロントは、そのときモックに切り替わる）。
  バックエンドの場所は、環境変数 API_BACKEND で変えられる。
"""
import functools
import http.server
import os
import socket
import sys
import urllib.error
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
ROOT = os.path.dirname(os.path.abspath(__file__))   # このファイルがある frontend/ を配信する


API_BACKEND = os.environ.get("API_BACKEND", "http://127.0.0.1:5000")


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".webp": "image/webp", ".ogg": "audio/ogg"}

    def _proxy(self):
        """/api/ のリクエストを、バックエンドへそのまま転送して、返事を返す"""
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(API_BACKEND + self.path, data=body, method=self.command)
        for key in ("Content-Type", "Accept"):
            if self.headers.get(key):
                req.add_header(key, self.headers[key])
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                status, data, ctype = res.status, res.read(), res.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:           # バックエンドが 4xx / 5xx を返した（そのまま伝える）
            status, data, ctype = e.code, e.read(), e.headers.get("Content-Type", "application/json")
        except OSError:                               # バックエンドに繋がらない
            status, data, ctype = 502, '{"error": {"code": "BACKEND_DOWN", "message": "バックエンドに接続できません。"}}'.encode("utf-8"), "application/json"
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        return super().do_GET()

    def do_POST(self):
        return self._proxy() if self.path.startswith("/api/") else self.send_error(405)

    do_PUT = do_PATCH = do_DELETE = do_POST

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # ログは出さない


def in_use(port):
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


if in_use(PORT):
    print(f"Serving on http://localhost:{PORT}/ (already running)", flush=True)
    sys.exit(0)

handler = functools.partial(NoCache, directory=os.path.abspath(ROOT))
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
    print(f"Serving on http://localhost:{PORT}/", flush=True)
    httpd.serve_forever()
