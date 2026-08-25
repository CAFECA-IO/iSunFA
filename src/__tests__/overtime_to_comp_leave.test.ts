import { describe, it, expect } from "@jest/globals";
import { OVERTIME_PREMIUM, OvertimePremiumTier } from "@/constants/overtime";
import { LeaveGrantSource } from "@/constants/leave_policy";
import { WorkDayType } from "@/constants/attendance";
import {
  deriveCompensatoryGrantDays,
  deriveOvertimeSegments,
} from "@/lib/overtime_rules";
import { grantedMinutesOf } from "@/lib/leave_entitlement_rules";
import {
  assertGrantSource,
  LeaveGrantInvariantError,
} from "@/repositories/leave_grant_invariant";

/**
 * Info: (20260818 - Julian) T15：加班換補休（計畫書 §16、D12、ADR 024 §5）。
 *
 * ## 這一支驗的是三件事
 *
 * 一段一筆、1:1 不乘倍率、級距隨批次保留。三者是同一個設計的三面：
 * §32-1 要求補休期限屆滿未休者「依延長工作時間或休息日工作**當日之工資計算標準**
 * 發給工資」，而把 3 小時加班（2h @ 1/3 + 1h @ 2/3）併成一批 3 小時的補休之後，
 * **級距資訊在合併的那一刻就被銷毀**，屆期折現時算不出金額。
 *
 * ## 為什麼不需要資料庫
 *
 * 換算本身是純的：切段由引擎決定，1:1 由 `assertGrantSource` 擋，
 * 而那條不變式故意放在 repository —— 高風險寫入路徑（補休入帳、資料遷移、
 * 調整腳本）全部繞過 service。這裡直接對它下斷言，
 * 驗的就是真正會在寫入時執行的那一段。
 */

const DAY_MINUTES = 480;
const EXPIRES_ON = "2027-02-13";
const WORK_DATE = "2026-08-13";

/** Info: (20260818 - Julian) 把一個分段換成一筆補休批次 —— 與 `overtime_request.repo` 的換算逐字相同 */
const grantFor = (minutes: number, overtimeSegmentId: string) => ({
  source: LeaveGrantSource.OVERTIME_CONVERSION,
  grantedDays: deriveCompensatoryGrantDays({
    minutes,
    dayEquivalentMinutes: DAY_MINUTES,
  }),
  dayEquivalentMinutes: DAY_MINUTES,
  grantedMinutes: minutes,
  cycleStartDate: WORK_DATE,
  cycleEndDate: WORK_DATE,
  expiresOn: EXPIRES_ON,
  overtimeSegmentId,
  overtimeSegmentMinutes: minutes,
  reason: null,
});

describe("加班換補休：一段一筆", () => {
  const segments = deriveOvertimeSegments({
    workDayType: WorkDayType.WORK,
    isEmergency: false,
    minutes: 180,
    priorRecognizedMinutes: 0,
  });

  it("3 小時平日加班切成兩段，因此換出兩批補休", () => {
    expect(segments).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_FIRST_2H, minutes: 120 },
      { order: 1, tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H, minutes: 60 },
    ]);
  });

  it("每一批的級距各自不同 —— 合併就再也分不出哪兩小時是 1/3", () => {
    const tiers = segments.map((segment) => segment.tier);
    expect(new Set(tiers).size).toBe(segments.length);
  });

  it("批次分鐘加總等於認列分鐘", () => {
    const total = segments.reduce((sum, segment) => sum + segment.minutes, 0);
    expect(total).toBe(180);
  });

  it("每一批都通過額度批次的不變式", () => {
    segments.forEach((segment, index) => {
      expect(() =>
        assertGrantSource(grantFor(segment.minutes, `seg-${index}`)),
      ).not.toThrow();
    });
  });
});

describe("§32-1 的 1:1", () => {
  it("補休分鐘等於加班分鐘，不乘加成倍率", () => {
    const grant = grantFor(120, "seg-0");
    expect(grant.grantedMinutes).toBe(120);
  });

  /**
   * Info: (20260818 - Julian) 這一條是本檔存在的主要理由。
   *
   * 「加班 1 小時、加給 1/3、所以補休 1.33 小時」是最容易犯的錯，
   * 而它錯的方向是**多給** —— 表面上對勞工有利，實際上會在屆期折現時
   * 算出一個與法定標準不符的金額，兩邊都對不上（ADR 024 §5.1）。
   */
  it("拿加成倍率去乘會被不變式擋下", () => {
    const ratio = OVERTIME_PREMIUM[OvertimePremiumTier.REST_DAY_FIRST_2H];
    const inflated = Math.round((120 * ratio.numerator) / ratio.denominator);
    expect(inflated).not.toBe(120);

    expect(() =>
      assertGrantSource({
        ...grantFor(120, "seg-0"),
        grantedDays: deriveCompensatoryGrantDays({
          minutes: inflated,
          dayEquivalentMinutes: DAY_MINUTES,
        }),
        grantedMinutes: inflated,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("不帶分段分鐘就驗不了 1:1，因此一律拒絕", () => {
    expect(() =>
      assertGrantSource({
        ...grantFor(120, "seg-0"),
        overtimeSegmentMinutes: undefined,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });
});

describe("來源與分段的雙向綁定", () => {
  it("補休批次沒掛分段會被擋 —— 級距會遺失", () => {
    expect(() =>
      assertGrantSource({ ...grantFor(120, "seg-0"), overtimeSegmentId: null }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("不是補休的批次不得掛分段", () => {
    expect(() =>
      assertGrantSource({
        ...grantFor(120, "seg-0"),
        source: LeaveGrantSource.SENIORITY_ACCRUAL,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });
});

describe("grantedDays 的可驗算性", () => {
  /**
   * Info: (20260819 - Julian) 補休的方向與年資給假相反：分鐘既定、日數推導，
   * 而日數必須能把分鐘算回來（`assertGrantSource`）。直接寫
   * `minutes / dayEquivalentMinutes` 會踩到浮點：
   * `100 / 480 × 480 === 100.00000000000001`。
   * 這一組把所有 1..720 分鐘、三種班長都跑一次，確保換算永遠回得來。
   *
   * Info: (20260819 - Julian) 斷言改用 `grantedMinutesOf` 而不是
   * `Math.ceil(grantedDays × dayEquivalentMinutes)`（review B6）——
   * 後者正是被修掉的那個錯式子，拿它當斷言等於要求實作繼續錯下去
   * （實測 450 分班有 16 個分鐘數過不了它，因為 `0.14 × 450` 是
   * `63.00000000000001`）。精度本身的紅燈在
   * `leave_granted_minutes_precision.test.ts`。
   */
  it.each([450, 480, 720])(
    "日約當 %i 分鐘時，任何分鐘數都能被重算回來",
    (dayEquivalentMinutes) => {
      for (let minutes = 1; minutes <= 720; minutes += 1) {
        const grantedDays = deriveCompensatoryGrantDays({
          minutes,
          dayEquivalentMinutes,
        });
        expect(grantedMinutesOf(grantedDays, dayEquivalentMinutes)).toBe(
          minutes,
        );
      }
    },
  );

  it("分鐘數不是正整數時直接丟，不回一個看起來合理的日數", () => {
    expect(() =>
      deriveCompensatoryGrantDays({ minutes: 0, dayEquivalentMinutes: 480 }),
    ).toThrow();
    expect(() =>
      deriveCompensatoryGrantDays({ minutes: 90.5, dayEquivalentMinutes: 480 }),
    ).toThrow();
  });
});
