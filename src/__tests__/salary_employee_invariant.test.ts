import { describe, it, expect } from "@jest/globals";
import {
  activeNumberFor,
  assertActiveNumberPairing,
  SalaryEmployeeInvariantError,
} from "@/repositories/salary_calculator_employee_invariant";

/**
 * Info: (20260831 - Julian) `activeNumber` 與 `deletedAt` 的配對不變式。
 *
 * 這條規則存在的理由：Prisma 表達不了 partial unique index，
 * 「存活中的員工 編號 在帳本內唯一」只能靠 nullable 唯一欄位模擬
 * （`@@unique([accountBookId, active編號])`，計劃書 §2.3）。
 *
 * 它的正確性完全靠「每一條寫入路徑都記得同時維護兩欄」。
 * 漏掉的症狀不是報錯，是**同一個 編號 出現兩筆存活列** ——
 * 而那會讓「這個月的薪資單要寄給誰」變成擲骰子。
 */

const DELETED_AT = new Date("2026-08-31T00:00:00Z");
const NUMBER = "A001";

describe("activeNumberFor", () => {
  it("存活中的員工帶著自己的 編號，唯一鍵才擋得住重複", () => {
    expect(activeNumberFor(NUMBER, null)).toBe(NUMBER);
  });

  it("被刪除的員工讓出 編號，同一個 編號 之後才能重新加入", () => {
    expect(activeNumberFor(NUMBER, DELETED_AT)).toBeNull();
  });
});

describe("assertActiveNumberPairing", () => {
  it("存活且 active編號 === number：通過", () => {
    expect(() =>
      assertActiveNumberPairing({
        number: NUMBER,
        activeNumber: NUMBER,
        deletedAt: null,
      }),
    ).not.toThrow();
  });

  it("已刪除且 active編號 === null：通過", () => {
    expect(() =>
      assertActiveNumberPairing({
        number: NUMBER,
        activeNumber: null,
        deletedAt: DELETED_AT,
      }),
    ).not.toThrow();
  });

  it("存活卻讓出了 active編號：擋下來（這一筆會讓 編號 重複而唯一鍵不會叫）", () => {
    expect(() =>
      assertActiveNumberPairing({
        number: NUMBER,
        activeNumber: null,
        deletedAt: null,
      }),
    ).toThrow(SalaryEmployeeInvariantError);
  });

  it("存活但 active編號 與 number 不一致：擋下來（改 編號 時只更新了一欄）", () => {
    expect(() =>
      assertActiveNumberPairing({
        number: NUMBER,
        activeNumber: "A002",
        deletedAt: null,
      }),
    ).toThrow(SalaryEmployeeInvariantError);
  });

  it("已刪除卻還佔著 active編號：擋下來（soft delete 忘了清這一欄）", () => {
    expect(() =>
      assertActiveNumberPairing({
        number: NUMBER,
        activeNumber: NUMBER,
        deletedAt: DELETED_AT,
      }),
    ).toThrow(SalaryEmployeeInvariantError);
  });

  it("錯誤訊息帶得出是哪一個 編號，除錯時不必回頭撈資料庫", () => {
    expect(() =>
      assertActiveNumberPairing({
        number: NUMBER,
        activeNumber: null,
        deletedAt: null,
      }),
    ).toThrow(NUMBER);
  });
});
