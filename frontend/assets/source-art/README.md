# source-art（素材の元データ）

アプリでは読み込まない、素材の「元」のデータです（アセットの置き場所 `frontend/assets/` の中にまとめてあります。サーバーが配信はしますが、画面からは使いません）。絵を直したいときや、別のツール（Photoshop・Clip Studio・Krita・Live2D Cubism）で開くときに使います。

## characters/ … 案内キャラクターの PSD（層ごと）

| ファイル | 表情 |
|---|---|
| `guide_neutral.psd` | 基本（穏やかな笑顔） |
| `guide_happy.psd` | 喜び（正解のとき） |
| `guide_sad.psd` | 困り顔（不正解のとき） |

サイズ 1731×2596。**オブジェクトごとのレイヤー**に分けてあり、重ね順は、アプリで動かすときと同じです。

```
Hair_Front   前髪・横髪（手前）
  hair_front (bangs and crown)           前髪・頭頂の髪
  hair_side_R / hair_side_L              横髪（右・左）
Face
  Eye_R / Eye_L                          目（白目・黒目・目の線・まつ毛・目の前の髪）
  mouth (mouth line)                     口の線（基本の表情だけ）
  face (face skin and ears)              顔の肌と耳（まぶたも肌の色で描いてある）
Body
  part_scarf_tail (scarf tails)          スカーフのしっぽ（アプリでは振り子のように揺れる）
  body                                   首・肩・服・リュック
hair_back (back hair fill)               後ろ髪の下敷き（顔や髪の下に隠れる部分を髪の色で埋めた層）
```

- 各レイヤーは、元の位置のまま、透明な余白を切り詰めて入っています。
- レイヤー名・グループ名が英語なのは、PSD の旧形式の名前が日本語を書けないためです。
- 髪の下・服の下など、**絵に描かれていない隠れた部分は、周りの色から補って描いた**ものです（動かしたときにすき間が見えないようにするため）。丁寧に描き直したいときは、これらの層を直してください。

## 作り直し方

1. 元の絵（ChatGPT で作った立ち絵）から、`D:\WineEngine\Tools\Live2D` の道具で切り抜く（`docs/character-prompt.md`）
2. `python tools/live2d/build_model.py` … 層に分ける → 輪郭を整える → アプリ用に書き出す
3. PSD は `D:\WineEngine\Scratch\psdvenv\Scripts\python.exe tools/live2d/export_psd.py <絵のフォルダ> <出力 .psd>`

## git について

PSD は 1 つ約 25MB あります。リポジトリに入れたくないときは、`.gitignore` に `frontend/assets/source-art/*.psd` / `frontend/assets/source-art/**/*.psd` を足してください（コミットは、あなたが決めます）。
