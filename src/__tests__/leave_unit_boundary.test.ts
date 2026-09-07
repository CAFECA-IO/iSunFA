import { describe, it, expect } from "@jest/globals";
import {
  LeaveRuleError,
  resolveLeaveMinutes,
} from "@/lib/leave_entitlement_rules";
import {
  LeaveDaySegment,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import { ILeaveShiftLength } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) T4：最小請假單位與捨入（ADR 021 §4）。
 *
 * 這支測試存在的主要理由是釘住一句話：**「半天」不是 240 分鐘。**
 * 它是該日班別應工作分鐘的一半，而班別因人而異。
 */

// Info: (20260817 - Julian) 八小時班（工地日班）
const EIGHT_HOUR: ILeaveShiftLength = {
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

/**
 * Info: (20260817 - Julian) 應工作分鐘為奇數的班別。
 * 465 = 7 小時 45 分，半天會落在 232.5 —— 不對稱由此而生。
 */
const ODD_SHIFT: ILeaveShiftLength = {
  requiredWorkMinutes: 465,
  breakMinutes: 45,
};

const halfHourPolicy = {
  unitBasis: LeaveUnitBasis.FIXED_MINUTES,
  minimumUnitMinutes: 30,
  roundingMode: LeaveRoundingMode.UP,
};

describe("resolveLeaveMinutes — 整天與半天", () => {
  it("整天 = 該日應工作分鐘，不是一個固定值", () => {
    expect(
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.FULL,
      }).minutes,
    ).toBe(480);

    expect(
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: ODD_SHIFT,
        segment: LeaveDaySegment.FULL,
      }).minutes,
    ).toBe(465);
  });

  it("日約當分鐘與分鐘數一起回傳（逐日固化的換算依據）", () => {
    const result = resolveLeaveMinutes({
      policy: halfHourPolicy,
      shift: ODD_SHIFT,
      segment: LeaveDaySegment.FULL,
    });
    expect(result.dayEquivalentMinutes).toBe(465);
  });

  it("八小時班的半天是 240 分鐘", () => {
    expect(
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.MORNING,
      }).minutes,
    ).toBe(240);
  });

  /**
   * Info: (20260817 - Julian) 奇數班別的不對稱：餘數由**下半天**吸收。
   *
   * 上午段的邊界由班別的核心起算時刻決定，是確定的；把餘數放在確定的一端，
   * 會讓「上午」的定義隨班別浮動（ADR 021 §4.2）。
   */
  it("奇數班別：上午 232、下午 233，餘數由下半天吸收", () => {
    expect(
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: ODD_SHIFT,
        segment: LeaveDaySegment.MORNING,
      }).minutes,
    ).toBe(232);

    expect(
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: ODD_SHIFT,
        segment: LeaveDaySegment.AFTERNOON,
      }).minutes,
    ).toBe(233);
  });

  it("上下半天相加等於一整天（不會因捨入而憑空多出時間）", () => {
    const morning = resolveLeaveMinutes({
      policy: halfHourPolicy,
      shift: ODD_SHIFT,
      segment: LeaveDaySegment.MORNING,
    }).minutes;
    const afternoon = resolveLeaveMinutes({
      policy: halfHourPolicy,
      shift: ODD_SHIFT,
      segment: LeaveDaySegment.AFTERNOON,
    }).minutes;
    expect(morning + afternoon).toBe(ODD_SHIFT.requiredWorkMinutes);
  });

  /**
   * Info: (20260817 - Julian) 最小單位是「整天」的假別不得選半天 ——
   * **擋下而非默默升級成整天**：靜默升級會讓一個人以為自己請了半天，
   * 月底看到扣一天才發現。
   */
  it("最小單位為整天時，選半天會被擋下而不是升級", () => {
    expect(() =>
      resolveLeaveMinutes({
        policy: {
          unitBasis: LeaveUnitBasis.FULL_WORKDAY,
          minimumUnitMinutes: null,
          roundingMode: LeaveRoundingMode.UP,
        },
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.MORNING,
      }),
    ).toThrow(LeaveRuleError);
  });
});

describe("resolveLeaveMinutes — 自訂時段與捨入", () => {
  it("半小時單位：兩小時整不需捨入", () => {
    const result = resolveLeaveMinutes({
      policy: halfHourPolicy,
      shift: EIGHT_HOUR,
      segment: LeaveDaySegment.CUSTOM,
      startMinute: 9 * 60,
      endMinute: 11 * 60,
    });
    expect(result.rawMinutes).toBe(120);
    expect(result.minutes).toBe(120);
  });

  it("半小時單位、UP：70 分鐘進位為 90 分鐘", () => {
    expect(
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 9 * 60,
        endMinute: 10 * 60 + 10,
      }).minutes,
    ).toBe(90);
  });

  it("NEAREST 則四捨五入為 60 分鐘", () => {
    expect(
      resolveLeaveMinutes({
        policy: { ...halfHourPolicy, roundingMode: LeaveRoundingMode.NEAREST },
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 9 * 60,
        endMinute: 10 * 60 + 10,
      }).minutes,
    ).toBe(60);
  });

  /**
   * Info: (20260817 - Julian) 一天的請假不可能超過那一天該工作的時間。
   * 465 分鐘的班、以小時為單位，進位會算出 480 —— 那多出來的 15 分鐘不存在於任何一天。
   */
  it("捨入結果夾在應工作分鐘以內", () => {
    expect(
      resolveLeaveMinutes({
        policy: {
          unitBasis: LeaveUnitBasis.FIXED_MINUTES,
          minimumUnitMinutes: 60,
          roundingMode: LeaveRoundingMode.UP,
        },
        shift: ODD_SHIFT,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 8 * 60,
        endMinute: 8 * 60 + 465,
      }).minutes,
    ).toBe(465);
  });

  it("半天為最小單位時，兩小時的自訂時段仍扣半天", () => {
    expect(
      resolveLeaveMinutes({
        policy: {
          unitBasis: LeaveUnitBasis.HALF_WORKDAY,
          minimumUnitMinutes: null,
          roundingMode: LeaveRoundingMode.UP,
        },
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 9 * 60,
        endMinute: 11 * 60,
      }).minutes,
    ).toBe(240);
  });
});

describe("resolveLeaveMinutes — 結構性錯誤", () => {
  it("FIXED_MINUTES 卻沒有最小單位，是設定錯誤而非使用者輸入錯誤", () => {
    expect(() =>
      resolveLeaveMinutes({
        policy: {
          unitBasis: LeaveUnitBasis.FIXED_MINUTES,
          minimumUnitMinutes: null,
          roundingMode: LeaveRoundingMode.UP,
        },
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 0,
        endMinute: 60,
      }),
    ).toThrow(LeaveRuleError);
  });

  it("最小單位無法整除 60 時擋下（避免出現半小時與 45 分鐘混用）", () => {
    expect(() =>
      resolveLeaveMinutes({
        policy: { ...halfHourPolicy, minimumUnitMinutes: 7 },
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 0,
        endMinute: 60,
      }),
    ).toThrow(LeaveRuleError);
  });

  it("CUSTOM 缺少起訖時擋下", () => {
    expect(() =>
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
      }),
    ).toThrow(LeaveRuleError);
  });

  it("區間反向時擋下（空矩陣是對資料的陳述，參數寫反是對請求的陳述）", () => {
    expect(() =>
      resolveLeaveMinutes({
        policy: halfHourPolicy,
        shift: EIGHT_HOUR,
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 600,
        endMinute: 540,
      }),
    ).toThrow(LeaveRuleError);
  });
});
