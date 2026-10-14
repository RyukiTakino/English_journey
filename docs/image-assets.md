# English journey 画像素材の生成依頼

> ログイン画面は当面作らないため、プロトタイプ版から背景 G1〜G4 を除いています（54枚）。
> ID（G5 など）は、プロトタイプと同じにするため振り直していません。

> このファイルは、ChatGPT にそのまま貼り付けて使います。
> 貼り付けると、ChatGPT が全54枚を順番に作り、最後に ZIP ファイルにまとめて渡してくれます。
> 途中で止まったときは「続けて」と送ってください。
> ZIP を展開すると `images/` フォルダができるので、中身を `frontend/assets/images/` に入れてください。

---

## ChatGPT への指示

あなたは、旅行をテーマにした英語学習ゲームアプリ「English journey」の画像素材を作るデザイナーです。
このあとに書いてある「画像リスト」の54枚の画像を作り、最後に ZIP ファイルにまとめて渡してください。

### 進め方

1. **確認を取らずに、すぐに作り始めてください。** 質問や「よろしいですか？」の確認は不要です。
2. 画像リストの順番どおりに、**1回の返事の中で、できるだけ多くの画像を続けて作ってください。** 1枚ごとに私の返事を待たないでください。
3. 画像を1枚作るたびに、その下に `M1　mascot/guide-default.png` のように **ID とファイル名を1行だけ** 書いてください。説明や感想は書かないでください。
4. 1回の返事で作れる枚数の上限などで途中で止まる場合は、最後に `ここまで：S3　次：S4　続きは「続けて」と送ってください。` とだけ書いてください。私が「続けて」と送ったら、次の画像から再開してください。
5. 54枚すべて作り終えたら、Python（コード実行）を使って次のようにまとめてください。
   - 各画像を、画像リストのファイル名どおりのフォルダとファイル名で保存する（例：`images/mascot/guide-default.png`、`images/brand/logo-plane.png`）
   - 透過が指定されている画像は、透過 PNG のまま保存する
   - `images/` フォルダ全体を `english-journey-images.zip` にまとめ、ダウンロードリンクを表示する
   - ZIP の中のファイル一覧と、枚数（54枚）を表示する
6. ZIP にまとめられない事情がある場合（作った画像を Python から読み込めない、など）は、理由を1行で伝えたうえで、私が手で保存できるよう、全画像の ID とファイル名の一覧を最後に表示してください。

### 作ったあとの修正

- 私が「M3 をやり直し」と送ったら、その画像だけを作り直してください。「M3 をやり直し：もっと明るく」のように理由が書いてあれば、それを反映してください。
- 作り直したあとは、作り直した画像を含めて ZIP を作り直し、新しいダウンロードリンクを表示してください。

### すべての画像に共通するルール

- **絵柄**：下の「共通スタイル」を、すべての画像に必ず適用してください。会話が長くなっても、最初の画像と同じ絵柄・同じ色を保ってください。
- **文字を入れない**：画像の中に、文字・数字・ロゴの文字・透かしを一切入れないでください。看板やラベルも、文字のない図形にしてください。サービス名「English journey」の文字も、アプリ側でフォントを使って入れるので描かないでください。
- **背景**：「背景：透明」と書いてある画像は、背景を透明（transparent background）にしてください。「背景：あり」の画像は、画面いっぱいに描いてください。
- **比率**：「正方形」は 1024×1024、「横長」は 1536×1024、「縦長」は 1024×1536 で作ってください。
- **ガイドキャラクター**：M1 で作ったキャラクターと、まったく同じ見た目（形、色、リュック、スカーフ）で描いてください。
- 実在の作家・スタジオ・作品の絵柄をまねないでください。国旗や実在のロゴも描かないでください。

### レイヤー（部品）に分ける画像のルール

ロゴ・背景・バッジ・搭乗券の一部は、アプリの中で動きを付けるために、**部品ごとに別の画像として作ります**。
たとえば、ロゴの紙飛行機だけが地球の周りを回る、背景の雲だけが流れる、バッジの光だけが表面を走る、といった動きです。
各グループの「動きの予定」に、アプリでどう動かすかを書いてあるので、それに合う部品にしてください。

