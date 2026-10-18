const STORAGE_KEY = "english-journey.language";
const LANGUAGES = ["ja", "zh", "en", "la"];

const DICTIONARY = {
  ja: { home: "ホーム", map: "地図", tour: "世界一周", words: "単語帳", me: "マイページ", switchTo: "中文に切り替え", backHome: "ホームに戻る", chooseCity: "都市を選択", chooseCategory: "カテゴリを選択", showArticles: "記事を表示", readArticle: "記事を読む", searchArticles: "Wikipediaの記事を検索しています…", noArticles: "記事が見つかりませんでした。別のカテゴリをお試しください。" },
  zh: { home: "首页", map: "地图", tour: "环球之旅", words: "单词本", me: "我的页面", switchTo: "切换为 English", backHome: "返回首页", chooseCity: "选择城市", chooseCategory: "选择类别", showArticles: "显示文章", readArticle: "阅读文章", searchArticles: "正在搜索 Wikipedia 文章…", noArticles: "没有找到文章，请尝试其他类别。" },
  en: { home: "Home", map: "Map", tour: "World Tour", words: "Word Book", me: "My Page", switchTo: "Switch to Latin", backHome: "Back to Home", chooseCity: "Choose a city", chooseCategory: "Choose a category", showArticles: "Show articles", readArticle: "Read article", searchArticles: "Searching Wikipedia articles…", noArticles: "No articles found. Try another category." },
  la: { home: "Domus", map: "Mappa", tour: "Iter Mundanum", words: "Liber Verborum", me: "Pagina Mea", switchTo: "日本語へ", backHome: "Redi ad Domum", chooseCity: "Urbem elige", chooseCategory: "Genus elige", showArticles: "Articulos monstra", readArticle: "Articulum lege", searchArticles: "Articuli Vicipaediae quaeruntur…", noArticles: "Articuli non inventi sunt. Aliud genus proba." }
};

