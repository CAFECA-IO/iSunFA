import { describe, it, expect } from "@jest/globals";
import {
  OVERTIME_ENGINE_VERSION,
  OvertimeRuleError,
  OvertimeRuleErrorReason,
  deriveOvertimeSegments,
} from "@/lib/overtime_rules";
import { WorkDayType } from "@/constants/attendance";
import {
  OVERTIME_PREMIUM,
  OvertimePremiumTier,
} from "@/constants/overtime";

/**
 * Info: (20260817 - Julian) T12：加班的加成切段（計畫書 §8.1、ADR 024 §4）。
 *
 * 驗收方式是窮舉切段表，不是抽樣：每一段的級距最終會決定工資倍率，
 * 而補休屆期折現時只能靠這個級距還原金額（§32-1）。
 */

const HOUR = 60;

describe("deriveOvertimeSegments — 上班日（§24 I）", () => {
  it("前兩小時走 1/3 級距", () => {
    expect(
      deriveOvertimeSegments({
        workDayType: WorkDayType.WORK,
        isEmergency: false,
        minutes: 2 * HOUR,
        priorRecognizedMinutes: 0,
      }),
    ).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_FIRST_2H, minutes: 120 },
    ]);
  });

  /**
   * Info: (20260817 - Julian) 跨越 120 分鐘邊界時切成兩段。
   *
   * 合併成一筆 180 分鐘的那一刻級距資訊就被銷毀，而 §32-1 的補休屆期折現
   * 要求「依當日工資計算標準發給」—— 屆時就算不出金額了。
   */
  it("三小時切成 2 小時 + 1 小時兩段", () => {
    expect(
      deriveOvertimeSegments({
        workDayType: WorkDayType.WORK,
        isEmergency: false,
        minutes: 3 * HOUR,
        priorRecognizedMinutes: 0,
      }),
    ).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_FIRST_2H, minutes: 120 },
      { order: 1, tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H, minutes: 60 },
    ]);
  });

  /**
   * Info: (20260817 - Julian) 當日先前已認列的分鐘會佔用前 2 小時的額度 ——
   * 上午加班一小時、下午再加兩小時，第二次的第一小時仍屬前 2 小時級距。
   */
  it("當日已加班一小時後，再加兩小時只有一小時留在低階級距", () => {
    expect(
      deriveOvertimeSegments({
        workDayType: WorkDayType.WORK,
        isEmergency: false,
        minutes: 2 * HOUR,
        priorRecognizedMinutes: 1 * HOUR,
      }),
    ).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_FIRST_2H, minutes: 60 },
      { order: 1, tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H, minutes: 60 },
    ]);
  });

  it("前 2 小時已用罄時整段走高階級距，且不產生零分鐘的段", () => {
    const segments = deriveOvertimeSegments({
      workDayType: WorkDayType.WORK,
      isEmergency: false,
      minutes: 1 * HOUR,
      priorRecognizedMinutes: 2 * HOUR,
    });
    expect(segments).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H, minutes: 60 },
    ]);
  });
});

describe("deriveOvertimeSegments — 休息日（§24 II）", () => {
  it("五小時切成 2 小時 + 3 小時，且級距為休息日專用", () => {
    expect(
      deriveOvertimeSegments({
        workDayType: WorkDayType.REST_DAY,
        isEmergency: false,
        minutes: 5 * HOUR,
        priorRecognizedMinutes: 0,
      }),
    ).toEqual([
      { order: 0, tier: OvertimePremiumTier.REST_DAY_FIRST_2H, minutes: 120 },
      { order: 1, tier: OvertimePremiumTier.REST_DAY_BEYOND_2H, minutes: 180 },
    ]);
  });
});

describe("deriveOvertimeSegments — 加倍發給的兩種情形", () => {
  it("休假日（國定假日）經同意出勤整段加倍（§39）", () => {
    expect(
      deriveOvertimeSegments({
        workDayType: WorkDayType.HOLIDAY,
        isEmergency: false,
        minutes: 8 * HOUR,
        priorRecognizedMinutes: 0,
      }),
    ).toEqual([
      { order: 0, tier: OvertimePremiumTier.HOLIDAY_DOUBLE, minutes: 480 },
    ]);
  });

  it("天災事變優先於一切日別（§32 IV）", () => {
    expect(
      deriveOvertimeSegments({
        workDayType: WorkDayType.WORK,
        isEmergency: true,
        minutes: 5 * HOUR,
        priorRecognizedMinutes: 0,
      }),
    ).toEqual([
      { order: 0, tier: OvertimePremiumTier.EMERGENCY_DOUBLE, minutes: 300 },
    ]);
  });
});

