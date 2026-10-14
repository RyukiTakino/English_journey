# カナダ用の画像素材の生成依頼（2 枚）

> 「行きたい国」は、Python の DB に入っている 4 か国（イギリス・フランス・カナダ・オーストラリア）です。
> 画像素材の切り出し済みのシート（`frontend/assets/images/`）には、イギリス・フランス・オーストラリアのカードとスタンプはありますが、
> **カナダの分がありません**。この 2 枚を、ChatGPT（画像生成）で作ります。
> 今は、カナダのカードは「国の色の背景＋国コード（CA）」、スタンプは「国の色の丸い枠」で代わりに表示しています。

## 進め方

1. ChatGPT に、**見本の画像を 2 枚添付**します（絵柄をそろえるため）。
   - `frontend/assets/images/cards/card-uk.png`（カードの見本）
   - `frontend/assets/images/stamps/stamp-france.png`（スタンプの見本）
2. 下の **K1** → **K2** のプロンプトを、順に貼り付けます。
3. できた画像を、次の名前で保存します（背景は透明の PNG）。
   - K1 → `frontend/assets/images/cards/card-canada.png`
   - K2 → `frontend/assets/images/stamps/stamp-canada.png`
4. 保存できたら、`frontend/js/domain/constants.js` の `COUNTRY_CARD_IMAGES` と `COUNTRY_STAMP_IMAGES` に、`canada: "card-canada.png"` / `canada: "stamp-canada.png"` を 1 行ずつ足します（こちらでやります）。

## 共通のルール

- 文字・数字・ロゴ・透かしを、**画像の中に一切入れない**（国旗も描かない。メープルの葉は、国旗ではなく自然のモチーフとして可）。
- 見本と同じ絵柄（フラットなイラスト、やわらかい紙の質感、やさしい影）と、同じ配色にする。
- 配色: 紺 `#14233a`、夕焼けオレンジ `#e2703a`、クリーム `#f5f1e8`、差し色にティール `#2f7d7b` とマスタード `#d9a441`。

## K1　cards/card-canada.png（国のカード）

- 比率：縦長（見本のカードと同じ 3:4）　背景：透明（角丸のカードの外側は透明）
- 内容：

```
Match the attached card (the UK card) exactly in style, framing, rounded corners and palette.
A portrait travel-poster card of Canada: in the foreground a calm turquoise mountain lake with a few pine trees,
in the middle the slim CN Tower of Toronto rising beside a hint of the city skyline,
in the background snow-capped Rocky Mountains under a blue sky with soft white clouds.
Flat illustration, warm and friendly, slightly retro travel-poster feel. Rounded-corner card shape with a thin light border.
No text, no letters, no numbers, no flag, no logo, no watermark. Transparent background outside the card.
```

## K2　stamps/stamp-canada.png（パスポートのスタンプ）

- 比率：正方形　背景：透明
- 内容：

```
Match the attached stamp (the France stamp) exactly in style: a single round passport rubber stamp, slightly tilted,
imperfect ink texture (uneven pressure, small gaps), double ring border with small decorative dots.
Inside the circle: a simple line drawing of the CN Tower with a maple leaf beside it.
No text or letters anywhere. One ink color: deep red (#b8403a).
Transparent background.
```
