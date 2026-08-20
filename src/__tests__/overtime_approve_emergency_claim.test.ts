import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260820 - Julian) 核准的原子 claim 必須包含 `isEmergency`（review 第 3 條）。
 *
 * ## 被修掉的交錯
 *
 * `approve` 在 service 的 `:258` 讀出這張單，到 `:318` 才用 `request.isEmergency`
 * 算分段，中間隔著 `assertMayDecide`、`buildApprovalContext` 與三次上限查詢。
 * HR 的 `declareEmergency` 只要求 `status = PENDING` —— 那段窗口對它完全敞開。
 *
 * 原本的 claim 條件只有 `status: PENDING`，於是：
 *
 * ```
 * 主管 approve 讀到 isEmergency=false
 *   → HR declareEmergency 成功（status 仍是 PENDING，它的條件通過）
 *   → 主管的交易 count === 1，把**普通級距**的分段寫進一張已標記為天災事變的單子
 * ```
 *
 * 結果是一筆兩邊對不起來的紀錄：單子說「已依 §32 IV 報備、應加倍發給」，
 * 分段說「平日前兩小時加給三分之一」，而補休批次與折現事件都已經照後者落地。
 * repository 的註解只擋得住反方向（「核准先、認定後」），而
 * service 的註解自己寫下了這個後果：「一張已經按普通級距算完錢的單子突然變成
 * 加倍發給，而分段早就寫好了」—— 那句話當時沒有任何執行者。
 *
 * ## 為什麼要用假的 prisma 而不是假的 repository
 *
 * 被測的東西就是 `where` 子句本身。假 repository 會把它整個換掉，
 * 於是「claim 有沒有帶 isEmergency」這個問題從測試裡消失（checklist §1.7）。
 * 這裡的替身停在 prisma 那一層，`where` 由替身**實際比對**。
 */

const row = {
  id: "ot-1",
  accountBookId: "book-1",
  status: "PENDING",
  isEmergency: false,
};

const created: { segments: unknown[] } = { segments: [] };

const matches = (where: Record<string, unknown>): boolean =>
  Object.entries(where).every(
    ([key, value]) => (row as Record<string, unknown>)[key] === value,
  );

jest.mock("@/lib/prisma", () => {
  const tx = {
    overtimeRequest: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          if (!matches(where)) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        },
      ),
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        matches(where) ? { status: row.status, isEmergency: row.isEmergency } : null,
      ),
    },
    overtimeSegment: {
      create: jest.fn(async ({ data }: { data: unknown }) => {
        created.segments.push(data);
        return { id: `seg-${created.segments.length}` };
      }),
    },
  };
  return {
    prisma: {
      ...tx,
      $transaction: async (fn: (client: unknown) => Promise<unknown>) => fn(tx),
    },
  };
});

