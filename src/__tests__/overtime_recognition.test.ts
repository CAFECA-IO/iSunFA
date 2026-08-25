import { describe, it, expect } from "@jest/globals";
import {
  OvertimeRuleError,
  reconcileOvertimeMinutes,
} from "@/lib/overtime_rules";

/**
 * Info: (20260817 - Julian) T14：加班認列 = min(核准, 事實)（ADR 024 §2）。
 *
 * 這支測試釘住的是「零捏造」在時數上的兩個方向：
 * 系統不發明沒有發生過的加班，也不隱瞞發生了的加班。
 */

describe("reconcileOvertimeMinutes", () => {
  it("申請三小時只待一小時，認列一小時", () => {
    expect(
      reconcileOvertimeMinutes({ approvedMinutes: 180, actualMinutes: 60 }),
    ).toEqual({ recognizedMinutes: 60, unapprovedMinutes: 0 });
  });

  /**
   * Info: (20260817 - Julian) 超出核准的部分不認列，**但也不靜默丟棄**。
   *
   * 未核准的加班是勞資爭議最常見的起點：事實仍存在於 `AttendancePunch` 裡，
   * 只是沒有人看見 —— 而勞動檢查看得見。`unapprovedMinutes` 是它浮出來的管道
   * （對應 L29 端點與 `OvertimeExceptionType.UNAPPROVED_OVERTIME`）。
   */
  it("待了三小時只核准一小時，認列一小時且交出兩小時的未核准加班", () => {
    expect(
      reconcileOvertimeMinutes({ approvedMinutes: 60, actualMinutes: 180 }),
    ).toEqual({ recognizedMinutes: 60, unapprovedMinutes: 120 });
  });

  it("核准與事實一致時沒有未核准加班", () => {
    expect(
      reconcileOvertimeMinutes({ approvedMinutes: 120, actualMinutes: 120 }),
    ).toEqual({ recognizedMinutes: 120, unapprovedMinutes: 0 });
  });

  it("完全沒有打卡佐證時認列為零，且整段列為未核准", () => {
    expect(
      reconcileOvertimeMinutes({ approvedMinutes: 180, actualMinutes: 0 }),
    ).toEqual({ recognizedMinutes: 0, unapprovedMinutes: 0 });
  });

  it("沒有核准單卻有停留事實時，全數列為未核准加班", () => {
    expect(
      reconcileOvertimeMinutes({ approvedMinutes: 0, actualMinutes: 240 }),
    ).toEqual({ recognizedMinutes: 0, unapprovedMinutes: 240 });
  });

  it("認列分鐘永遠不超過核准，也永遠不超過事實", () => {
    for (const approved of [0, 30, 120, 480]) {
      for (const actual of [0, 30, 120, 480]) {
        const result = reconcileOvertimeMinutes({
          approvedMinutes: approved,
          actualMinutes: actual,
        });
        expect(result.recognizedMinutes).toBeLessThanOrEqual(approved);
        expect(result.recognizedMinutes).toBeLessThanOrEqual(actual);
        expect(result.recognizedMinutes + result.unapprovedMinutes).toBe(
          Math.max(actual, result.recognizedMinutes),
        );
      }
    }
  });

  it.each([
    ["核准為負", -1, 60],
    ["事實為負", 60, -1],
  ])(
    "%s 時擋下（呼叫端的錯誤，不是使用者輸入）",
    (_label, approved, actual) => {
      expect(() =>
        reconcileOvertimeMinutes({
          approvedMinutes: approved,
          actualMinutes: actual,
        }),
      ).toThrow(OvertimeRuleError);
    },
  );
});
