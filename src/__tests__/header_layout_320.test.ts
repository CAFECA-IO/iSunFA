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
 *   幾何推得，下方掃描斷言釘住對應的 class）、登入態膠囊（72）、nav 內距（12）、
 *   **字型**（Noto Sans CJK／系統等寬字；產品是 Arial + next/font 的 Geist Mono
 *   ——CJK 表意字寬不受字族影響，但版號地板的絕對值有個位數 px 的字型誤差）。
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
  ctaW: number;
}

interface IResult {
  premise: {
    gapPx: number;
    logoHPx: number;
    version: string;
    ctrl: { nav: number; theme: number; lang: number; pill: number };
    navPadPx: number;
  };
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

  it("premise 是精確值：gap 6px、logo 28px、版號同一份", () => {
    /**
     * Info: (20260901 - Luphia) 精確相等，不是 `> 0`（review 四輪中-2）：
     * 「大於 0」與「寫死一個正數」相容——那正是 §1.9 的形狀。改 `gap-x-*` 或
     * `h-*` 時一併更新這裡，**這一條的用途就是逼你重新量一次**。
     *
     * 它的價值當場驗證過一次：腳本的 regex 改壞成貪婪版本（抓到 `lg:gap-x-8`、
     * 量出 32px）的那一刻，就是這條把它攔下來的——`> 0` 會照綠。
     * `version` 一起比，順便釘住「腳本讀的 package.json 與測試讀的是同一份」。
     */
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { version: string };
    expect(result.premise).toEqual({
      gapPx: 6,
      logoHPx: 28,
      version: pkg.version,
      /**
       * Info: (20260901 - Luphia) rig 側的常數（review 五輪中-2）：腳本把這些
       * 數字餵進 HTML 並原樣回報，這裡精確比對——rig 被調校、換算寫錯、
       * class 變了，三邊各自會紅。來源 class 由下方的計數斷言守著。
       */
      ctrl: { nav: 36, theme: 52, lang: 40, pill: 72 },
      navPadPx: 12,
    });
  });

  /**
   * Info: (20260901 - Luphia) CJK 字型真的存在的證據（review 四輪低-1）。
   *
   * 帶寬的鑑別力是**量出來的**，不是推的（review 五輪低-2）：在 node:22-slim
   * 容器裡實測——不裝 fonts-noto-cjk 時 tofu 的 `ctaW = 48.81`（**帶外，會紅**），
   * 裝了之後 `ctaW = 60.00`（帶內，與「28px 字寬＋32px 內距」的推導一致）。
   * 且兩種情況 `scrollWidth` 都是 320——溢出斷言抓不到字型缺席，只有這一條
   * 抓得到，所以它是載重的。
   */
  it("登入按鈕的字寬證明 CJK 字型存在（56–64px）", () => {
    expect(result.loggedOut.ctaW).toBeGreaterThanOrEqual(56);
    expect(result.loggedOut.ctaW).toBeLessThanOrEqual(64);
  });

  /**
   * Info: (20260901 - Luphia) 釘住的控件幾何要與元件原始碼一致（review 四輪中-1）。
   *
   * 量測腳本裡選單 36／主題 52／語言 40／膠囊 72／nav 內距 12 是**手抄**的常數，
   * 只有數量守門擋不住「任一控件變寬」——而這個版面的餘裕是 2px。間距與 logo
   * 已經改成從原始碼 parse；這三個元件的幾何寫在 class 裡，這裡以掃描斷言釘住
   * 對應關係（class 一變這裡先紅，紅的訊息指著量測腳本要一起改）。
   */
  /**
   * Info: (20260901 - Luphia) **精確計數**而不是 `toContain`（review 五輪低-1）：
   * `px-2` 在 header_nav 出現兩次（連結與 MenuButton）、`size-5` 兩次、
   * `size-4` 在 language_selector 兩次——`toContain` 之下「兩處之一被改掉」
   * 照綠，而 320px 的餘裕只有 2px。計數一少一多都會紅。
   * 計數帶邊界（`(?![\d.-])`）：`px-2` 不可誤中 `px-2.5`。
   */
  const countOf = (source: string, token: string) => {
    const escaped = token.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
    return (source.match(new RegExp(`${escaped}(?![\\d.-])`, "g")) ?? [])
      .length;
  };

  it.each([
    ["src/components/header/theme_toggle.tsx", "h-7 w-13 shrink-0", 1],
    ["src/components/header/language_selector.tsx", "size-5", 1],
    ["src/components/header/language_selector.tsx", "size-4", 2],
    ["src/components/header/header_nav.tsx", "px-2", 2],
    ["src/components/header/header_nav.tsx", "size-5", 2],
    ["src/components/header/user_actions.tsx", "py-1 pr-3 pl-1", 1],
    ["src/components/header/user_actions.tsx", "size-8", 1],
    ["src/components/header/user_actions.tsx", "gap-x-2", 1],
  ])("釘住的幾何：%s 的 %s 恰好 %i 處", (file, token, expected) => {
    const source = readFileSync(join(process.cwd(), file as string), "utf8");
    expect(countOf(source, token as string)).toBe(expected);
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
