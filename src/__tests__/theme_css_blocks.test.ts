// Info: (20260802 - Luphia) globals.css 的主題選擇區塊一致性。
//
// Info: (20260802 - Luphia) 深色有兩個入口（`.dark` 與系統偏好的媒體查詢），
// Info: (20260802 - Luphia) 淺色也有兩個（預設與 @media print）。四個區塊各自宣告同一組
// Info: (20260802 - Luphia) `--t-*` 變數，改了其中一個而忘了另一個不會有任何錯誤 ——
// Info: (20260802 - Luphia) 只會讓「明確選深色」與「系統深色」長得不一樣，而那極難被發現。

import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

/**
 * Info: (20260802 - Luphia) 空白正規化。Prettier 會依縮排深度把長的 color-mix 折成
 * 不同形狀，兩個深色區塊的同一條宣告因此字面不同但語意相同。
 * 不正規化就比對的話，測試會為了排版差異而失敗，很快就會被加上例外而失去意義。
 */
function normalize(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim();
}

/**
 * Info: (20260802 - Luphia) 取出某個選擇器區塊內的 `--t-*` 宣告。
 * 以大括號配對切出區塊而非用正則一次抓，是因為區塊內含註解與巢狀媒體查詢，
 * 正則會在第一個 `}` 就停住。
 */
function extractThemeVars(
  css: string,
  startIndex: number,
): Map<string, string> {
  const open = css.indexOf("{", startIndex);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const vars = new Map<string, string>();
  for (const match of body.matchAll(/(--t-[\w-]+):\s*([^;]+);/g)) {
    // Info: (20260802 - Luphia) 一併正規化空白：值可能長到被 Prettier 折行，
    // Info: (20260802 - Luphia) 而兩個深色區塊的縮排不同，折出來的形狀就不同。
    vars.set(match[1], normalize(match[2]));
  }
  return vars;
}

function blockAt(css: string, selector: string): Map<string, string> {
  const index = css.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  return extractThemeVars(css, index);
}

/**
 * Info: (20260802 - Luphia) `color-scheme` 是屬性而非變數，不會被上面的
 * `--t-*` 抽取抓到，但它同樣必須四塊一致 —— 漏掉一塊的症狀是
 * 「頁面是深的、捲軸是白的」，看起來像瀏覽器的問題而不像我們的。
 */
function colorSchemeAt(css: string, selector: string): string | undefined {
  const index = css.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", index);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return css
    .slice(open + 1, end)
    .match(/color-scheme:\s*([^;]+);/)?.[1]
    .trim();
}

describe("globals.css 主題區塊", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  const light = blockAt(css, "\n:root,\n.theme-static-light,");
  const dark = blockAt(css, "\n.dark {");
  const systemDark = blockAt(css, ":root:not(.light) {");
  const print = blockAt(css, "@media print {");

  it("淺色區塊有宣告變數", () => {
    expect(light.size).toBeGreaterThan(10);
  });

  /**
   * Info: (20260802 - Luphia) 最重要的一條：明確選深色與系統深色必須完全相同。
   * 兩者是同一個主題的兩個入口，長得不一樣就是 bug。
   */
  it("`.dark` 與系統偏好回退宣告完全相同", () => {
    expect(Object.fromEntries(systemDark)).toEqual(Object.fromEntries(dark));
  });

  it("列印區塊與淺色區塊宣告完全相同", () => {
    expect(Object.fromEntries(print)).toEqual(Object.fromEntries(light));
  });

  /**
   * Info: (20260802 - Luphia) 原生部件（捲軸、下拉、日期選擇器）的配色。
   * 值必須寫死 light / dark 而非 `light dark`：後者會在使用者明確選淺色、
   * 但系統是深色時，讓原生部件維持深色。
   */
  it("四個區塊都宣告了正確的 color-scheme", () => {
    expect(colorSchemeAt(css, "\n:root,\n.theme-static-light,")).toBe("light");
    expect(colorSchemeAt(css, "\n.dark {")).toBe("dark");
    expect(colorSchemeAt(css, ":root:not(.light) {")).toBe("dark");
    expect(colorSchemeAt(css, "@media print {")).toBe("light");
  });

  it("淺色與深色宣告同一組變數名（只有值不同）", () => {
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
  });

  /**
   * Info: (20260802 - Luphia) 主題差異必須全部收斂在這四塊。
   * 若有人在別處宣告 `--t-*`，色彩就會出現第二個真相來源，
   * 而四個入口之中總有一個不會跟著走。
   *
   * 以「全檔宣告總數 = 四塊各自的數量相加」來驗證，
   * 比數選擇器可靠 —— 新增第五個區塊也會被抓到。
   */
  it("`--t-*` 只在這四個區塊裡宣告", () => {
    const total = (css.match(/--t-[\w-]+:/g) || []).length;
    expect(total).toBe(light.size + dark.size + systemDark.size + print.size);
  });
});

