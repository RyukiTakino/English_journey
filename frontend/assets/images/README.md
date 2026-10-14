# 画像アセット一覧

`tools/assets/slice_sheets.py` でUIスプライトシート2枚から自動切り出しした透過PNGです。
再生成は `python tools/assets/slice_sheets.py` (Pillow / numpy / scipy / opencv が必要)。

- シート1: `ff7b5dd0-...png` (白背景・メイン) / シート2: `a_clean_flat_soft_shaded_...png` (にじんだ色背景)
- 全ファイル 4px の透明余白付き。元解像度のまま(基本 1x 以下で使用してください。拡大するとぼやけます)。
- `manifest.json` に同じ内容を機械可読で出力しています。

## ファイル数

| フォルダ | 枚数 |
|---|---|
| mascot/ | 8 |
| banners/ | 4 |
| icons/ | 29 |
| ui/ | 48 |
| cards/ | 13 |
| passport/ | 5 |
| stamps/ | 6 |
| badges/ | 8 |
| effects/ | 4 |
| 合計 | 125 |

## mascot/ (マスコット(鳥))

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `mascot/bird-wave.png` | 128x126 | 立ち姿で手を振る鳥 | 1 |  |
| `mascot/bird-cheer.png` | 146x124 | 羽を広げて飛び跳ねる鳥(喜び) | 1 |  |
| `mascot/bird-think.png` | 124x137 | 頭に手を当て電球を思いつく鳥 | 1 |  |
| `mascot/bird-chin.png` | 119x133 | 羽をあごに当てて考える鳥 | 1 |  |
| `mascot/bird-happy.png` | 138x115 | 目を閉じて笑う鳥 | 1 |  |
| `mascot/bird-read.png` | 132x125 | 本を読む鳥 | 1 |  |
| `mascot/bird-listen.png` | 164x127 | ヘッドホンで飛ぶ鳥(足は隣のアイコンに接触していたため端を一部補正) | 1 |  |
| `mascot/bird-sleep.png` | 114x118 | 座って眠る鳥 | 1 |  |

## banners/ (バナー)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `banners/banner-sky-plane.png` | 497x98 | 空と飛行機のバナー | 1 |  |
| `banners/banner-world-map.png` | 499x197 | ルート付き世界地図バナー | 1 |  |
| `banners/banner-skyline-1.png` | 465x115 | 街並みスカイラインのバナー(1) | 1 |  |
| `banners/banner-skyline-2.png` | 464x106 | 街並みスカイラインのバナー(2・ドーム) | 1 |  |

## icons/ (アイコン・丸ボタン)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `icons/icon-home.png` | 90x86 | ホーム(紺プレート) | 1 |  |
| `icons/icon-globe.png` | 90x86 | 地球(クリームプレート) | 1 |  |
| `icons/icon-map.png` | 89x86 | 地図ピン | 1 |  |
| `icons/icon-book.png` | 90x87 | 開いた本(紺プレート) | 1 |  |
| `icons/icon-headphones.png` | 91x86 | ヘッドホン | 1 |  |
| `icons/icon-passport.png` | 90x86 | パスポート(紺プレート) | 1 |  |
| `icons/icon-suitcase.png` | 91x86 | スーツケース | 1 |  |
| `icons/icon-award.png` | 88x86 | 受賞リボン(紺プレート) | 1 |  |
| `icons/icon-chart.png` | 87x86 | 棒グラフ | 1 |  |
| `icons/icon-settings.png` | 88x86 | 歯車 | 1 |  |
| `icons/icon-play.png` | 71x71 | 再生(オレンジ丸) | 1 |  |
| `icons/icon-pause.png` | 71x71 | 一時停止(紺丸) | 1 |  |
| `icons/icon-stop.png` | 71x71 | 停止(紺丸) | 1 |  |
| `icons/icon-volume.png` | 71x70 | 音量(紺丸) | 1 |  |
| `icons/icon-mute.png` | 69x70 | ミュート(紺丸・×) | 1 |  |
| `icons/icon-mute-alt.png` | 69x70 | ミュート(オレンジ・別デザイン) | 1 |  |
| `icons/icon-music.png` | 72x70 | 音符(紺丸) | 1 |  |
| `icons/icon-hint.png` | 74x75 | ヒント(電球の吹き出し) | 1 |  |
| `icons/icon-alert.png` | 72x75 | 注意(!の吹き出し) | 1 |  |
| `icons/icon-correct.png` | 72x75 | 正解(チェックの吹き出し) | 1 |  |
| `icons/icon-wrong.png` | 71x76 | 不正解(×の吹き出し) | 1 |  |
| `icons/icon-notes.png` | 126x128 | ノート(付箋とブックマーク)アイコン(クリームのプレート) | 2 |  |
| `icons/icon-sound-on-round.png` | 88x88 | 丸ボタン: スピーカーON(紺) | 2 |  |
| `icons/icon-music-on-round.png` | 88x88 | 丸ボタン: 音符ON(クリーム) | 2 |  |
| `icons/icon-sound-off-round.png` | 88x88 | 丸ボタン: スピーカーOFF(ティール) | 2 |  |
| `icons/icon-music-off.png` | 88x88 | 丸ボタン: 音符OFF(クリーム・×) | 2 |  |
| `icons/icon-star.png` | 127x124 | オレンジの星(単体グリフ) | 2 | 元が小さいためLanczos 2x拡大済み |
| `icons/icon-heart.png` | 125x112 | オレンジのハート(単体グリフ) | 2 | 元が小さいためLanczos 2x拡大済み |
| `icons/icon-bookmark.png` | 92x119 | 黄色のブックマーク(単体グリフ) | 2 | 元が小さいためLanczos 2x拡大済み |

