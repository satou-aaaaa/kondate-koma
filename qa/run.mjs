// 献立こまの検査。料理の「つ」が食事バランスガイドの料理例どおりか・問題の作り方（15種類×3000問を別に足し直す・そろう選び肢が1つ）・
// 今日の5問と上級の組み方（3年分）・とことんの並び（300回）・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん・料理帳・
// 実績・カレンダー・あとから・文字の大きさ・言い方・スマホ幅・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));
const GROUPS_NAME = ["主食", "副菜", "主菜", "牛乳・乳製品", "果物"];

// ---- 1. 問題の作り方（ブラウザを使わない）----
// 料理の「つ」と1日の目安を、gen.js とは別にここへ書き写し（農林水産省「食事バランスガイド」の料理例・適量チェックチャート）、
// 献立を自分で足し直して、足すと5つのなかまが全部目安に入る選び肢がちょうど1つかを確かめる
const OFFICIAL = {
  "ごはん 小盛り1杯": [0, 1], "おにぎり 1個": [0, 1], "食パン 1枚": [0, 1], "ロールパン 2個": [0, 1], "ごはん 中盛り1杯": [0, 1.5], "うどん 1杯": [0, 2], "もりそば 1杯": [0, 2], "スパゲッティー": [0, 2],
  "野菜サラダ": [1, 1], "きゅうりとわかめの酢の物": [1, 1], "具たくさん味噌汁": [1, 1], "ほうれん草のお浸し": [1, 1], "ひじきの煮物": [1, 1], "煮豆": [1, 1], "きのこソテー": [1, 1], "野菜の煮物": [1, 2], "野菜炒め": [1, 2], "芋の煮っころがし": [1, 2],
  "冷奴": [2, 1], "納豆": [2, 1], "目玉焼き 一皿": [2, 1], "焼き魚": [2, 2], "魚の天ぷら": [2, 2], "まぐろとイカの刺身": [2, 2], "ハンバーグステーキ": [2, 3], "豚肉のしょうが焼き": [2, 3], "鶏肉のから揚げ": [2, 3],
  "牛乳 コップ半分": [3, 1], "チーズ 1かけ": [3, 1], "スライスチーズ 1枚": [3, 1], "ヨーグルト 1パック": [3, 1], "牛乳 びん1本": [3, 2],
  "みかん 1個": [4, 1], "りんご 半分": [4, 1], "かき 1個": [4, 1], "梨 半分": [4, 1], "ぶどう 半房": [4, 1], "桃 1個": [4, 1],
  "せんべい 3〜4枚": [-1, 0], "ショートケーキ 小1個": [-1, 0], "お茶 1杯": [-2, 0],
};
const RANGE = [[5, 7], [5, 6], [3, 5], [2, 2], [2, 2]]; // 2200±200kcal（基本形）
{
  const names = G.DISHES.map((d) => d.n);
  const diff = G.DISHES.filter((d) => !OFFICIAL[d.n] || OFFICIAL[d.n][0] !== d.g || OFFICIAL[d.n][1] !== d.v).map((d) => d.n);
  check("料理と「つ」は食事バランスガイドの料理例と同じ（書き写しと1品ずつ比べる）", diff.length === 0 && names.length === Object.keys(OFFICIAL).length && new Set(G.DISHES.map((d) => d.id)).size === G.DISHES.length, diff.join(","));
  check("1日の目安は基本形（主食5〜7・副菜5〜6・主菜3〜5・牛乳・乳製品2・果物2）", JSON.stringify(G.GROUPS.map((g) => [g.lo, g.hi])) === JSON.stringify(RANGE));
  const byName = Object.fromEntries(G.DISHES.map((d) => [d.id, OFFICIAL[d.n]]));
  const sum = (ids) => { const t = [0, 0, 0, 0, 0]; for (const id of ids) { const [g, v] = byName[id]; if (g >= 0) t[g] += v; } return t; };
  const okT = (t) => t.every((v, g) => v >= RANGE[g][0] && v <= RANGE[g][1]);
  const bad = {}, seen = {}, N = 3000;
  for (const k of G.KINDS) {
    for (let s = 0; s < N; s++) {
      const P = G.make(`${k.id}|qa${s}`), why = [], ids = P.items.map((x) => x.d), t = sum(ids);
      if (P.opts.length !== 4 || new Set(P.opts).size !== 4 || !P.opts.includes(P.ans)) why.push("選び肢が4つちがう・答えを含む");
      if (ids.some((id) => !byName[id] || byName[id][0] < 0)) why.push("献立に知らない料理・お菓子");
      if (P.items.some((x) => !(x.meal >= 0 && x.meal <= 3))) why.push("食事の時間がおかしい");
      for (let m = 0; m < 4; m++) { const ms = P.items.filter((x) => x.meal === m).map((x) => x.d); if (new Set(ms).size !== ms.length) why.push("同じ食事に同じ料理が2つ"); }
      if (ids.filter((id) => byName[id][0] === 0).length !== 3 || [0, 1, 2].some((m) => P.items.filter((x) => x.meal === m && byName[x.d][0] === 0).length !== 1)) why.push("主食が朝・昼・夕に1品ずつでない");
      const shortG = t.map((v, g) => (v < RANGE[g][0] ? g : -1)).filter((g) => g >= 0), overG = t.map((v, g) => (v > RANGE[g][1] ? g : -1)).filter((g) => g >= 0);
      if (shortG.length !== 1 || shortG[0] !== k.X || overG.length) why.push(`足りないのが「${k.name}」1つだけでない：${t.join(",")}`);
      const fix = P.opts.filter((o) => okT(sum([...ids, o])));
      if (fix.length !== 1 || fix[0] !== P.ans) why.push("足すとそろう選び肢が1つでない：" + fix.join(","));
      if (k.lv === 0 && P.opts.some((o) => o !== P.ans && byName[o][0] < 0)) why.push("やさしいにお菓子が出る");
      if (!/足りませんでした/.test(P.why) || !P.why.includes(GROUPS_NAME[k.X])) why.push("説明がおかしい");
      if (JSON.stringify(G.make(`${k.id}|qa${s}`)) !== JSON.stringify(P)) why.push("同じ種で同じ問題にならない");
      seen[k.id] = seen[k.id] || new Set(); seen[k.id].add(ids.join(" ") + ">" + P.opts.join(" "));
      if (why.length && !(bad[k.id] || []).length) bad[k.id] = [why.join("・") + "：" + ids.join(" ") + " / " + P.opts.join(" ")];
    }
  }
  check(`問題：${G.KINDS.length}種類×${N}問で、足りないなかまは1つだけ・足すとそろう選び肢はちょうど1つ（別に足し直して確かめる）`, Object.keys(bad).length === 0, JSON.stringify(bad));
  const few = G.KINDS.filter((k) => seen[k.id].size < 300).map((k) => `${k.id}:${seen[k.id].size}`);
  check("問題：どの種類も300通り以上の献立が出る（同じ問題ばかりにならない）", few.length === 0, few.join(","));
  check("問題：種類は15（やさしい・ふつう・むずかしい×5つのなかま）", G.KINDS.length === 15 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "5,5,5");
  const longWhy = [], longLook = [];
  for (const k of G.KINDS) { for (let s = 0; s < 200; s++) { const P = G.make(`${k.id}|len${s}`); if ([...P.why].length > 80) longWhy.push(k.id + ":" + P.why); } if ([...k.look].length > 45) longLook.push(k.id); }
  check("説明は80字以内・ヒントは45字以内（やさしい日本語。一文を短く）", !longWhy.length && !longLook.length, longWhy.concat(longLook).slice(0, 3).join(","));
  // 料理帳：どの料理も、どこかの問題の答えになる（全部集められる）
  const ansSeen = new Set(); for (const k of G.KINDS) for (let s = 0; s < 400; s++) ansSeen.add(G.make(`${k.id}|qa${s}`).ans);
  const never = G.DISHES.filter((d) => d.g >= 0 && !ansSeen.has(d.id)).map((d) => d.n);
  check("料理帳：どの料理も答えに出る（全部集められる）", never.length === 0, never.join(","));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-07");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map((t) => t.split("|")[0]), hk = hl.map((t) => t.split("|")[0]);
    if (dl.length !== 5 || new Set(dk.map((k) => G.BY[k].X)).size !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2") bad.push(d + " 今日");
    if (hl.length !== 3 || new Set(hk).size !== 3 || hk.some((k) => G.BY[k].lv !== 2) || hk.includes(dk[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if (dk.join() === prev) sameAsPrev++; prev = dk.join();
    if (i < 60) [...dk, ...hk].forEach((k) => cover.add(k));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、足りないなかまは全部ちがう）と上級（むずかしい3・今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに15種類が全部出る・前の日と同じ組の日が少ない", cover.size === 15 && sameAsPrev < 30, `${cover.size}種類・前の日と同じ ${sameAsPrev}日`);
}
{
  // とことんの並び：何百回作っても、1回の中で同じ問題が出ない・作れない問題が無い
  let dup = 0, broken = 0;
  for (let n = 0; n < 300; n++) { const salt = "e" + n + Math.random(); const tags = [...Array(5).keys()].map((i) => `e${i % 5}|${salt}:${i}`).concat([...Array(95).keys()].map((i) => `${i < 10 ? "n" : "h"}${i % 5}|${salt}:${i + 5}`)); const keys = new Set(); for (const t of tags) { const P = G.make(t); if (!P) { broken++; continue; } const key = P.items.map((x) => x.meal + x.d).join() + P.opts.join(); if (keys.has(key)) dup++; keys.add(key); } }
  check("とことんの100問を300回作っても、1回の中で同じ献立が出ない", dup === 0 && broken === 0, `重なり ${dup}・作れない ${broken}`);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$|^https:\/\/www\.(maff|mhlw)\.go\.jp\//.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test(gen.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("言い方：やせる・病気が治る・予防できるなどを言い切らない", !/やせ(る|ます|られ)|痩せ|治りま|治る|予防でき|防げます|ダイエット効果/.test(html + readFileSync(path.join(root, "README.md"), "utf8")));
check("言い方：「このゲームについて」に、目安は人で変わること・病気の食事の指導ではないこと・出典（農林水産省・厚生労働省）がある", /人で変わ|活動の量で、合う量は変わります/.test(html) && /病気の食事の指導ではありません/.test(html) && /maff\.go\.jp\/j\/syokuiku\/kenzensyokuseikatsu\/about_b_guide\.html/.test(html) && /mhlw\.go\.jp/.test(html));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="kondate-koma" data-keys="kondate-v1,kondate-fs"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/kondate-koma/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "献立こま" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const ansIdx = (p) => p.evaluate(() => { const c = __kk.cur(); return c.P.opts.indexOf(c.P.ans); });
const wrongIdx = (p) => p.evaluate(() => { const c = __kk.cur(); return c.P.opts.findIndex((o) => o !== c.P.ans && !c.wrong.includes(o)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("kondate-v1") || "{}"));
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.click(`.ch[data-j="${await ansIdx(p)}"]`);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  await p.click("#howto-ok");
  check("文字の大きさ：はじめは「ふつう」（18px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "18px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "25px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日のまめ知識が出る", (await p.textContent("#tip")).includes("今日のまめ知識"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __kk.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：こま・献立・大きな選び肢4つ（高さ72px以上）", await p.locator("#koma svg.koma").count() === 1 && await p.locator("#menu .dish").count() >= 8 && (await p.$$eval(".ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 72) && await p.locator(".ch").count() === 4);
  check("やさしい：こまに数と ▼（足りない段）の文字が出る・献立の料理に読み上げ用の名前がある", (await p.getAttribute("#koma svg", "aria-label")).includes("目安") && (await p.textContent("#koma svg")).includes("▼") && (await p.$$eval("#menu .dish", (t) => t.filter((x) => !x.getAttribute("aria-label")).length)) === 0);
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字（色だけで分けない）・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && (await p.textContent("#msg")).includes("✕") && (await p.textContent(".ch.ng .chip")).length > 0 && await p.getAttribute("#msg", "role") === "status");
  // 開き直しても、まちがえた選び肢は残る
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがえた印のまま）", await p.locator(".ch.ng").count() === 1 && await p.evaluate(() => __kk.cur().i) === 0);
  await solve(p);
  check("正解すると ✓ の印・なぜの説明・★2（まちがい1回）・こまが全部 ✓", await p.locator(".ch.ok").count() === 1 && (await p.textContent(".verdict .why")).length > 6 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ" && !(await p.textContent("#koma svg")).includes("▼") && await p.locator("#menu .dish.add").count() === 1);
  await p.click("#next");
  await p.click("#hint");
  check("ヒント1は足りないなかまを言い、こまの数を見せる（料理の答えは言わない）", (await p.textContent("#hintbox")).includes("💡") && (await p.getAttribute("#koma svg", "aria-label")).includes("目安") && await p.locator(".ch.ng").count() === 0);
  await p.click("#hint");
  check("ヒント2はまちがいの選び肢を消し、2つにしぼる・ヒントは2回まで", await p.locator(".ch.ng").count() === 2 && await p.locator("#hint:disabled").count() === 1);
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  check("ふつう（3問目）：こまの数はかくれ、料理になかまの印が出る", (await p.getAttribute("#koma svg", "aria-label")).includes("かくれ") && await p.locator("#menu .chip").count() >= 8);
  for (let i = 2; i < 5; i++) { if (i === 4) check("むずかしい（5問目）：こまの数も料理の印もかくれる", (await p.getAttribute("#koma svg", "aria-label")).includes("かくれ") && await p.locator("#menu .chip").count() === 0); await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]");
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !G.DISHES.some((d) => share.includes(d.n.split(" ")[0])) && !/主食|副菜|主菜|果物|乳/.test(share), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("料理帳に足した料理が載る", Object.keys(s1.dex).length === 5 && Object.values(s1.food).reduce((a, b) => a + b, 0) === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __kk.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（料理帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // なかまを決めて練習
  await p.click("#back"); await p.click("#go-p"); await p.click('[data-x="1"]');
  check("足りないなかまを決めて練習できる（副菜だけ）", (await p.evaluate(() => __kk.load().runs.p.list)).every((t) => t.split("|")[0].endsWith("1")));
  // とことん：まちがえてもヒントを使っても続き、「ここで降りる」で終わる。自己ベストは一発で解いた数
  await p.click("#back"); await p.click("#go-e");
  check("とことんは100問の並びで始まり、チケット・ライフが無い", (await p.evaluate(() => __kk.load().runs.e.list.length)) === 100 && !(await p.textContent("body")).match(/🎫|🌸|のこり\d/));
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint"); await solve(p); await p.click("#next");
  check("まちがえてもヒントを使っても続く", await p.evaluate(() => __kk.cur().i) === 4 && await p.locator("#quit").count() === 1);
  await p.reload(); await p.waitForTimeout(200); await p.click("#go-e");
  check("とことんは開き直しても続きから", await p.evaluate(() => __kk.cur().i) === 4);
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一発で解いた数（2問）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("4問") && (await p.textContent("#ebest")).includes("一発でそろえた献立 2問") && !(await mem(p)).runs.e);
  {
    // とことんの並びを使い切りそうになったら、次の並びを足して続ける（好きなだけ遊べる）
    await p.evaluate(() => { __kk.save((s) => { s.runs.e = { mode: "e", id: "zz", date: __kk.todayKey(), list: __kk.endlessList().slice(0, 6), res: [{ m: 0 }, { m: 0 }], cur: null, clean: 2, miss: 0 }; }); });
    await p.goto(url); await p.waitForTimeout(150); await p.click("#go-e");
    check("とことんの並びの残りが少ないと、次の100問を足して続ける", (await p.evaluate(() => __kk.load().runs.e.list.length)) === 106);
    await p.click("#quit"); await p.waitForTimeout(100);
  }
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("kondate-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { e1: '"><b id="xss2">', zz: 3 }; s.food = { salad: '"><i id="xss4">', nope: 2 }; s.runs = { e: { mode: "e", id: "x", date: "2026-11-07", list: ["e1|1"], res: [], clean: '"><i id="xss3">' }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["e1|1"], res: [] }, a1: { mode: "a", id: "a1", date: "2026-11-04", list: ["e1|1"], res: [null] }, a2: { mode: "a", id: "a2", date: "2026-11-03", list: "bad", res: [] }, a3: { mode: "a", id: "a3", date: "2026-11-02", list: ["e1|1", "e1|2"], res: [{ m: 0 }], cur: { i: 1, tag: "e1|2", wrong: "x", hints: 0 } } }; s.days = { "2026-11-07": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("kondate-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __kk.load());
    check("記録の形を直す：数の所の文字は0に・知らない料理や種類は捨てる・形のちがう途中経過と日ごとの記録は捨てる", st.ebest === 0 && st.dex.e1 === 0 && !("zz" in st.dex) && st.food.salad === 0 && !("nope" in st.food) && st.runs.e.clean === 0 && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && !("a1" in st.runs) && !("a2" in st.runs) && st.runs.a3 && st.runs.a3.cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    await q.goto(url); await q.waitForTimeout(100); await q.click("#go-dex").catch(() => {});
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3, #xss4").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 3);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：目安の説明と出典", (await p.textContent("#about")).includes("病気の食事の指導ではありません") && await p.locator("#about a").count() >= 2);
  await p.click("#back"); await p.click("#go-dex");
  check("料理帳：5つのなかまと、なかまに入らないもの（お菓子・お茶）が全部見られる・足した料理は ✓ の文字", await p.locator(".fgrid > div").count() === G.DISHES.length && (await p.textContent(".fgrid")).includes("✓"));
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る
  {
    // 第1回の日（EPOCH）のすぐあとでも取りこぼした日を試せるよう、ページの時計を10日先に進める
    const FUT = TODAY > "2026-11-17" ? TODAY : "2026-11-17", db = (n) => new Date(Date.parse(FUT) - n * 864e5).toISOString().slice(0, 10);
    const cctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    await cctx.clock.setFixedTime(new Date(FUT + "T03:00:00Z"));
    const q = await newPage(390, cctx);
    await q.evaluate(([d2, d3]) => { localStorage.setItem("kondate-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [db(2), db(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __kk.lateDays(__kk.load()));
    const exp = [1, 4, 5, 6, 7].map(db).filter((d) => d >= "2026-11-07");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (db(3).slice(0, 7) === FUT.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator(".ch").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __kk.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    await ctx.close();
  }

  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => localStorage.setItem("kondate-fs", String(fs)), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const j = await ansIdx(q);
    await q.focus(`.ch[data-j="${j}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    check("キーボードだけで選んで答えられる", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "kondate-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { m: [0, 1, 0, 0, 2], k: ["e1", "e3", "n4", "n0", "h2"] } }, hdays: {}, adays: {}, dex: { e1: 1, e3: 1, n4: 1, n0: 1, h2: 1 }, food: { yasaiitame: 1, "milk-h": 1, mikan: 1, udon: 1, natto: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }), "kondate-fs": "3" };
  await checkTransfer({ browser, url, game: "kondate-koma", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 献立こま QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