- 「レイヤー」と書いてある画像は、**その部品だけ** を描いた透過 PNG にしてください。同じグループの他の部品は描き込まないでください。
- 部品は画像の中央に、周りに少し余白をとって置いてください。位置合わせはアプリ側で行うので、他の部品とぴったり重なる位置である必要はありません。
- ただし「全幅レイヤー」と書いた画像（背景の雲や建物の列など）は、横幅いっぱいに描き、左右の端が切れても不自然にならないようにしてください。
- 同じグループの部品は、絵柄・色・線の太さ・光の向き（左上から光が当たる）をそろえてください。
- グループに「完成見本」がある場合は、それを最初に作り、続く部品はその見本と同じデザインを分解したものにしてください。

### 共通スタイル

```
Flat illustration for a travel-themed English learning game app.
Warm and friendly, with a slightly retro travel-poster feel.
Color palette: deep navy (#14233a), sunset orange (#e2703a), cream paper (#f5f1e8),
with muted teal (#2f7d7b) and mustard (#d9a441) as accents.
Clean simple shapes, soft paper grain texture, gentle shadows.
No text, no letters, no numbers, no logos, no watermark.
```

---

## 画像リスト

この順番で作ってください。全部で 54 枚です。

### 第1部：ガイドキャラクター

アプリの案内役です。リュックを背負った小さな渡り鳥で、画面のあちこちで、正解・不正解・ヒントなどに反応します。
キャラクターは1枚の絵のまま使い、アプリ側で弾む・傾く・拡大するなどの動きを付けます。

#### M1　mascot/guide-default.png
- 比率：正方形　背景：透明
- 内容：
```
Original mascot character: a small round migratory bird who loves traveling.
Wears a tiny orange backpack and a navy scarf. Big friendly eyes, simple shapes that are easy to draw again
in other poses. Full body, standing, waving one wing. Centered.
```

#### M2　mascot/guide-happy.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1 (same shape, colors, orange backpack, navy scarf).
Pose: jumping with joy, both wings up, eyes closed with a big smile. Full body, centered.
```

#### M3　mascot/guide-sad.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1. Pose: slightly disappointed but calm, scratching its head with one wing,
a small sweat drop. Not too sad. Full body, centered.
```

#### M4　mascot/guide-think.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1. Pose: thinking, one wing on its chin, a small light bulb floating above.
Full body, centered.
```

#### M5　mascot/guide-cheer.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1. Pose: cheering, holding up a small round blank stamp with both wings,
sparkles around. Full body, centered.
```

#### M6　mascot/guide-read.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1. Pose: sitting and reading an open book with no visible text, looking curious.
Full body, centered.
```

#### M7　mascot/guide-listen.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1. Pose: wearing headphones, eyes closed, listening carefully,
a few small music notes around. Full body, centered.
```

#### M8　mascot/guide-fly.png
- 比率：横長　背景：透明
- 内容：
```
The same bird character as M1. Pose: flying to the right with wings spread, backpack on,
soft motion lines behind. Full body.
```

