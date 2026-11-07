// アイコンと SNS 用の絵で使う、こまの絵（SVG）。上から主食・副菜・主菜、下の左が牛乳・乳製品・右が果物。
// 色は index.html と同じカラーユニバーサルデザインの組。数や料理（答え）は入れない
module.exports = function koma(size, withText) {
  const t = (x, y, s) => (withText ? `<text x="${x}" y="${y}" font-size="11" text-anchor="middle" fill="#1f2a44" font-family="'Noto Sans CJK JP',sans-serif" font-weight="900">${s}</text>` : "");
  return `<svg width="${size}" height="${size * 1.18}" viewBox="0 0 200 236" xmlns="http://www.w3.org/2000/svg">
  <rect x="96" y="2" width="8" height="26" rx="3" fill="#cfd6e3" stroke="#1f2a44" stroke-width="2"/>
  <path d="M8 26 L192 26 L176 64 L24 64 Z" fill="#e69f00" stroke="#1f2a44" stroke-width="2.4"/>${t(100, 50, "主食")}
  <path d="M25 66 L175 66 L160 104 L40 104 Z" fill="#009e73" stroke="#1f2a44" stroke-width="2.4"/>${t(100, 90, "副菜")}
  <path d="M42 106 L158 106 L143 144 L57 144 Z" fill="#d55e00" stroke="#1f2a44" stroke-width="2.4"/>${t(100, 130, "主菜")}
  <path d="M59 146 L100 146 L100 184 L74 184 Z" fill="#cc79a7" stroke="#1f2a44" stroke-width="2.4"/>
  <path d="M100 146 L141 146 L126 184 L100 184 Z" fill="#56b4e9" stroke="#1f2a44" stroke-width="2.4"/>
  <path d="M74 184 L100 226 L126 184 Z" fill="#e8e3d6" stroke="#1f2a44" stroke-width="2.4"/></svg>`;
};
