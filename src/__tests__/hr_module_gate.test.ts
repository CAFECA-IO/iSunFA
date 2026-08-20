import { describe, it, expect } from "@jest/globals";
import { readdirSync } from "fs";
import { join, relative, sep } from "path";
import {
  isHrModuleEnabled,
  isHrModulePath,
} from "@/constants/hr_module_gate";

/**
 * Info: (20260820 - Julian) 上線前的閘要**真的蓋住每一支**。
 *
 * ## 為什麼掃檔案系統而不是列一份名單
 *
 * 名單會過期，而過期的症狀是「新增的那一支沒有被擋」——
 * 沒有任何錯誤訊息，且它與「擋住了」在測試上長得一模一樣。
 * 這一支從 `src/app` 掃出實際存在的頁面與路由，逐一問那個判準
 * （**產品用的同一支函式**，不是手抄的規則，checklist §1.9）。
 *
 * 新增一支落在規則外的 hr 路由 → 這裡紅。
 * 把規則改寬到誤擋別的模組 → 下面的反方向那一組紅。
 */

const APP_ROOT = join(process.cwd(), "src", "app");

/** Info: (20260820 - Julian) 把檔案系統路徑換成它對外的 URL 路徑 */
const routeUrlOf = (filePath: string): string => {
  const parts = relative(APP_ROOT, filePath).split(sep);
  parts.pop(); // Info: (20260820 - Julian) 去掉 page.tsx / route.ts
  return `/${parts
    // Info: (20260820 - Julian) `(group)` 是版型分組，不出現在網址上
    .filter((part) => !(part.startsWith("(") && part.endsWith(")")))
    .join("/")}`;
};

const walk = (dir: string, into: string[]): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, into);
      continue;
    }
    if (entry.name === "page.tsx" || entry.name === "route.ts") into.push(full);
  }
};

const allRoutes = (): string[] => {
  const files: string[] = [];
  walk(APP_ROOT, files);
  return files.map(routeUrlOf).sort();
};

/**
 * Info: (20260820 - Julian) 「屬於人事模組」的獨立判準 —— 由**路徑上的實體**
 * 決定，而不是再抄一次被測函式。
 *
 * 兩者若一致，代表判準涵蓋得剛剛好；不一致的那幾筆會被逐一列出來，
 * 而不是只告訴你「有一筆不同」。
 */
const looksLikeHrRoute = (url: string): boolean =>
  url === "/hr_management" ||
  url.startsWith("/hr_management/") ||
  url.startsWith("/api/v1/hr/") ||
  /\/hr\//.test(url.replace("/api/v1/user/account_book/[account_book_id]", ""));

describe("人事模組的上線閘：路徑判準", () => {
  const routes = allRoutes();

  /**
   * Info: (20260820 - Julian) 掃到零支的話下面每一條都會是空集合相等，永遠綠。
   *
   * 這裡用下限而不是精確值，是因為**精確的覆蓋由下面兩條集合相等的斷言
   * 負責**；這一條只回答「掃描根還在不在」。2026-08-20 實測：全站 308 支路由，
   * 其中人事 50 支（13 個頁面 ＋ 37 支 API）。
   */
  it("掃描根真的掃到東西", () => {
    expect(routes.length).toBeGreaterThan(100);
    expect(
      routes.filter((url) => url.startsWith("/hr_management")).length,
    ).toBeGreaterThanOrEqual(13);
    expect(routes.filter((url) => isHrModulePath(url)).length).toBeGreaterThanOrEqual(50);
  });

  /**
   * Info: (20260820 - Julian) 這一條是本檔的紅線：**每一支人事路由都被擋**。
   */
  it("每一支人事模組的頁面與端點都命中判準", () => {
    const missed = routes
      .filter((url) => looksLikeHrRoute(url))
      .filter((url) => !isHrModulePath(url));
    expect(missed).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 反方向：**其餘的一支都不能被擋**。
   *
   * 少了這一條，一個 `() => true` 的判準也會讓上面那條通過 ——
   * 而那會讓整個網站 404。誤擋比漏擋更難發現，因為它不會有人來抱怨
   * 「我看得到不該看的東西」，只會有人說「網站壞了」。
   */
  it("不屬於人事模組的路由一支都沒被擋", () => {
    const overreach = routes
      .filter((url) => !looksLikeHrRoute(url))
      .filter((url) => isHrModulePath(url));
    expect(overreach).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 逐段比對，不是子字串。
   * `includes("hr")` 會把這些也擋掉，而一道會誤擋的閘遲早被人整個關掉。
   */
  it.each([
    ["/api/v1/threshold/list"],
    ["/api/v1/user/chr/profile"],
    ["/hr_management_archive"],
    ["/api/v1/hrm/employee"],
  ])("%s：不得被誤擋", (url) => {
    expect(isHrModulePath(url)).toBe(false);
  });

  it.each([
    ["/hr_management"],
    ["/hr_management/leave/approval"],
    ["/api/v1/hr/employee"],
    ["/api/v1/user/account_book/abc-123/hr/leave/request"],
  ])("%s：要被擋", (url) => {
    expect(isHrModulePath(url)).toBe(true);
  });
});

/**
 * Info: (20260820 - Julian) 旗標**預設關**，且只認字面的 `"true"`。
 *
 * 寬鬆的解析會讓一個打錯的值意外地把模組打開 —— 而那正是這道閘要防的事。
 * 兩種遺漏都會發生（忘了設、設錯了），只有一種會讓外人看到不該看的東西。
 */
describe("人事模組的上線閘：旗標", () => {
  it("未設定時是關的", () => {
    expect(isHrModuleEnabled(undefined)).toBe(false);
  });

  it.each([["true"]])("%s：開", (value) => {
    expect(isHrModuleEnabled(value)).toBe(true);
  });

  it.each([["TRUE"], ["1"], ["yes"], ["on"], [""], [" true"], ["false"]])(
    "%s：關",
    (value) => {
      expect(isHrModuleEnabled(value)).toBe(false);
    },
  );
});