#### M9　mascot/guide-sleep.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1. Pose: sleeping while sitting, head tilted, small curved sleep lines
(shapes only, not letters). Full body, centered.
```

### 第2部：正解・不正解のマーク

問題を採点したときに、大きく押されるハンコ風のマークです。
動きの予定：大きい状態から縮みながら「ポン」と押される。

#### E3　effects/mark-correct.png
- 比率：正方形　背景：透明
- 内容：
```
A big hand-drawn circle mark like a sunset-orange ink stamp, meaning "correct".
Imperfect ink texture with uneven pressure. Centered.
```

#### E4　effects/mark-wrong.png
- 比率：正方形　背景：透明
- 内容：
```
A big hand-drawn cross mark like a muted blue-gray ink stamp, meaning "try again".
Imperfect ink texture with uneven pressure. Centered.
```

### 第3部：国のスタンプ

世界一周で、その国の問題に6割以上正解するとパスポートに押されるスタンプです。国名は画像に入れません（アプリ側で文字を重ねます）。
動きの予定：上から落ちてきて、少し回転しながら押される。

#### S1　stamps/stamp-uk.png
- 比率：正方形　背景：透明
- 内容：
```
A single round passport rubber stamp, slightly tilted, imperfect ink texture (uneven pressure, small gaps).
Inside the circle: a simple line drawing of a clock tower. Double ring border with small decorative dots.
No text or letters anywhere. One ink color: dark blue (#2f5d8a).
```

#### S2　stamps/stamp-france.png
- 比率：正方形　背景：透明
- 内容：
```
A single round passport rubber stamp, slightly tilted, imperfect ink texture (uneven pressure, small gaps).
Inside the circle: a simple line drawing of an iron lattice tower. Double ring border with small decorative dots.
No text or letters anywhere. One ink color: royal blue (#3b5ba5).
```

#### S3　stamps/stamp-italy.png
- 比率：正方形　背景：透明
- 内容：
```
A single round passport rubber stamp, slightly tilted, imperfect ink texture (uneven pressure, small gaps).
Inside the circle: a simple line drawing of a ruined round amphitheater. Double ring border with small decorative dots.
No text or letters anywhere. One ink color: green (#2f7d5b).
```

#### S4　stamps/stamp-egypt.png
- 比率：正方形　背景：透明
- 内容：
```
A single round passport rubber stamp, slightly tilted, imperfect ink texture (uneven pressure, small gaps).
Inside the circle: a simple line drawing of three pyramids and a sun. Double ring border with small decorative dots.
No text or letters anywhere. One ink color: ochre (#b07a2a).
```

#### S5　stamps/stamp-australia.png
- 比率：正方形　背景：透明
- 内容：
```
A single round passport rubber stamp, slightly tilted, imperfect ink texture (uneven pressure, small gaps).
Inside the circle: a simple line drawing of an opera house with sail-shaped roofs by the water.
Double ring border with small decorative dots. No text or letters anywhere. One ink color: terracotta red (#c0573a).
```

#### S6　stamps/stamp-usa.png
- 比率：正方形　背景：透明
- 内容：
```
A single round passport rubber stamp, slightly tilted, imperfect ink texture (uneven pressure, small gaps).
Inside the circle: a simple line drawing of a statue holding up a torch. Double ring border with small decorative dots.
No text or letters anywhere. One ink color: plum purple (#7a3b6e).
```

#### S7　stamps/stamp-empty.png
- 比率：正方形　背景：透明
- 内容：
```
An empty round dashed circle outline, like a blank space waiting for a passport stamp.
Light gray-blue dashed line, nothing inside. Centered.
```

### 第4部：ロゴ（レイヤー）

ロゴは「絵の部分」だけを作ります。「English journey」の文字はアプリ側でフォントを使って横に並べます。
動きの予定：紙飛行機が地球のまわりを1周し、通ったあとに点線（アプリ側で描く）が残る。地球はゆっくり回る。
B2 が完成見本、B3・B4 がその部品です。

#### B1　brand/app-icon.png
- 比率：正方形　背景：あり
- 内容：
```
App icon for a travel and English learning app. A simple globe with a small orange paper airplane
flying around it, leaving a dotted trail. Bold and readable at small sizes.
Deep navy background filling the whole square.
```

#### B2　brand/logo-mark.png（完成見本）
- 比率：正方形　背景：透明
- 内容：
```
Logo mark only: a simple globe with a small orange paper airplane circling it with a dotted trail.
The same design as the app icon B1, but without the background square. Centered, bold shapes.
```

#### B3　brand/logo-globe.png（レイヤー：地球だけ）
- 比率：正方形　背景：透明
- 内容：
```
Layer part of the logo B2: only the globe, exactly the same design and colors as in B2.
No airplane, no dotted trail. Centered with some empty margin.
```

#### B4　brand/logo-plane.png（レイヤー：紙飛行機だけ）
- 比率：正方形　背景：透明
- 内容：
```
Layer part of the logo B2: only the orange paper airplane, exactly the same design as in B2,
pointing to the right. No globe, no dotted trail. Centered with plenty of empty margin.
```

### 第5部：背景（レイヤー）

ホーム画面の背景は、奥行きのある動き（遠くのものほどゆっくり動く）を付けるために、空と雲を分けて作ります。

**ホーム画面**
動きの予定：空は動かない。雲がゆっくり流れる。

#### G5　backgrounds/home-sky.png（レイヤー：空）
- 比率：横長　背景：あり
- 内容：
```
Background layer: only a calm daytime sky gradient, light blue to cream near the bottom. Very low contrast,
used behind text. No clouds, no airplanes.
```

#### G6　backgrounds/home-clouds.png（全幅レイヤー：雲）
- 比率：横長　背景：透明
- 内容：
```
Full-width layer: only a few rounded white clouds and two tiny distant airplanes, flat style.
Everything else transparent. The left and right edges should look natural when repeated side by side.
```

**その他の背景**（1枚の絵のまま使う）

#### G7　backgrounds/paper-texture.png
- 比率：正方形　背景：あり
- 内容：
```
Seamless tileable texture of warm cream paper (#f5f1e8) with very subtle grain and fibers.
Low contrast, no objects. The edges must connect seamlessly when tiled.
```

#### G8　backgrounds/passport-cover.png
- 比率：横長　背景：あり
- 内容：
```
Front cover of a travel passport, deep navy leather texture, a simple embossed globe emblem
in muted gold in the center, slightly worn edges. Flat front view. No text.
```

#### G9　backgrounds/world-map-illust.png
- 比率：横長　背景：あり
- 内容：
```
Illustrated world map in equirectangular projection (plate carrée), the whole world from left to right,
simple continent shapes on a calm teal ocean, small decorative waves, no country borders, no labels.
Keep continent shapes and positions as accurate as possible.
```

### 第6部：実績バッジ（レイヤー）

条件を満たすともらえるメダルです。全バッジで同じ「メダルの土台」を使い、その上に種類ごとの「絵柄」を重ねます。土台を共通にすることで、全種類の見た目が自然にそろいます。
動きの予定：土台が回転しながら現れ、絵柄が少し遅れて弾むように出てくる。最後に光（A9）が表面を斜めに走る。まだ取っていないバッジは、アプリ側で土台を灰色にして、鍵（A10）を重ねる。
バッジの名前や数字はアプリ側で重ねます。

#### A0　badges/badge-base.png（レイヤー：メダルの土台）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an empty round achievement medal for a game. Gold rim, a small navy and orange ribbon at the bottom,
a plain cream circle in the center left empty for an icon. Front view. No icon, no shine streak, no text.
```

#### A1　badges/icon-first-step.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon to be placed in the center of the medal A0. A small pair of footprints, navy and orange,
bold simple shapes. Only the icon, no medal, no circle behind it. Centered.
```

#### A2　badges/icon-perfect.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1, to be placed in the center of the medal A0.
A star inside a laurel wreath. Only the icon, no medal, no circle behind it. Centered.
```

#### A3　badges/icon-streak.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1. A flame. Only the icon, no medal, no circle behind it. Centered.
```

#### A4　badges/icon-words.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1. An open dictionary book with no visible text.
Only the icon, no medal, no circle behind it. Centered.
```

#### A5　badges/icon-listener.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1. Headphones. Only the icon, no medal, no circle behind it. Centered.
```

#### A6　badges/icon-culture.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1. A teacup and a slice of pizza.
Only the icon, no medal, no circle behind it. Centered.
```

#### A7　badges/icon-explorer.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1. A compass. Only the icon, no medal, no circle behind it. Centered.
```

#### A8　badges/icon-world-tour.png（レイヤー：絵柄）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: an icon in the same style as A1. A globe wearing a small crown.
Only the icon, no medal, no circle behind it. Centered.
```

#### A9　badges/badge-shine.png（レイヤー：光）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: a single soft diagonal white light streak with a gentle glow, slightly transparent,
used to sweep across a medal. Only the light streak, nothing else.
```

#### A10　badges/icon-lock.png（レイヤー：鍵）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: a small gray padlock icon in the same style as A1, to be placed on a locked medal.
Only the padlock. Centered.
```

### 第7部：UI パーツ

ボタンや文字はアプリ側で作るので、飾りの部分だけを作ります。

**搭乗券（レイヤー）**
ホーム画面の「次の国へ」のカードに使います。
動きの予定：「出発」を押すと、右側の半券（U2）がミシン目から切り離されて落ちる。
U1 と U2 は、並べると1枚の搭乗券になるように、高さ・紙の色・上部の帯の色をそろえてください。

#### U1　ui/ticket-main.png（レイヤー：搭乗券の本体）
- 比率：横長　背景：透明
- 内容：
```
Layer part: the main (left) part of an empty airline boarding pass, horizontal, cream paper with a navy header strip,
subtle barcode-like stripes (no numbers), lots of empty space for text. The right edge is a straight perforated
tear line. No stub attached.
```

#### U2　ui/ticket-stub.png（レイヤー：半券）
- 比率：正方形　背景：透明
- 内容：
```
Layer part: only the small stub of the same boarding pass as U1, the same height, cream paper and navy header strip.
The left edge is a perforated tear line. Empty space for text. Centered.
```

**その他のパーツ**（1枚の絵のまま使う）

#### U3　ui/ribbon-banner.png
- 比率：横長　背景：透明
- 内容：
```
A wide horizontal ribbon banner with folded ends, sunset orange, the center left empty for text.
```

#### U4　ui/category-sight.png
- 比率：正方形　背景：透明
- 内容：
```
A simple round icon: a map pin standing on a tiny landmark silhouette, navy and teal.
Bold, readable at small size.
```

#### U5　ui/category-culture.png
- 比率：正方形　背景：透明
- 内容：
```
A simple round icon in the same style as U4: a teacup with steam and a small sparkle, mustard and orange.
Bold, readable at small size.
```

#### U6　ui/category-news.png
- 比率：正方形　背景：透明
- 内容：
```
A simple round icon in the same style as U4: a vintage radio with sound waves, orange and navy.
Bold, readable at small size.
```

#### U7　ui/map-pin.png
- 比率：正方形　背景：透明
- 内容：
```
A single map pin marker, teardrop shape, white outline, empty round center for a label, soft shadow below.
```

#### U8　ui/suitcase-stickers.png
- 比率：正方形　背景：透明
- 内容：
```
A vintage suitcase covered with round travel stickers that show simple landmark drawings
(no text on the stickers), slightly worn.
```

### 第8部：演出用の素材

動きの予定：紙吹雪は1つずつ切り出して舞わせる。キラキラは点滅させる。紙飛行機は画面を横切らせる。

#### E1　effects/confetti-sheet.png
- 比率：正方形　背景：透明
- 内容：
```
A sprite sheet of confetti pieces arranged on a loose grid with clear spacing between them:
small rectangles, circles, stars and tiny paper airplanes in the palette colors.
```

#### E2　effects/sparkle.png
- 比率：正方形　背景：透明
- 内容：
```
A single four-pointed sparkle star with a soft glow, warm white and mustard. Centered.
```

#### E5　effects/paper-plane.png
- 比率：正方形　背景：透明
- 内容：
```
A single folded paper airplane seen from the side, flying to the right, cream paper with an orange stripe.
No trail (the app draws the trail). Centered.
```

### 第9部：「まだ何もない」ときのイラスト

M1 のガイドキャラクターが出てくるイラストです。M1 とまったく同じ見た目で描いてください。

#### N1　empty/no-words.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1, holding an empty notebook and looking at it curiously.
```

#### N2　empty/no-history.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1, standing next to an empty open suitcase, ready to pack.
```

#### N3　empty/loading.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1, looking at a big map with no labels and planning a route with a pencil.
```

#### N4　empty/error.png
- 比率：正方形　背景：透明
- 内容：
```
The same bird character as M1, holding a map upside down, looking a little confused.
A small curl of smoke above its head (a simple shape, not a question mark).
```

#### N5　empty/tour-complete.png
- 比率：横長　背景：透明
- 内容：
```
The same bird character as M1, standing on top of a small globe, raising both wings in celebration,
confetti around.
```

---

## 画像リストの順番（確認用）

M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 →
E3 → E4 →
S1 → S2 → S3 → S4 → S5 → S6 → S7 →
B1 → B2 → B3 → B4 →
G5 → G6 → G7 → G8 → G9 →
A0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → A9 → A10 →
U1 → U2 → U3 → U4 → U5 → U6 → U7 → U8 →
E1 → E2 → E5 →
N1 → N2 → N3 → N4 → N5

合計：54枚
