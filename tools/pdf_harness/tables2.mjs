import { chromium } from 'playwright';

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 兩張表：一張欄少（窄）、一張 11 欄（寬），量在三種列印樣式下的寬度
const NARROW = { cols: ['項目', '數值'], row: ['總排放量', '12,345'] };
const WIDE = {
  cols: ['類別/範疇', '子代碼', '規模', '影響', '可控', '利害關係人', '外包', '法規', '成本', '合計', '重大'],
  row: ['類別二:輸入能源的間接溫室氣體排放量', '2.1 外購電力 外購電力', '2', '3', '3', '3', '2', '2', '3', '21', '✓'],
};
const table = (t) => `<div class="overflow-x-auto"><table style="border-collapse:collapse">
  <thead><tr>${t.cols.map(c => `<th style="padding:8px;white-space:nowrap;border:1px solid #ddd">${c}</th>`).join('')}</tr></thead>
  <tbody><tr>${t.row.map(c => `<td style="padding:8px;white-space:nowrap;border:1px solid #ddd">${c}</td>`).join('')}</tr></tbody>
</table></div>`;

const html = (extra) => `<body style="margin:0">
<div id="pdf-content" style="width:794px;font-family:sans-serif;font-size:14px">
  <p>一段內文</p>
  ${table(NARROW)}
  <p>另一段內文</p>
  ${table(WIDE)}
</div><style>
  #pdf-content .overflow-x-auto { overflow-x: visible !important; }
  #pdf-content th, #pdf-content td { white-space: normal !important; overflow-wrap: break-word !important; }
  ${extra}
</style></body>`;

const VARIANTS = [
  ['A 原本：width:100% + fixed', `#pdf-content table { width:100% !important; table-layout:fixed !important; }`],
  ['B 8/10 改的：只有 auto', `#pdf-content table { table-layout:auto !important; }`],
  ['C 建議：width:100% + auto', `#pdf-content table { width:100% !important; table-layout:auto !important; }`],
];

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log('變體'.padEnd(30) + '窄表寬'.padEnd(10) + '寬表寬'.padEnd(10) + '#pdf-content scrollWidth'.padEnd(26) + '寬表首欄');
console.log('-'.repeat(96));
for (const [label, extra] of VARIANTS) {
  await page.setContent(html(extra));
  const r = await page.evaluate(() => {
    const root = document.getElementById('pdf-content');
    const [narrow, wide] = [...document.querySelectorAll('table')];
    const firstCell = wide.querySelector('tbody td');
    const lh = parseFloat(getComputedStyle(firstCell).lineHeight) || 20;
    return {
      narrowW: Math.round(narrow.getBoundingClientRect().width),
      wideW: Math.round(wide.getBoundingClientRect().width),
      scrollW: root.scrollWidth,
      clientW: root.clientWidth,
      cellW: Math.round(firstCell.getBoundingClientRect().width),
      lines: Math.round(firstCell.getBoundingClientRect().height / lh),
    };
  });
  console.log(
    label.padEnd(30) + `${r.narrowW}px`.padEnd(10) + `${r.wideW}px`.padEnd(10) +
    `${r.scrollW}px (client ${r.clientW})`.padEnd(26) + `${r.cellW}px / ${r.lines} 行`
  );
}
console.log('\n--- 判讀 ---');
console.log('窄表寬 ≠ 寬表寬 → 使用者看到的「表格沒有一樣寬，有特別窄的」');
console.log('scrollWidth > clientWidth → 光柵化畫布比版面寬，整份縮小後就「沒有滿版」，圖也跟著變小');
await browser.close();
