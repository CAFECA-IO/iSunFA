// Info: (20260716 - Tzuhan) 盤查狀態帳本引擎測試(#6518):merge 去重、組織欄位不覆蓋、狀態機推進、白名單裁決

import { describe, it, expect } from "@jest/globals";
import {
  createEmptyInventoryState,
  mergeInventoryExtraction,
  computeInventoryStep,
  describeInventoryStep,
  applyComputedLedger,
  CARBON_INVENTORY_MIN_ACTIVITY_RECORDS,
} from "@/lib/carbon_inventory";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import {
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
} from "@/constants/carbon_articulation";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import {
  CarbonActivityRecordSchema,
  CarbonInventoryExtractionSchema,
} from "@/validators";
import { LedgerProvenanceEnum } from "@/constants/imported_quantity";
import {
  IActivityRecord,
  ICarbonInventoryState,
  IComputedLedger,
  IComputedLedgerEntry,
} from "@/types/carbon_chatbot.types";

const electricity = (quantity = "1,200,000"): IActivityRecord => ({
  scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
  sourceName: "外購電力",
  quantity,
  unit: MeasurementUnit.KWH,
});

describe("mergeInventoryExtraction", () => {
  it("should add activities and dedupe identical records across merges", () => {
    const s0 = createEmptyInventoryState();
    const m1 = mergeInventoryExtraction(
      s0,
      { activities: [electricity()] },
      "電費單.pdf",
    );
    expect(m1.addedCount).toBe(1);
    expect(m1.state.activities[0].source).toBe("電費單.pdf");

    // Info: (20260716 - Tzuhan) 同排放源+數量+單位+範疇 = 同一筆；重傳不重複記帳
    const m2 = mergeInventoryExtraction(m1.state, {
      activities: [electricity()],
    });
    expect(m2.addedCount).toBe(0);
    expect(m2.state.activities).toHaveLength(1);

    // Info: (20260716 - Tzuhan) 數量不同 = 不同筆
    const m3 = mergeInventoryExtraction(m2.state, {
      activities: [electricity("800,000")],
    });
    expect(m3.addedCount).toBe(1);
    expect(m3.state.activities).toHaveLength(2);
  });

  it("should fill org fields only when empty (manual confirmation wins)", () => {
    const s0 = createEmptyInventoryState();
    const m1 = mergeInventoryExtraction(s0, {
      company: "CAFECA",
      year: 2025,
      activities: [],
    });
    expect(m1.state.company).toBe("CAFECA");

    const m2 = mergeInventoryExtraction(m1.state, {
      company: "別家公司",
      year: 2020,
      activities: [],
    });
    expect(m2.state.company).toBe("CAFECA");
    expect(m2.state.year).toBe(2025);
  });
});

