import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Info: (20260810 - Emily) 瀏覽器路徑：優先吃 CHROMIUM_PATH，沒設就用 Playwright 自己找的
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

const CASES = [
  ['真空白(白)',            '', true],
  ['真空白(深色版面)',      '<div style="position:absolute;inset:0;background:#1b1b1b"></div>', true],
  ['真空白(灰底)',          '<div style="position:absolute;inset:0;background:#f3f4f6"></div>', true],
  ['只有右下角頁碼',         '<div style="position:absolute;right:20px;bottom:16px;font:12px sans-serif;color:#111">12</div>', false],
  ['只有一個小圖示',         '<div style="position:absolute;left:40px;top:40px;width:8px;height:8px;background:#444;border-radius:50%"></div>', false],
  ['只有一條頁尾細線',       '<div style="position:absolute;left:0;right:0;bottom:60px;height:1px;background:#ccc"></div>', false],
  ['只有一行標題',           '<div style="padding:24px;font:20px sans-serif;color:#111">第 4 章 範疇三排放</div>', false],
  ['末頁:兩行內文+頁碼',    '<div style="padding:24px;font:14px sans-serif;color:#222;line-height:1.8">本章結束。<br>下一章接續說明查證邊界。</div><div style="position:absolute;right:20px;bottom:16px;font:12px sans-serif;color:#111">153</div>', false],
];

const browser = await chromium.launch({
  ...LAUNCH,
});
const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
await page.setContent('<body style="margin:0"><div id="pg" style="position:relative;width:794px;height:1123px;background:#fff"></div></body>');
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });

const rows = await page.evaluate(async ({ CASES, SIZES }) => {
  const el = document.getElementById('pg');

  const probeHalving = (canvas, PROBE) => {
    let src = canvas, w = canvas.width, h = canvas.height;
    while (w > PROBE * 2 || h > PROBE * 2) {
      const nw = Math.max(PROBE, Math.ceil(w / 2));
      const nh = Math.max(PROBE, Math.ceil(h / 2));
      const t = document.createElement('canvas');
      t.width = nw; t.height = nh;
      const c = t.getContext('2d', { willReadFrequently: true });
      c.imageSmoothingEnabled = true;
      c.drawImage(src, 0, 0, nw, nh);
      src = t; w = nw; h = nh;
    }
    const p = document.createElement('canvas');
    p.width = PROBE; p.height = PROBE;
    const c = p.getContext('2d', { willReadFrequently: true });
    c.imageSmoothingEnabled = true;
    c.drawImage(src, 0, 0, PROBE, PROBE);
    const { data } = c.getImageData(0, 0, PROBE, PROBE);
    const [bR,bG,bB,bA] = [data[0],data[1],data[2],data[3]];
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]!==bR||data[i+1]!==bG||data[i+2]!==bB||data[i+3]!==bA) n += 1;
    }
    return { differing: n, total: data.length / 4 };
  };

  const out = [];
  for (const [name, html, shouldBeBlank] of CASES) {
    el.innerHTML = html;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', x: 0, y: 0, width: 794, height: 1123 });
    const per = {};
    for (const s of SIZES) per[s] = probeHalving(canvas, s);
    out.push({ name, shouldBeBlank, per });
  }
  return out;
}, { CASES, SIZES: [32, 64, 128] });

for (const S of [32, 64, 128]) {
  console.log(`\n===== 探針 ${S}×${S} (${S*S} 像素) =====`);
  const blanks = [], inked = [];
  for (const r of rows) {
    const d = r.per[S];
    (r.shouldBeBlank ? blanks : inked).push({ name: r.name, px: d.differing, ratio: d.differing / d.total });
    console.log(`  ${r.name.padEnd(22)} ${r.shouldBeBlank ? '應空白' : '應有料'}  非背景 ${String(d.differing).padStart(6)} px  ratio=${(d.differing/d.total).toFixed(6)}`);
  }
  const maxBlank = Math.max(...blanks.map(b => b.ratio));
  const minInk = Math.min(...inked.map(b => b.ratio));
  const minInkName = inked.find(b => b.ratio === minInk).name;
  console.log(`  ── 真空白最高 ${maxBlank.toFixed(6)} | 合法最稀疏 ${minInk.toFixed(6)}(${minInkName})`);
  console.log(`  ── 可用門檻區間: (${maxBlank.toFixed(6)}, ${minInk.toFixed(6)})  分離倍數 ${minInk > 0 && maxBlank >= 0 ? (maxBlank === 0 ? '∞(真空白為 0)' : (minInk/maxBlank).toFixed(1)) : 'n/a'}`);
}
await browser.close();