## ui/ (UI部品)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `ui/switcher-arrows.png` | 165x70 | 左右矢印のスイッチャー | 1 |  |
| `ui/toggle-orange.png` | 105x60 | オレンジのトグルスイッチ(ON) | 1 |  |
| `ui/progress-blue.png` | 283x43 | 青いプログレスバー(約40%) | 1 |  |
| `ui/progress-orange-knob.png` | 256x47 | ノブ付きオレンジのプログレスバー | 1 |  |
| `ui/progress-orange-full.png` | 285x44 | オレンジの満タンバー | 1 |  |
| `ui/progress-route.png` | 364x51 | 飛行機のルート型ステップ進捗 | 1 |  |
| `ui/spinner.png` | 66x63 | ローディングスピナー(ドット) | 1 |  |
| `ui/pill-stars-4.png` | 141x48 | 星4つのレーティングピル(3つ点灯) | 1 |  |
| `ui/pill-stars-3.png` | 131x46 | 星3つのレーティングピル(2つ点灯) | 1 |  |
| `ui/pill-heart.png` | 92x49 | ハートのピル | 1 |  |
| `ui/pill-bookmark.png` | 92x49 | ブックマークのピル | 1 |  |
| `ui/pill-menu.png` | 91x48 | メニュー(三本線)のピル | 1 |  |
| `ui/pill-dots.png` | 116x46 | 三点リーダーのピル | 1 |  |
| `ui/bubble-chat.png` | 91x53 | オレンジのチャットアイコン付き吹き出しピル | 1 |  |
| `ui/panel-label-wide.png` | 465x104 | 紺枠の横長ラベル2枚(写真つき・星つき) | 1 |  |
| `ui/ticket-blank.png` | 206x89 | 搭乗券(空白+飛行機スタブ) | 1 |  |
| `ui/pinboard.png` | 180x134 | コルクボード(飛行機のピン付き) | 1 |  |
| `ui/bubble-rect.png` | 166x124 | 四角い吹き出し(空白) | 1 |  |
| `ui/bubble-cloud.png` | 141x122 | 雲形の吹き出し(空白) | 1 |  |
| `ui/ribbon-orange.png` | 174x64 | オレンジのリボンバナー | 1 |  |
| `ui/ribbon-blue.png` | 174x69 | 青いリボンバナー | 1 |  |
| `ui/tag-luggage-1.png` | 175x71 | 荷札(上) | 1 |  |
| `ui/tag-luggage-2.png` | 185x72 | 荷札(下) | 1 |  |
| `ui/envelope-airmail.png` | 150x109 | 航空便の封筒 | 1 |  |
| `ui/washi-orange.png` | 86x41 | マスキングテープ(オレンジ) | 1 |  |
| `ui/washi-blue.png` | 77x35 | マスキングテープ(青) | 1 |  |
| `ui/washi-yellow.png` | 82x40 | マスキングテープ(黄) | 1 |  |
| `ui/btn-play-orange.png` | 220x108 | オレンジの再生ボタン(角丸四角) | 2 |  |
| `ui/btn-next-teal.png` | 187x107 | ティールの右矢印ボタン(角丸四角) | 2 |  |
| `ui/btn-back.png` | 152x107 | クリーム色の戻る(左矢印)ボタン | 2 |  |
| `ui/btn-star.png` | 161x107 | 星のボタン(クリーム) | 2 |  |
| `ui/btn-heart.png` | 161x107 | ハートのボタン(クリーム) | 2 |  |
| `ui/btn-bookmark.png` | 154x107 | ブックマークのボタン(クリーム) | 2 |  |
| `ui/btn-check.png` | 172x111 | 緑のチェックボタン | 2 |  |
| `ui/btn-close.png` | 175x107 | 赤い×ボタン | 2 |  |
| `ui/dropdown-globe-orange.png` | 219x77 | 地球アイコン付きオレンジのドロップダウン | 2 |  |
| `ui/dropdown-bars-navy.png` | 218x77 | 棒グラフ付き紺のドロップダウン | 2 |  |
| `ui/dropdown-calendar.png` | 221x75 | カレンダー付きクリームのドロップダウン | 2 |  |
| `ui/dropdown-list.png` | 212x75 | リスト付きクリームのドロップダウン | 2 |  |
| `ui/search-field.png` | 340x75 | 虫眼鏡付き検索フィールド(空) | 2 |  |
| `ui/btn-refresh.png` | 198x80 | 更新(リフレッシュ)ボタン(紺) | 2 |  |
| `ui/level-sprout.png` | 204x76 | レベルピル: 芽+星1 | 2 |  |
| `ui/level-two-stars.png` | 206x72 | レベルピル: 星2(ティール) | 2 |  |
| `ui/level-three-stars.png` | 204x76 | レベルピル: 星3 | 2 |  |
| `ui/bubble-hint.png` | 151x110 | ヒント(電球)入り吹き出し | 2 |  |
| `ui/bubble-alert.png` | 175x110 | 注意(!)入り吹き出し | 2 |  |
| `ui/bubble-correct.png` | 173x110 | 正解(チェック)入り吹き出し | 2 |  |
| `ui/bubble-wrong.png` | 170x111 | 不正解(×)入り吹き出し | 2 |  |

