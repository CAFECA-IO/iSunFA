/**
 * Info: (20260901 - Luphia) header 在 320px 下的真渲染量測（review #6731 三輪中-1）。
 *
 * 為什麼是獨立腳本而不是寫在 jest 測試裡：puppeteer 25 是 ESM-only，而 jest 的
 * CJS runtime 載不動它——`new Function("return import(s)")` 也會被 jest 的 VM 以
 * 「A dynamic import callback was invoked without --experimental-vm-modules」擋下。
 * 與其在整個 test runner 上開實驗旗標，不如讓量測跑在原生 Node（毫無限制），
 * jest 只執行本腳本並對輸出的 JSON 斷言（`src/__tests__/header_layout_320.test.ts`）。
 *
 * 重現的忠實度（哪些是真的、哪些是釘的）寫在該測試檔的檔頭。
 * 本腳本只輸出一行 JSON 到 stdout；任何雜訊都走 stderr。
 */
import { readFileSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// Info: (20260901 - Luphia) Tailwind 間距刻度 n × 4px（v4 預設，--spacing 未覆寫）
const spacingPx = (n) => Number(n) * 4;

const headerActionsSource = read("src/components/header/header_actions.tsx");
const gapMatch = /(?:^|[" ])gap-x-([\d.]+)/.exec(headerActionsSource);
const brandSource = read("src/components/header/brand_logo.tsx");
const logoMatch = /className="h-(\d+) w-auto/.exec(brandSource);
const version = JSON.parse(read("package.json")).version;
const logoSvg = read("public/isunfa_logo.svg");

if (!gapMatch || !logoMatch) {
  // Info: (20260901 - Luphia) parse 不到就整個失敗——缺席不可以走靜默通道
  console.error("cannot parse gap-x-* or h-* from source");
  process.exit(2);
}

const GAP_PX = spacingPx(gapMatch[1]);
const LOGO_H_PX = Number(logoMatch[1]) * 4;
const SVG_URI = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

// Info: (20260901 - Luphia) 真的登入按鈕：字、字級、內距與 login_button.tsx 一致
const LOGIN_BUTTON =
  '<div style="flex-shrink:0"><button id="cta" style="border-radius:9999px;background:#ea580c;padding:10px 16px;font-size:14px;font-weight:600;line-height:20px;color:#fff">登入</button></div>';

/**
 * Info: (20260901 - Luphia) 登入態的使用者膠囊（user_actions.tsx 的 PopoverButton）：
 * pl-1(4) + 頭像 size-8(32) + gap-x-2(8) + chevron size-4(16) + pr-3(12) = 72px；
 * 名字在 <sm 是 hidden。三輪 review 點名「登入態的寬度這個 PR 沒有量過」——
 * 這個情境補那一刀。
 */
const LOGGED_IN_PILL =
  '<button id="cta" style="display:flex;align-items:center;column-gap:8px;border-radius:9999px;padding:4px 12px 4px 4px;flex-shrink:0"><span style="width:32px;height:32px;border-radius:9999px;background:#fed7aa;flex-shrink:0"></span><span style="width:16px;height:16px;flex-shrink:0;background:#888"></span></button>';

function headerHtml({ actionsHtml, versionText, gapPx = GAP_PX }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>
    /* Info: (20260901 - Luphia) preflight 相關子集：img 的 max-width:100% 是
       「品牌區吸收差額」機制的全部依據 */
    *,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}
    img{max-width:100%;height:auto;display:block}
    button{font:inherit;background:none;color:inherit}
    body{font-family:'Noto Sans CJK TC','PingFang TC',sans-serif}
  </style></head><body>
  <header><nav style="display:flex;align-items:center;justify-content:space-between;padding:12px">
    <div style="display:flex">
      <a style="display:flex;flex-direction:column;align-items:flex-end">
        <img src="${SVG_URI}" style="height:${LOGO_H_PX}px;width:auto" id="logo">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px" id="ver">v${versionText}</span>
      </a>
    </div>
    <div style="display:flex;align-items:center;column-gap:${gapPx}px" id="group">
      <!-- Info: 選單鈕＝px-2(16) + size-5 icon(20)＝36 -->
      <button style="display:flex;align-items:center;padding:4px 8px"><span style="width:20px;height:20px;flex-shrink:0;background:#888"></span></button>
      <!-- Info: 主題開關＝h-7 w-13 shrink-0＝52 -->
      <button style="height:28px;width:52px;flex-shrink:0;border-radius:14px;background:#ddd"></button>
      <!-- Info: 語言選擇＝size-5(20)+gap-1(4)+size-4(16)＝40 -->
      <button style="display:flex;align-items:center;column-gap:4px"><span style="width:20px;height:20px;flex-shrink:0;background:#888"></span><span style="width:16px;height:16px;flex-shrink:0;background:#888"></span></button>
      ${actionsHtml}
    </div>
  </nav></header></body></html>`;
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 700 });

  const measure = async (html) => {
    await page.setContent(html, { waitUntil: "load" });
    return page.evaluate(() => {
      const logo = document.getElementById("logo");
      return {
        scrollWidth: document.documentElement.scrollWidth,
        logoW: logo.getBoundingClientRect().width,
        logoComplete: logo.complete,
        logoNaturalW: logo.naturalWidth,
        verW: document.getElementById("ver").getBoundingClientRect().width,
        ctaRight: document.getElementById("cta").getBoundingClientRect().right,
      };
    });
  };

  const result = {
    premise: { gapPx: GAP_PX, logoHPx: LOGO_H_PX, version },
    loggedOut: await measure(
      headerHtml({ actionsHtml: LOGIN_BUTTON, versionText: version }),
    ),
    loggedIn: await measure(
      headerHtml({ actionsHtml: LOGGED_IN_PILL, versionText: version }),
    ),
    // Info: (20260901 - Luphia) 對照組：未修狀態的間距（gap-x-6 = 24px）
    gap24: await measure(
      headerHtml({ actionsHtml: LOGIN_BUTTON, versionText: version, gapPx: 24 }),
    ),
    // Info: (20260901 - Luphia) 對照組：版號地板抬高
    longVersion: await measure(
      headerHtml({
        actionsHtml: LOGIN_BUTTON,
        versionText: "0.99.0+99999-release-candidate-hotfix",
      }),
    ),
  };
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
