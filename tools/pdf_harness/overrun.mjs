import { chromium } from 'playwright';

const SCALE = 2, PAGE = 1000, PPS = 3;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.setContent(`<body style="margin:0"><div style="height:137px;background:#333"></div>
<div style="padding-left:41px"><div id="content" style="width:794px;background:#fff"></div></div></body>`);
await page.addScriptTag({ path: '/home/claude/h2c/node_modules/html2canvas/dist/html2canvas.min.js' });

const out = await page.evaluate(async ({ SCALE, PAGE, PPS }) => {
  const el = document.getElementById('content');
  // 400 條 10px 橫紋,顏色編碼索引;中間插一張 400px 高的「圖表」讓分頁被提前
  let html = '';
  for (let i = 0; i < 400; i++) {
    if (i === 90) html += '<svg id="chart" width="700" height="400" style="display:block"><rect width="700" height="400" fill="#000080"/></svg>';
    html += `<div style="height:10px;background:rgb(${i & 255},${(i >> 8) & 255},200)"></div>`;
  }
  el.innerHTML = html;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const W = el.scrollWidth, H = el.scrollHeight;
  const elTop = el.getBoundingClientRect().top;
  const blocks = Array.from(el.querySelectorAll('svg,table,img,pre')).map(n => {
    const r = n.getBoundingClientRect();
    return { topPx: r.top - elTop, bottomPx: r.bottom - elTop };
  });

  const computePageStarts = (ch, ph, bs) => {
    const minFill = ph * 0.35;
    const sorted = [...bs].filter(b => b.bottomPx > b.topPx).sort((a, b) => a.topPx - b.topPx);
    const starts = [0]; let cursor = 0;
    for (let g = 0; g < Math.ceil(ch / ph) + bs.length + 1; g++) {
      const nat = cursor + ph;
      if (nat >= ch) break;
      const st = sorted.find(b => b.topPx > cursor && b.topPx < nat && b.bottomPx > nat && b.bottomPx - b.topPx <= ph);
      const boundary = st && st.topPx - cursor >= minFill ? st.topPx : nat;
      starts.push(boundary); cursor = boundary;
    }
    return starts;
  };

  const pageStarts = computePageStarts(H, PAGE, blocks);
  const totalPages = pageStarts.length;
  const pc = document.createElement('canvas');
  pc.width = Math.ceil(W * SCALE); pc.height = Math.ceil(PAGE * SCALE);
  const ctx = pc.getContext('2d', { willReadFrequently: true });
  const decode = (d) => (d[0] | (d[1] << 8));
  const pages = [];

  for (let sp = 0; sp < totalPages; sp += PPS) {
    const inSeg = Math.min(PPS, totalPages - sp);
    const sliceTop = pageStarts[sp];
    const sliceBottom = sp + inSeg < totalPages ? pageStarts[sp + inSeg] : H;
    const seg = await html2canvas(el, {
      scale: SCALE, useCORS: true, backgroundColor: '#ffffff',
      x: 0, y: sliceTop, width: W, height: sliceBottom - sliceTop,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      scrollX: 0, scrollY: 0,
    });
    for (let off = 0; off < inSeg; off++) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, pc.width, pc.height);
      const pTop = pageStarts[sp + off];
      const pBot = sp + off + 1 < totalPages ? pageStarts[sp + off + 1] : H;
      const sy = Math.round((pTop - sliceTop) * SCALE);
      const sh = Math.min(Math.round((pBot - pTop) * SCALE), seg.height - sy);
      if (sh > 0) ctx.drawImage(seg, 0, sy, seg.width, sh, 0, 0, seg.width, sh);

      // 這一頁畫到的橫紋索引集合(每 20px 取樣一次)
      const seen = new Set();
      for (let y = 1; y < pc.height; y += 20) {
        const d = ctx.getImageData(20, y, 1, 1).data;
        if (d[0] === 255 && d[1] === 255 && d[2] === 255) continue;
        if (d[2] === 200) seen.add(decode(d));
      }
      pages.push({ page: sp + off, heightPx: pBot - pTop, stripes: [...seen] });
    }
  }
  return { H, totalPages, pageStarts, blocks, pages };
}, { SCALE, PAGE, PPS });

console.log(`內容高 ${out.H}px,共 ${out.totalPages} 頁`);
console.log(`圖表位置: ${out.blocks.map(b => `${b.topPx}→${b.bottomPx}`).join(', ')}`);
console.log(`分頁起點: [${out.pageStarts.join(', ')}]\n`);

const owner = new Map();
let dupes = 0;
for (const p of out.pages) {
  for (const s of p.stripes) {
    if (owner.has(s)) { dupes++; console.log(`  ✗ 橫紋 ${s} 同時出現在第 ${owner.get(s)} 頁與第 ${p.page} 頁`); }
    else owner.set(s, p.page);
  }
}
out.pages.forEach(p => console.log(`  第 ${p.page} 頁 高 ${p.heightPx.toFixed(0)}px  取樣到 ${p.stripes.length} 條橫紋`));
console.log('\n' + (dupes === 0 ? '✅ 沒有任何內容跨頁重複(溢出已消除)' : `❌ ${dupes} 條橫紋重複出現`));
await browser.close();
process.exit(dupes === 0 ? 0 : 1);
