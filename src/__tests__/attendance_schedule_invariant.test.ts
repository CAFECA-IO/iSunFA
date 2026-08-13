import { describe, it, expect } from "@jest/globals";
import {
  assertSchedulableDay,
  AttendanceScheduleInvariantError,
} from "@/repositories/attendance_schedule_invariant";
import { WorkDayType } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 排班日不變式：`dayType` 與 `shiftPatternId` 必須同進退。
 *
 * 兩個被擋下的組合都對應一種「寫得進去、但讀出來會說謊」的紀錄：
 * 上班日沒班別會被判成「沒有排班」（明明排了）；
 * 休假日掛班別會讓月曆畫出一個沒有任何判定在用的班次。
 *
 * 寫法比照 `hr_pii_invariant.test.ts` —— 兩者是同一條規則的同一種形狀。
 */
describe("assertSchedulableDay", () => {
  const shiftPatternId = "shift-pattern-uuid";

  it("should accept a work day that carries a shift pattern", () => {
    expect(() =>
      assertSchedulableDay({ dayType: WorkDayType.WORK, shiftPatternId }),
    ).not.toThrow();
  });

  it("should accept a regular off day with no shift pattern", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.REGULAR_OFF,
        shiftPatternId: null,
      }),
    ).not.toThrow();
  });

  // Info: (20260813 - Julian) undefined 與 null 都代表「沒有班別」，兩者都要放行
  it("should treat an undefined shift pattern the same as null", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.HOLIDAY,
        shiftPatternId: undefined,
      }),
    ).not.toThrow();
  });

  it("should reject a work day without a shift pattern", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.WORK,
        shiftPatternId: null,
      }),
    ).toThrow(AttendanceScheduleInvariantError);
  });

  it("should reject a non-working day that carries a shift pattern", () => {
    expect(() =>
      assertSchedulableDay({ dayType: WorkDayType.REST_DAY, shiftPatternId }),
    ).toThrow(AttendanceScheduleInvariantError);
  });

  /**
   * Info: (20260813 - Julian) 每一種非上班日都要擋 —— 逐一列出而不是抽一個代表。
   * 未來新增 `SUSPENDED`（停工）時，這個清單漏掉它就會安靜地放行。
   */
  it.each([
    WorkDayType.REGULAR_OFF,
    WorkDayType.REST_DAY,
    WorkDayType.HOLIDAY,
    WorkDayType.LEAVE,
  ])("should reject %s carrying a shift pattern", (dayType) => {
    expect(() => assertSchedulableDay({ dayType, shiftPatternId })).toThrow(
      AttendanceScheduleInvariantError,
    );
  });

  /**
   * Info: (20260813 - Julian) 空字串視為「沒有班別」。
   *
   * 外鍵不可能是空字串，但批次匯入的 CSV 很容易把空欄位讀成 `""` ——
   * 若當成「有值」放行，會得到一筆指向不存在班別的上班日，
   * 而那個錯誤要等到外鍵約束才爆，訊息與成因無關。
   */
  it("should treat an empty string as no shift pattern at all", () => {
    expect(() =>
      assertSchedulableDay({ dayType: WorkDayType.WORK, shiftPatternId: "" }),
    ).toThrow(AttendanceScheduleInvariantError);

    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.REST_DAY,
        shiftPatternId: "",
      }),
    ).not.toThrow();
  });

  // Info: (20260813 - Julian) 錯誤訊息要帶得出兩個欄位的值，否則批次匯入失敗時無從定位
  it("should report both field values in the error message", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.WORK,
        shiftPatternId: null,
      }),
    ).toThrow(/dayType=WORK/);
  });
});
