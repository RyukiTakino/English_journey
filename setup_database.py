import subprocess
import sys
from pathlib import Path

# このファイルがあるディレクトリを取得

BASE_DIR = Path(__file__).resolve().parent

# 実行するスクリプトを順番に指定

scripts = [
    "init_db.py",
    "insert_countries.py",
    "insert_regions.py",
    "insert_categories.py",
]

# 指定した順番で実行

for script in scripts:
    script_path = BASE_DIR / "database" / script

    print(f"\n--- {script} を実行します ---", flush=True)

    subprocess.run(
        [sys.executable, str(script_path)],
        check=True,
        cwd=BASE_DIR,
    )

print("\nデータベースの初期設定が完了しました！", flush=True)
