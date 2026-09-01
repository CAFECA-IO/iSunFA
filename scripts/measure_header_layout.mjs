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
 *
 * **字型也是釘的**（review 四輪中-1 附帶）：這裡用 Noto Sans CJK / 系統等寬字，
 * 而產品的 body 是 Arial/Helvetica、`font-mono` 解析到 next/font 的 Geist Mono。
 * CJK 的「登入」寬度不受影響（表意字寬 = 字級 × 字數），但**版號字串的地板**
 * 是用另一套等寬字量的——`verW` 的絕對值有個位數 px 的字型誤差，
 * 測試端以 `ctaW` 區間斷言守住 CJK 字型真的存在。
 *
 * 那個區間的鑑別力是**量出來的**（review 五輪低-2）：在 node:22-slim 容器裡
 * 實測——不裝 fonts-noto-cjk 時 tofu 的 `ctaW = 48.81`（帶外，會紅），
 * 裝了之後 `ctaW = 60.00`（帶內）。且兩種情況 `scrollWidth` 都是 320——
 * 溢出斷言抓不到字型缺席，只有這一條抓得到。
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
/**
 * Info: (20260901 - Luphia) 分兩步：先取出 `className="…"` 的字串，再在字串內取
 * **無前綴的** `gap-x-` token（review 四輪中-3）。
 *
 * 兩個坑都真的踩過：掃整個檔案會被註解裡的 `gap-x-`（出現 15 次）咬到——這一族
 * 在本 PR 已是第三個現場；而 `className="[^"]*\bgap-x-` 這種一步到位的寫法，
 * `[^"]*` 是**貪婪**的，會抓到同一個字串裡最後的 `lg:gap-x-8`（量出 32px）——
 * 我改成那樣的當下就被 premise 的精確斷言抓下來。
 */
const classAttrs = [...headerActionsSource.matchAll(/className="([^"]*)"/g)].map(
  (m) => m[1],
);
const gapClass = classAttrs.find((c) => /(?:^| )gap-x-[\d.]/.test(c));
const gapMatch = gapClass ? /(?:^| )gap-x-([\d.]+)/.exec(gapClass) : null;
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

/**
 * Info: (20260901 - Luphia) 釘住的控件幾何，**具名常數餵進 HTML、原樣回報進
 * premise**（review 五輪中-2）：rig 用的數字與 premise 回報的數字是同一份，
 * 測試端以精確斷言比對——rig 被調校、換算寫錯、class 變了，三邊各自會紅。
 * 每個數字對應的來源 class 由 header_layout_320.test.ts 的計數斷言守著。
 */
const ICON_5 = 20; // size-5
const ICON_4 = 16; // size-4
const MENU_PAD_X = 8; // px-2（header_nav 的 MenuButton）
const CTRL = {
  nav: MENU_PAD_X * 2 + ICON_5, // 36
  theme: 13 * 4, // h-7 w-13 shrink-0 → 52
  lang: ICON_5 + 4 + ICON_4, // size-5 + gap-1 + size-4 → 40
  pill: 4 + 32 + 8 + ICON_4 + 12, // pl-1 + size-8 + gap-x-2 + size-4 + pr-3 → 72
};
const NAV_PAD_PX = 12; // p-3（三個 header 的 nav 共同）
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
const LOGGED_IN_PILL = `<button id="cta" style="display:flex;align-items:center;column-gap:8px;border-radius:9999px;padding:4px 12px 4px 4px;flex-shrink:0"><span style="width:32px;height:32px;border-radius:9999px;background:#fed7aa;flex-shrink:0"></span><span style="width:${ICON_4}px;height:${ICON_4}px;flex-shrink:0;background:#888"></span></button>`;

function headerHtml({ actionsHtml, versionText, gapPx = GAP_PX }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>
    /* Info: (20260901 - Luphia) preflight 相關子集：img 的 max-width:100% 是
       「品牌區吸收差額」機制的全部依據 */
    *,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}
    img{max-width:100%;height:auto;display:block}
    button{font:inherit;background:none;color:inherit}
    body{font-family:'Noto Sans CJK TC','PingFang TC',sans-serif}
  </style></head><body>
  <header><nav style="display:flex;align-items:center;justify-content:space-between;padding:${NAV_PAD_PX}px">
    <div style="display:flex">
      <a style="display:flex;flex-direction:column;align-items:flex-end">
        <img src="${SVG_URI}" style="height:${LOGO_H_PX}px;width:auto" id="logo">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px" id="ver">v${versionText}</span>
      </a>
    </div>
    <div style="display:flex;align-items:center;column-gap:${gapPx}px" id="group">
      <!-- Info: 選單鈕＝px-2 ×2 + size-5 icon＝CTRL.nav -->
      <button style="display:flex;align-items:center;padding:4px ${MENU_PAD_X}px"><span style="width:${ICON_5}px;height:${ICON_5}px;flex-shrink:0;background:#888"></span></button>
      <!-- Info: 主題開關＝h-7 w-13 shrink-0＝CTRL.theme -->
      <button style="height:28px;width:${CTRL.theme}px;flex-shrink:0;border-radius:14px;background:#ddd"></button>
      <!-- Info: 語言選擇＝size-5 + gap-1 + size-4＝CTRL.lang -->
      <button style="display:flex;align-items:center;column-gap:4px"><span style="width:${ICON_5}px;height:${ICON_5}px;flex-shrink:0;background:#888"></span><span style="width:${ICON_4}px;height:${ICON_4}px;flex-shrink:0;background:#888"></span></button>
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
        ctaW: document.getElementById("cta").getBoundingClientRect().width,
      };
    });
  };

  const result = {
    premise: { gapPx: GAP_PX, logoHPx: LOGO_H_PX, version, ctrl: CTRL, navPadPx: NAV_PAD_PX },
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
