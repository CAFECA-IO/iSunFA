import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260820 - Julian) 撤回這條路徑要**實際走過** `assertEmergencyDeclaration`
 * （review 第 4 輪第 4 條）。
 *
 * ## 被修掉的空缺
 *
 * `assertEmergencyDeclaration` 是為了「撤回三欄同生共死」寫的，schema 也寫著
 * 「由 `assertEmergencyDeclaration` 雙向擋」。但它上線時只有一個產品呼叫端
 * （`declareEmergency`），而那一端傳的是三個字面 `null` —— 撤回三欄的分支
 * **一個產品呼叫端都沒有**。現有測試直接呼叫函式本身，所以無論
 * `revokeEmergency` 有沒有接上都是綠的（checklist §1.7）。
 *
 * ## 為什麼替身停在 prisma 那一層
 *
 * 被測的問題是「`revokeEmergency` 有沒有把那道判準接上去」。假 repository 會把
 * 整支方法換掉，問題就從測試裡消失了。這裡的替身停在 prisma，
 * `revokeEmergency` 的每一行都真的執行。
 */

const row = {
  id: "ot-1",
  accountBookId: "book-1",
  status: "PENDING",
  isEmergency: true,
};

/** Info: (20260820 - Julian) 有效的那一列（`revokedAt: null`）；null 表歷史表裡沒有 */
let activeDeclaration: {
  reportUrl: string;
  reportedAt: Date;
  declaredByEmployeeId: string;
} | null = null;

const declarationWrites: Record<string, unknown>[] = [];

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
      findFirst: jest.fn(async () => ({
        status: row.status,
        isEmergency: row.isEmergency,
      })),
    },
    overtimeEmergencyDeclaration: {
      findFirst: jest.fn(async () => activeDeclaration),
      updateMany: jest.fn(
        async ({ data }: { data: Record<string, unknown> }) => {
          declarationWrites.push(data);
          return { count: 1 };
        },
      ),
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
import { OvertimeDecisionOutcome } from "@/interfaces/overtime";

const REPORTED_AT = new Date("2026-08-15T11:00:00+08:00");
const REVOKED_AT = new Date("2026-08-16T09:00:00+08:00");

const revokeOf = (overrides: Partial<{ revokeReason: string }> = {}) => ({
  accountBookId: "book-1",
  requestId: "ot-1",
  revokedByEmployeeId: "hr-1",
  revokedAt: REVOKED_AT,
  revokeReason: "主管機關退回報備",
  ...overrides,
});

beforeEach(() => {
  row.status = "PENDING";
  row.isEmergency = true;
  activeDeclaration = {
    reportUrl: "https://example.gov.tw/filing/1",
    reportedAt: REPORTED_AT,
    declaredByEmployeeId: "hr-0",
  };
  declarationWrites.length = 0;
});

describe("revokeEmergency 走的是同一道判準", () => {
  /**
   * Info: (20260820 - Julian) 對照組。少了它，下面兩條「一律擋」也會通過。
   */
  it("三欄齊全時撤回成功，且三欄一起補在歷史列上", async () => {
    const outcome = await overtimeRequestRepo.revokeEmergency(revokeOf());

    expect(outcome).toBe(OvertimeDecisionOutcome.DECIDED);
    expect(row.isEmergency).toBe(false);
    expect(declarationWrites).toHaveLength(1);
    expect(declarationWrites[0]).toEqual({
      revokedAt: REVOKED_AT,
      revokedByEmployeeId: "hr-1",
      revokeReason: "主管機關退回報備",
    });
  });

  /**
   * Info: (20260820 - Julian) 這一條是本檔的紅線。
   *
   * 空白理由是「半套撤回」裡唯一還能通過型別檢查的那一種，因此它是
   * 「判準有沒有真的接上」的探針。`revokeEmergency` 若退回成直接
   * `updateMany`，這條會綠著讓一筆沒有理由的撤回落地。
   *
   * 只斷言「有丟例外」不夠：也要斷言**歷史列沒有被寫**。否則一個先寫再擋的
   * 實作同樣會丟例外，而它已經留下了半套資料。
   *
   * 旗標本身回到 `true` 是 `$transaction` 回滾做的，不是這支替身做的 ——
   * 這裡不假裝驗得到那件事。
   */
  it("理由留白時由不變式擋下，且歷史列一個字都沒寫", async () => {
    await expect(
      overtimeRequestRepo.revokeEmergency(revokeOf({ revokeReason: "   " })),
    ).rejects.toBeInstanceOf(OvertimeRequestInvariantError);

    expect(declarationWrites).toHaveLength(0);
  });

  /**
   * Info: (20260820 - Julian) 旗標說「認定中」、歷史表卻沒有那一列。
   * 放行的話會撤回一份沒有任何痕跡的認定：勞動檢查時既看不到報備、
   * 也看不到撤回。
   */
  it("找不到有效的認定列時擋下，不留半套狀態", async () => {
    activeDeclaration = null;

    await expect(
      overtimeRequestRepo.revokeEmergency(revokeOf()),
    ).rejects.toBeInstanceOf(OvertimeRequestInvariantError);

    expect(declarationWrites).toHaveLength(0);
  });

  /**
   * Info: (20260820 - Julian) 撤回一份不存在的認定不是成功，是落空。
   * 這一條同時確認上面那條「找不到歷史列就擋」沒有把它蓋掉。
   */
  it("旗標本來就是 false 時回 NOT_DECLARED，不是例外", async () => {
    row.isEmergency = false;

    const outcome = await overtimeRequestRepo.revokeEmergency(revokeOf());

    expect(outcome).toBe(OvertimeDecisionOutcome.NOT_DECLARED);
    expect(declarationWrites).toHaveLength(0);
  });
});
