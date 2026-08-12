import { chromium } from 'playwright';

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 列印樣式的 width:100% !important 會不會蓋掉 JS 為了「量內在寬」而設的 inline max-content
const COLS = ['排放類別', '排放項目', 'A.幅度(數量)', 'B.影響程度', 'C.風險與機會', 'D.利害相關者關切事項', 'E.員工參與', 'F.活動資料可取得度', 'G.排放係數可取得度', 'H.發生頻率', '各項評分加總', '判定'];
const ROW = ['類別二：輸入能源的間接溫室氣體排放量', '2.1 外購電力 外購電力', '2', '3', '3', '3', '2', '2', '3', '3', '21', '✓'];

const browser = await chromium.launch({ ...LAUNCH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.setContent(`<body style="margin:0">
<div id="pdf-content" style="width:794px;font-family:sans-serif;font-size:14px">
 <div class="overflow-x-auto"><table style="border-collapse:collapse">
  <thead><tr>${COLS.map(c => `<th style="padding:8px;border:1px solid #ddd">${c}</th>`).join('')}</tr></thead>
  <tbody><tr>${ROW.map(c => `<td style="padding:8px;border:1px solid #ddd">${c}</td>`).join('')}</tr></tbody>
 </table></div>
</div><style>
 #pdf-content .overflow-x-auto { overflow-x: visible !important; }
 #pdf-content table { width:100% !important; table-layout:auto !important; }
 #pdf-content th, #pdf-content td { white-space: normal !important; overflow-wrap: break-word !important; }
</style></body>`);

const r = await page.evaluate(() => {
  const t = document.querySelector('table');
  const out = {};
  out.constrained = Math.round(t.getBoundingClientRect().width);
  t.style.width = 'max-content';                              // 沒有 important
  out.plain = Math.round(t.getBoundingClientRect().width);
  out.plainComputed = getComputedStyle(t).width;
  t.style.setProperty('width', 'max-content', 'important');   // 有 important
  out.bang = Math.round(t.getBoundingClientRect().width);
  t.style.removeProperty('width');
  const th = document.querySelector('th');
  out.firstColW = Math.round(th.getBoundingClientRect().width);
  out.firstColH = Math.round(th.getBoundingClientRect().height);
  return out;
});

console.log(`容器約束下的表寬          ${r.constrained}px`);
console.log(`量內在寬（無 important）   ${r.plain}px   computed=${r.plainComputed}`);
console.log(`量內在寬（有 important）   ${r.bang}px`);
console.log(`第一欄表頭               ${r.firstColW}px 寬 × ${r.firstColH}px 高`);
console.log('\n--- 結論 ---');
console.log(r.plain === r.constrained && r.bang > r.constrained
  ? `❌ 量不到內在寬：列印樣式的 width:100% !important 蓋過 inline 的 max-content，\n   內在寬回報成 ${r.plain}px（= 可列印寬），永遠判定「沒超寬」，縮放從來沒觸發過。\n   真值 ${r.bang}px，超出 ${r.bang - r.constrained}px。`
  : '✅ 量得到內在寬');
await browser.close();