## cards/ (カード)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `cards/card-photo-landscape.png` | 173x128 | 山の風景写真+地図ピン(フォトプレースホルダ) | 1 |  |
| `cards/card-uk.png` | 122x171 | 国カード(ピクチャのみ・星ストリップなし): イギリス(ビッグベン) | 1 | 下端は直線(角丸は上側のみ) |
| `cards/card-uk-rating.png` | 122x205 | 国カード(星ストリップ付き): イギリス(ビッグベン) | 1 |  |
| `cards/card-france.png` | 133x171 | 国カード(ピクチャのみ・星ストリップなし): フランス(エッフェル塔) | 1 | 下端は直線(角丸は上側のみ) |
| `cards/card-france-rating.png` | 133x205 | 国カード(星ストリップ付き): フランス(エッフェル塔) | 1 |  |
| `cards/card-italy.png` | 135x171 | 国カード(ピクチャのみ・星ストリップなし): イタリア(コロッセオ) | 1 | 下端は直線(角丸は上側のみ) |
| `cards/card-italy-rating.png` | 135x205 | 国カード(星ストリップ付き): イタリア(コロッセオ) | 1 |  |
| `cards/card-egypt.png` | 133x171 | 国カード(ピクチャのみ・星ストリップなし): エジプト(ピラミッドとスフィンクス) | 1 | 下端は直線(角丸は上側のみ) |
| `cards/card-egypt-rating.png` | 133x205 | 国カード(星ストリップ付き): エジプト(ピラミッドとスフィンクス) | 1 |  |
| `cards/card-australia.png` | 128x171 | 国カード(ピクチャのみ・星ストリップなし): オーストラリア(オペラハウス) | 1 | 下端は直線(角丸は上側のみ) |
| `cards/card-australia-rating.png` | 128x205 | 国カード(星ストリップ付き): オーストラリア(オペラハウス) | 1 |  |
| `cards/card-usa.png` | 124x170 | 国カード(ピクチャのみ・星ストリップなし): アメリカ(自由の女神) | 1 | 下端は直線(角丸は上側のみ) |
| `cards/card-usa-rating.png` | 124x205 | 国カード(星ストリップ付き): アメリカ(自由の女神) | 1 |  |

## passport/ (パスポート・地図)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `passport/passport-cover.png` | 154x198 | 閉じた紺のパスポート | 1 |  |
| `passport/world-map-old.png` | 294x209 | 古い宝の地図風の世界地図 | 1 |  |
| `passport/passport-book-open.png` | 338x201 | スタンプ帳(見開き・スタンプ6個) | 1 |  |
| `passport/stamp-tool.png` | 101x111 | 赤いゴム印ツール | 1 |  |
| `passport/postage-stamp-globe.png` | 134x204 | 地球の切手(絵柄部分のみ・ギザギザの白縁なし) | 2 | ギザギザ縁は背景との分離が難しく省略 |

