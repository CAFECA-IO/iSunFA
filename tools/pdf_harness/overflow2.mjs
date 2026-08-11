import { chromium } from 'playwright';

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 1) 極寬表（min-content 就超過可列印寬）會不會撐爆 scrollWidth
// 2) 圖表 SVG 在 width:100% / height:auto 下的實際尺寸
const COLS = Array.from({ length: 16 }, (_, i) => `指標項目${i + 1}`);
const ROW = COLS.map((_, i) => `2,345,678.${i}`);

const SVGS = [
  ['小流程圖 viewBox 200x120', `<svg viewBox="0 0 200 120" width="200" height="120"><rect width="200" height="120" fill="#eef"/></svg>`],
  ['桑基圖 viewBox 1200x700', `<svg viewBox="0 0 1200 700" width="1200" height="700"><rect width="1200" height="700" fill="#efe"/></svg>`],
  ['無 viewBox 只有 w/h', `<svg width="400" height="260"><rect width="400" height="260" fill="#fee"/></svg>`],
  ['極高 viewBox 600x2400', `<svg viewBox="0 0 600 2400" width="600" height="2400"><rect width="600" height="2400" fill="#ffe"/></svg>`],
];

const PRINT = `
  #pdf-content .overflow-x-auto { overflow-x: visible !important; }
  #pdf-content table { width:100% !important; table-layout:auto !important; }
  #pdf-content th, #pdf-content td { white-space: normal !important; overflow-wrap: break-word !important; }
  #pdf-content .chart-shell-content { transform:none !important; width:100% !important; height:auto !important; display:block !important; }
  #pdf-content .chart-shell-content svg { max-height:none !important; max-width:100% !important; height:auto !important; width:100% !important; }
`;

const html = `<body style="margin:0">
<div id="pdf-content" style="width:794px;font-family:sans-serif;font-size:14px">
  <div class="overflow-x-auto"><table style="border-collapse:collapse">
    <thead><tr>${COLS.map(c => `<th style="padding:6px;border:1px solid #ddd">${c}</th>`).join('')}</tr></thead>
    <tbody><tr>${ROW.map(c => `<td style="padding:6px;border:1px solid #ddd">${c}</td>`).join('')}</tr></tbody>
  </table></div>
  ${SVGS.map(([name, svg], i) => `<div class="chart-shell-content" data-name="${name}" id="c${i}">${svg}</div>`).join('')}
</div><style>${PRINT}</style></body>`;

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.setContent(html);
const r = await page.evaluate(() => {
  const root = document.getElementById('pdf-content');
  const t = document.querySelector('table');
  const charts = [...document.querySelectorAll('.chart-shell-content')].map(n => {
    const svg = n.querySelector('svg').getBoundingClientRect();
    return { name: n.dataset.name, w: Math.round(svg.width), h: Math.round(svg.height) };
  });
  return {
    clientW: root.clientWidth, scrollW: root.scrollWidth,
    tableW: Math.round(t.getBoundingClientRect().width),
    charts,
  };
});
console.log(`#pdf-content: clientWidth ${r.clientW}px  scrollWidth ${r.scrollW}px`);
console.log(`16 欄表寬: ${r.tableW}px`);
console.log(r.scrollW > r.clientW
  ? `❌ 溢出 ${r.scrollW - r.clientW}px —— 光柵化會把整份依 ${r.scrollW}px 縮到頁寬，其餘內容因此「沒有滿版」（縮到 ${(r.clientW / r.scrollW * 100).toFixed(0)}%）`
  : '✅ 未溢出');
console.log('\n圖表尺寸（可列印寬 794px）');
console.log('-'.repeat(60));
r.charts.forEach(c => console.log(`  ${c.name.padEnd(26)} ${c.w} × ${c.h}px` + (c.h > 1000 ? '  ← 高過一頁(A4 內容區約 1000px)' : '')));
await browser.close();
