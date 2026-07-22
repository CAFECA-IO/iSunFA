// Info: (20260720 - Emily) #53 憑證聯動測試:映射精度、明示跳過、去重鍵、precomputed 直採
// Info: (20260720 - Emily) repo 以建構子注入 mock;@/lib/prisma 整模組 stub —
// Info: (20260720 - Emily) service 的 import 鏈(esg.repo/EmissionFactorRepo)會在載入時開真實 pg Pool
// Info: (20260720 - Emily) 注意:next/jest(SWC)只 hoist「全域 jest」的 jest.mock(見 carbon_access.test)

import { describe, it, expect } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import {
  CarbonEsgLinkService,
  CarbonEsgSkipReasonEnum,
} from "@/services/carbon_esg_link.service";
import type { esgRepo } from "@/repositories/esg.repo";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { CarbonCalculationService } from "@/services/carbon_calculation.service";
import { activityDedupeKey } from "@/lib/carbon_inventory";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import { IEsgRecordDetail } from "@/interfaces/esg";

const baseRecord = (
  overrides: Partial<IEsgRecordDetail>,
): IEsgRecordDetail => ({
  id: "esg-1",
  tradingDate: 1750000000,
  activityType: null,
  vendor: "台灣電力公司",
  amount: "2500000",
  unit: "度(kwh)",
  emissions: "1235000",
  scope: null,
  ghgProtocolCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
  intensity: null as unknown as IEsgRecordDetail["intensity"],
  analysisStatus: AIAnalysisStatus.COMPLETED,
  fileId: "file-1",
  aiNote: "",
  confidence: 0.95,
  isVerified: true,
  dqiScore: 4,
  coefficient: null,
  emissionSource: { id: "src-1", name: "外購電力" },
  journalId: "journal-1",
  voucherId: "voucher-1",
  ...overrides,
});

const buildService = (records: IEsgRecordDetail[]): CarbonEsgLinkService =>
  new CarbonEsgLinkService({
    getEsgRecords: async () => records,
  } as unknown as typeof esgRepo);

describe("CarbonEsgLinkService", () => {
  it("should map recognized records verbatim with the full evidence chain keys", async () => {
    const result = await buildService([baseRecord({})]).listBookActivities(
      "book-1",
    );
    expect(result.skipped).toHaveLength(0);
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({
      scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
      sourceName: "外購電力",
      quantity: "2500000",
      unit: MeasurementUnit.KWH,
      precomputedCo2eKg: "1235000",
      esgRecordId: "esg-1",
      voucherId: "voucher-1",
      journalId: "journal-1",
      fileId: "file-1",
      source: "voucher:voucher-1",
    });
  });

  it("should skip unmappable records with explicit reasons (never guess)", async () => {
    const result = await buildService([
      // Info: (20260720 - Emily) SCOPE_3 無子分類:15 類不可代猜
      baseRecord({
        id: "esg-2",
        ghgProtocolCategory: null,
        scope: "SCOPE_3" as IEsgRecordDetail["scope"],
      }),
      // Info: (20260720 - Emily) 單位無法正規化
      baseRecord({ id: "esg-3", unit: "桶" }),
      // Info: (20260720 - Emily) 分析未完成
      baseRecord({ id: "esg-4", analysisStatus: AIAnalysisStatus.PROCESSING }),
      // Info: (20260720 - Emily) SCOPE_1/2 無歧義,可由 scope 補位
      baseRecord({
        id: "esg-5",
        ghgProtocolCategory: null,
        scope: "SCOPE_1" as IEsgRecordDetail["scope"],
      }),
    ]).listBookActivities("book-1");

    expect(result.activities.map((a) => a.esgRecordId)).toEqual(["esg-5"]);
    expect(result.activities[0].scopeCategory).toBe(
      GhgProtocolCategory.SCOPE_1_DIRECT,
    );
    expect(result.skipped).toEqual([
      expect.objectContaining({
        esgRecordId: "esg-2",
        reason: CarbonEsgSkipReasonEnum.UNMAPPED_SCOPE,
      }),
      expect.objectContaining({
        esgRecordId: "esg-3",
        reason: CarbonEsgSkipReasonEnum.UNMAPPED_UNIT,
      }),
      expect.objectContaining({
        esgRecordId: "esg-4",
        reason: CarbonEsgSkipReasonEnum.NOT_COMPLETED,
      }),
    ]);
  });
});

describe("voucher-linked dedupe key", () => {
  it("should keep two identical-looking vouchers as two facts and stay idempotent on re-import", () => {
    const a = {
      scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
      sourceName: "外購電力",
      quantity: "1000",
      unit: MeasurementUnit.KWH,
      esgRecordId: "esg-a",
    };
    const b = { ...a, esgRecordId: "esg-b" };
    // Info: (20260720 - Emily) 同額同源的兩張憑證 = 兩筆事實(內容鍵會誤併)
    expect(activityDedupeKey(a)).not.toBe(activityDedupeKey(b));
    // Info: (20260720 - Emily) 同一憑證重新匯入 = 同一鍵(冪等)
    expect(activityDedupeKey(a)).toBe(activityDedupeKey({ ...a }));
  });
});

describe("CarbonCalculationService precomputed pass-through", () => {
  it("should adopt the voucher pipeline emissions without re-selecting a factor", async () => {
    // Info: (20260720 - Emily) lookup 若被呼叫即失敗:precomputed 紀錄嚴禁重選係數
    const service = new CarbonCalculationService({
      findFallbackCoefficientId: async () => {
        throw new Error("must not lookup for precomputed records");
      },
      getCoefficientById: async () => {
        throw new Error("must not lookup for precomputed records");
      },
    });
    const ledger = await service.computeLedger([
      {
        scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
        sourceName: "外購電力",
        quantity: "2,500,000",
        unit: MeasurementUnit.KWH,
        emissionFactor: "0.494",
        factorSource: "台電係數(台灣電力公司 2024)",
        esgRecordId: "esg-1",
        voucherId: "voucher-1",
        precomputedCo2eKg: "1235000",
      },
    ]);
    expect(ledger.pending).toHaveLength(0);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]).toMatchObject({
      co2eKg: "1235000",
      factor: expect.objectContaining({ value: "0.494" }),
      evidence: { esgRecordId: "esg-1", voucherId: "voucher-1" },
    });
    expect(ledger.totalCo2eKg).toBe("1235000");
  });
});
