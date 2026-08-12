import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 端到端：套上修正後的列印樣式 + 換算式 getComputedStyle + 表格縮放，再真的光柵化一次
const CHART_MAX = 900;
const PRINT = `
  #pdf-content .overflow-x-auto { overflow-x: visible !important; }
  #pdf-content table { width:100% !important; table-layout:auto !important; word-wrap:break-word !important; }
  #pdf-content th, #pdf-content td { white-space: normal !important; overflow-wrap: break-word !important; }
  #pdf-content thead { display: table-header-group !important; }
  #pdf-content tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  #pdf-content .chart-shell-content { width:100% !important; height:auto !important; display:block !important; text-align:center !important; }
  #pdf-content .chart-shell-content svg { max-height:${CHART_MAX}px !important; max-width:100% !important; height:auto !important; width:auto !important; }
`;

const NARROW = { cols: ['項目', '數值'], row: ['總排放量', '12,345'] };
const WIDE11 = {
  cols: ['類別/範疇', '子代碼', '規模', '影響', '可控', '利害關係人', '外包', '法規', '成本', '合計', '重大'],
  row: ['類別二:輸入能源的間接溫室氣體排放量', '2.1 外購電力 外購電力', '2', '3', '3', '3', '2', '2', '3', '21', '✓'],
};
const WIDE16 = {
  cols: Array.from({ length: 16 }, (_, i) => `指標項目${i + 1}`),
  row: Array.from({ length: 16 }, (_, i) => `2,345,678.${i}`),
};
// 表頭用 Tailwind v4 會產出的顏色寫法
const tbl = (t, id) => `<div class="overflow-x-auto"><table id="${id}" style="border-collapse:collapse">
  <thead><tr>${t.cols.map(c => `<th style="background:oklch(0.985 0.002 247.839);color:oklch(0.553 0.195 38.402);padding:8px;white-space:nowrap;border:1px solid #ddd">${c}</th>`).join('')}</tr></thead>
  <tbody><tr>${t.row.map(c => `<td style="padding:8px;white-space:nowrap;border:1px solid #ddd">${c}</td>`).join('')}</tr></tbody>
</table></div>`;

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.setContent(`<body style="margin:0;background:#fff">
<div id="pdf-content" style="width:794px;font-family:sans-serif;font-size:14px;background:#fff">
  <p>一段內文</p>
  ${tbl(NARROW, 'narrow')}
  ${tbl(WIDE11, 'wide11')}
  ${tbl(WIDE16, 'wide16')}
  <div class="chart-shell-content" data-name="小流程圖"><svg viewBox="0 0 200 120" width="200" height="120"><rect width="200" height="120" fill="#eef"/></svg></div>
  <div class="chart-shell-content" data-name="桑基圖"><svg viewBox="0 0 1200 700" width="1200" height="700"><rect width="1200" height="700" fill="#efe"/></svg></div>
  <div class="chart-shell-content" data-name="長條圖(極高)"><svg viewBox="0 0 600 2400" width="600" height="2400"><rect width="600" height="2400" fill="#ffe"/></svg></div>
</div><style>${PRINT}</style></body>`);
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });

