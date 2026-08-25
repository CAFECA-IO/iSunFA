import { describe, it, expect } from "@jest/globals";
import { WorkDayType } from "@/constants/attendance";
import { OvertimePremiumTier } from "@/constants/overtime";
import {
  deriveOvertimeSegments,
  OvertimeRuleErrorReason,
} from "@/lib/overtime_rules";
import type { IStorableEmergencyDeclaration } from "@/repositories/overtime_request_invariant";
import {
  assertEmergencyDeclaration,
  assertOvertimeEmergencyRecord,
  assertOvertimeSegmentPremium,
  IStorableOvertimeEmergency,
  OvertimeRequestInvariantError,
} from "@/repositories/overtime_request_invariant";
import {
  overtimeApprovalSchema,
  overtimeEmergencyDeclareSchema,
  overtimeRequestCreateSchema,
} from "@/validators/overtime";

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

/**
 * Info: (20260819 - Julian) 認定與核准是**兩支端點**。
 *
 * 第一版把認定做成核准 payload 的一個欄位，結果撞上一個結構性的空集合：
 * 核准要求「管得到他的主管」，認定要求 `HR_ADMIN`，而一般組織裡沒有人
 * 同時是兩者 —— demo 帳本正是如此（EMP005 管得到人但不是 HR，
 * EMP002 是 HR 但不管人），於是 §32 IV 成了一條走不通的路。
 */
