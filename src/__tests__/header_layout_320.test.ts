import { describe, it, expect, beforeAll } from "@jest/globals";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Info: (20260901 - Luphia) header 在 320px 下的**真渲染**版面測試
 *（review #6731 三輪中-1）。
 *
 * 這個 PR 其餘 19 條測試全部是原始碼字串掃描：擋得住「有人把 `shrink-0` 刪了」，
 * 擋不住「320px 又溢出了」。而被守護的不變式是一個可量的數字——
 * `scrollWidth <= 320`——**餘裕只有 2px**。header 加第五個控件、任一圖示變寬、
 * 版號字串變長，都會打破它而字串掃描全綠。所以這一組在真的 Chromium 裡把版面
 * 跑起來量。
 *
 * 量測跑在 `scripts/measure_header_layout.mjs`（原生 Node）而不是本檔內：
 * puppeteer 25 是 ESM-only，jest 的 CJS runtime 載不動，連
 * `new Function("return import(s)")` 都會被 jest 的 VM 以
 * 「without --experimental-vm-modules」擋下。與其對整個 runner 開實驗旗標，
 * 不如讓量測在原生 Node 跑、本檔對輸出的 JSON 斷言。
 *
 * **重現的忠實度**（上一輪 review 的教訓：釘住一個實際會動的變數，就會得到
 * 相反的結論——所以哪些是真的、哪些是釘的要寫清楚）：
 *
 * - **真的**：SVG（`public/` 原檔內嵌）、版號字串（`package.json`）、登入按鈕
 *  （真的字「登入」＋真的內距）、間距與 logo 高度（**從原始碼 parse**，改了
 *   class 量的東西跟著變）、flex 結構與 preflight 的 `img{max-width:100%}`。
 * - **釘的**：三個純圖示控件的外框（選單 36、主題 52、語言 40，由各元件的固定
 *   幾何推得）。它們是剛性葉節點；會動的變數全是真的。
 *
 * 忠實度的證據：重現量到的 `logoW = 95.42`、`verW = 66.23`、`gap24 → 338`
 * 與真實頁面（dev server 實測）及三輪 reviewer 的獨立容器重現**三方一致**。
 *
 * **已知的極限**（誠實申報）：釘住控件讓 2px 級的邊界情形可能與真實頁面有
 * 個位數 px 的出入。這一組守的是「明確溢出」（間距改回 24px 是 +18px 級、
 * 版號變長是 +10px 級），2px 邊界由字串掃描測試釘住 class 來守。
 *
 * CI 的 `node:22-slim` 沒有 Chromium：workflow 已加裝 `chromium` 與
 * `fonts-noto-cjk`（CJK 字寬是這個缺陷的成因，沒有 CJK 字型量出來的字寬是錯的）。
 * **腳本跑不起來就讓測試失敗**，不 skip——skip 是行程層級的 fail-open。
 */

jest.setTimeout(120_000);

interface IMeasurement {
  scrollWidth: number;
  logoW: number;
  logoComplete: boolean;
  logoNaturalW: number;
  verW: number;
  ctaRight: number;
}

interface IResult {
  premise: { gapPx: number; logoHPx: number; version: string };
  loggedOut: IMeasurement;
  loggedIn: IMeasurement;
  gap24: IMeasurement;
  longVersion: IMeasurement;
}

let result: IResult;

beforeAll(() => {
  const stdout = execFileSync(
    process.execPath,
    [join(process.cwd(), "scripts", "measure_header_layout.mjs")],
    { encoding: "utf8", timeout: 110_000 },
  );
  result = JSON.parse(stdout.trim().split("\n").pop() as string) as IResult;
});

describe("header 在 320px 的真渲染版面", () => {
  /**
   * Info: (20260901 - Luphia) 量測前提先驗證：圖真的載入了。
   * 二輪那個錯的 88 就是量在 `complete: false` 的預留框上——
   * 「量出來的」不等於「量對了」，量的時機也是量測方法的一部分。
   */
  it("量測前提：圖已載入、比例是內建的 3.5", () => {
    expect(result.loggedOut.logoComplete).toBe(true);
    expect(result.loggedOut.logoNaturalW).toBe(224);
  });

  it("未登入（登入按鈕）：不水平溢出，logo 沒被壓到版號以下", () => {
    expect(result.loggedOut.scrollWidth).toBeLessThanOrEqual(320);
    expect(result.loggedOut.ctaRight).toBeLessThanOrEqual(320);
    // Info: (20260901 - Luphia) 品牌區吸收差額的下限：logo 不可比版號字串窄
    expect(result.loggedOut.logoW).toBeGreaterThanOrEqual(
      result.loggedOut.verW,
    );
  });

  /**
   * Info: (20260901 - Luphia) 登入態（使用者膠囊 72px）。三輪 review 點名
   * 「`user_header` 只走登入態，而登入態的寬度這個 PR 沒有量過」——這一條補上。
   */
  it("登入態（使用者膠囊）：不水平溢出", () => {
    expect(result.loggedIn.scrollWidth).toBeLessThanOrEqual(320);
    expect(result.loggedIn.ctaRight).toBeLessThanOrEqual(320);
  });

  /**
   * Info: (20260901 - Luphia) 反向驗證：這一組**抓得到**溢出，不是永遠綠。
   * 一條從來不會紅的守門，與沒有守門分不出來。
   *
   * `gap24` 是未修狀態（`gap-x-6`）的間距——3×3 矩陣裡確定溢出的一格，
   * 真實頁面 338，重現也是 338。
   */
  it("對照組：間距 24px（未修狀態）確實溢出", () => {
    expect(result.gap24.scrollWidth).toBeGreaterThan(320);
  });

  /**
   * Info: (20260901 - Luphia) 版號字串是品牌區壓縮的**地板**：它變長就是把地板
   * 抬高。字串掃描永遠看不到這件事——這正是要真渲染的理由之一。
   */
  it("對照組：版號字串變得很長時，溢出被抓到", () => {
    expect(result.longVersion.scrollWidth).toBeGreaterThan(320);
  });
});

describe("重現的前提（改了這些，上面的重現就過期）", () => {
  const headerActionsSource = readFileSync(
    join(process.cwd(), "src", "components", "header", "header_actions.tsx"),
    "utf8",
  );

  it("間距與 logo 高度是腳本從原始碼 parse 的，不是寫死的", () => {
    // Info: (20260901 - Luphia) premise 由腳本回報——它 parse 失敗會以 exit 2 直接讓 beforeAll 炸掉
    expect(result.premise.gapPx).toBeGreaterThan(0);
    expect(result.premise.logoHPx).toBeGreaterThan(0);
  });

  /**
   * Info: (20260901 - Luphia) 控件數量守門：重現裡釘了三個圖示控件＋一個動作區。
   * header 加第五個控件（通知鈴鐺在 #6701 的路上）時這條先紅，逼著把重現與
   * 量測一起更新——否則上面的「不溢出」量的是舊版面。
   */
  it("HeaderActions 仍是四個控件", () => {
    const inner = headerActionsSource.slice(
      headerActionsSource.indexOf("return ("),
    );
    const components = inner.match(/<[A-Z][A-Za-z]*\s*\/>/g) ?? [];
    expect(components).toEqual([
      "<HeaderNav />",
      "<ThemeToggle />",
      "<LanguageSelector />",
      "<UserActions />",
    ]);
  });
});
