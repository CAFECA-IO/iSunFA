import { describe, it, expect } from "@jest/globals";
import { WorkDayType } from "@/constants/attendance";
import { OvertimePremiumTier } from "@/constants/overtime";
import {
  deriveOvertimeSegments,
  OvertimeRuleErrorReason,
} from "@/lib/overtime_rules";
import {
  assertOvertimeEmergencyRecord,
  IStorableOvertimeEmergency,
  OvertimeRequestInvariantError,
} from "@/repositories/overtime_request_invariant";
import { overtimeRequestCreateSchema } from "@/validators/overtime";

/**
 * Info: (20260819 - Julian) §32 IV 天災事變的認定必須有記載（review B7）。
 *
 * ## 這一組守的是什麼
 *
 * `isEmergency` 原本是**申請人在送出的 payload 裡自填的一個布林值**，
 * 而它的兩個後果都對填單的人有利：整段加班跳到 `EMERGENCY_DOUBLE`
 * （加倍發給），且它排在判定表第一列，因此連例假日的閘門也一併繞過。
 * 系統裡沒有任何地方記載那次報備 —— 計畫書 §8.3 自己寫下了這件事：
 * 「程式已經假設報備發生過，但系統裡沒有任何地方記錄它。」
 *
 * 標準取自同一支模組已經立好的那一把尺：`assertOvertimePolicy` 對 §32 III
 * 54 小時放寬寫著「**一個沒有記載的『已同意』等於沒有同意**」。
 * 這裡的結構完全相同，代價更大 —— 放寬多的是 8 小時額度，
 * 加倍發給改的是整段工資的計算標準。
 */

const RECORDED: IStorableOvertimeEmergency = {
  isEmergency: true,
  emergencyReportUrl: "https://example.test/filings/2026-0819-001",
  emergencyReportedAt: new Date("2026-08-19T09:00:00+08:00"),
  emergencyDeclaredByEmployeeId: "emp-hr1",
};

describe("assertOvertimeEmergencyRecord — 沒有記載就沒有報備", () => {
  it("三個欄位俱全時通過", () => {
    expect(() => assertOvertimeEmergencyRecord(RECORDED)).not.toThrow();
  });

  it.each([
    ["缺報備紀錄", { emergencyReportUrl: null }],
    ["報備紀錄是空白字串", { emergencyReportUrl: "   " }],
    ["缺報備時點", { emergencyReportedAt: null }],
    ["缺認定者", { emergencyDeclaredByEmployeeId: null }],
    ["認定者是空白字串", { emergencyDeclaredByEmployeeId: "  " }],
  ])("%s 時擋下", (_label, patch) => {
    expect(() =>
      assertOvertimeEmergencyRecord({
        ...RECORDED,
        ...(patch as Partial<IStorableOvertimeEmergency>),
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  it("非天災事變且三個欄位皆空時通過", () => {
    expect(() =>
      assertOvertimeEmergencyRecord({
        isEmergency: false,
        emergencyReportUrl: null,
        emergencyReportedAt: null,
        emergencyDeclaredByEmployeeId: null,
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260819 - Julian) 反方向也要擋：一筆帶著報備紀錄卻沒有
   * `isEmergency` 的單子，事後分不出來是「認定被撤回了」還是「認定漏掉了」。
   * 留著半套資料等於留下一個講兩種故事的紀錄。
   */
  it.each([
    ["只剩報備紀錄", { emergencyReportUrl: RECORDED.emergencyReportUrl }],
    ["只剩報備時點", { emergencyReportedAt: RECORDED.emergencyReportedAt }],
    [
      "只剩認定者",
      { emergencyDeclaredByEmployeeId: RECORDED.emergencyDeclaredByEmployeeId },
    ],
  ])("非天災事變卻%s 時擋下", (_label, patch) => {
    expect(() =>
      assertOvertimeEmergencyRecord({
        isEmergency: false,
        emergencyReportUrl: null,
        emergencyReportedAt: null,
        emergencyDeclaredByEmployeeId: null,
        ...(patch as Partial<IStorableOvertimeEmergency>),
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });
});

describe("送出的 payload 不得帶 isEmergency", () => {
  const base = {
    workDate: "2026-08-19",
    filingType: "ADVANCE",
    compensationMode: "PAYMENT",
    requestedStartMinute: 1080,
    requestedEndMinute: 1200,
    reason: "趕工期",
  };

  it("合法的送出 payload 通過", () => {
    expect(overtimeRequestCreateSchema.safeParse(base).success).toBe(true);
  });

  /**
   * Info: (20260819 - Julian) 多送一個 `isEmergency: true` 不會讓它成立。
   *
   * zod 預設會**剝掉**未宣告的鍵，所以這裡不驗「解析失敗」而是驗
   * 「解析結果裡沒有它」—— 後者才是真正要保證的事：舊版前端或第三方
   * 腳本照舊送出那個欄位時，它到不了 service。
   */
  it("多送 isEmergency 時被剝掉，不會流進 service", () => {
    const parsed = overtimeRequestCreateSchema.safeParse({
      ...base,
      isEmergency: true,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect("isEmergency" in parsed.data).toBe(false);
  });
});

/**
 * Info: (20260819 - Julian) 判定表的順序本身就是一條規則（ADR 024 §4.5）。
 * 例假日排在 `isEmergency` 之前，且沒有旁路。
 */
describe("例假日一律擋下，天災事變不是通行證", () => {
  it.each([false, true])("isEmergency=%p 時都擋下", (isEmergency) => {
    expect(() =>
      deriveOvertimeSegments({
        workDayType: WorkDayType.REGULAR_OFF,
        isEmergency,
        minutes: 120,
        priorRecognizedMinutes: 0,
      }),
    ).toThrow(
      expect.objectContaining({
        reason: OvertimeRuleErrorReason.REGULAR_OFF_REQUIRES_ARTICLE_40,
      }) as unknown as Error,
    );
  });

  it("例假以外仍然跳到加倍級距", () => {
    for (const workDayType of [
      WorkDayType.WORK,
      WorkDayType.REST_DAY,
      WorkDayType.HOLIDAY,
    ]) {
      expect(
        deriveOvertimeSegments({
          workDayType,
          isEmergency: true,
          minutes: 180,
          priorRecognizedMinutes: 0,
        }),
      ).toEqual([
        { order: 0, tier: OvertimePremiumTier.EMERGENCY_DOUBLE, minutes: 180 },
      ]);
    }
  });
});
