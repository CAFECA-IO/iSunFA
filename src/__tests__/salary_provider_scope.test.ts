import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, sep } from "path";

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

/**
 * Info: (20260901 - Julian) 走訪目錄，不是寫死清單。
 *
 * 原本這裡是 `["page.tsx", "records/page.tsx", "pay_slip/page.tsx"]` ——
 * 掃描根等於「剛好被修的那幾個檔案」，而這一條要擋的缺陷正是**下一個人新增頁面**
 * 時原樣重演（checklist §1.1）。實測：加第四個 `page.tsx` 並自己包一顆
 * `<CalculatorProvider>` → 寫死清單那版全綠，症狀是「按鈕按下去毫無反應且不噴錯」。
 *
 * 走訪之後，只要有人在這個路由底下新增頁面就自動納入守備範圍，不必記得回來改陣列。
 */
const collectPages = (): string[] =>
  readdirSync(SALARY_DIR, { recursive: true, encoding: "utf-8" })
    .map((entry) => entry.split(sep).join("/"))
    .filter((entry) => entry.endsWith("page.tsx"))
    .sort();

const PAGES: readonly string[] = collectPages();

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
  /**
   * Info: (20260901 - Julian) 走訪撈不到東西時，下面的 `it.each` 會靜靜地零個案例。
   * 一支「一條都沒跑」的測試看起來和「全部通過」一模一樣 —— 先把這件事釘住。
   */
  it("走訪真的撈到頁面（掃描根空掉時 it.each 會靜默跳過）", () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(3);
    expect(PAGES).toContain("page.tsx");
  });

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
