import { describe, it, expect } from "@jest/globals";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260818 - Luphia) 錯誤碼必須唯一（PR #6652 第五輪 B-1）。
 *
 * `API_ERRORS` 是以**鍵**索引的物件，因此兩個不同的鍵用同一個 `code` 字串
 * **不會有任何型別錯誤**，而對外的契約是那個字串：前端文案、i18n 映射、
 * 支援文件、以及所有 `errorCode === "XX000000"` 的分流都只看得到它。
 *
 * 撞號的代價不是「顯示錯字」，而是**兩個語意不同的錯誤變成同一件事**。
 * 本輪的實例：
 *
 * - `NF000017`：這條分支的 `NF_TEAM`（團隊不存在）與 develop 的
 *   `NF_EMPLOYEE_FOR_USER`（不是這個帳本的員工——刻意不回 403 以免洩漏
 *   「這個信箱在系統裡有員工檔」）。若前端把它映射成「團隊不存在」，
 *   對方那條的保護就沒了意義。
 * - `VA000041`、`TW000010`：**同一個檔案內**的重複——本 PR 新增條目時
 *   沿用了已在使用中的號碼。這兩個不是跨分支問題，在此之前就存在，
 *   而沒有任何機制會發現。
 *
 * 這支測試看不到別的分支，因此擋不住「兩邊各自新增、合併後才撞」——
 * 那要靠 review 對 base 做三方比對（見 code review checklist §1.1 的同一個道理：
 * 掃描根決定價值）。但它擋得住合併之後的狀態，也擋得住同檔重複。
 */

describe("API_ERRORS 的 code", () => {
  const entries = Object.entries(API_ERRORS).map(([key, def]) => ({
    key,
    code: def.code,
  }));

  it("不是空的（避免這支測試空過）", () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it("每一個 code 都只被一個鍵使用", () => {
    const byCode = new Map<string, string[]>();
    for (const { key, code } of entries) {
      byCode.set(code, [...(byCode.get(code) ?? []), key]);
    }

    const duplicated = [...byCode.entries()]
      .filter(([, keys]) => keys.length > 1)
      .map(([code, keys]) => `${code}: ${keys.join(", ")}`);

    expect(duplicated).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) 格式一併釘住：英文前綴 + **六位**數字。
   *
   * 前端與支援文件都以這個形狀解析，而寫成 `TW00021`（少一位）不會有型別錯誤。
   * 前綴長度放到 2–5：多數模組是兩碼，DPP 模組用的是既有的 `ISDPP`。
   * 這裡照實反映現況，而不是訂一個現有資料不符合的規則——
   * 那種測試只會逼下一個人放寬它。
   */
  it("每一個 code 都是英文前綴 + 六位數字", () => {
    const malformed = entries
      .filter(({ code }) => !/^[A-Z]{2,5}\d{6}$/.test(code))
      .map(({ key, code }) => `${key}: ${code}`);

    expect(malformed).toEqual([]);
  });
});
