// Info: (20260802 - Luphia) globals.css 的主題選擇區塊一致性。
//
// Info: (20260802 - Luphia) 深色有兩個入口（`.dark` 與系統偏好的媒體查詢），
// Info: (20260802 - Luphia) 淺色也有兩個（預設與 @media print）。四個區塊各自宣告同一組
// Info: (20260802 - Luphia) `--t-*` 變數，改了其中一個而忘了另一個不會有任何錯誤 ——
// Info: (20260802 - Luphia) 只會讓「明確選深色」與「系統深色」長得不一樣，而那極難被發現。

import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

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
    vars.set(match[1], match[2].trim());
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
