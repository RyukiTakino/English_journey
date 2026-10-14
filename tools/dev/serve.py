"""frontend/ を http://localhost:8800/ で配信する開発用サーバー（F5 の「ビルド」に当たる）。

使い方: python tools/dev/serve.py [ポート番号]
- ビルドは不要（素の JavaScript）。ファイルを配信するだけ。
- すでに同じポートで配信中なら、そのまま使う（エラーにしない）。
- キャッシュを無効にして配信する（ファイルを直して、再読み込みすれば、すぐ反映される）。
"""
import functools
import http.server
import os
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend")


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".webp": "image/webp", ".ogg": "audio/ogg"}

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
