import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.setContent(`<body style="margin:0">
<div style="height:137px;background:#333"></div>
<div style="padding-left:41px">
  <div id="content" style="width:794px;background:#fff">
    <div style="height:800px"></div>
    <svg id="chart" width="700" height="400" style="display:block"><rect width="700" height="400" fill="#4a90d9"/></svg>
    <div style="height:1500px"></div>
    <table id="tbl" style="width:700px;height:300px"><tr><td>x</td></tr></table>
    <div style="height:900px"></div>
  </div>
</div></body>`);
await page.evaluate(() => window.scrollTo(0, 420));

const out = await page.evaluate(() => {
  const element = document.getElementById('content');
  const elementTopInViewport = element.getBoundingClientRect().top;
  const blocks = Array.from(element.querySelectorAll('svg, table, img, pre')).map((node) => {
    const r = node.getBoundingClientRect();
    return {
      tag: node.tagName.toLowerCase(),
      topPx: r.top - elementTopInViewport,
      bottomPx: r.bottom - elementTopInViewport,
    };
  });
  return {
    contentHeight: element.scrollHeight,
    scrollY: window.scrollY,
    elementTopInDoc: element.getBoundingClientRect().top + window.scrollY,
    blocks,
  };
});

console.log(`頁面已捲動 scrollY=${out.scrollY},元素在文件中的 top=${out.elementTopInDoc}`);
console.log(`內容高 ${out.contentHeight}px\n`);
console.log('量到的不可切割區塊(相對於元素頂端):');
const expected = { svg: [800, 1200], table: [2700, 3000] };
let ok = true;
for (const b of out.blocks) {
  const [eTop, eBot] = expected[b.tag] ?? [];
  const good = Math.abs(b.topPx - eTop) < 2 && Math.abs(b.bottomPx - eBot) < 2;
  if (!good) ok = false;
  console.log(`  ${b.tag.padEnd(6)} ${b.topPx.toFixed(1)} → ${b.bottomPx.toFixed(1)}   期望 ${eTop} → ${eBot}  ${good ? 'OK' : '✗'}`);
}

const PAGE = 1000;
const computePageStarts = (contentHeightPx, pageHeightPx, blocks) => {
  if (pageHeightPx <= 0 || contentHeightPx <= 0) return [0];
  const minFill = pageHeightPx * 0.35;
  const sorted = [...blocks].filter(b => b.bottomPx > b.topPx).sort((a, b) => a.topPx - b.topPx);
  const starts = [0];
  let cursor = 0;
  const maxPages = Math.ceil(contentHeightPx / pageHeightPx) + blocks.length + 1;
  for (let g = 0; g < maxPages; g += 1) {
    const nat = cursor + pageHeightPx;
    if (nat >= contentHeightPx) break;
    const straddling = sorted.find(b => b.topPx > cursor && b.topPx < nat && b.bottomPx > nat && b.bottomPx - b.topPx <= pageHeightPx);
    const boundary = straddling && straddling.topPx - cursor >= minFill ? straddling.topPx : nat;
    starts.push(boundary);
    cursor = boundary;
  }
  return starts;
};

const starts = computePageStarts(out.contentHeight, PAGE, out.blocks);
console.log(`\n分頁起點: [${starts.join(', ')}]`);

console.log('\n每個區塊是否完整落在單一頁內:');
const pageOf = (y) => { let i = 0; for (let k = 0; k < starts.length; k++) if (starts[k] <= y) i = k; return i; };
for (const b of out.blocks) {
  const pTop = pageOf(b.topPx), pBot = pageOf(b.bottomPx - 0.01);
  const whole = pTop === pBot;
  if (!whole) ok = false;
  console.log(`  ${b.tag.padEnd(6)} 頂在第 ${pTop} 頁,底在第 ${pBot} 頁  ${whole ? '完整 OK' : '✗ 被切開'}`);
}
console.log('\n' + (ok ? '結論:量測正確,圖表與表格都沒有被分頁線切開' : '結論:有問題'));
await browser.close();
process.exit(ok ? 0 : 1);
