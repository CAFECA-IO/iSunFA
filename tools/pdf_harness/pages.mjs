import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// 與 src/constants/pdf_export.ts 同值
const SCALE = 2, MARGIN_MM = 15;
const A4_W_MM = 210, A4_H_MM = 297;

const browser = await chromium.launch({
  ...LAUNCH,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('file://' + path.join(__dirname, 'page.html'));
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });
await page.evaluate(() => window.scrollTo(0, 420));

const out = await page.evaluate(async ({ SCALE, MARGIN_MM, A4_W_MM, A4_H_MM, PPS }) => {
  const element = document.getElementById('content');
  const stripeH = window.__STRIPE_H__;
  const contentWidthPx = element.scrollWidth;
  const contentHeightPx = element.scrollHeight;

  // ---- 完全照 renderSegmentedPdf 的換算 ----
  const printableWidthMm = A4_W_MM - MARGIN_MM * 2;
  const printableHeightMm = A4_H_MM - MARGIN_MM * 2;
  const pxPerMm = contentWidthPx / printableWidthMm;
  const pageHeightPx = printableHeightMm * pxPerMm;
  const totalPages = Math.max(1, Math.ceil(contentHeightPx / pageHeightPx));

  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = Math.ceil(contentWidthPx * SCALE);
  pageCanvas.height = Math.ceil(pageHeightPx * SCALE);
  const pageContext = pageCanvas.getContext('2d', { willReadFrequently: true });

  const decode = (d) => (d[0] | (d[1] << 8));
  const pages = [];

  for (let startPage = 0; startPage < totalPages; startPage += PPS) {
    const pagesInSegment = Math.min(PPS, totalPages - startPage);
    const sliceTopPx = startPage * pageHeightPx;
    const sliceHeightPx = Math.min(pagesInSegment * pageHeightPx, contentHeightPx - sliceTopPx);

    const segmentCanvas = await html2canvas(element, {
      scale: SCALE, useCORS: true, backgroundColor: '#ffffff',
      x: 0, y: sliceTopPx,                       // ← 已修正的段落座標
      width: contentWidthPx, height: sliceHeightPx,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      scrollX: 0, scrollY: 0,
    });

    for (let offset = 0; offset < pagesInSegment; offset += 1) {
      pageContext.fillStyle = '#ffffff';
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.drawImage(segmentCanvas, 0, -Math.round(offset * pageHeightPx * SCALE));

      const px = (y) => [...pageContext.getImageData(20, y, 1, 1).data];
      const topPx = px(1);
      const botPx = px(pageCanvas.height - 2);

      const absPage = startPage + offset;
      const contentTop = absPage * pageHeightPx;
      const contentBot = Math.min(contentHeightPx, contentTop + pageHeightPx) - 1;

      pages.push({
        absPage,
        drawOffsetY: -offset * pageHeightPx * SCALE,
        isFractional: Math.abs((offset * pageHeightPx * SCALE) % 1) > 1e-9,
        topSeen: decode(topPx), topExp: Math.floor(contentTop / stripeH),
        botSeen: decode(botPx), botExp: Math.floor(contentBot / stripeH),
        // 條紋色的 b 一律是 200;若被重採樣混色,b 會偏離 200
        topB: topPx[2], botB: botPx[2],
        isWhite: topPx[0] === 255 && topPx[1] === 255 && topPx[2] === 255,
      });
    }
  }
  return { contentHeightPx, pageHeightPx, totalPages, pageCanvasH: pageCanvas.height, pages };
}, { SCALE, MARGIN_MM, A4_W_MM, A4_H_MM, PPS: 3 });

console.log(`內容高 ${out.contentHeightPx}px,每頁 ${out.pageHeightPx.toFixed(4)}px,共 ${out.totalPages} 頁`);
console.log(`頁面 canvas 高 ${out.pageCanvasH}px (= ceil(${(out.pageHeightPx * SCALE).toFixed(4)}))`);
console.log(`每頁高度是小數:${out.pageHeightPx % 1 !== 0 ? '是' : '否'}\n`);

let wrongContent = 0, blurred = 0, whitePages = 0;
console.log('頁  貼圖 y 位移      小數?  頂端條紋 看到/期望   底端條紋 看到/期望   取樣色 b');
console.log('-'.repeat(88));
for (const p of out.pages) {
  const topOk = p.topSeen === p.topExp;
  const botOk = p.botSeen === p.botExp || p.isWhite;
  const sharp = (p.topB === 200 || p.topB === 255);
  if (!topOk) wrongContent += 1;
  if (!sharp) blurred += 1;
  if (p.isWhite) whitePages += 1;
  console.log(
    String(p.absPage).padStart(3) +
    String(p.drawOffsetY.toFixed(2)).padStart(14) +
    (p.isFractional ? '   是  ' : '   否  ') +
    `   ${String(p.topSeen).padStart(4)}/${String(p.topExp).padEnd(4)} ${topOk ? '✓' : '✗'}` +
    `        ${String(p.botSeen).padStart(4)}/${String(p.botExp).padEnd(4)} ${botOk ? '✓' : '✗'}` +
    `        ${String(p.topB).padStart(3)}${sharp ? '' : ' ←混色'}`
  );
}

console.log('\n--- 總結 ---');
console.log(`內容錯位的頁:${wrongContent} / ${out.pages.length}`);
console.log(`取樣點被重採樣混色的頁:${blurred} / ${out.pages.length}`);
console.log(`整頁全白的頁:${whitePages}`);
await browser.close();
