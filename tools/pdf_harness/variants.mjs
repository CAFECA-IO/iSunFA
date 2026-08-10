import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('file://' + path.join(__dirname, 'page.html'));
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });
await page.evaluate(() => window.scrollTo(0, 420));

const out = await page.evaluate(async () => {
  const element = document.getElementById('content');
  const stripeH = window.__STRIPE_H__;
  const W = element.scrollWidth, H = element.scrollHeight;
  const pageHeightPx = 1123, PPS = 3;
  const totalPages = Math.ceil(H / pageHeightPx);
  const rect = element.getBoundingClientRect();
  const elTop = rect.top + window.scrollY;
  const elLeft = rect.left + window.scrollX;
  const decode = (d) => (d[0] | (d[1] << 8));

  const variants = {
    // A:目前程式碼 —— 把元素在文件中的位置加進去
    A_document_coords: (slice) => ({ x: elLeft, y: elTop + slice }),
    // B:只給元素內偏移
    B_element_offset:  (slice) => ({ x: 0, y: slice }),
  };

  const report = {};
  for (const [name, mk] of Object.entries(variants)) {
    const rows = [];
    for (let sp = 0; sp < totalPages; sp += PPS) {
      const pages = Math.min(PPS, totalPages - sp);
      const sliceTop = sp * pageHeightPx;
      const sliceH = Math.min(pages * pageHeightPx, H - sliceTop);
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        ...mk(sliceTop),
        width: W, height: sliceH,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scrollX: 0, scrollY: 0,
      });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const px = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
      rows.push({
        sp,
        firstSeen: decode(px(20, 1)),
        firstExp: Math.floor(sliceTop / stripeH),
        lastSeen: decode(px(20, canvas.height - 2)),
        lastExp: Math.floor((sliceTop + sliceH - 1) / stripeH),
        // 右緣:分段若在水平方向錯位,這裡會是背景而不是橫紋色
        rightEdge: px(canvas.width - 3, Math.floor(canvas.height / 2)),
      });
    }
    report[name] = rows;
  }
  return { W, H, elTop, elLeft, totalPages, report };
});

console.log('元素 top=%d left=%d,內容 %dx%d,共 %d 頁\n', out.elTop, out.elLeft, out.W, out.H, out.totalPages);

for (const [name, rows] of Object.entries(out.report)) {
  let ok = true, seams = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.firstSeen !== r.firstExp || r.lastSeen !== r.lastExp) ok = false;
    // 右緣應為橫紋色(b=200),背景會是 255/255/255 或 136/136/136
    if (r.rightEdge[2] !== 200) ok = false;
    if (i > 0) {
      const gap = r.firstSeen - rows[i - 1].lastSeen - 1;
      seams.push(gap);
      if (gap !== 0) ok = false;
    }
  }
  console.log('%s -> %s', name.padEnd(20), ok ? '✅ 全部正確' : '❌ 錯位');
  for (const r of rows) {
    const mark = (r.firstSeen === r.firstExp && r.lastSeen === r.lastExp) ? '  ' : '✗ ';
    console.log('   %s段@p%-3d 頂 %4d/%-4d 底 %4d/%-4d 右緣%j',
      mark, r.sp, r.firstSeen, r.firstExp, r.lastSeen, r.lastExp, r.rightEdge);
  }
  console.log('   接縫(0=完美接合): %j\n', seams);
}
await browser.close();
