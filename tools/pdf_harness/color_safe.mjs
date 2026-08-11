import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.setContent(`<body style="margin:0">
<div id="pdf-content" style="background:#fff;width:500px;padding:12px">
  <table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th id="a" style="background:oklch(0.985 0.002 247.839);color:oklch(0.553 0.195 38.402);padding:14px">欄位一</th>
      <th id="b" style="background:color-mix(in oklab, #ffffff 5%, transparent);padding:14px">欄位二</th>
    </tr></thead>
    <tbody><tr>
      <td style="background:#fff;padding:14px;border-top:1px solid oklch(0.7 0.02 250)">內容一</td>
      <td style="background:rgb(240,240,240);padding:14px">內容二</td>
    </tr></tbody>
  </table>
</div></body>`);
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });

const out = await page.evaluate(async () => {
  const root = document.getElementById('pdf-content');
  const UNSUPPORTED = /(oklch|oklab|color-mix|lch\(|lab\(|hwb\()/i;
  const PROPS = ['backgroundColor', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
  const CSS_PROP = { backgroundColor:'background-color', color:'color', borderTopColor:'border-top-color', borderRightColor:'border-right-color', borderBottomColor:'border-bottom-color', borderLeftColor:'border-left-color', outlineColor:'outline-color' };

  // 用 canvas 把任意 CSS 顏色轉成 rgb() —— Chrome 的 fillStyle 支援 oklch/color-mix
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const toRgb = (value) => {
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = '#000';
    try { pctx.fillStyle = value; } catch { return null; }
    pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${(d[3] / 255).toFixed(3)})`;
  };

  const before = [];
  const restores = [];
  let converted = 0, scanned = 0;
  const nodes = [root, ...root.querySelectorAll('*')];
  for (const node of nodes) {
    const cs = getComputedStyle(node);
    for (const p of PROPS) {
      scanned += 1;
      const v = cs[p];
      if (!v || !UNSUPPORTED.test(v)) continue;
      before.push({ tag: node.tagName + (node.id ? '#' + node.id : ''), prop: p, from: v });
      const rgb = toRgb(v);
      if (!rgb) continue;
      const css = CSS_PROP[p];
      const prev = node.style.getPropertyValue(css);
      const prio = node.style.getPropertyPriority(css);
      restores.push(() => prev ? node.style.setProperty(css, prev, prio) : node.style.removeProperty(css));
      node.style.setProperty(css, rgb, 'important');
      converted += 1;
    }
  }

  let error = null, headerPx = null;
  try {
    const canvas = await html2canvas(root, { scale: 1, backgroundColor: '#ffffff' });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData(20, 20, 1, 1).data;
    headerPx = [d[0], d[1], d[2]];
  } catch (e) { error = String(e.message || e).slice(0, 70); }

  restores.reverse().forEach(fn => fn());
  const afterA = getComputedStyle(document.getElementById('a')).backgroundColor;
  return { scanned, converted, before, error, headerPx, restoredA: afterA };
});

console.log(`掃描 ${out.scanned} 個屬性,轉換 ${out.converted} 個\n`);
console.log('轉換前的值:');
out.before.forEach(b => console.log(`  ${b.tag.padEnd(10)} ${b.prop.padEnd(18)} ${b.from}`));
console.log(`\nhtml2canvas: ${out.error ? '💥 ' + out.error : `✅ 成功,表頭像素 rgb(${out.headerPx.join(', ')})`}`);
console.log(`還原後 #a 的 background: ${out.restoredA}`);
console.log('\n--- 結論 ---');
console.log(!out.error && out.converted > 0 && /oklch/.test(out.restoredA)
  ? '✅ 轉換有效且可還原:html2canvas 不再拋錯,畫面樣式回復原狀'
  : '❌ 未達成');
await browser.close();