describe("認定不在核准的 payload 裡", () => {
  it("核准 schema 只收 approvedMinutes", () => {
    const parsed = overtimeApprovalSchema.safeParse({
      approvedMinutes: 60,
      emergency: {
        reportUrl: "https://e.test/1",
        reportedAt: "2026-08-15T11:00",
      },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect("emergency" in parsed.data).toBe(false);
  });

  it("認定 schema 兩個欄位皆必填", () => {
    expect(
      overtimeEmergencyDeclareSchema.safeParse({
        reportUrl: "https://e.test/1",
        reportedAt: "2026-08-15T11:00",
      }).success,
    ).toBe(true);
    expect(
      overtimeEmergencyDeclareSchema.safeParse({
        reportUrl: "https://e.test/1",
      }).success,
    ).toBe(false);
    expect(
      overtimeEmergencyDeclareSchema.safeParse({
        reportedAt: "2026-08-15T11:00",
      }).success,
    ).toBe(false);
    // Info: (20260819 - Julian) 空白字串不算紀錄
    expect(
      overtimeEmergencyDeclareSchema.safeParse({
        reportUrl: "   ",
        reportedAt: "2026-08-15T11:00",
      }).success,
    ).toBe(false);
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

/**
 * Info: (20260820 - Julian) 旗標與級距不得各說各話（review 第 3 條）。
 *
 * `deriveOvertimeSegments` 的判定表 #2 保證了這個對應，但那只涵蓋
 * 「分段是從那支函式拿到的」那條路。核准的交錯（見
 * `overtime_approve_emergency_claim.test.ts`）、資料遷移、未來的更正流程
 * 都不走那支函式，而這張表存得下那個矛盾。
 */
describe("assertOvertimeSegmentPremium — 旗標與級距講同一個故事", () => {
  const emergency = {
    order: 0,
    tier: OvertimePremiumTier.EMERGENCY_DOUBLE,
    minutes: 180,
  };
  const weekdayFirst = {
    order: 0,
    tier: OvertimePremiumTier.WEEKDAY_FIRST_2H,
    minutes: 120,
  };
  const weekdayBeyond = {
    order: 1,
    tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H,
    minutes: 60,
  };

  it("天災事變：整段一筆加倍發給時通過", () => {
    expect(() =>
      assertOvertimeSegmentPremium({
        isEmergency: true,
        segments: [emergency],
      }),
    ).not.toThrow();
  });

  it("非天災事變：普通級距時通過", () => {
    expect(() =>
      assertOvertimeSegmentPremium({
        isEmergency: false,
        segments: [weekdayFirst, weekdayBeyond],
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260820 - Julian) 這一條就是核准交錯落地之後的那筆紀錄：
   * 單子說「已依 §32 IV 報備」，分段說「平日前兩小時加給三分之一」。
   */
  it("已報備卻是普通級距 —— 工資少算，而報備紀錄會證明公司知道", () => {
    expect(() =>
      assertOvertimeSegmentPremium({
        isEmergency: true,
        segments: [weekdayFirst, weekdayBeyond],
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  /**
   * Info: (20260820 - Julian) 反方向代價更大：加倍發給已經出去，
   * 而系統裡沒有任何一份 §32 IV 的報備紀錄可以答覆勞動檢查。
   */
  it("沒有報備卻掛著加倍級距 —— 錢出去了，佐證答不出來", () => {
    expect(() =>
      assertOvertimeSegmentPremium({
        isEmergency: false,
        segments: [emergency],
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  /**
   * Info: (20260820 - Julian) 天災事變不切級距（判定表 #2 直接回一筆）。
   * 混著一筆普通級距，等於把「加倍發給」偷偷折成部分加倍。
   */
  it("天災事變混進一筆普通級距時擋下", () => {
    expect(() =>
      assertOvertimeSegmentPremium({
        isEmergency: true,
        segments: [emergency, weekdayBeyond],
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  /**
   * Info: (20260820 - Julian) 認列 0 分鐘沒有分段，那不是矛盾 ——
   * 一張核准 0 分鐘的單子沒有任何工資標準要決定。
   */
  it("認列 0 分鐘（無分段）時兩種旗標都通過", () => {
    expect(() =>
      assertOvertimeSegmentPremium({ isEmergency: true, segments: [] }),
    ).not.toThrow();
    expect(() =>
      assertOvertimeSegmentPremium({ isEmergency: false, segments: [] }),
    ).not.toThrow();
  });
});

/**
 * Info: (20260820 - Julian) 報備連結必須**點得進去**（review 第 3 輪第 1 條）。
 *
 * 這一欄從自填布林值改成強制記載，要的是「不再有看起來像記載的狀態」。
 * 只要求非空的話 `N/A` 就通得過 —— 而
 * `OVERTIME_EMERGENCY_REPORT_URL_MAX_LENGTH` 的註解自己寫著
 * 「一個填了 `N/A` 的必填欄位，比沒有這個欄位更糟：它看起來像有記載」。
 *
 * 協定白名單而不只是「像不像 URL」：這一欄直接進 `<a href={...}>`，
 * 而 zod `.url()` 的實作 `new URL()` 認得 `javascript:`、`data:`、`file:`、
 * `vbscript:`（本 repo 實測 zod 4.4.3，四種全部通過）。
 */
describe("報備連結的協定白名單", () => {
  it.each([
    ["placeholder", "N/A"],
    ["文號而不是連結", "北市勞動字第 1140819 號"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["file:", "file:///etc/passwd"],
    ["vbscript:", "vbscript:msgbox(1)"],
  ])("%s 擋下", (_label, reportUrl) => {
    expect(() =>
      assertOvertimeEmergencyRecord({
        ...RECORDED,
        emergencyReportUrl: reportUrl,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  /**
   * Info: (20260820 - Julian) 反面：正當的連結不得被擋。
   *
   * 內網位址**刻意放行** —— 公司把公文放在內部文件伺服器是正當的記錄位置，
   * 擋掉只會逼出一個對外看得到、但其實不是那份公文的網址，
   * 而那比內網連結更糟（它看起來可以查證）。「連到哪」的判斷交給畫面，
   * 它會把 host 顯示出來。
   */
  it.each([
    ["主管機關網站", "https://www.mol.gov.tw/filings/2026-0819"],
    ["內網文件伺服器", "http://intranet.local/filings/2026-0819.pdf"],
  ])("%s 放行", (_label, reportUrl) => {
    expect(() =>
      assertOvertimeEmergencyRecord({
        ...RECORDED,
        emergencyReportUrl: reportUrl,
      }),
    ).not.toThrow();
  });
});

/**
 * Info: (20260820 - Julian) 認定歷史列的「撤回三欄同生共死」（review 第 3 輪第 2 條）。
 *
 * 撤回留列而不是把欄位清空：公司真的通知過工會、真的報過主管機關，
 * 那件事不會因為系統把欄位設成 null 而沒有發生過。
 */
describe("assertEmergencyDeclaration", () => {
  const ACTIVE = {
    reportUrl: "https://example.test/filings/2026-0819-001",
    reportedAt: new Date("2026-08-19T09:00:00+08:00"),
    declaredByEmployeeId: "emp-hr1",
    revokedAt: null,
    revokedByEmployeeId: null,
    revokeReason: null,
  };

  it("有效的認定（撤回三欄全空）通過", () => {
    expect(() => assertEmergencyDeclaration(ACTIVE)).not.toThrow();
  });

  it("完整的撤回通過", () => {
    expect(() =>
      assertEmergencyDeclaration({
        ...ACTIVE,
        revokedAt: new Date("2026-08-20T10:00:00+08:00"),
        revokedByEmployeeId: "emp-hr1",
        revokeReason: "主管機關退回，須重新報備",
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260820 - Julian) 三選二不行：半套撤回分不出是「撤回了」還是
   * 「某一欄漏填」，而那個差別決定的是「這份報備要不要重做」。
   */
  const REVOKED_AT = new Date("2026-08-20T10:00:00+08:00");
  /**
   * Info: (20260820 - Julian) 顯式標註成 tuple 陣列 —— 不標的話 TS 會把兩種型別
   * 推成聯集，`it.each` 的回呼參數就拿不到各自的型別。
   */
  const HALF_REVOCATIONS: readonly [
    string,
    Partial<IStorableEmergencyDeclaration>,
  ][] = [
    ["少了時點", { revokedByEmployeeId: "emp-hr1", revokeReason: "打錯了" }],
    ["少了撤回者", { revokedAt: REVOKED_AT, revokeReason: "打錯了" }],
    ["少了理由", { revokedAt: REVOKED_AT, revokedByEmployeeId: "emp-hr1" }],
    [
      "理由是空白字串",
      {
        revokedAt: REVOKED_AT,
        revokedByEmployeeId: "emp-hr1",
        revokeReason: "   ",
      },
    ],
  ];

  it.each(HALF_REVOCATIONS)("%s 擋下", (_label, patch) => {
    expect(() => assertEmergencyDeclaration({ ...ACTIVE, ...patch })).toThrow(
      OvertimeRequestInvariantError,
    );
  });

  it("歷史列的連結同樣走協定白名單", () => {
    expect(() =>
      assertEmergencyDeclaration({
        ...ACTIVE,
        reportUrl: "javascript:alert(1)",
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });
});
