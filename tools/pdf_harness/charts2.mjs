import { chromium } from 'playwright';

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

const SVGS = [
  ['小流程圖 viewBox 200x120', `<svg viewBox="0 0 200 120" width="200" height="120"><rect width="200" height="120" fill="#eef"/><text x="10" y="60" font-size="16">A→B</text></svg>`],
  ['桑基圖 viewBox 1200x700', `<svg viewBox="0 0 1200 700" width="1200" height="700"><rect width="1200" height="700" fill="#efe"/></svg>`],
  ['mermaid 風格 w=100% + max-width', `<svg viewBox="0 0 520 300" style="max-width:520px" width="100%"><rect width="520" height="300" fill="#eef8ff"/></svg>`],
  ['無 viewBox 只有 w/h', `<svg width="400" height="260"><rect width="400" height="260" fill="#fee"/></svg>`],
  ['極高 viewBox 600x2400', `<svg viewBox="0 0 600 2400" width="600" height="2400"><rect width="600" height="2400" fill="#ffe"/></svg>`],
];

const RULES = [
  ['現況 width:100%;height:auto;max-height:none', `width:100%!important;height:auto!important;max-width:100%!important;max-height:none!important;`],
  ['加上限 width:100%;max-height:900px', `width:100%!important;height:auto!important;max-width:100%!important;max-height:900px!important;`],
  ['建議 width:auto;max-w:100%;max-h:900px', `width:auto!important;height:auto!important;max-width:100%!important;max-height:900px!important;`],
];

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const [label, rule] of RULES) {
  await page.setContent(`<body style="margin:0"><div id="pdf-content" style="width:794px">
    ${SVGS.map(([n, s]) => `<div class="chart-shell-content" data-name="${n}">${s}</div>`).join('')}
  </div><style>
    #pdf-content .chart-shell-content { width:100%!important; height:auto!important; display:block!important; text-align:center!important; }
    #pdf-content .chart-shell-content svg { ${rule} }
  </style></body>`);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.chart-shell-content')].map(n => {
    const b = n.querySelector('svg').getBoundingClientRect();
    return { name: n.dataset.name, w: Math.round(b.width), h: Math.round(b.height) };
  }));
  console.log(`\n[${label}]`);
  rows.forEach(r => {
    const flag = r.h > 1000 ? ' ← 超過一頁' : (r.w < 200 ? ' ← 過小' : '');
    console.log(`  ${r.name.padEnd(32)} ${String(r.w).padStart(5)} × ${String(r.h).padStart(5)}px${flag}`);
  });
}
await browser.close();