import { overtimeRequestRepo } from "@/repositories/overtime_request.repo";
import { OvertimeRequestInvariantError } from "@/repositories/overtime_request_invariant";
import {
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import { OvertimeDecisionOutcome } from "@/interfaces/overtime";

const SHIFT_WINDOW_MS = Date.UTC(2026, 7, 15, 9, 0, 0);

const writeOf = (overrides: {
  isEmergencyAtDerivation: boolean;
  tier: OvertimePremiumTier;
}) => ({
  accountBookId: "book-1",
  requestId: "ot-1",
  employeeId: "emp-1",
  workDate: "2026-08-15",
  actorEmployeeId: "mgr-1",
  approvedMinutes: 60,
  recognizedMinutes: 60,
  evidenceBasis: OvertimeEvidenceBasis.MANUAL_DECLARATION,
  segments: [{ order: 0, tier: overrides.tier, minutes: 60 }],
  isEmergencyAtDerivation: overrides.isEmergencyAtDerivation,
  engineVersion: 1,
  invariant: {
    filingType: OvertimeFilingType.POST_HOC,
    status: OvertimeRequestStatus.APPROVED,
    submittedAtMs: SHIFT_WINDOW_MS + 3_600_000,
    shiftWindowStartMs: SHIFT_WINDOW_MS,
    requestedStartMinute: 1020,
    requestedEndMinute: 1080,
    approvedMinutes: 60,
    recognizedMinutes: 60,
  },
  compensatory: null,
  cashOut: null,
});

beforeEach(() => {
  row.status = "PENDING";
  row.isEmergency = false;
  created.segments = [];
});

describe("核准的 claim 帶著 isEmergency", () => {
  // Info: (20260820 - Julian) 對照組：沒有人動旗標時照常寫入（否則「一律擋」也會通過）
  it("旗標沒有變動時照常核准並寫入分段", async () => {
    const result = await overtimeRequestRepo.approve(
      writeOf({
        isEmergencyAtDerivation: false,
        tier: OvertimePremiumTier.WEEKDAY_FIRST_2H,
      }),
    );

    expect(result.outcome).toBe(OvertimeDecisionOutcome.DECIDED);
    expect(created.segments).toHaveLength(1);
    expect(row.status).toBe("APPROVED");
  });

  /**
   * Info: (20260820 - Julian) 交錯本身：service 算完之後、交易開始之前 HR 按下認定。
   *
   * 三個斷言缺一不可 —— 沒有寫入、狀態還停在 PENDING、且回的是
   * **重新分類**而不是已決行。只驗第一個的話，回一句「已決行」也會通過，
   * 而那會讓主管以為不用再管這張單。
   */
  it("旗標在核准過程中被改掉時不寫入，且回 RECLASSIFIED_TO_EMERGENCY", async () => {
    row.isEmergency = true; // Info: (20260820 - Julian) HR 在這一刻按下 §32 IV 認定

    const result = await overtimeRequestRepo.approve(
      writeOf({
        isEmergencyAtDerivation: false,
        tier: OvertimePremiumTier.WEEKDAY_FIRST_2H,
      }),
    );

    expect(result.outcome).toBe(
      OvertimeDecisionOutcome.RECLASSIFIED_TO_EMERGENCY,
    );
    expect(created.segments).toHaveLength(0);
    expect(row.status).toBe("PENDING");
  });

  /**
   * Info: (20260820 - Julian) 反方向的交錯：認定被撤掉了，加倍級距同樣不得落地。
   *
   * 這一條原本與上一條斷言同一個結局，於是「方向」在回傳值裡就消失了，
   * 而呼叫端的文案只講得出其中一個方向（review 第 4 輪第 3 條）。
   * 最後那個 `not.toBe` 是這條測試的重點：兩個方向若再度合流，它會紅。
   */
  it("依天災事變算好的分段，遇上旗標已翻回 false 時擋下並回 RECLASSIFIED_TO_ORDINARY", async () => {
    row.isEmergency = false;

    const result = await overtimeRequestRepo.approve(
      writeOf({
        isEmergencyAtDerivation: true,
        tier: OvertimePremiumTier.EMERGENCY_DOUBLE,
      }),
    );

    expect(result.outcome).toBe(
      OvertimeDecisionOutcome.RECLASSIFIED_TO_ORDINARY,
    );
    expect(created.segments).toHaveLength(0);
    expect(row.status).toBe("PENDING");
    expect(OvertimeDecisionOutcome.RECLASSIFIED_TO_ORDINARY).not.toBe(
      OvertimeDecisionOutcome.RECLASSIFIED_TO_EMERGENCY,
    );
  });

  /**
   * Info: (20260820 - Julian) 已決行與重新分類必須分得出來。
   * 兩者的下一步相反：一個是不用再管，一個是重新看過再按一次。
   */
  it("單子真的已被決行時回的是 ALREADY_REVIEWED", async () => {
    row.status = "REJECTED";

    const result = await overtimeRequestRepo.approve(
      writeOf({
        isEmergencyAtDerivation: false,
        tier: OvertimePremiumTier.WEEKDAY_FIRST_2H,
      }),
    );

    expect(result.outcome).toBe(OvertimeDecisionOutcome.ALREADY_REVIEWED);
  });

  /**
   * Info: (20260820 - Julian) 不變式擋在交易之外：級距與旗標不一致時，
   * 連那一次附條件更新都不會發出去。
   */
  it("旗標與級距不一致的參數在進入交易之前就被不變式擋下", async () => {
    await expect(
      overtimeRequestRepo.approve(
        writeOf({
          isEmergencyAtDerivation: false,
          tier: OvertimePremiumTier.EMERGENCY_DOUBLE,
        }),
      ),
    ).rejects.toBeInstanceOf(OvertimeRequestInvariantError);

    expect(row.status).toBe("PENDING");
    expect(created.segments).toHaveLength(0);
  });
});
