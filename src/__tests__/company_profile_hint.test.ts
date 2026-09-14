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
