/**
 * Info: (20260914 - Julian) 「這本帳還沒有公司設定」提示的兩件純邏輯。
 *
 * **這一則提示壞掉的症狀是「它沒出現」** —— 而沒出現與沒有提示長得一模一樣，
 * 不會有錯誤、不會有 console 警告，畫面看起來完全正常。
 * 它守的本來就是可發現性，所以它自己不可發現的時候，等於不存在。
 *
 * 判準與關閉旗標因此抽到 `lib/utils/company_profile_hint.ts` ——
 * 本專案的測試不 render React，留在元件裡就沒有任何東西守得住。
 */

import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  companyProfileHintDismissKeyOf,
  shouldShowCompanyProfileHint,
} from "@/lib/utils/company_profile_hint";

// Info: (20260914 - Julian) 「該出現」的那一組：四個條件全部成立
const SHOWN = {
  isConfigured: false,
  isLoading: false,
  loadFailed: false,
  isDismissed: false as boolean | null,
};

describe("提示什麼時候出現", () => {
  it("沒設定、讀完了、沒失敗、沒關過 —— 出現", () => {
    expect(shouldShowCompanyProfileHint(SHOWN)).toBe(true);
  });

  /**
   * Info: (20260914 - Julian) 四個條件**逐一**翻面，每一條都要讓它消失。
   *
   * 一次翻一個而不是寫四個獨立案例：判準寫成 `||` 之類的漏接時，
   * 這一組會精確指出是哪一個條件沒有被看。
   * 少了其中任何一行，對應的那種「說錯話」就沒有東西擋。
   */
  it.each([
    ["已經設定好了（對著填好的帳本喊沒設定）", { isConfigured: true }],
    ["還在讀（每次進頁面閃一下）", { isLoading: true }],
    ["讀失敗（不知道卻斷言沒有）", { loadFailed: true }],
    ["已經關掉了（關不掉的提示）", { isDismissed: true }],
    ["還沒讀過 localStorage（關過的人會看到它閃一下）", { isDismissed: null }],
  ])("%s —— 不出現", (_label, override) => {
    expect(shouldShowCompanyProfileHint({ ...SHOWN, ...override })).toBe(false);
  });
});

describe("關閉旗標的 localStorage 鍵", () => {
  /**
   * Info: (20260914 - Julian) **這一條是這個檔案存在的主要理由。**
   *
   * 鍵不帶帳本 id 的話：在 A 帳本設定完、順手把提示關掉，
   * B 帳本（從來沒設定過）的提示也跟著消失 —— 而那正是最需要
   * 看到它的那一本。使用者不會回報「提示沒出現」，他根本不知道有。
   *
   * 斷言寫成「兩本帳的鍵不同」而不是比對一個寫死的字串：
   * 後者在有人改前綴時會紅，而那不是缺陷。
   */
  it("不同帳本是不同的鍵", () => {
    expect(companyProfileHintDismissKeyOf("book-a")).not.toBe(
      companyProfileHintDismissKeyOf("book-b"),
    );
  });

  it("鍵裡真的帶著帳本 id", () => {
    expect(companyProfileHintDismissKeyOf("book-a")).toContain("book-a");
  });

  /**
   * Info: (20260914 - Julian) `localStorage` 以來源分區，同網域所有頁面共用一個命名空間。
   *
   * 短鍵（`dismissed`）撞到別的功能時兩邊都不會報錯，只是行為互相干擾。
   */
  it("有專案前綴，不是一個裸的短鍵", () => {
    expect(companyProfileHintDismissKeyOf("book-a").startsWith("isunfa:")).toBe(
      true,
    );
  });

  it("同一本帳每次算出來都一樣（否則關了等於沒關）", () => {
    expect(companyProfileHintDismissKeyOf("book-a")).toBe(
      companyProfileHintDismissKeyOf("book-a"),
    );
  });
});

/**
 * Info: (20260915 - Julian) 上一層的接線：薪資紀錄頁有沒有真的畫出這一則（review B3）。
 *
 * 上面那組測的是判準與關閉旗標 —— **零件**。
 * 把 `<CompanyProfileHint />` 從薪資紀錄頁拿掉，那些測試一條都不會紅，
 * 而沒設定公司的帳本從此永遠不知道自己沒設定。
 *
 * 這一則守的本來就是可發現性 —— 所以它自己不可發現的時候，等於不存在。
 * 做法照 `salary_pay_slip_meta.test.ts`。
 */
describe("薪資紀錄頁真的畫出這一則提示", () => {
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const page = stripComments(
    readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "salary_calculator",
        "salary_records_page_body.tsx",
      ),
      "utf-8",
    ),
  );

  it("元件有被 import 且真的 render", () => {
    expect(page).toContain(
      'import CompanyProfileHint from "@/components/salary_calculator/company_profile_hint"',
    );
    expect(page).toContain("<CompanyProfileHint");
  });

  /**
   * Info: (20260915 - Julian) 取出那一段 JSX 再驗 prop，不是在整頁裡找字串。
   *
   * `accountBookId={accountBookId}` 在這一頁還有別的地方會出現
   * （`<SalaryCalculatorShell>` 就有一個）—— 在整頁裡找的話，
   * 提示被整段刪掉那一條還是會過，而那正是這一組要抓的突變。
   */
  const hintTag = (() => {
    const start = page.indexOf("<CompanyProfileHint");
    if (start < 0) return "";
    return page.slice(start, page.indexOf("/>", start) + 2);
  })();

  /**
   * Info: (20260915 - Julian) 四個 prop 都要來自 hook，**不能寫死**。
   *
   * 每一個寫死都對應一種說錯話的方式，而四種都不會報錯：
   *
   * | 寫死成 | 症狀 |
   * | --- | --- |
   * | `isConfigured={false}` | 設定好的帳本被一直告知「還沒設定」 |
   * | `isLoading={false}` | 每次進頁面閃一下，包含設定好的帳本 |
   * | `loadFailed={false}` | 讀失敗時**不知道**有沒有設定，卻斷言沒有 —— 使用者會去把資料重打一次 |
   *
   * `accountBookId` 則是關閉旗標分帳本的前提（見上面那組）。
   */
  it("四個 prop 都接在真的狀態上，沒有一個是寫死的", () => {
    expect(hintTag).toContain("accountBookId={accountBookId}");
    expect(hintTag).toContain("isConfigured={companyProfile.isConfigured}");
    expect(hintTag).toContain("isLoading={isCompanyProfileLoading}");
    expect(hintTag).toContain("loadFailed={companyProfileLoadFailed}");
  });

  /**
   * Info: (20260915 - Julian) **反面釘**（檢查清單 §1.11）。
   *
   * 出現的判準抽到 `lib/utils/company_profile_hint.ts` 是為了讓它測得到。
   * 下一個人在頁面裡多包一層條件（例如
   * `{!companyProfile.isConfigured && <CompanyProfileHint … />}`）的話，
   * 判準就有兩份 —— 而頁面裡的那一份沒有任何東西守著，
   * 兩份不一致時的症狀是「提示在某些情況下不出現」，靜悄悄的。
   */
  it("頁面不自己判斷要不要顯示，那是元件的事", () => {
    expect(page).not.toMatch(/isConfigured\s*&&\s*<CompanyProfileHint/);
    expect(page).not.toContain("shouldShowCompanyProfileHint");
  });
});
