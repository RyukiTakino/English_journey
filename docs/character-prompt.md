# English journey ガイドキャラクター（Live2D 風）の生成依頼

> このファイルは、ChatGPT（画像生成）に貼り付けて使います。
> 作った絵は、`D:\WineEngine\Tools\Live2D` の道具で「パーツ分け + メッシュ変形 + 揺れの物理」を付けて、
> アプリの中で動くキャラクターにします（目のまばたき、マウスを目で追う、髪の揺れ、呼吸）。
> 画像集（`docs/image-assets.md`）とは別の作業です。

---

## 1. 方針

### なぜ「人物」にするのか

`Tools\Live2D` のリグは、**顔・目・髪・体のある人物**を前提にパーツ分けします（目の位置、髪の房、頭の傾きを使うため）。
画像集（`image-assets.md`）の M1「渡り鳥」は、この仕組みに向いていません。
そのため、動かすガイドは**旅人の人物**にして、渡り鳥は画像集のまま「小さな相棒の静止画」として残す形を想定しています。

### 権利

`Tools\Live2D\README.md` のとおり、**自分で用意した絵（ChatGPT で描いたものなど）から作ったものだけ**を使います。
既存の作品のキャラクターや、実在の人物に似せた絵は使いません。

### 作る絵の数

| ID | 内容 | 優先度 |
|---|---|---|
| C1 | 基本の立ち絵（正面・無表情に近い穏やかな笑顔） | **まずこれだけ**。C1 で動かしてみて、良ければ増やす |
| C2 | 同じ絵で「喜び」の表情 | 正解のときの反応用 |
| C3 | 同じ絵で「困り顔」の表情 | 不正解のときの反応用 |

C2・C3 は、C1 と**ポーズ・構図・服・髪を完全に同じ**にして、表情だけ変えます。
こうしておくと、表情を切り替えても体の位置がずれません。

---

## 2. 絵の条件（リグを作りやすくするため）

ChatGPT に伝える内容の意味です。守られていないと、パーツ分けが難しくなります。

| 条件 | 理由 |
|---|---|
| **正面向き、腰から上（バストアップ〜ウエスト）** | 目・顔・髪・体の位置が分かりやすい。全身だと顔が小さくなり、目の動きが粗くなる |
| **背景は無地の白** | 背景を自動で取り除くため。影や模様があると髪や体と混ざる |
| **縦長（1024×1536）、頭の上と左右に余白** | 髪が絵の端で切れると、揺れたときに不自然になる |
| **目を大きく、黒目（虹彩）をはっきり描く** | 黒目がマウスを追うため。まつ毛も描いてあると、まばたきが自然になる |
| **髪は房がはっきり分かれた、中〜長めの髪** | 房ごとに揺らすため。短すぎると揺れが見えない |
| **髪色は、肌・服と違う色** | 髪の領域を色で自動判定するため |
| **腕は体の横に自然に下ろす（手は小さく、または描かない）** | 手が顔や髪に重なると、パーツ分けが難しくなる |
| **前髪が目にかからない** | 目のパーツを切り出すため |
| **帽子・メガネ・大きな耳飾りは付けない** | 目や髪と重なるため |
| **文字・ロゴ・模様の細かい服は避ける** | 切り抜きの境目が汚れやすい |
| **線画がはっきりした、フラットな塗り** | 切り抜きの精度が上がる |

---

## 3. キャラクター設定

画像集のブランドカラー（紺・夕焼けオレンジ・クリーム）に合わせます。
名前は仮です。決めたら、ここと `image-assets.md` の M・N シリーズを書き換えます。

| 項目 | 内容 |
|---|---|
| 役割 | アプリの案内役。世界中を旅して、英語を教えてくれる旅人 |
| 年齢の印象 | 10代後半〜20代前半。親しみやすく、頼れるお姉さん／お兄さんのような雰囲気 |
| 髪 | 中〜長めのウェーブがかった髪。色は**ライトブラウンか栗色**（肌・服と区別しやすい） |
| 目 | 大きく、黒目は**ティール（青緑）**。まつ毛あり |
| 服 | クリーム色のシャツ + **紺のスカーフ** + オレンジのリュックの肩ひも（画像集の渡り鳥と同じ配色） |
| 雰囲気 | 明るく、好奇心が強い。穏やかな笑顔 |

性別や見た目の好みを変えたい場合は、「髪」「目」「服」の項目だけ書き換えれば、そのまま使えます。

---

## 4. ChatGPT への指示

### 進め方

