import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 重現 pdf_editor.tsx 裡既有的 getComputedStyle Proxy（20260426 - Luphia）
// 它把任何含 lab / lch / color( 的 computed 值換成 rgb(17, 24, 39)
const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.setContent(`<body style="margin:0">
<div id="pdf-content" style="background:#fff;width:500px;padding:12px">
  <table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th id="a" style="background:oklch(0.985 0.002 247.839);color:oklch(0.553 0.195 38.402);padding:18px">欄位一</th>
      <th id="b" style="background:color-mix(in oklab, #ffffff 5%, transparent);padding:18px">欄位二</th>
    </tr></thead>
    <tbody><tr>
      <td style="background:#fff;padding:18px">內容一</td>
      <td style="background:rgb(240,240,240);padding:18px">內容二</td>
    </tr></tbody>
  </table>
</div></body>`);
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });

const out = await page.evaluate(async () => {
  const root = document.getElementById('pdf-content');
  const original = window.getComputedStyle;

  // ---- 既有的 Proxy：碰到 lab/lch/color( 一律回 rgb(17,24,39) ----
  const installBlackoutProxy = () => {
    window.getComputedStyle = function (elt, pseudoElt) {
      const styles = original.call(window, elt, pseudoElt);
      return new Proxy(styles, {
        get(target, prop) {
          const obj = target;
          if (typeof obj[prop] === 'function') {
            if (prop === 'getPropertyValue') {
              return function (property) {
                const val = target.getPropertyValue(property);
                if (typeof val === 'string' && (val.includes('lab') || val.includes('lch') || val.includes('color('))) {
                  if (property.toLowerCase().includes('shadow') || property.toLowerCase().includes('image')) return 'none';
                  return 'rgb(17, 24, 39)';
                }
                return val;
              };
            }
            return obj[prop].bind(target);
          }
          const val = obj[prop];
          if (typeof val === 'string' && (val.includes('lab') || val.includes('lch') || val.includes('color('))) {
            if (String(prop).toLowerCase().includes('shadow') || String(prop).toLowerCase().includes('image')) return 'none';
            return 'rgb(17, 24, 39)';
          }
          return val;
        },
      });
    };
  };

  // ---- 修正版：同樣攔截，但用瀏覽器自己的解析器換成「等價的」rgb ----
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const convert = (value) => {
    if (cache.has(value)) return cache.get(value);
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = '#000000';
    pctx.fillStyle = value;
    pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    const rgba = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${(d[3] / 255).toFixed(3)})`;
    cache.set(value, rgba);
    return rgba;
  };
  const UNSUPPORTED = /(oklch|oklab|color-mix|\blch\(|\blab\(|\bhwb\()/i;
  const rewrite = (prop, val) => {
    if (typeof val !== 'string' || !UNSUPPORTED.test(val)) return val;
    const p = String(prop).toLowerCase();
    if (p.includes('shadow') || p.includes('image') || p.includes('gradient')) return 'none';
    // 多值（如 border-color 三段）逐段換
    return val.replace(/(oklch|oklab|color-mix|lch|lab|hwb)\([^()]*(\([^()]*\))?[^()]*\)/gi, (m) => convert(m));
  };
  const installConvertingProxy = () => {
    window.getComputedStyle = function (elt, pseudoElt) {
      const styles = original.call(window, elt, pseudoElt);
      return new Proxy(styles, {
        get(target, prop) {
          const obj = target;
          if (typeof obj[prop] === 'function') {
            if (prop === 'getPropertyValue') {
              return function (property) { return rewrite(property, target.getPropertyValue(property)); };
            }
            return obj[prop].bind(target);
          }
          return rewrite(prop, obj[prop]);
        },
      });
    };
  };

  const shoot = async (label) => {
    try {
      const canvas = await html2canvas(root, { scale: 1, backgroundColor: '#ffffff' });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const px = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
      return { label, error: null, thA: px(30, 25), thB: px(400, 25) };
    } catch (e) {
      return { label, error: String(e.message || e).slice(0, 70) };
    }
  };

  const results = [];
  results.push(await shoot('無 Proxy'));
  installBlackoutProxy();
  results.push(await shoot('既有 Proxy（回 rgb(17,24,39)）'));
  installConvertingProxy();
  results.push(await shoot('修正版 Proxy（等價換算）'));
  window.getComputedStyle = original;

  const truth = { a: convert('oklch(0.985 0.002 247.839)'), b: convert('color-mix(in oklab, #ffffff 5%, transparent)') };
  return { results, truth };
});

console.log(`真值：欄位一底色 = ${out.truth.a}   欄位二底色 = ${out.truth.b}\n`);
console.log('情境'.padEnd(34) + '欄位一像素'.padEnd(22) + '欄位二像素');
console.log('-'.repeat(80));
for (const r of out.results) {
  if (r.error) { console.log(r.label.padEnd(34) + '💥 ' + r.error); continue; }
  const black = (p) => p[0] < 40 && p[1] < 40 && p[2] < 40;
  console.log(
    r.label.padEnd(34) +
    (`rgb(${r.thA.join(',')})` + (black(r.thA) ? ' ← 黑' : '')).padEnd(22) +
    `rgb(${r.thB.join(',')})` + (black(r.thB) ? ' ← 黑' : '')
  );
}
await browser.close();