describe("deriveOvertimeSegments — 擋下而非猜測", () => {
  /**
   * Info: (20260817 - Julian) 例假日出勤依 §40 原則上不得為之，僅限天災、事變或突發事件，
   * 且須於 24 小時內通報主管機關並事後補假。系統尚未實作通報與補假，故一律擋下 ——
   * 放行會讓一個違法的排班在系統裡看起來像一筆正常的加班。
   */
  it("例假日加班擋下，並指出須依 §40 程序", () => {
    expect(() =>
      deriveOvertimeSegments({
        workDayType: WorkDayType.REGULAR_OFF,
        isEmergency: false,
        minutes: 60,
        priorRecognizedMinutes: 0,
      }),
    ).toThrow(
      expect.objectContaining({
        reason: OvertimeRuleErrorReason.REGULAR_OFF_REQUIRES_ARTICLE_40,
      }) as unknown as Error,
    );
  });

  it("請假日的加成標準未定義，擋下而不猜一個級距", () => {
    expect(() =>
      deriveOvertimeSegments({
        workDayType: WorkDayType.LEAVE,
        isEmergency: false,
        minutes: 60,
        priorRecognizedMinutes: 0,
      }),
    ).toThrow(OvertimeRuleError);
  });

  it.each([0, -1, 1.5])("分鐘數為 %p 時擋下", (minutes) => {
    expect(() =>
      deriveOvertimeSegments({
        workDayType: WorkDayType.WORK,
        isEmergency: false,
        minutes,
        priorRecognizedMinutes: 0,
      }),
    ).toThrow(OvertimeRuleError);
  });
});

describe("deriveOvertimeSegments — 不變式", () => {
  it("各段分鐘加總必等於輸入分鐘（守恆）", () => {
    const cases = [
      { workDayType: WorkDayType.WORK, minutes: 1, prior: 0 },
      { workDayType: WorkDayType.WORK, minutes: 119, prior: 1 },
      { workDayType: WorkDayType.WORK, minutes: 600, prior: 0 },
      { workDayType: WorkDayType.REST_DAY, minutes: 121, prior: 0 },
      { workDayType: WorkDayType.REST_DAY, minutes: 30, prior: 119 },
      { workDayType: WorkDayType.HOLIDAY, minutes: 480, prior: 0 },
    ];
    for (const item of cases) {
      const segments = deriveOvertimeSegments({
        workDayType: item.workDayType,
        isEmergency: false,
        minutes: item.minutes,
        priorRecognizedMinutes: item.prior,
      });
      expect(segments.reduce((sum, seg) => sum + seg.minutes, 0)).toBe(
        item.minutes,
      );
      expect(segments.every((seg) => seg.minutes > 0)).toBe(true);
      expect(segments.map((seg) => seg.order)).toEqual(
        segments.map((_seg, index) => index),
      );
    }
  });
});

/**
 * Info: (20260817 - Julian) 倍率以整數分子分母表示，嚴禁浮點。
 * 本模組不做這個乘法（金額屬薪資模組），但它必須把一個
 * **可以無誤差相乘**的東西交給薪資模組。
 */
describe("OVERTIME_PREMIUM — 加給倍率", () => {
  it("每一個級距都有整數分子分母", () => {
    for (const tier of Object.values(OvertimePremiumTier)) {
      const ratio = OVERTIME_PREMIUM[tier];
      expect(Number.isInteger(ratio.numerator)).toBe(true);
      expect(Number.isInteger(ratio.denominator)).toBe(true);
      expect(ratio.denominator).toBeGreaterThan(0);
    }
  });

  it("平日與休息日的四個級距對齊 §24 的加給比例", () => {
    expect(OVERTIME_PREMIUM[OvertimePremiumTier.WEEKDAY_FIRST_2H]).toEqual({
      numerator: 1,
      denominator: 3,
    });
    expect(OVERTIME_PREMIUM[OvertimePremiumTier.WEEKDAY_BEYOND_2H]).toEqual({
      numerator: 2,
      denominator: 3,
    });
    expect(OVERTIME_PREMIUM[OvertimePremiumTier.REST_DAY_FIRST_2H]).toEqual({
      numerator: 4,
      denominator: 3,
    });
    expect(OVERTIME_PREMIUM[OvertimePremiumTier.REST_DAY_BEYOND_2H]).toEqual({
      numerator: 5,
      denominator: 3,
    });
  });

  /**
   * Info: (20260817 - Julian) 「加倍發給」的語意是**再給一份工資**，
   * 故加給倍率為 1/1 而非 2/1。這個區分在型別裡看不出來，只能靠測試釘住。
   */
  it("加倍發給的加給倍率是 1/1，不是 2/1", () => {
    expect(OVERTIME_PREMIUM[OvertimePremiumTier.HOLIDAY_DOUBLE]).toEqual({
      numerator: 1,
      denominator: 1,
    });
    expect(OVERTIME_PREMIUM[OvertimePremiumTier.EMERGENCY_DOUBLE]).toEqual({
      numerator: 1,
      denominator: 1,
    });
  });
});

describe("引擎版本", () => {
  it("有明確的版本號隨每筆分段落地", () => {
    expect(OVERTIME_ENGINE_VERSION).toBe(1);
  });
});
