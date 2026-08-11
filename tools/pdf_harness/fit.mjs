import { chromium } from 'playwright';

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const COLS = ['類別/範疇','子代碼','規模','影響','可控','利害關係人','外包','法規','成本','合計','重大'];
const ROW = ['類別二:輸入能源的間接溫室氣體排放量','2.1 外購電力 外購電力','2','3','3','3','2','2','3','21','V'];
const b = await chromium.launch({ ...LAUNCH });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.setContent(`<body style="margin:0"><div id="pdf-content" style="width:794px;font-family:sans-serif;font-size:14px">
<div class="overflow-x-auto"><table style="border-collapse:collapse">
<thead><tr>${COLS.map(c=>`<th style="padding:8px;white-space:nowrap">${c}</th>`).join('')}</tr></thead>
<tbody><tr>${ROW.map(c=>`<td style="padding:8px;white-space:nowrap">${c}</td>`).join('')}</tr></tbody>
</table></div></div>
<style>
#pdf-content .overflow-x-auto{overflow-x:visible!important}
#pdf-content table{table-layout:auto!important;word-wrap:break-word!important}
#pdf-content th,#pdf-content td{white-space:normal!important;overflow-wrap:break-word!important}
</style></body>`);
const r = await p.evaluate(() => {
  const root = document.getElementById('pdf-content');
  const t = root.querySelector('table');
  const constrained = { w: Math.round(t.scrollWidth),
                        cell: Math.round(t.querySelector('tbody td').getBoundingClientRect().height) };
  // 先解除容器約束,量內在寬度
  const prevW = t.style.width;
  t.style.width = 'max-content';
  const intrinsic = Math.round(t.getBoundingClientRect().width);
  const intrinsicCell = Math.round(t.querySelector('tbody td').getBoundingClientRect().height);
  t.style.width = prevW;
  const before = { w: intrinsic, cell: intrinsicCell, constrainedW: constrained.w, constrainedCell: constrained.cell };
  const avail = root.clientWidth;
  const scale = Math.min(1, avail / intrinsic);
  if (scale < 1) t.style.width = 'max-content';
  const wrap = t.parentElement;
  t.style.transformOrigin = 'left top';
  t.style.transform = `scale(${scale})`;
  wrap.style.height = `${Math.ceil(t.scrollHeight * scale)}px`;
  const rect = t.getBoundingClientRect();
  return { before, avail, scale: +scale.toFixed(3),
           after: { w: Math.round(rect.width), h: Math.round(rect.height) },
           wrapH: Math.round(wrap.getBoundingClientRect().height) };
});
console.log(`可列印寬 ${r.avail}px`);
console.log(`受容器約束:表寬 ${r.before.constrainedW}px,儲存格高 ${r.before.constrainedCell}px`);
console.log(`內在寬度  :表寬 ${r.before.w}px(超出 ${r.before.w - r.avail}px),儲存格高 ${r.before.cell}px`);
console.log(`縮放 ${r.scale} → 表寬 ${r.after.w}px,容器高 ${r.wrapH}px(表高 ${r.after.h}px)`);
const fits = r.after.w <= r.avail + 1;
const noGap = Math.abs(r.wrapH - r.after.h) <= 2;
console.log(`\n${fits ? '✅' : '❌'} 收進可列印寬   ${noGap ? '✅' : '❌'} 容器高度無多餘空隙`);
await b.close();
