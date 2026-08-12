import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 各種顏色寫法,看 html2canvas 解析得了哪些
const CASES = [
  ['純 hex',                    '#f9fafb'],
  ['rgb()',                     'rgb(249, 250, 251)'],
  ['rgba() 半透明',             'rgba(255, 255, 255, 0.05)'],
  ['oklch()（TW4 調色盤）',      'oklch(0.985 0.002 247.839)'],
  ['color-mix()（TW4 不透明度）', 'color-mix(in oklab, #ffffff 5%, transparent)'],
  ['CSS 變數',                   'var(--test-bg, #f9fafb)'],
];

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
await page.setContent(`<body style="margin:0;--test-bg:#f9fafb"><div id="wrap" style="background:#fff;width:400px"></div></body>`);
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });

const rows = await page.evaluate(async (CASES) => {
  const wrap = document.getElementById('wrap');
  const out = [];
  for (const [name, color] of CASES) {
    wrap.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr><th id="cell" style="background:${color};padding:20px;color:#c2410c">欄位名</th></tr></thead>
    </table>`;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const computed = getComputedStyle(document.getElementById('cell')).backgroundColor;
    try {
      const canvas = await html2canvas(wrap, { scale: 1, backgroundColor: '#ffffff' });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const d = ctx.getImageData(10, 10, 1, 1).data;
      out.push({ name, color, computed, px: [d[0], d[1], d[2]], error: null });
    } catch (e) {
      out.push({ name, color, computed, px: null, error: String(e.message || e).slice(0, 60) });
    }
  }
  return out;
}, CASES);

console.log('寫法'.padEnd(26) + 'computed'.padEnd(34) + 'html2canvas 畫出來');
console.log('-'.repeat(84));
let broken = [];
for (const r of rows) {
  if (r.error) {
    broken.push(r.name + '(拋錯)');
    console.log(r.name.padEnd(26) + r.computed.slice(0, 32).padEnd(34) + '💥 ' + r.error);
    continue;
  }
  const isBlack = r.px[0] < 40 && r.px[1] < 40 && r.px[2] < 40;
  if (isBlack) broken.push(r.name + '(黑塊)');
  console.log(
    r.name.padEnd(26) + r.computed.slice(0, 32).padEnd(34) +
    `rgb(${r.px.join(', ')})` + (isBlack ? '  ← 黑塊' : '')
  );
}
console.log('\n--- 結論 ---');
console.log(broken.length
  ? `❌ html2canvas 解析不了:${broken.join('、')} —— 一律畫成黑色`
  : '✅ 全部解析正常,黑塊另有成因');
await browser.close();
