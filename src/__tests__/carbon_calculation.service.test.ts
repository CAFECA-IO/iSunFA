// Info: (20260716 - Emily) 決定論 CO2e facade 測試(#6519):解析邊界、單位對齊、待補裁決、手算基準、冪等

import { describe, it, expect, jest } from "@jest/globals";
import {
  CarbonCalculationService,
  parseActivityQuantity,
  normalizeCoefficientUnit,
  IFactorLookup,
} from "@/services/carbon_calculation.service";
import { CarbonPendingReasonEnum } from "@/constants/carbon_calculation";
import {
  applyComputedLedger,
  createEmptyInventoryState,
  computeInventoryStep,
} from "@/lib/carbon_inventory";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import { IActivityRecord } from "@/types/carbon_chatbot.types";

describe("parseActivityQuantity", () => {
  it.each([
    ["1,200,000", "1200000"],
    ["１２３４．５", "1234.5"], // Info: (20260716 - Emily) 全形轉半形
    ["1 234 567", "1234567"],
    ["0", "0"],
  ])("should parse %p to %p", (raw, expected) => {
    expect(parseActivityQuantity(raw)).toBe(expected);
  });

  it.each([["約 1200 度"], ["-5"], ["1.2e6"], [""], ["很多"]])(
    "should reject %p (never guess)",
    (raw) => {
      expect(parseActivityQuantity(raw)).toBeNull();
    },
  );
});

describe("normalizeCoefficientUnit", () => {
  it("should map dictionary unit strings deterministically", () => {
    expect(normalizeCoefficientUnit("度(kwh)")).toBe(MeasurementUnit.KWH);
    expect(normalizeCoefficientUnit("公升(L)")).toBe(MeasurementUnit.LITER);
    expect(normalizeCoefficientUnit("公噸(mt)")).toBe(MeasurementUnit.TONNE);
    expect(normalizeCoefficientUnit("KWH")).toBe(MeasurementUnit.KWH);
    expect(normalizeCoefficientUnit("short ton")).toBeNull();
    expect(normalizeCoefficientUnit("包")).toBeNull();
  });
});

const electricity = (quantity = "1,200,000"): IActivityRecord => ({
  scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
  sourceName: "外購電力",
  quantity,
  unit: MeasurementUnit.KWH,
});

const buildLookup = (
  coefficient: {
    id: string;
    name: string;
    unit: string;
    emissionFactor: string;
    source: string;
    ghgFactors?: unknown;
  } | null,
): IFactorLookup => ({
  findFallbackCoefficientId: jest
    .fn<() => Promise<string | null>>()
    .mockResolvedValue(coefficient?.id ?? null),
  getCoefficientById: jest
    .fn<() => Promise<typeof coefficient>>()
    .mockResolvedValue(coefficient),
});

const TAIPOWER = {
  id: "moenv-grid-2024",
  name: "台灣電力排放係數",
  unit: "度(kwh)",
  emissionFactor: "0.494",
  source: "MOENV 2024",
};

describe("CarbonCalculationService.computeLedger", () => {
  it("should match the hand-calculated benchmark exactly (1,200,000 KWH x 0.494)", async () => {
    const service = new CarbonCalculationService(buildLookup(TAIPOWER));
    const ledger = await service.computeLedger([electricity()]);

    // Info: (20260716 - Emily) 手算基準:1200000 × 0.494 = 592800(Decimal 精確,無浮點誤差)
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].co2eKg).toBe("592800");
    expect(ledger.totalCo2eKg).toBe("592800");
    expect(
      ledger.scopeSubtotals[GhgProtocolCategory.SCOPE_2_INDIRECT],
    ).toBe("592800");
    // Info: (20260716 - Emily) 係數快照完整(#6521 稽核軌跡地基)
    expect(ledger.entries[0].factor).toMatchObject({
      factorId: "moenv-grid-2024",
      value: "0.494",
      source: "MOENV 2024",
    });
  });

  it("should convert units before multiplying (MWH activity vs kWh factor)", async () => {
    const service = new CarbonCalculationService(buildLookup(TAIPOWER));
    const ledger = await service.computeLedger([
      { ...electricity("1,200"), unit: MeasurementUnit.MWH },
    ]);
    // Info: (20260716 - Emily) 1200 MWH = 1,200,000 kWh → 同基準值
    expect(ledger.entries[0].convertedQuantity).toBe("1200000");
    expect(ledger.entries[0].co2eKg).toBe("592800");
  });

  it("should send to pending instead of guessing", async () => {
    // Info: (20260716 - Emily) a) 數量不可解析 b) 查無係數 c) 係數單位無法對齊(跨量綱)
    const noFactor = new CarbonCalculationService(buildLookup(null));
    const l1 = await noFactor.computeLedger([electricity()]);
    expect(l1.entries).toHaveLength(0);
    expect(l1.pending[0].reason).toBe(CarbonPendingReasonEnum.NO_FACTOR_MATCH);

    const service = new CarbonCalculationService(buildLookup(TAIPOWER));
    const l2 = await service.computeLedger([electricity("約一百萬度")]);
    expect(l2.pending[0].reason).toBe(
      CarbonPendingReasonEnum.UNPARSABLE_QUANTITY,
    );

    const massFactor = new CarbonCalculationService(
      buildLookup({ ...TAIPOWER, unit: "公斤(kg)" }),
    );
    const l3 = await massFactor.computeLedger([electricity()]);
    expect(l3.pending[0].reason).toBe(CarbonPendingReasonEnum.UNIT_MISMATCH);
    expect(l3.totalCo2eKg).toBe("0");
  });

  it("should be idempotent (same input, same output)", async () => {
    const service = new CarbonCalculationService(buildLookup(TAIPOWER));
    const input = [electricity(), electricity("800,000")];
    const a = await service.computeLedger(input);
    const b = await service.computeLedger(input);
    expect(a.entries).toEqual(b.entries);
    expect(a.totalCo2eKg).toBe(b.totalCo2eKg);
    expect(a.totalCo2eKg).toBe("988000"); // Info: (20260716 - Emily) 592800 + 395200
  });
});

describe("applyComputedLedger (state machine unlock)", () => {
  it("should backfill factors by activity key and advance to REVIEW", async () => {
    const service = new CarbonCalculationService(buildLookup(TAIPOWER));
    const state = createEmptyInventoryState();
    state.company = "CAFECA";
    state.year = 2025;
    state.boundaryApproach = "operational_control";
    state.activities = [
      electricity(),
      electricity("800,000"),
      electricity("500,000"),
    ];
    expect(computeInventoryStep(state)).toBe(
      CarbonInventoryStep.EMISSION_FACTORS,
    );

    const ledger = await service.computeLedger(state.activities);
    const next = applyComputedLedger(state, ledger);

    expect(next.activities.every((a) => a.emissionFactor === "0.494")).toBe(
      true,
    );
    // Info: (20260716 - Emily) 2,500,000 kWh × 0.494 = 1,235,000(= 592800 + 395200 + 247000)
    expect(next.computedLedger?.totalCo2eKg).toBe("1235000");
    // Info: (20260716 - Emily) 係數齊全 → EMISSION_FACTORS 完成 → REVIEW(其出口由 #6520 鎖住)
    expect(next.step).toBe(CarbonInventoryStep.REVIEW);
  });
});
