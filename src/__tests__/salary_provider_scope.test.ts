import { describe, it, expect } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Info: (20260901 - Julian) 帳本版薪資計算機的三個頁面必須共用同一個 CalculatorProvider。
 *
 * ## 這一條擋的是什麼
 *
 * 原本三個 `page.tsx` 各自 `<CalculatorProvider>` 包自己。同一份程式碼、
 * 三個互不相干的實例 —— 薪資紀錄頁的「載回計算機」把快照寫進紀錄頁那一顆，
 * 而 `router.push` 導到計算機頁時那一顆隨頁面卸載，計算機頁掛的是全新的預設值。
 * 按鈕按下去毫無反應，而且不噴任何錯誤。
 *
 * 修法是把 provider 提到 `layout.tsx`（App Router 的 layout 在同層路由之間
 * 切換時不會重新掛載）。這一條把「有人記得提到 layout」變成機制。
 *
 * ## 為什麼是掃檔案而不是 render 測試
 *
 * `jest.config.mjs` 是 `testEnvironment: "node"`，全專案沒有任何一支 render React
 * （同 `app_route_auth_guard.test.ts` 的理由）。要驗的也不是 provider 的行為，
 * 而是「它掛在哪一層」—— 那是檔案結構的問題，掃得出來就夠。
 */

const SALARY_DIR = join(
  process.cwd(),
  "src",
  "app",
  "user",
  "account_book",
  "[account_book_id]",
  "salary_calculator",
);

// Info: (20260901 - Julian) 共用 provider 的三個頁面（employee_list 已移除）
const PAGES: readonly string[] = [
  "page.tsx",
  "records/page.tsx",
  "pay_slip/page.tsx",
];

const read = (relativePath: string): string =>
  readFileSync(join(SALARY_DIR, relativePath), "utf-8");

/**
 * Info: (20260901 - Julian) 去掉註解再比對。
 *
 * 這幾個檔案的註解裡就寫著 `CalculatorProvider`（在解釋它為什麼在 layout），
 * 而「註解提到」會讓 `not.toContain` 誤判 —— 同 `salary_schema_defaults` 的作法。
 */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("帳本版薪資計算機的 CalculatorProvider 掛在 layout", () => {
  it("layout.tsx 存在，而且真的渲染 CalculatorProvider", () => {
    expect(existsSync(join(SALARY_DIR, "layout.tsx"))).toBe(true);

    const layout = stripComments(read("layout.tsx"));

    expect(layout).toContain(
      'import { CalculatorProvider } from "@/contexts/calculator_context"',
    );
    // Info: (20260901 - Julian) 光 import 不算數，要真的包住 children
    expect(layout).toMatch(/<CalculatorProvider>\s*\{children\}/);
  });

  it.each(PAGES)(
    "%s 不自己掛一顆 provider（掛了就會蓋掉 layout 那一顆）",
    (page) => {
      expect(stripComments(read(page))).not.toContain("CalculatorProvider");
    },
  );
});
