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

/**
 * Info: (20260817 - Julian) `plannedWorkMinutes` 的方向性。
 *
 * 這個欄位是假勤模組加的：`assertSchedulableDay` 保證非上班日必無班別，
 * 於是一旦投影成 `LEAVE` / `SUSPENDED`，「這天本來要上幾分鐘」在 DB 裡就消失了 ——
 * 而那是半天假換算、額度扣抵、銷假退回三件事的依據。
 *
 * 它與上面兩條是同一個形狀：同一個欄位在某個 `dayType` 下有意義、在另一個下必須為空。
 */
describe("assertSchedulableDay — plannedWorkMinutes", () => {
  it("非上班日可以帶著快照", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.LEAVE,
        shiftPatternId: null,
        plannedWorkMinutes: 480,
      }),
    ).not.toThrow();
  });

  // Info: (20260817 - Julian) 停工日尤其需要：停工天數是工期展延與契約計價的依據
  it("停工日可以帶著快照", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.SUSPENDED,
        shiftPatternId: null,
        plannedWorkMinutes: 450,
      }),
    ).not.toThrow();
  });

  it("非上班日不帶快照也通過（例假本來就不是上班日）", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.REGULAR_OFF,
        shiftPatternId: null,
        plannedWorkMinutes: null,
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260817 - Julian) 上班日的班別還在，`requiredWorkMinutes` 才是唯一來源。
   * 留著舊快照的實際情境是：銷假把某天投影回 `WORK` 卻沒清掉它 ——
   * 之後有人改了班別，那份快照就開始說謊，而它看起來仍像一個有效設定。
   */
  it("上班日帶著快照時擋下：那是第二個可以互相矛盾的答案", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.WORK,
        shiftPatternId: "shift-1",
        plannedWorkMinutes: 480,
      }),
    ).toThrow(AttendanceScheduleInvariantError);
  });

  // Info: (20260817 - Julian) 既有呼叫端不傳這個欄位，必須維持通過
  it("完全不傳這個欄位時維持原行為", () => {
    expect(() =>
      assertSchedulableDay({
        dayType: WorkDayType.WORK,
        shiftPatternId: "shift-1",
      }),
    ).not.toThrow();
  });
});