const out = await page.evaluate(async () => {
  const root = document.getElementById('pdf-content');

  // ---- 與 pdf_color_safety.ts 同一套邏輯 ----
  const UNSUPPORTED = /(oklch|oklab|color-mix|\blch\(|\blab\(|\bhwb\()/i;
  const FN = /(?:oklch|oklab|color-mix|lch|lab|hwb)\((?:[^()]|\([^()]*\))*\)/gi;
  const probe = document.createElement('canvas'); probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const convert = (v) => {
    if (cache.has(v)) return cache.get(v);
    pctx.fillStyle = '#010203'; pctx.fillStyle = v;
    const ok = pctx.fillStyle !== '#010203';
    if (!ok) { cache.set(v, v); return v; }
    pctx.clearRect(0, 0, 1, 1); pctx.fillStyle = v; pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    const r = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${(d[3] / 255).toFixed(3)})`;
    cache.set(v, r); return r;
  };
  const rewrite = (prop, val) => {
    if (typeof val !== 'string' || !UNSUPPORTED.test(val)) return val;
    const out = val.replace(FN, (fn) => convert(fn));
    if (!UNSUPPORTED.test(out)) return out;
    const p = String(prop).toLowerCase();
    return (p.includes('shadow') || p.includes('image')) ? 'none' : out;
  };
  const original = window.getComputedStyle;
  window.getComputedStyle = function (el, pseudo) {
    const s = original.call(window, el, pseudo);
    return new Proxy(s, { get(t, p) {
      const v = t[p];
      if (typeof v === 'function') {
        if (p === 'getPropertyValue') return (n) => rewrite(n, t.getPropertyValue(n));
        return v.bind(t);
      }
      return typeof v === 'string' ? rewrite(p, v) : v;
    }});
  };

  // ---- withFittedTables ----
  const restores = [];
  const avail = root.clientWidth;
  const fitted = [];
  root.querySelectorAll('table').forEach((table) => {
    const wrapper = table.parentElement;
    const pw = table.style.width;
    table.style.width = 'max-content';
    const intrinsic = table.getBoundingClientRect().width;
    table.style.width = pw;
    if (intrinsic <= avail) return;
    const scale = avail / intrinsic;
    fitted.push({ id: table.id, intrinsic: Math.round(intrinsic), scale: +scale.toFixed(3) });
    restores.push(() => { table.style.transform=''; table.style.transformOrigin=''; table.style.width=pw; if(wrapper) wrapper.style.height=''; });
    table.style.width = 'max-content';
    table.style.transformOrigin = 'left top';
    table.style.transform = `scale(${scale})`;
    if (wrapper) wrapper.style.height = `${Math.ceil(table.getBoundingClientRect().height)}px`;
  });

  const geo = {
    clientW: root.clientWidth, scrollW: root.scrollWidth,
    narrow: Math.round(document.getElementById('narrow').getBoundingClientRect().width),
    wide11: Math.round(document.getElementById('wide11').getBoundingClientRect().width),
    charts: [...document.querySelectorAll('.chart-shell-content')].map(n => {
      const b = n.querySelector('svg').getBoundingClientRect();
      return { name: n.dataset.name, w: Math.round(b.width), h: Math.round(b.height) };
    }),
    fitted,
  };

  let error = null, headerPx = null;
  try {
    const canvas = await html2canvas(root, { scale: 1, backgroundColor: '#ffffff' });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // 窄表表頭大約在 y≈40
    const th = document.querySelector('#narrow th').getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const d = ctx.getImageData(Math.round(th.x - rr.x + 20), Math.round(th.y - rr.y + 8), 1, 1).data;
    headerPx = [d[0], d[1], d[2]];
  } catch (e) { error = String(e.message || e).slice(0, 70); }

  restores.forEach(f => f());
  window.getComputedStyle = original;
  return { geo, error, headerPx };
});

const g = out.geo;
const ok = [];
const check = (label, pass, detail) => { ok.push(pass); console.log(`${pass ? '✅' : '❌'} ${label.padEnd(30)} ${detail}`); };

console.log('== 修正後的實測 ==\n');
check('表頭顏色', out.headerPx && out.headerPx[0] > 200, out.error ? '💥 ' + out.error : `rgb(${out.headerPx.join(',')})（真值 249,250,251；修正前 17,24,39）`);
check('表格等寬', g.narrow === g.wide11, `窄表 ${g.narrow}px、11 欄表 ${g.wide11}px`);
check('版面滿版不溢出', g.scrollW <= g.clientW, `scrollWidth ${g.scrollW}px / clientWidth ${g.clientW}px`);
check('超寬表已縮放', g.fitted.length === 1 && g.fitted[0].id === 'wide16', g.fitted.map(f => `${f.id} 內在 ${f.intrinsic}px → ×${f.scale}`).join('、') || '無');
const tall = g.charts.filter(c => c.h > CHART_MAX);
check('圖表高度不超過一頁', tall.length === 0, g.charts.map(c => `${c.name} ${c.w}×${c.h}`).join('、'));
const letterboxed = g.charts.filter(c => c.h >= CHART_MAX && c.w >= g.clientW - 1);
check('圖表無信箱框空白', letterboxed.length === 0, letterboxed.length ? letterboxed.map(c => c.name).join('、') : '每張圖的框等於內容');

console.log(`\n--- 結論 ---\n${ok.every(Boolean) ? '✅ 六項全過' : '❌ 仍有未過項目'}`);
await browser.close();
