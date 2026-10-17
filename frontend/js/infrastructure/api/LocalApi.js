/**
 * サーバーなしで動かすための、サーバーの代わり（モック）
 *
 * 層：infrastructure
 * 担当：フロント（バックエンドの API が出来上がるまでの開発用。出来たら HttpApi に切り替える）
 *
 * HttpApi と同じ request(method, path, body) の形で、サーバーと同じ形の JSON を返します。
 * これがあるので、バックエンドが未完成でもフロントの画面を作り進められます。
 *
 * - 教材は data/seed.json（手書きの記事・問題・ニュース・単語）を読み込む
 * - 学習記録（スタンプ・履歴・単語帳・行きたいリスト・バッジ）は localStorage に保存する（このブラウザの中だけ）
 * - ログインは無い。ブラウザごとに 1 人分の記録を持つ
 * - 採点・スタンプ・バッジ・連続日数のルールは、本物のサーバーと同じ考え方でここに書いてある
 * - Gemini と YouTube は使わない（API キーをフロントに置けないため）
 *
 * TODO(Backend): 本物の API が出来たら、返す JSON の形・採点とバッジのルールがここと一致しているか確認する。
 *            違う場合は、フロントに知らせる（ここの形を直す）。
 * TODO(Backend): バッジのルール（下の BADGES）と、スタンプの基準（STAMP_RATE）を、サーバー側の仕様に合わせる。
 * TODO(API): data/seed.json は仮の初期教材。本物の seed が出来たら差し替える（形は buildSeed が受け取る形）。
 */
import { ApiError } from "./ApiClient.js";

/** 学習記録の保存先（localStorage のキー） */
const STORE_KEY = "english-journey.local.v1";
/** 初期教材の場所。このファイルの場所を基準にするので、どのページから使っても同じ場所を指す */
const SEED_URL = new URL("../../../data/seed.json", import.meta.url).href;
/** この正答率以上でスタンプがもらえる */
const STAMP_RATE = 0.6;
const LEVELS = ["A2", "B1", "B2"];

// ---------- バッジのルール ----------
// check(progress, seed) が true になったときに獲得する。画像は assets/images/badges/ にある
const BADGES = [
  { id: "first-step", name: "はじめの一歩", description: "はじめて問題を解いた", check: (p) => p.history.length >= 1 },
  { id: "perfect", name: "全問正解", description: "1回の学習で全問正解した", check: (p) => p.history.some((h) => h.correct === h.total) },
  { id: "streak", name: "3日続けて", description: "3日続けて学習した", check: (p) => streakDays(p.history) >= 3 },
  { id: "words", name: "単語コレクター", description: "単語帳に10語保存した", check: (p) => p.words.length >= 10 },
  { id: "listener", name: "聞き取り上手", description: "ニュースを3本クリアした", check: (p) => clearedRefs(p, "listen").size >= 3 },
  // DB には「文化」の記事が無い（観光名所だけ）ので、記事を3本クリアしたら取れるバッジにしている
  { id: "reader", name: "読書家", description: "記事を3本クリアした", check: (p) => clearedRefs(p, "read").size >= 3 },
  { id: "explorer", name: "3か国の旅人", description: "3か国のスタンプを集めた", check: (p) => Object.keys(p.stamps).length >= 3 },
  {
    id: "world-tour",
    name: "世界一周",
    description: "すべての国のスタンプを集めた",
    check: (p, seed) => Object.keys(p.stamps).length >= seed.countries.length
  }
];

/** 6割以上正解した記事・ニュースの ID の集まり */
function clearedRefs(p, kind) {
  return new Set(p.history.filter((h) => h.kind === kind && h.correct / h.total >= STAMP_RATE).map((h) => h.refId));
}