describe("computeInventoryStep (deterministic state machine)", () => {
  it("should advance strictly in order and never skip on missing prerequisites", () => {
    const s = createEmptyInventoryState();
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ORG_PROFILE);

    s.company = "CAFECA";
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ORG_PROFILE);
    s.year = 2025;
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ORG_BOUNDARY);

    s.boundaryApproach = "operational_control";
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.EMISSION_SOURCES);

    s.activities = [electricity()];
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ACTIVITY_DATA);

    // Info: (20260716 - Tzuhan) 達到最低筆數門檻 → 推進到係數對應(其出口由 #6519 解鎖)
    s.activities = Array.from(
      { length: CARBON_INVENTORY_MIN_ACTIVITY_RECORDS },
      (_, i) => electricity(`${i + 1}00`),
    );
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.EMISSION_FACTORS);

    // Info: (20260716 - Tzuhan) 全部有係數 → REVIEW
    s.activities = s.activities.map((a) => ({ ...a, emissionFactor: "0.495" }));
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.REVIEW);

    // Info: (20260720 - Tzuhan) #6520 REVIEW 出口:計算總表無待補 + 守恆勾稽非違反 → COMPLETED
    const passedLedger = {
      entries: [],
      pending: [],
      scopeSubtotals: {},
      totalCo2eKg: "0",
      computedAt: new Date().toISOString(),
    };
    s.computedLedger = {
      ...passedLedger,
      articulation: {
        status: ArticulationStatusEnum.VIOLATED,
        violations: [
          {
            materialName: "柴油",
            unit: MeasurementUnit.LITER,
            reason: ArticulationViolationReasonEnum.MASS_GAP_EXCEEDS_TOLERANCE,
            expectedConsumption: "150",
            actualConsumption: "200",
            gap: "50",
          },
        ],
        warnings: [],
        checkedAt: new Date().toISOString(),
      },
    };
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.REVIEW);

    s.computedLedger = {
      ...passedLedger,
      articulation: {
        status: ArticulationStatusEnum.PASSED,
        violations: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      },
    };
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.COMPLETED);
  });

  it("should merge stock records with dedupe and surface violation facts to the persona", () => {
    const s0 = createEmptyInventoryState();
    const stock = {
      materialName: "柴油",
      openingQuantity: "100",
      purchasedQuantity: "50",
      closingQuantity: "0",
      unit: MeasurementUnit.LITER,
    };
    const m1 = mergeInventoryExtraction(s0, {
      activities: [],
      stockRecords: [stock],
    });
    expect(m1.addedCount).toBe(1);
    expect(m1.state.stockRecords).toHaveLength(1);

    // Info: (20260720 - Tzuhan) 同物料+單位 = 同一筆,後到的萃取不覆蓋
    const m2 = mergeInventoryExtraction(m1.state, {
      activities: [],
      stockRecords: [{ ...stock, openingQuantity: "999" }],
    });
    expect(m2.addedCount).toBe(0);
    expect(m2.state.stockRecords?.[0].openingQuantity).toBe("100");

    // Info: (20260720 - Tzuhan) 守恆違反 → persona 描述附等式事實(TS 產生,LLM 只措辭)
    const violated = {
      ...m2.state,
      computedLedger: {
        entries: [],
        pending: [],
        scopeSubtotals: {},
        totalCo2eKg: "0",
        computedAt: new Date().toISOString(),
        articulation: {
          status: ArticulationStatusEnum.VIOLATED,
          violations: [
            {
              materialName: "柴油",
              unit: MeasurementUnit.LITER,
              reason:
                ArticulationViolationReasonEnum.MASS_GAP_EXCEEDS_TOLERANCE,
              expectedConsumption: "150",
              actualConsumption: "200",
              gap: "50",
            },
          ],
          warnings: [],
          checkedAt: new Date().toISOString(),
        },
      },
    };
    const description = describeInventoryStep(violated);
    expect(description).toContain("質量守恆勾稽違反");
    expect(description).toContain("缺口=50");
  });

  it("should describe missing prerequisites for the persona", () => {
    const s = createEmptyInventoryState();
    const description = describeInventoryStep(s);
    expect(description).toContain(CarbonInventoryStep.ORG_PROFILE);
    expect(description).toContain("企業名稱");
  });
});

describe("inventory validators (whitelist guardrails)", () => {
  it("should reject activities with units or scopes outside the enums", () => {
    expect(
      CarbonActivityRecordSchema.safeParse({
        scopeCategory: "SCOPE_9_MADE_UP",
        sourceName: "外購電力",
        quantity: "100",
        unit: MeasurementUnit.KWH,
      }).success,
    ).toBe(false);
    expect(
      CarbonActivityRecordSchema.safeParse({
        scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
        sourceName: "外購電力",
        quantity: "100",
        unit: "斤",
      }).success,
    ).toBe(false);
  });

  it("should keep quantity as a raw string and coerce year deterministically", () => {
    const parsed = CarbonInventoryExtractionSchema.safeParse({
      company: "CAFECA",
      year: "2025",
      activities: [electricity("1,234.5")],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.year).toBe(2025);
      expect(parsed.data.activities[0].quantity).toBe("1,234.5");
    }
    // Info: (20260716 - Tzuhan) 年度合理性邊界
    expect(
      CarbonInventoryExtractionSchema.safeParse({ year: "1024" }).success,
    ).toBe(false);
  });
});

/**
 * Info: (20260805 - Luphia) applyComputedLedger 必須讓匯入項目跨重算存活。
 * 這一組的存在理由是一個實際會發生的順序:confirmPendingImport 先送出活動、
 * 再寫入表3.8 的分錄;活動簽章一變就觸發 /calculate,而 /calculate 只認得
 * 憑證/活動算出來的項目 —— 回應整包蓋回來時,匯入的分錄不能一起被沖掉。
 *
 * 為什麼這件事值得一組獨立測試:失敗的表現是「報告寫著已寫入帳本,帳本卻是空的」。
 * 那不是資料遺失,是報告在說謊,而總量看起來仍然合理,沒有人會發現。
 */