// Static interface phrases are translated from the Japanese source text.
const PHRASES = [
  ["ホーム", "Home", "首页", "Domus"], ["地図", "Map", "地图", "Mappa"], ["世界一周", "World Tour", "环球之旅", "Iter Mundanum"], ["単語帳", "Word Book", "单词本", "Liber Verborum"], ["マイページ", "My Page", "我的页面", "Pagina Mea"],
  ["世界一周ルート", "World tour route", "环球路线", "Iter mundanum"], ["行き先をえらぶ", "Choose a destination", "选择目的地", "Destinationem elige"], ["地図から国をさがす", "Find a country on the map", "在地图上查找国家", "Patriam in mappa quaere"],
  ["記事を読んで、ニュースを聴いて、スタンプを集めよう。", "Read articles, listen to the news, and collect stamps.", "阅读文章、收听新闻并收集印章。", "Articulos lege, nuntios audi et signa collige."],
  ["続きから・おすすめの記事", "Continue · Recommended articles", "继续学习 · 推荐文章", "Perge · Articuli commendati"], ["世界一周コンプリート！", "World tour complete!", "环球之旅完成！", "Iter mundanum perfectum!"], ["パスポートを開く", "Open passport", "打开护照", "Diploma aperi"],
  ["ルート", "Route", "路线", "Iter"], ["スタンプ帳", "Stamp book", "印章册", "Liber signorum"], ["スタンプのもらい方", "How to earn stamps", "如何获得印章", "Quomodo signa accipiantur"], ["次の目的地", "Next destination", "下一个目的地", "Proxima destinatio"],
  ["カードで復習", "Review with cards", "用卡片复习", "Chartis repete"], ["記事を読みにいく", "Read an article", "阅读文章", "Articulum lege"], ["学習履歴", "Study history", "学习记录", "Historia studiorum"], ["バッジ", "Badges", "徽章", "Insignia"], ["行きたいリスト", "Want to visit", "想去的地方", "Loca visitanda"],
  ["効果音", "Sound effects", "音效", "Sonitus"], ["連続学習", "Study streak", "连续学习", "Series studii"], ["正答率", "Accuracy", "正确率", "Accuratio"], ["スタンプ", "Stamps", "印章", "Signa"], ["単語", "Words", "单词", "Verba"], ["プロフィール", "Profile", "个人资料", "Profilum"], ["英語のレベル", "English level", "英语等级", "Gradus Anglicus"], ["名前を変える", "Change name", "修改姓名", "Nomen muta"],
  ["国をさがす", "Find a country", "查找国家", "Patriam quaere"], ["地図で国をさがす", "Find a country on the map", "在地图上查找国家", "Patriam in mappa quaere"], ["世界地図", "World map", "世界地图", "Mappa mundi"], ["記事で旅する", "Travel through articles", "通过文章旅行", "Per articulos peregra"],
  ["ホームに戻る", "Back to Home", "返回首页", "Redi ad Domum"], ["国の選択に戻る", "Back to countries", "返回国家选择", "Redi ad patrias"], ["都市の選択に戻る", "Back to cities", "返回城市选择", "Redi ad urbes"], ["カテゴリ選択に戻る", "Back to categories", "返回类别选择", "Redi ad genera"],
  ["都市を選んでください", "Choose a city", "请选择城市", "Urbem elige"], ["カテゴリを選んでください", "Choose a category", "请选择类别", "Genus elige"], ["選択した条件で記事を表示", "Show articles for this selection", "显示符合条件的文章", "Articulos secundum selectionem monstra"], ["記事を表示", "Show articles", "显示文章", "Articulos monstra"], ["記事を読む", "Read article", "阅读文章", "Articulum lege"],
  ["ニュースを聴く", "Listen to the news", "收听新闻", "Nuntios audi"], ["について", "About", "关于", "De"], ["問題に進む", "Continue to questions", "进入练习", "Ad quaestiones perge"], ["問題にチャレンジ", "Challenge yourself", "开始练习", "Te ipsum proba"], ["設定", "Settings", "设置", "Configurationes"], ["保存", "Save", "保存", "Serva"], ["やめる", "Cancel", "取消", "Abroga"], ["閉じる", "Close", "关闭", "Claude"],
  ["記事をさがす", "Find an article", "查找文章", "Articulum quaere"], ["学習をはじめる", "Start learning", "开始学习", "Disce incipere"], ["Wikipediaの記事を検索しています…", "Searching Wikipedia articles…", "正在搜索 Wikipedia 文章…", "Articuli Vicipaediae quaeruntur…"], ["記事が見つかりませんでした。別のカテゴリをお試しください。", "No articles found. Try another category.", "没有找到文章，请尝试其他类别。", "Articuli non inventi sunt. Aliud genus proba."]
];

export function getLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.includes(stored) ? stored : "ja";
  } catch { return "ja"; }
}

export function nextLanguage() {
  const index = LANGUAGES.indexOf(getLanguage());
  return LANGUAGES[(index + 1) % LANGUAGES.length];
}

export function setLanguage(language) {
  const next = LANGUAGES.includes(language) ? language : "ja";
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private browsing */ }
  document.documentElement.lang = next === "zh" ? "zh-CN" : next;
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { language: next } }));
}

export function t(key) { return DICTIONARY[getLanguage()][key] ?? key; }

export function applyTranslations(root) {
  const language = getLanguage();
  document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  const column = { ja: 0, zh: 2, en: 1, la: 3 }[language];
  const replacements = new Map(PHRASES.map((row) => [row[0], row[column]]));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const value = node.nodeValue.trim();
    if (value && replacements.has(value)) node.nodeValue = node.nodeValue.replace(value, replacements.get(value));
  });
  root.querySelectorAll("[aria-label], [title]").forEach((el) => {
    for (const attr of ["aria-label", "title"]) {
      const value = el.getAttribute(attr);
      if (value && replacements.has(value)) el.setAttribute(attr, replacements.get(value));
    }
  });
}

export function languageLabel() { return { ja: "中", zh: "EN", en: "LA", la: "日本語" }[getLanguage()]; }
