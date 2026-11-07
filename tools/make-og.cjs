// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、こまの絵と遊び方だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
const koma = require("./koma-art.cjs");
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:64px 80px;background:#f5efe2;color:#1f2a44;display:flex;align-items:center;gap:40px">
    <div style="flex:1">
      <div style="font-size:32px;color:#86291a;letter-spacing:.06em">食事バランスガイドで学ぶ・時間制限なし</div>
      <div style="font-size:112px;font-weight:900;margin-top:10px;letter-spacing:.1em;color:#142a52">献立<span style="color:#b8402a">こま</span></div>
      <div style="font-size:42px;margin-top:10px;line-height:1.5">1日の献立に1品足して<br>こまを回そう</div>
    </div>
    <div>${koma(380, true)}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
