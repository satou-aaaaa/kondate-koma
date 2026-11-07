// 献立こまの問題を作る（ブラウザと node の両方で使う）。
// 1日の献立（朝・昼・夕・間食）を作り、5つの料理区分のうち1つだけを目安より少なくする。
// 選び肢は4品。足すと5つの区分が全部目安に入るのは、ちょうど1品だけ（QA が全部の選び肢を足して確かめる）。
// 料理と「つ（SV）」は農林水産省「食事バランスガイド」の料理例、1日の目安は同じページの適量チェックチャート（2200±200kcal・基本形）。
//   https://www.maff.go.jp/j/syokuiku/kenzensyokuseikatsu/about_b_guide.html （2026-11-07 に画面で確かめた）
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ種なら、どの端末でも同じ問題になる。
(function (root) {
  "use strict";
  // 料理区分：名前・短い名前・目安（下〜上）・1つの基準
  const GROUPS = [
    { id: 0, name: "主食", short: "主食", lo: 5, hi: 7, unit: "炭水化物 約40g", what: "ごはん・パン・めん" },
    { id: 1, name: "副菜", short: "副菜", lo: 5, hi: 6, unit: "野菜など 約70g", what: "野菜・いも・きのこ・海藻" },
    { id: 2, name: "主菜", short: "主菜", lo: 3, hi: 5, unit: "たんぱく質 約6g", what: "肉・魚・卵・大豆" },
    { id: 3, name: "牛乳・乳製品", short: "乳", lo: 2, hi: 2, unit: "カルシウム 約100mg", what: "牛乳・ヨーグルト・チーズ" },
    { id: 4, name: "果物", short: "果物", lo: 2, hi: 2, unit: "果物 約100g", what: "みかん・りんごなど" },
  ];
  // 料理例（id は記録の料理帳に残るので、変えない・消さない。足すのは最後に）。g は区分（-1 は菓子・嗜好飲料、-2 は水・お茶）、v は「つ」
  const DISHES = [
    { id: "gohan-s", n: "ごはん 小盛り1杯", e: "🍚", g: 0, v: 1 },
    { id: "onigiri", n: "おにぎり 1個", e: "🍙", g: 0, v: 1 },
    { id: "shokupan", n: "食パン 1枚", e: "🍞", g: 0, v: 1 },
    { id: "roll", n: "ロールパン 2個", e: "🥐", g: 0, v: 1 },
    { id: "gohan-m", n: "ごはん 中盛り1杯", e: "🍚", g: 0, v: 1.5 },
    { id: "udon", n: "うどん 1杯", e: "🍜", g: 0, v: 2 },
    { id: "soba", n: "もりそば 1杯", e: "🥢", g: 0, v: 2 },
    { id: "spa", n: "スパゲッティー", e: "🍝", g: 0, v: 2 },
    { id: "salad", n: "野菜サラダ", e: "🥗", g: 1, v: 1 },
    { id: "sunomono", n: "きゅうりとわかめの酢の物", e: "🥒", g: 1, v: 1 },
    { id: "misoshiru", n: "具たくさん味噌汁", e: "🥣", g: 1, v: 1 },
    { id: "ohitashi", n: "ほうれん草のお浸し", e: "🥬", g: 1, v: 1 },
    { id: "hijiki", n: "ひじきの煮物", e: "🫙", g: 1, v: 1 },
    { id: "nimame", n: "煮豆", e: "🫘", g: 1, v: 1 },
    { id: "kinoko", n: "きのこソテー", e: "🍄", g: 1, v: 1 },
    { id: "yasainimono", n: "野菜の煮物", e: "🥕", g: 1, v: 2 },
    { id: "yasaiitame", n: "野菜炒め", e: "🥦", g: 1, v: 2 },
    { id: "imo", n: "芋の煮っころがし", e: "🥔", g: 1, v: 2 },
    { id: "hiyayakko", n: "冷奴", e: "⬜", g: 2, v: 1 },
    { id: "natto", n: "納豆", e: "🫛", g: 2, v: 1 },
    { id: "medamayaki", n: "目玉焼き 一皿", e: "🍳", g: 2, v: 1 },
    { id: "yakizakana", n: "焼き魚", e: "🐟", g: 2, v: 2 },
    { id: "tenpura", n: "魚の天ぷら", e: "🍤", g: 2, v: 2 },
    { id: "sashimi", n: "まぐろとイカの刺身", e: "🍣", g: 2, v: 2 },
    { id: "hamburg", n: "ハンバーグステーキ", e: "🍖", g: 2, v: 3 },
    { id: "shogayaki", n: "豚肉のしょうが焼き", e: "🥩", g: 2, v: 3 },
    { id: "karaage", n: "鶏肉のから揚げ", e: "🍗", g: 2, v: 3 },
    { id: "milk-h", n: "牛乳 コップ半分", e: "🥛", g: 3, v: 1 },
    { id: "cheese", n: "チーズ 1かけ", e: "🧀", g: 3, v: 1 },
    { id: "slice", n: "スライスチーズ 1枚", e: "🟨", g: 3, v: 1 },
    { id: "yogurt", n: "ヨーグルト 1パック", e: "🍶", g: 3, v: 1 },
    { id: "milk-b", n: "牛乳 びん1本", e: "🍼", g: 3, v: 2 },
    { id: "mikan", n: "みかん 1個", e: "🍊", g: 4, v: 1 },
    { id: "ringo", n: "りんご 半分", e: "🍎", g: 4, v: 1 },
    { id: "kaki", n: "かき 1個", e: "🟠", g: 4, v: 1 },
    { id: "nashi", n: "梨 半分", e: "🍐", g: 4, v: 1 },
    { id: "budo", n: "ぶどう 半房", e: "🍇", g: 4, v: 1 },
    { id: "momo", n: "桃 1個", e: "🍑", g: 4, v: 1 },
    { id: "senbei", n: "せんべい 3〜4枚", e: "🍘", g: -1, v: 0 },
    { id: "cake", n: "ショートケーキ 小1個", e: "🍰", g: -1, v: 0 },
    { id: "ocha", n: "お茶 1杯", e: "🍵", g: -2, v: 0 },
  ];
  const DBY = Object.fromEntries(DISHES.map((d) => [d.id, d]));
  const inG = (g) => DISHES.filter((d) => d.g === g);
  const MEALS = ["朝", "昼", "夕", "間食"];
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const LOOK = [
    "主食は、ごはん・パン・めんなど、炭水化物の多い料理です。",
    "副菜は、野菜・いも・きのこ・海藻の料理です。いもも副菜です。",
    "主菜は、肉・魚・卵・大豆（とうふ・納豆）の料理です。",
    "牛乳・乳製品は、牛乳・ヨーグルト・チーズのなかまです。",
    "果物は、みかん・りんごなど。1つは約100gです。",
  ];

  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const shuffle = (R, arr) => pickN(R, arr, arr.length);
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const rangeStr = (g) => (GROUPS[g].lo === GROUPS[g].hi ? `${GROUPS[g].lo}つ` : `${GROUPS[g].lo}〜${GROUPS[g].hi}つ`);
  const inRange = (g, v) => v >= GROUPS[g].lo && v <= GROUPS[g].hi;

  // 区分 g の料理を、合わせてちょうど T つになるように選ぶ（主食は朝・昼・夕に1品ずつの3品）
  function fill(R, g, T) {
    const ds = inG(g);
    if (g === 0) {
      // 3品の「つ」の組（1・1.5・2）で合計が T になるものを全部数え、1つ選ぶ
      const vs = [1, 1.5, 2], combos = [];
      for (const a of vs) for (const b of vs) for (const c of vs) if (a + b + c === T) combos.push([a, b, c]);
      const cb = pick(R, combos);
      return cb.map((v) => pick(R, ds.filter((d) => d.v === v)));
    }
    const out = []; let r = T;
    // 同じ料理は、まだ使っていない料理が無いときだけくり返す（1日に同じお浸しが5皿、にならないように）
    while (r > 0) { const ok = ds.filter((d) => d.v <= r), fresh = ok.filter((d) => !out.includes(d)); const d = pick(R, fresh.length ? fresh : ok); out.push(d); r -= d.v; }
    return out;
  }
  // 区分ごとの「ふつうの日」の合計の候補（目安の中）と、足りない日の合計の候補
  const OKV = [[5, 5.5, 6], [5, 6], [3, 4, 5], [2], [2]];
  const SHORTV = [[3, 3.5, 4, 4.5], [3, 4], [1, 2], [0, 1], [1]];

  // 1問を作る。X は足りない区分、lv は難しさ
  function build(R, X, lv) {
    const tot = GROUPS.map((g) => (g.id === X ? pick(R, SHORTV[X]) : pick(R, OKV[g.id])));
    const items = [];
    for (const g of GROUPS) {
      const ds = fill(R, g.id, tot[g.id]);
      const start = Math.floor(R() * 3);
      ds.forEach((d, i) => {
        const meal = g.id === 0 ? i : g.id <= 2 ? (start + i) % 3 : Math.floor(R() * 4);
        items.push({ meal, d: d.id });
      });
    }
    // 同じ食事の中で同じ料理が重なったら、ほかの食事へ移す（朝・昼・夕の順に空いている所）
    for (let i = 0; i < items.length; i++) for (let j = 0; j < i; j++) if (items[j].meal === items[i].meal && items[j].d === items[i].d) { for (let m = 0; m < 4; m++) if (!items.some((x) => x.meal === m && x.d === items[i].d)) { items[i].meal = m; break; } }
    items.sort((a, b) => a.meal - b.meal || DBY[a.d].g - DBY[b.d].g);
    // 答え：足りない区分の料理で、足すと目安に入るもの
    const cur = tot[X], need = GROUPS[X];
    const okDish = inG(X).filter((d) => inRange(X, cur + d.v));
    const ans = pick(R, okDish);
    // まちがいの選び肢
    const others = shuffle(R, GROUPS.filter((g) => g.id !== X).map((g) => g.id));
    const sweets = shuffle(R, DISHES.filter((d) => d.g < 0));
    const sameBad = shuffle(R, inG(X).filter((d) => !inRange(X, cur + d.v)));
    const wrong = [];
    const add = (d) => { if (d && d.id !== ans.id && !wrong.some((w) => w.id === d.id)) wrong.push(d); };
    if (lv === 2) { add(sameBad[0] || sweets[0]); add(pick(R, inG(others[0]))); add(R() < 0.5 ? sweets[1] : pick(R, inG(others[1]))); }
    else if (lv === 1) { add(pick(R, inG(others[0]))); add(pick(R, inG(others[1]))); add(R() < 0.5 ? sweets[0] : pick(R, inG(others[2]))); }
    else { add(pick(R, inG(others[0]))); add(pick(R, inG(others[1]))); add(pick(R, inG(others[2]))); }
    for (let k = 3; wrong.length < 3; k++) add(pick(R, inG(others[k % 4])));
    const opts = shuffle(R, [ans.id, ...wrong.map((w) => w.id)]);
    const lack = need.lo - cur;
    const why = `${need.name}が${fmt(cur)}つで、目安（${rangeStr(X)}）に${fmt(lack)}つ足りませんでした。${ans.n}は${need.name}${fmt(ans.v)}つです。`;
    return { items, tot, X, opts, ans: ans.id, why };
  }

  // 種類：難しさ×足りない区分（15種類）
  const KINDS = [];
  for (let lv = 0; lv < 3; lv++) for (const g of GROUPS) KINDS.push({ id: "enh"[lv] + g.id, lv, X: g.id, name: `${g.name}が足りない`, look: LOOK[g.id] });
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「種類|種」（例 "e1|2026-11-07:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = build(rng(seedOf(tag)), k.X, k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, ...p };
  }
  // 献立に1品足したときの区分ごとの合計
  function totalsWith(P, add) { const t = P.tot.slice(); const d = DBY[add]; if (d && d.g >= 0) t[d.g] += d.v; return t; }
  const balanced = (t) => t.every((v, g) => inRange(g, v));

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。足りない区分はなるべく重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), xs = shuffle(R, [0, 1, 2, 3, 4]), lvs = [0, 0, 1, 1, 2];
    return lvs.map((lv, i) => `${"enh"[lv]}${xs[i]}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の区分）
  function hardTags(date) {
    const dx = +dailyTags(date)[4].split("|")[0].slice(1), R = rng(seedOf("hard:" + date)), xs = pickN(R, [0, 1, 2, 3, 4].filter((x) => x !== dx), 3);
    return xs.map((x, i) => `h${x}|${date}:h${i}`);
  }
  const sayOf = (id) => (DBY[id] ? DBY[id].n : id);

  const KONDATE = { GROUPS, DISHES, DBY, MEALS, LV, KINDS, BY, kindsOf, seedOf, rng, make, dailyTags, hardTags, sayOf, pickN, totalsWith, balanced, inRange, fmt, rangeStr };
  if (typeof module !== "undefined" && module.exports) module.exports = KONDATE; else root.KONDATE = KONDATE;
})(typeof self !== "undefined" ? self : this);
