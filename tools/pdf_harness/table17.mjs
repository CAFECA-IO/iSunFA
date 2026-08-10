import { chromium } from 'playwright';

const COLS = ['類別/範疇', '子代碼', '規模', '影響', '可控', '利害關係人', '外包', '法規', '成本', '合計', '重大'];
const ROW = ['類別二:輸入能源的間接溫室氣體排放量', '2.1 外購電力 外購電力', '2', '3', '3', '3', '2', '2', '3', '21', '✓'];

const html = (extra) => `<body style="margin:0">
<div id="pdf-content" style="width:794px;font-family:sans-serif;font-size:14px">
  <div class="overflow-x-auto">
    <table style="border-collapse:collapse">
      <thead><tr>${COLS.map(c => `<th style="padding:8px;white-space:nowrap;background:#fff;color:#c2410c">${c}</th>`).join('')}</tr></thead>
      <tbody><tr>${ROW.map(c => `<td style="padding:8px;white-space:nowrap">${c}</td>`).join('')}</tr></tbody>
    </table>
  </div>
</div>
<style>${extra}</style></body>`;

const PRINT = `
  #pdf-content .overflow-x-auto { overflow-x: visible !important; }
  #pdf-content table { width:100% !important; table-layout:fixed !important; word-wrap:break-word !important; }
  #pdf-content th, #pdf-content td { white-space: normal !important; overflow-wrap: break-word !important; word-wrap: break-word !important; }
`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const measure = async (extra, label) => {
  await page.setContent(html(extra));
  const r = await page.evaluate(() => {
    const th = [...document.querySelectorAll('th')];
    const firstCell = document.querySelector('tbody td');
    const cs = getComputedStyle(document.querySelector('table'));
    return {
      layout: cs.tableLayout,
      tableWidth: document.querySelector('table').getBoundingClientRect().width,
      colWidths: th.map(n => Math.round(n.getBoundingClientRect().width)),
      firstCellW: Math.round(firstCell.getBoundingClientRect().width),
      firstCellH: Math.round(firstCell.getBoundingClientRect().height),
      lineHeight: parseFloat(getComputedStyle(firstCell).lineHeight) || 20,
    };
  });
  r.estLines = Math.round(r.firstCellH / r.lineHeight);
  console.log(`\n[${label}]`);
  console.log(`  table-layout: ${r.layout}   表寬 ${Math.round(r.tableWidth)}px`);
  console.log(`  欄寬: ${r.colWidths.join(', ')}`);
  console.log(`  第一欄儲存格: ${r.firstCellW}px 寬 × ${r.firstCellH}px 高 ≈ ${r.estLines} 行`);
  return r;
};

const preview = await measure('', '預覽（無列印樣式）');
const print = await measure(PRINT, '下載（套用列印樣式）');

console.log('\n--- 結論 ---');
console.log(`第一欄寬度: 預覽 ${preview.firstCellW}px → 列印 ${print.firstCellW}px（${(print.firstCellW / preview.firstCellW * 100).toFixed(0)}%）`);
console.log(`第一欄行數: 預覽 ${preview.estLines} 行 → 列印 ${print.estLines} 行`);
console.log(print.estLines >= preview.estLines * 3
  ? '✅ 假設成立:列印樣式的 table-layout:fixed 把欄壓窄,中文逐字換行 → 直排'
  : '❌ 未重現,成因另有其他');
await browser.close();