1. まず、下の **C1** のプロンプトを貼り付けて、1 枚作ってもらいます。
2. 気に入らない場合は、「髪を長く」「もう少し大人っぽく」のように修正を送って、納得いくまで作り直します。
3. **C1 が決まってから**、C2・C3 を作ります。必ず**C1 の画像を添付して**、「この画像の表情だけを変えて」と頼みます（別々に新規で作ると、顔や服が変わってしまいます）。
4. できた画像は、原寸のまま保存します（縮小しない）。

### 共通スタイル（C1〜C3 に必ず含める）

```
Anime-style flat illustration for a travel-themed English learning game app.
Clean, bold outlines and simple cel shading. Warm and friendly mood with a slightly retro travel-poster feel.
Color palette: deep navy (#14233a), sunset orange (#e2703a), cream (#f5f1e8), with muted teal (#2f7d7b) and mustard (#d9a441) as accents.
Front view, upper body (from the waist up), centered, facing the viewer directly.
Plain pure white background, no shadows on the background, no gradients, no props behind the character.
Vertical canvas 1024x1536, with generous empty margin above the head and on both sides (hair must not touch the image edge).
No text, no letters, no numbers, no logos, no watermark.
```

---

### C1　基本の立ち絵

```
Original character: a cheerful young traveler who acts as a friendly guide in an English learning app.
Age impression: late teens to early twenties. Gentle, curious, reliable.

Face: large expressive eyes with clearly visible teal irises and defined eyelashes, eyes fully open and looking straight at the viewer.
A small calm smile with a closed mouth. Eyebrows relaxed. Bangs short and swept to the sides so they never cover the eyes.

Hair: medium-to-long wavy light-brown (chestnut) hair, clearly separated into several distinct locks on both sides of the face and behind the shoulders.
The hair color must be clearly different from the skin tone and the clothes.

Outfit: a cream-colored collared shirt, a navy scarf tied loosely at the neck, and the orange shoulder straps of a travel backpack.
No hat, no glasses, no large earrings, no detailed patterns.

Pose: standing straight, facing the viewer, arms relaxed at the sides, hands out of frame or very small and not overlapping the face or hair.

(Apply the common style block above.)
```

### C2　喜び（C1 の画像を添付して使う）

```
Using the attached image as the exact reference, redraw the SAME character with the SAME pose, framing, hair, outfit and colors.
Change ONLY the facial expression: a big joyful smile with the mouth open, eyes still open and bright, with the teal irises visible.
Eyebrows slightly raised. Do not move the head, shoulders, hair or scarf. Keep the plain white background and the same canvas size.
No text.
```

### C3　困り顔（C1 の画像を添付して使う）

```
Using the attached image as the exact reference, redraw the SAME character with the SAME pose, framing, hair, outfit and colors.
Change ONLY the facial expression: slightly troubled and thinking, eyebrows angled up in the middle, a small wavy mouth,
eyes still open with the teal irises visible. Not too sad. Do not move the head, shoulders, hair or scarf.
Keep the plain white background and the same canvas size. No text.
```

---

## 5. できあがった後の流れ

絵ができたら、次の順で進めます（`D:\WineEngine\Tools\Live2D` の道具を使います）。

| 手順 | 内容 |
|---|---|
| 1 | 絵を `D:\WineEngine\Scratch\` に置く |
| 2 | `new_picture.py` で、パーツ分け用のフォルダを作る |
| 3 | 絵の中の位置（顔・目・黒目）を、座標で書き込む（`seg_prompts.json` `shapes.json`） |
| 4 | SAM 2 で切り抜き → 層に分ける → Web 用に書き出す |
| 5 | ブラウザのプレビューで、まばたき・視線・髪の揺れを確認して調整する |
| 6 | 書き出した層の画像と動かし方の JSON を、このアプリの `frontend/assets/characters/` に写す |
| 7 | 画面に表示する部品（`Mascot`）を作り、「正解」「不正解」などの出来事（`EventBus`）で表情を切り替える |

3 と 4 の座標の入力と実行は、こちらで行えます。絵ができたらファイルの場所を教えてください。

## 6. 次の判断

- 画像集 `image-assets.md` の M1〜M9（渡り鳥の各ポーズ）と N1〜N5（空の状態のイラスト）は、今は渡り鳥のままです。
  動くキャラクターを案内役にする場合は、これらを次のどちらかにします。
  - **A. 削る**: 動くキャラクターが全部の反応を担当する（M2〜M9 は不要。N シリーズは人物に書き換える）
  - **B. 残す**: 渡り鳥は「小さな相棒」として、静止画だけ使う（今のまま）
