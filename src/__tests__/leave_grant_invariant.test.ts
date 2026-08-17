import { describe, it, expect } from "@jest/globals";
import {
  LeaveGrantInvariantError,
  assertGrantSource,
  IStorableLeaveGrant,
} from "@/repositories/leave_grant_invariant";
import { LeaveGrantSource } from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 額度批次的不變式。
 *
 * 這支測試守的是 ADR 022 對外的兩個承諾：
 * ① 補休 1:1（§32-1），② 任何人事後都能驗算 grantedMinutes 的來歷。
 * 兩者若只寫在文件裡，第一支繞過引擎的腳本就會讓它們失效 ——
 * 而失效要到薪資結算日才會被發現。
 */

// Info: (20260817 - Julian) 特休：7 日 × 每日 480 分鐘 = 3360 分鐘
const seniorityGrant: IStorableLeaveGrant = {
  source: LeaveGrantSource.SENIORITY_ACCRUAL,
  grantedDays: 7,
  dayEquivalentMinutes: 480,
  grantedMinutes: 3360,
  cycleStartDate: "2027-01-01",
  cycleEndDate: "2027-12-31",
  expiresOn: "2028-12-31",
  overtimeSegmentId: null,
  reason: null,
};

// Info: (20260817 - Julian) 補休：一段 60 分鐘的加班換 60 分鐘補休（1:1，不乘倍率）
const compensatoryGrant: IStorableLeaveGrant = {
  source: LeaveGrantSource.OVERTIME_CONVERSION,
  grantedDays: 0.125,
  dayEquivalentMinutes: 480,
  grantedMinutes: 60,
  cycleStartDate: "2026-08-17",
  cycleEndDate: "2026-11-17",
  expiresOn: "2026-11-17",
  overtimeSegmentId: "segment-1",
  overtimeSegmentMinutes: 60,
  reason: null,
};

describe("assertGrantSource — 來源與外鍵的雙向約束", () => {
  it("年資授予與補休授予的合法形狀都通過", () => {
    expect(() => assertGrantSource(seniorityGrant)).not.toThrow();
    expect(() => assertGrantSource(compensatoryGrant)).not.toThrow();
  });

  it("補休沒掛分段：級距資訊消失，§32-1 折現算不出來", () => {
    expect(() =>
      assertGrantSource({
        ...compensatoryGrant,
        overtimeSegmentId: null,
        overtimeSegmentMinutes: null,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it.each([
    LeaveGrantSource.SENIORITY_ACCRUAL,
    LeaveGrantSource.CARRY_FORWARD,
    LeaveGrantSource.MANUAL_ADJUSTMENT,
  ])("非補休來源（%s）掛著分段擋下", (source) => {
    expect(() =>
      assertGrantSource({
        ...seniorityGrant,
        source,
        reason: "manual",
        overtimeSegmentId: "segment-1",
        overtimeSegmentMinutes: 60,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });
});

describe("assertGrantSource — §32-1 的 1:1 換算", () => {
  /**
   * Info: (20260817 - Julian) 直覺會想「加班 1 小時、加給 1/3、所以補休 1.33 小時」。
   * 那個直覺錯的方向是**多給** —— 表面上對勞工有利，實際上屆期折現時
   * 會算出與法定標準不符的金額，兩邊都對不上。
   */
  it("補休乘上加成倍率擋下（80 分鐘 ≠ 60 分鐘的加班）", () => {
    expect(() =>
      assertGrantSource({
        ...compensatoryGrant,
        grantedDays: 80 / 480,
        grantedMinutes: 80,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("補休少給也擋下（方向不是重點，對不上才是）", () => {
    expect(() =>
      assertGrantSource({
        ...compensatoryGrant,
        grantedDays: 30 / 480,
        grantedMinutes: 30,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("補休沒有帶分段分鐘數時擋下（無從驗證 1:1）", () => {
    expect(() =>
      assertGrantSource({
        ...compensatoryGrant,
        overtimeSegmentMinutes: undefined,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });
});

describe("assertGrantSource — grantedMinutes 必須可驗算", () => {
  it("分鐘數與「日數 × 日約當分鐘」不符時擋下", () => {
    expect(() =>
      assertGrantSource({ ...seniorityGrant, grantedMinutes: 3300 }),
    ).toThrow(LeaveGrantInvariantError);
  });

  /**
   * Info: (20260817 - Julian) 比例給假會產生小數分鐘（1.1 日 × 465 分鐘 = 511.5），
   * 進位後為 512 —— 用與 `deriveGrantSchedule` 完全相同的式子驗算，
   * 兩邊才不會因為捨入方式不同而對不上。
   */
  it("比例給假的進位結果通過", () => {
    expect(() =>
      assertGrantSource({
        ...seniorityGrant,
        grantedDays: 1.1,
        dayEquivalentMinutes: 465,
        grantedMinutes: 512,
      }),
    ).not.toThrow();
  });

  it("比例給假若改成無條件捨去則擋下", () => {
    expect(() =>
      assertGrantSource({
        ...seniorityGrant,
        grantedDays: 1.1,
        dayEquivalentMinutes: 465,
        grantedMinutes: 511,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("日約當分鐘為零時擋下（整筆授予無從驗算）", () => {
    expect(() =>
      assertGrantSource({
        ...seniorityGrant,
        dayEquivalentMinutes: 0,
        grantedMinutes: 0,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });
});

describe("assertGrantSource — 人工調整與期間", () => {
  it("人工調整必須說明理由", () => {
    const manual = {
      ...seniorityGrant,
      source: LeaveGrantSource.MANUAL_ADJUSTMENT,
    };
    expect(() => assertGrantSource({ ...manual, reason: null })).toThrow(
      LeaveGrantInvariantError,
    );
    expect(() => assertGrantSource({ ...manual, reason: "   " })).toThrow(
      LeaveGrantInvariantError,
    );
    expect(() =>
      assertGrantSource({ ...manual, reason: "系統遷移補發 2026 年度未休特休" }),
    ).not.toThrow();
  });

  it("週期反向擋下", () => {
    expect(() =>
      assertGrantSource({
        ...seniorityGrant,
        cycleStartDate: "2027-12-31",
        cycleEndDate: "2027-01-01",
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  /**
   * Info: (20260817 - Julian) `expiresOn` 是 FIFO 扣減的唯一排序鍵。
   * 一筆在週期還沒結束就已到期的批次會被排到最前面優先扣光 ——
   * 症狀是「今年的特休先被扣完、去年遞延的還在」，剛好與制度要的順序相反。
   */
  it("到期日早於週期結束日擋下（FIFO 順序會顛倒）", () => {
    expect(() =>
      assertGrantSource({ ...seniorityGrant, expiresOn: "2027-06-30" }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("不可遞延的假別：到期日等於週期結束日", () => {
    expect(() =>
      assertGrantSource({ ...seniorityGrant, expiresOn: "2027-12-31" }),
    ).not.toThrow();
  });
});