describe("applyComputedLedger — imported entries survive recalculation", () => {
  const computedEntry = (): IComputedLedgerEntry => ({
    activityKey: "esg|voucher-1",
    scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
    sourceName: "外購電力",
    quantityRaw: "2,500,000",
    convertedQuantity: "2500000",
    convertedUnit: MeasurementUnit.KWH,
    co2eKg: "1235000",
    factor: {
      factorId: "f1",
      name: "台電電力係數",
      value: "0.494",
      unit: "度(kwh)",
      source: "台灣電力公司 2024",
    },
  });

  const importedEntry = (
    activityKey = "imported:LOCATION:(1) 總公司:1.1",
    co2eKg = "2591861.5",
  ): IComputedLedgerEntry => ({
    activityKey,
    scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
    sourceName: "1.1 固定式燃燒",
    quantityRaw: "—",
    convertedQuantity: co2eKg,
    convertedUnit: MeasurementUnit.KG,
    co2eKg,
    provenance: LedgerProvenanceEnum.IMPORTED,
    factor: {
      factorId: "imported",
      name: "不適用(原文照錄)",
      value: "—",
      unit: "—",
      source: "表3.8",
    },
  });

  const serverLedger = (): IComputedLedger => ({
    entries: [computedEntry()],
    pending: [],
    scopeSubtotals: { [GhgProtocolCategory.SCOPE_2_INDIRECT]: "1235000" },
    totalCo2eKg: "1235000",
    computedAt: "2026-08-05T00:00:00.000Z",
  });

  const stateWithImported = (
    imported: IComputedLedgerEntry[],
  ): ICarbonInventoryState => ({
    ...createEmptyInventoryState(),
    computedLedger: {
      entries: imported,
      pending: [],
      scopeSubtotals: {},
      totalCo2eKg: "0",
      computedAt: "2026-08-04T00:00:00.000Z",
    },
  });

  it("should preserve imported entries when /calculate returns a computed-only ledger", () => {
    const next = applyComputedLedger(
      stateWithImported([importedEntry()]),
      serverLedger(),
    );
    const keys = next.computedLedger?.entries.map((e) => e.activityKey) ?? [];
    // Info: (20260805 - Luphia) 兩者並存:伺服端算的與原文照錄的都在
    expect(keys).toContain("esg|voucher-1");
    expect(keys).toContain("imported:LOCATION:(1) 總公司:1.1");
  });

  it("should recompute subtotals and total over the merged entry set", () => {
    const next = applyComputedLedger(
      stateWithImported([importedEntry()]),
      serverLedger(),
    );
    // Info: (20260805 - Luphia) 1235000 + 2591861.5,以字串 Decimal 精確相加(禁止原生浮點)
    expect(next.computedLedger?.totalCo2eKg).toBe("3826861.5");
    expect(
      next.computedLedger?.scopeSubtotals[GhgProtocolCategory.SCOPE_1_DIRECT],
    ).toBe("2591861.5");
    expect(
      next.computedLedger?.scopeSubtotals[GhgProtocolCategory.SCOPE_2_INDIRECT],
    ).toBe("1235000");
  });

  it("should let the server win when both sides carry the same activityKey", () => {
    const collide = importedEntry("esg|voucher-1", "999");
    const next = applyComputedLedger(
      stateWithImported([collide]),
      serverLedger(),
    );
    expect(next.computedLedger?.entries).toHaveLength(1);
    expect(next.computedLedger?.entries[0].co2eKg).toBe("1235000");
    // Info: (20260805 - Luphia) 同鍵不得同時存在,否則同一筆排放被算兩次
    expect(next.computedLedger?.totalCo2eKg).toBe("1235000");
  });

  it("should return the server ledger untouched when there is nothing imported to keep", () => {
    const next = applyComputedLedger(
      stateWithImported([computedEntry()]),
      serverLedger(),
    );
    // Info: (20260805 - Luphia) 沒有 IMPORTED 就不該有任何額外行為(既有憑證路徑零影響)
    expect(next.computedLedger).toEqual(serverLedger());
  });

  it("should keep the server articulation verdict as-is", () => {
    const ledger: IComputedLedger = {
      ...serverLedger(),
      articulation: {
        status: ArticulationStatusEnum.PASSED,
        violations: [],
        warnings: [],
        checkedAt: "2026-08-05T00:00:00.000Z",
      },
    };
    const next = applyComputedLedger(
      stateWithImported([importedEntry()]),
      ledger,
    );
    /**
     * Info: (20260805 - Luphia) 質量守恆勾稽是對活動數據的期初+採購=消耗+期末做的,
     * 匯入項目只有最終 CO2e、沒有庫存流量,本來就不在該檢查範圍內 ——
     * 故此處刻意不重算也不清空,並以測試把這個決定釘住。
     */
    expect(next.computedLedger?.articulation?.status).toBe(
      ArticulationStatusEnum.PASSED,
    );
  });
});
