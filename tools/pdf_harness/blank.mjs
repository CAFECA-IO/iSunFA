import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROBE = 32;
const MIN_INK_RATIO = 0.002;

const CASES = [
  ['真空白(白)',            '', true],
  ['真空白(深色版面)',      '<div style="position:absolute;inset:0;background:#1b1b1b"></div>', true],
  ['只有右下角頁碼',         '<div style="position:absolute;right:20px;bottom:16px;font:12px sans-serif;color:#111">12</div>', false],
  ['只有一條頁尾細線',       '<div style="position:absolute;left:0;right:0;bottom:60px;height:1px;background:#ccc"></div>', false],
  ['只有一行標題',           '<div style="padding:24px;font:20px sans-serif;color:#111">第 4 章 範疇三排放</div>', false],
  ['末頁:兩行內文+頁碼',    '<div style="padding:24px;font:14px sans-serif;color:#222;line-height:1.8">本章結束。<br>下一章接續說明查證邊界。</div><div style="position:absolute;right:20px;bottom:16px;font:12px sans-serif;color:#111">153</div>', false],
  ['一般滿版內文',           Array.from({length:38},(_,i)=>`<div style="padding:0 24px;font:14px sans-serif;color:#222;line-height:1.6">第 ${i+1} 行:溫室氣體盤查作業說明與計算基礎。</div>`).join(''), false],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
await page.setContent('<body style="margin:0"><div id="pg" style="position:relative;width:794px;height:1123px;background:#fff"></div></body>');
await page.addScriptTag({ path: path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js') });

const rows = await page.evaluate(async ({ CASES, PROBE }) => {
  const el = document.getElementById('pg');

  const countDiffering = (data) => {
    const [bR, bG, bB, bA] = [data[0], data[1], data[2], data[3]];
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== bR || data[i+1] !== bG || data[i+2] !== bB || data[i+3] !== bA) n += 1;
    }
    return { differing: n, total: data.length / 4 };
  };

  // A:目前實作 —— 一次 drawImage 縮到 32×32
  const probeA = (canvas) => {
    const p = document.createElement('canvas');
    p.width = PROBE; p.height = PROBE;
    const c = p.getContext('2d', { willReadFrequently: true });
    c.drawImage(canvas, 0, 0, PROBE, PROBE);
    return countDiffering(c.getImageData(0, 0, PROBE, PROBE).data);
  };

  // B:逐次減半再縮到 32×32(每一步都是正常的 box filter,細內容不會被跳過)
  const probeB = (canvas) => {
    let src = canvas;
    let w = canvas.width, h = canvas.height;
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
    return countDiffering(c.getImageData(0, 0, PROBE, PROBE).data);
  };

  // C:直接在原尺寸 canvas 上掃描等距橫條(不縮圖,不會漏掉細內容)
  const probeC = (canvas) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const STRIPS = 64;
    let differing = 0, total = 0, base = null;
    for (let s = 0; s < STRIPS; s++) {
      const y = Math.min(canvas.height - 1, Math.floor((s * canvas.height) / STRIPS));
      const { data } = ctx.getImageData(0, y, canvas.width, 1);
      if (base === null) base = [data[0], data[1], data[2], data[3]];
      for (let i = 0; i < data.length; i += 4) {
        total += 1;
        if (data[i] !== base[0] || data[i+1] !== base[1] || data[i+2] !== base[2] || data[i+3] !== base[3]) differing += 1;
      }
    }
    return { differing, total };
  };

  const out = [];
  for (const [name, html, shouldBeBlank] of CASES) {
    el.innerHTML = html;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      x: 0, y: 0, width: 794, height: 1123,
    });
    out.push({
      name, shouldBeBlank,
      canvasSize: canvas.width + 'x' + canvas.height,
      A: probeA(canvas), B: probeB(canvas), C: probeC(canvas),
    });
  }
  return out;
}, { CASES, PROBE });

const verdict = (r) => r.differing / r.total < MIN_INK_RATIO;
const fmt = (r) => (r.differing / r.total).toFixed(6).padStart(9);

console.log(`門檻:ink ratio < ${MIN_INK_RATIO} 判定為空白\n`);
console.log('情境'.padEnd(24) + '應為  ' + 'A 一次縮圖'.padEnd(14) + 'B 逐次減半'.padEnd(14) + 'C 掃描橫條');
console.log('-'.repeat(80));

const fails = { A: [], B: [], C: [] };
for (const r of rows) {
  const cells = ['A','B','C'].map((k) => {
    const blank = verdict(r[k]);
    if (blank !== r.shouldBeBlank) fails[k].push(r.name);
    return (fmt(r[k]) + (blank ? ' 空白' : ' 有料')).padEnd(14);
  });
  console.log(r.name.padEnd(24) + (r.shouldBeBlank ? '空白  ' : '有料  ') + cells.join(''));
}

console.log('\n--- 判定結果 ---');
for (const k of ['A','B','C']) {
  console.log(`${k}: ` + (fails[k].length === 0 ? '✅ 七種情境全對' : `❌ 誤判 ${fails[k].length} 種 → ${fails[k].join('、')}`));
}

console.log('\n--- 合法頁面的安全邊際(越大越不會被誤殺)---');
for (const k of ['A','B','C']) {
  const sparse = rows.filter(r => !r.shouldBeBlank).sort((a,b) => a[k].differing/a[k].total - b[k].differing/b[k].total)[0];
  const ratio = sparse[k].differing / sparse[k].total;
  console.log(`${k}: 最稀疏的合法頁「${sparse.name}」ratio=${ratio.toFixed(6)} = 門檻的 ${(ratio / MIN_INK_RATIO).toFixed(1)} 倍`);
}
await browser.close();