/** Info: (20260802 - Luphia) 取出某區塊內的 `--color-*` 宣告（彩色階重映） */
function extractColorVars(css: string, selector: string): Map<string, string> {
  const index = css.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", index);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const vars = new Map<string, string>();
  for (const match of css
    .slice(open + 1, end)
    .matchAll(/(--color-[\w-]+):([^;]+);/g)) {
    vars.set(match[1], normalize(match[2]));
  }
  return vars;
}

const TAILWIND_HUES =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/**
 * Info: (20260802 - Luphia) 掃描原始碼中實際使用的 utility（含變體）
 *
 * Info: (20260803 - Tzuhan) 必須連 `.ts` 一起掃，不能只掃 `.tsx`。
 * Tailwind v4 掃描的是所有原始碼檔，class 名稱不必寫在 JSX 裡也會被產生 ——
 * `src/constants/accounting_account.ts` 的 ACCOUNT_TYPE_COLORS 就把
 * `bg-lime-50`、`bg-cyan-50`、`bg-fuchsia-50` 定義在 `.ts` 中。
 * 只掃 `.tsx` 的話，這條測試看不到那三個色相，也就漏掉了它自己要防的那個 bug
 * （深色模式下粉彩底配提亮後的深階文字，對比僅 2.3–2.5:1）。
 * 排除 `__tests__`：測試檔裡的字串是斷言用的樣本，不是實際渲染的 class。
 */
function usedUtilities(pattern: RegExp): string[] {
  const found = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        for (const m of readFileSync(full, "utf8").matchAll(pattern))
          found.add(m[0]);
      }
    }
  };
  walk(join(process.cwd(), "src"));
  return [...found].sort();
}

describe("globals.css 彩色階", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  /**
   * Info: (20260802 - Luphia) 與 `--t-*` 同樣的理由：深色有兩個入口，
   * 彩色 tint 的重映也必須兩邊一致，否則「明確選深色」與「系統深色」會長得不一樣。
   */
  it("`.dark` 與系統偏好回退的彩色階重映完全相同", () => {
    const dark = extractColorVars(css, "\n.dark {");
    const systemDark = extractColorVars(css, ":root:not(.light) {");
    expect(dark.size).toBeGreaterThan(40);
    expect(Object.fromEntries(systemDark)).toEqual(Object.fromEntries(dark));
  });

  /**
   * Info: (20260802 - Luphia) 有人新增一個目前沒用過的色相（例如 bg-cyan-50）時，
   * 那張卡在深色模式會維持粉嫩色而配上已翻成淺色的文字 —— 正是這次回報的症狀。
   * 這條測試讓它在 CI 就停下來，而不是等使用者截圖。
   */
  it("原始碼用到的每個彩色 tint 都有深色重映", () => {
    const used = usedUtilities(
      new RegExp(
        `\\b(?:bg|border|ring|divide|from|to|via)-(?:${TAILWIND_HUES})-(?:50|100|200|300)\\b`,
        "g",
      ),
    );
    const missing = used.filter((utility) => {
      const [, hue, shade] =
        utility.match(new RegExp(`-(${TAILWIND_HUES})-(\\d+)$`)) ?? [];
      return !css.includes(`--color-${hue}-${shade}:`);
    });
    expect(missing).toEqual([]);
  });

  /**
   * Info: (20260802 - Luphia) 彩色深階當文字用時要提亮，而提亮是逐條選擇器寫的
   * （不能改變數，否則實心按鈕會一起變亮）。新增變體時很容易漏掉。
   */
  it("原始碼用到的每個彩色深階文字都有提亮規則", () => {
    const used = usedUtilities(
      /**
       * Info: (20260802 - Luphia) 變體片段要允許 `/`：具名 group（`group-hover/tag:`）
       * 若被切成 `tag:`，測試會去找一個不存在的 class 而假性失敗。
       */
      new RegExp(
        `\\b(?:[a-z0-9-]+(?:/[a-z0-9-]+)?:)*text-(?:${TAILWIND_HUES})-(?:600|700|800|900)\\b`,
        "g",
      ),
    );
    const missing = used.filter(
      (utility) =>
        !css.includes(`.${utility.replace(/[:/]/g, (c) => `\\${c}`)}`),
    );
    expect(missing).toEqual([]);
  });
});