## stamps/ (スタンプ)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `stamps/stamp-plane.png` | 80x80 | スタンプ(円形): 青い飛行機 | 1 |  |
| `stamps/stamp-france.png` | 84x84 | スタンプ(円形): 赤いエッフェル塔 | 1 |  |
| `stamps/stamp-italy.png` | 82x82 | スタンプ(円形): 青いコロッセオ | 1 |  |
| `stamps/stamp-pyramids.png` | 76x76 | スタンプ(円形): 黄色いピラミッド | 1 |  |
| `stamps/stamp-australia.png` | 80x80 | スタンプ(円形): 青いオペラハウス | 1 |  |
| `stamps/stamp-usa.png` | 80x80 | スタンプ(円形): 赤い自由の女神 | 1 |  |

## badges/ (バッジ)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `badges/badge-globe.png` | 119x116 | 実績バッジ: 地球 | 1 |  |
| `badges/badge-suitcase.png` | 119x122 | 実績バッジ: スーツケース | 1 |  |
| `badges/badge-camera.png` | 117x116 | 実績バッジ: カメラ | 1 |  |
| `badges/badge-mountain.png` | 116x114 | 実績バッジ: 山と太陽 | 1 |  |
| `badges/badge-map-pin.png` | 121x116 | 実績バッジ: 地図ピン | 1 |  |
| `badges/badge-crown.png` | 123x118 | 実績バッジ: 王冠と月桂樹 | 1 |  |
| `badges/badge-books.png` | 118x118 | 実績バッジ: 本と月桂樹 | 1 |  |
| `badges/badge-wheel.png` | 120x118 | 実績バッジ: 船の舵輪 | 1 |  |

## effects/ (エフェクト)

| パス | サイズ(px) | 内容 | シート | 備考 |
|---|---|---|---|---|
| `effects/lightbulb.png` | 61x72 | 光る電球(鳥と一緒に使う装飾) | 1 |  |
| `effects/star-small.png` | 41x44 | 小さなオレンジの星 | 1 | 小さいアセット: 1xまで |
| `effects/star-big.png` | 70x74 | 大きなオレンジの星 | 1 |  |
| `effects/confetti.png` | 276x115 | 紙吹雪(大きな星を除く) | 1 |  |

## 命名メモ(依頼の例と異なるもの)

- 鳥: `bird-wave / cheer / think / chin / happy / read / listen / sleep`。`bird-default` は無し(立ち姿は `bird-wave`)。
- ミュートは2種: `icon-mute`(紺丸) / `icon-mute-alt`(オレンジのスピーカー)。シート2の丸ボタンは `icon-sound-on-round / icon-music-on-round / icon-sound-off-round / icon-music-off`。
- スタンプ: ピラミッドは `stamp-pyramids`(エジプトではなく描かれているもの名)。UKのスタンプは存在せず、`stamp-plane` が青い飛行機。
- 国カード: `card-<国>.png` は星ストリップなし、`card-<国>-rating.png` は星ストリップ付き。

## 省略したもの・品質メモ

- シート1 左上の少女バスト3種(通常/笑顔/悲しみ): Live2D側で処理済みのため対象外
- シート2のホーム/地図/本/ヘッドホン/パスポート/賞/歯車アイコン、国カード、バッジ、スタンプ帳、ルート進捗、スピナー、チケット: シート1(白背景)の方が高品質なため不使用
- シート2の小鳥の頭+空白吹き出し: 鳥の輪郭が背景のにじみと混ざり、きれいに切れないため省略
- シート2の切手のギザギザ縁(perforation): 縁と背景の色差が小さく分離できないため、青い絵柄部分のみ(postage-stamp-globe)
- シート2の空白吹き出し(クリーム・しっぽ付き)と三点リーダー吹き出し: 輪郭がほぼ背景に溶けるため省略(シート1のbubble-rect/pill-dotsを使用)
- シート1のルート進捗右端にある小さな丸パーツ(リング+矢印風): 意味が不明な断片のため省略
- 国カード下部の3つ星ストリップ単体(ui/stars-*.png): 星レーティングは pill-stars-3/4 と card-*-rating.png で代替できるため単体では出力していない
- `mascot/bird-listen.png`: 足がナビアイコンのプレートに接触していたため、足先の端を少し補正。
- `icons/icon-chart.png` / `icon-settings.png`: 同様に鳥の足が重なっていた上端をインペイントで補正(上辺が少しだけ他より粗い)。
- 元画像自体の解像度が低く縁に微細なにじみがあるため、鳥など小さなアセットは等倍以下での利用を推奨。
