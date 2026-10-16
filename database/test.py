
# 地域検索の動作確認
from queries import get_regions_by_country

# 日本語の国名を入力
country_name = input("国名を日本語で入力してください：").strip()

# 入力された国の地域を取得
regions = get_regions_by_country(country_name)

# 検索結果を表示
if regions:
    for region in regions:
        print(region)
else:
    print("存在しません")