// ---------- 日付 ----------
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowIso = () => {
  const d = new Date();
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 連続学習日数。今日（無ければ昨日）から、さかのぼって続いている日数 */
function streakDays(history) {
  const days = new Set(history.map((h) => h.createdAt.slice(0, 10)));
  const d = new Date();
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ---------- 教材の準備 ----------

/** 文字列から「決まった乱数」を作る（同じ記事なら、毎回同じ並び順にするため） */
function seededRandom(key) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 手書きの問題は正解の位置が偏りやすいので、選択肢を並べ替える */
function shuffleChoices(questions, key) {
  const rand = seededRandom(key);
  return questions.map((q) => {
    const choices = [...q.choices];
    const correct = choices[q.answer];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { text: q.q, choices, answer: choices.indexOf(correct), hint: q.hint || "", explanation: q.explain || "" };
  });
}

/** seed.json を API の形に組み直す */
function buildSeed(raw) {
  const countries = [];
  const trips = {};
  const lessons = {};
  const news = {};
  for (const c of [...raw.countries].sort((a, b) => a.tour_order - b.tour_order)) {
    const cTrips = c.trips.map((t) => {
      const trip = {
        id: t.id,
        countryId: c.id,
        name: t.name,
        nameEn: t.nameEn,
        category: t.category,
        city: t.city,
        tip: t.tip,
        description: t.desc,
        level: t.level,
        minutes: t.minutes,
        imageKey: t.img || t.wiki,
        wikiTitle: t.wiki
      };
      trips[t.id] = trip;
      lessons[t.id] = { level: t.level, article: t.article, questions: shuffleChoices(t.questions, t.id), summary: t.summary };
      return trip;
    });
    news[c.id] = { ...c.news, questions: shuffleChoices(c.news.questions, c.id) };
    countries.push({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      code: c.code,
      region: c.region,
      lat: c.lat,
      lng: c.lng,
      color: c.color,
      tourOrder: c.tour_order,
      capital: c.capital,
      language: c.language,
      currency: c.currency,
      phrase: c.phrase,
      description: c.desc,
      wikiJa: c.wikiJa,
      trips: cTrips
    });
  }
  return { countries, trips, lessons, news, glossary: raw.glossary };
}

// ---------- 単語 ----------

/** 活用形から、辞書の見出し語の候補を作る（"gondolas" → "gondola" など） */
function wordCandidates(word) {
  const w = word.toLowerCase().replace(/’/g, "'").replace(/'s$/, "");
  const out = [w];
  for (const [suf, rep] of [["ies", "y"], ["es", ""], ["s", ""], ["ed", ""], ["ed", "e"], ["d", ""], ["ing", ""], ["ing", "e"]]) {
    if (w.endsWith(suf) && w.length > suf.length + 2) out.push(w.slice(0, -suf.length) + rep);
  }
  return [...new Set(out)];
}

/** 本文の中で、辞書に載っている単語の一覧（画面で下線を引く） */
function highlightWords(texts, glossary) {
  const found = new Set();
  texts.forEach((t) =>
    (t.match(/[A-Za-z][A-Za-z'’-]*/g) || []).forEach((w) => {
      if (wordCandidates(w).some((c) => glossary[c])) found.add(w.toLowerCase());
    })
  );
  return [...found];
}

/** 要約の簡易採点（キーワードがどれだけ入っているか）。本物のサーバーでは Gemini が採点する予定 */
function keywordGrade(text, summary) {
  const t = text.toLowerCase();
  const matched = [];
  const missed = [];
  summary.keywords.forEach((alts) => (alts.some((a) => t.includes(a.toLowerCase())) ? matched : missed).push(alts[0]));
  const isJa = /[぀-ヿ一-龯]/.test(text);
  const len = text.trim().length;
  let score = Math.round((matched.length / Math.max(1, summary.keywords.length)) * 80);
  if (len >= (isJa ? 30 : 60)) score += 20;
  else if (len >= (isJa ? 15 : 30)) score += 10;
  const improve = [];
  if (missed.length) improve.push(`「${missed.slice(0, 3).join("」「")}」にあたる内容が入っていません。`);
  if (isJa) improve.push("内容はつかめています。次は英語で書いてみてください。");
  else if (len < 60) improve.push("1文だけだと情報が足りません。2文くらいにまとめると要点が伝わります。");
  return {
    score: Math.min(100, score),
    gradedBy: "keyword",
    good: [],
    improve,
    rewrite: "",
    matchedKeywords: matched,
    missedKeywords: missed,
    modelSummary: summary.model
  };
}

// ---------- Wikipedia（ブラウザから直接取得） ----------
const wikiCache = new Map();
function wikiSummary(lang, title) {
  const key = `${lang}:${title}`;
  if (!wikiCache.has(key)) {
    wikiCache.set(
      key,
      fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );
  }
  return wikiCache.get(key);
}

// ---------- 本体 ----------

export class LocalApi {
  #seedPromise = null;

  /** 教材を読み込む（1回だけ。2回目からは同じものを返す） */
  #seed() {
    this.#seedPromise ||= fetch(SEED_URL)
      .then((r) => r.json())
      .then(buildSeed);
    return this.#seedPromise;
  }

  /** 保存してある学習記録を読む。無い・壊れているときは、まっさらな記録を返す */
  #load() {
    const fresh = {
      profile: { displayName: "たびびと", level: "B1" },
      progress: { stamps: {}, history: [], words: [], wants: [], badges: {} }
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return saved ? { ...fresh, ...saved, progress: { ...fresh.progress, ...saved.progress } } : fresh;
    } catch {
      return fresh;
    }
  }

  #save(db) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
    } catch {
      /* 保存できない環境では、保存せずに続ける */
    }
  }

  /**
   * 観光地の画像の URL。Wikipedia の概要 API から代表画像を取る。
   * "fr:Tour_Eiffel" のように、先頭に言語を付けて指定できる。見つからなければ null。
   * TODO(API): 本物では、サーバーの GET /api/images?key=… に変える（HttpApi 側も同じ形に合わせる）。
   */
  async imageUrl(key, large) {
    const m = key.match(/^([a-z]{2}):(.+)$/);
    const d = await (m ? wikiSummary(m[1], m[2]) : wikiSummary("en", key));
    const thumb = d?.thumbnail?.source;
    if (!thumb) return null;
    return large ? thumb.replace(/\/\d+px-/, "/960px-") : thumb;
  }

  /**
   * ApiClient から呼ばれる入口。URL を見て、下の各処理に振り分ける。
   * @param {string} method
   * @param {string} path
   * @param {object} [body]
   */
  async request(method, path, body = {}) {
    const url = new URL(path, "http://local");
    const p = url.pathname;
    const seed = await this.#seed();
    const db = this.#load();
    const prog = db.progress;
    const fail = (status, code, message) => {
      throw new ApiError(code, message, status);
    };
    /** 記録を保存して、結果を返す */
    const done = (result) => {
      this.#save(db);
      return result;
    };
    let m;

    // 本物の通信っぽく少し待つ（読み込み中の表示を確認するため）。C# の await Task.Delay(80) に相当
    await new Promise((resolve) => setTimeout(resolve, 80));

    if (p === "/api/status") return { gemini: false, youtube: false, local: true };

    /** バッジの条件を調べ、新しく取れたものを返す */
    const awardBadges = () =>
      BADGES.filter((b) => !prog.badges[b.id] && b.check(prog, seed)).map((b) => {
        prog.badges[b.id] = nowIso();
        return { id: b.id, name: b.name, description: b.description, earnedAt: prog.badges[b.id] };
      });

    /** 採点結果を記録し、スタンプ・バッジを与える */
    const record = (kind, refId, countryId, title, correct, total, summaryScore = null) => {
      prog.history.unshift({ kind, refId, countryId, title, correct, total, summaryScore, createdAt: nowIso() });
      prog.history = prog.history.slice(0, 300);
      let stamp = null;
      if (correct / total >= STAMP_RATE && !prog.stamps[countryId]) {
        prog.stamps[countryId] = dateKey(new Date());
        stamp = { countryId, earnedAt: prog.stamps[countryId] };
      }
      return { stamp, badges: awardBadges() };
    };

    /** 答え合わせ。正解・解説は、ここ（採点結果）で初めて返す */
    const checkAnswers = (qs, answers = []) => {
      let correct = 0;
      const results = qs.map((q, i) => {
        const chosen = Number.isInteger(answers[i]) ? answers[i] : null;
        const ok = chosen === q.answer;
        if (ok) correct++;
        return { correct: ok, answer: q.answer, chosen, explanation: q.explanation };
      });
      return { correct, results };
    };

    // --- 自分 ---
    if (p === "/api/me" && method === "GET") {
      return {
        user: { displayName: db.profile.displayName, level: db.profile.level },
        stamps: Object.entries(prog.stamps).map(([countryId, earnedAt]) => ({ countryId, earnedAt })),
        wants: prog.wants,
        history: prog.history.slice(0, 50),
        streak: streakDays(prog.history),
        wordCount: prog.words.length,
        badgeCount: Object.keys(prog.badges).length
      };
    }
    if (p === "/api/me" && method === "PATCH") {
      if (LEVELS.includes(body.level)) db.profile.level = body.level;
      if ((body.displayName || "").trim()) db.profile.displayName = body.displayName.trim().slice(0, 16);
      return done({ ok: true });
    }
    if (p === "/api/me/progress" && method === "DELETE") {
      db.progress = { stamps: {}, history: [], words: [], wants: [], badges: {} };
      return done(null);
    }
    if (p === "/api/badges") {
      return BADGES.map((b) => ({ id: b.id, name: b.name, description: b.description, earnedAt: prog.badges[b.id] || null }));
    }

    // --- 国・観光地 ---
    if (p === "/api/countries") return structuredClone(seed.countries);
    if ((m = p.match(/^\/api\/countries\/(\w+)$/))) {
      const c = seed.countries.find((x) => x.id === m[1]) || fail(404, "NOT_FOUND", "国が見つかりません。");
      const s = await wikiSummary("ja", c.wikiJa);
      // regions（国の地域・都市）は、本物のサーバーのデータ。モックには無いので、空にしておく
      return { ...structuredClone(c), regions: [], info: { extract: s?.extract || c.description, sourceUrl: s?.content_urls?.desktop?.page || null } };
    }

    // --- カテゴリ（DB の categories に対応するモック） ---
    if (p === "/api/categories") {
      return [
        { id: 1, name: "食事", nameEn: "Food" },
        { id: 2, name: "建築", nameEn: "Architecture" },
        { id: 3, name: "文化", nameEn: "Culture" }
      ];
    }

    // --- 行きたいリスト ---
    if ((m = p.match(/^\/api\/wants\/(\w+)$/))) {
      if (!seed.trips[m[1]]) fail(404, "NOT_FOUND", "記事が見つかりません。");
      prog.wants = prog.wants.filter((x) => x !== m[1]);
      if (method === "PUT") prog.wants.unshift(m[1]);
      return done(null);
    }

    // --- リーディング ---
    if ((m = p.match(/^\/api\/trips\/(\w+)\/lesson$/))) {
      const L = seed.lessons[m[1]] || fail(404, "NOT_FOUND", "記事が見つかりません。");
      return {
        id: m[1],
        tripId: m[1],
        source: "seed",
        level: L.level,
        article: structuredClone(L.article),
        // 答え（answer）と解説（explanation）は、採点まで返さない約束
        questions: L.questions.map((q) => ({ text: q.text, choices: q.choices, hint: q.hint })),
        highlightWords: highlightWords(L.article.paragraphs, seed.glossary),
        canRegenerate: false
      };
    }
    if ((m = p.match(/^\/api\/lessons\/(\w+)\/grade$/)) && method === "POST") {
      const L = seed.lessons[m[1]] || fail(404, "NOT_FOUND", "記事が見つかりません。");
      const trip = seed.trips[m[1]];
      const { correct, results } = checkAnswers(L.questions, body.answers);
      const text = (body.summary?.text || "").trim();
      const summary = text ? keywordGrade(text, L.summary) : null;
      const rewards = record("read", trip.id, trip.countryId, trip.name, correct, L.questions.length, summary?.score ?? null);
      return done({ correct, total: L.questions.length, results, summary, rewards, streak: streakDays(prog.history) });
    }

    // --- リスニング ---
    if ((m = p.match(/^\/api\/countries\/(\w+)\/news$/))) {
      const n = seed.news[m[1]] || fail(404, "NOT_FOUND", "ニュースが見つかりません。");
      return {
        id: m[1],
        countryId: m[1],
        source: "seed",
        video: null,
        headline: n.headline,
        script: n.script,
        summaryJa: n.summaryJa,
        summaryEn: n.summaryEn,
        questions: n.questions.map((q) => ({ text: q.text, choices: q.choices, hint: q.hint })),
        highlightWords: highlightWords([n.script], seed.glossary),
        canRegenerate: false
      };
    }
    if ((m = p.match(/^\/api\/news\/(\w+)\/grade$/)) && method === "POST") {
      const n = seed.news[m[1]] || fail(404, "NOT_FOUND", "ニュースが見つかりません。");
      const { correct, results } = checkAnswers(n.questions, body.answers);
      const rewards = record("listen", m[1], m[1], n.headline, correct, n.questions.length);
      return done({ correct, total: n.questions.length, results, summary: null, rewards, streak: streakDays(prog.history) });
    }

    // --- 単語 ---
    if (p === "/api/words/lookup") {
      const word = (url.searchParams.get("word") || "").trim().slice(0, 40);
      if (!/^[A-Za-z][A-Za-z'’-]*$/.test(word)) fail(400, "INVALID_WORD", "単語を指定してください。");
      for (const c of wordCandidates(word)) {
        const g = seed.glossary[c];
        if (g) return { word: c, pos: g.pos, meaning: g.meaning, lang: "ja" };
      }
      // 手書きの辞書になければ、無料の英英辞書を使う
      try {
        const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
        if (r.ok) {
          const meaning = (await r.json())[0].meanings[0];
          const pos = { noun: "名", verb: "動", adjective: "形", adverb: "副" }[meaning.partOfSpeech] || "";
          return { word: word.toLowerCase(), pos, meaning: meaning.definitions[0].definition, lang: "en" };
        }
      } catch {
        /* 辞書が使えなくても続ける */
      }
      return { word: word.toLowerCase(), pos: "", meaning: "", lang: "" };
    }
    if (p === "/api/words" && method === "GET") return structuredClone(prog.words);
    if (p === "/api/words" && method === "POST") {
      const word = (body.word || "").trim().toLowerCase().slice(0, 40);
      const meaning = (body.meaning || "").trim().slice(0, 200);
      if (!word || !meaning) fail(400, "INVALID_WORD", "単語と意味が必要です。");
      prog.words = [{ word, pos: body.pos || "", meaning, source: (body.source || "").slice(0, 60) }, ...prog.words.filter((w) => w.word !== word)];
      return done({ ok: true, rewards: { stamp: null, badges: awardBadges() } });
    }
    if ((m = p.match(/^\/api\/words\/(.+)$/)) && method === "DELETE") {
      const w = decodeURIComponent(m[1]).toLowerCase();
      prog.words = prog.words.filter((x) => x.word !== w);
      return done(null);
    }

    return fail(404, "NOT_FOUND", `未対応の API です：${method} ${path}`);
  }
}
