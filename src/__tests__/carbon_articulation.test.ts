// Info: (20260720 - Tzuhan) #6520 質量守恆勾稽測試:等式邊界、損耗容差、單位換算、非庫存跳過、合理性區間
// Info: (20260720 - Tzuhan) 純決定性服務(無 DB/LLM),直接實例化,無需 mock

import { describe, it, expect } from "@jest/globals";
import { CarbonArticulationService } from "@/services/carbon_articulation.service";
import {
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
  ArticulationWarningReasonEnum,
} from "@/constants/carbon_articulation";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import {
  IActivityRecord,
  IMaterialStockRecord,
} from "@/types/carbon_chatbot.types";

const service = new CarbonArticulationService();

const dieselActivity = (
  quantity: string,
  unit = MeasurementUnit.LITER,
): IActivityRecord => ({
  scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
  sourceName: "柴油",
  quantity,
  unit,
});

const dieselStock = (
  opening: string,
  purchased: string,
  closing: string,
): IMaterialStockRecord => ({
  materialName: "柴油",
  openingQuantity: opening,
  purchasedQuantity: purchased,
  closingQuantity: closing,
  unit: MeasurementUnit.LITER,
});

describe("CarbonArticulationService mass conservation", () => {
  it("should freeze when consumption exceeds opening + purchased (Emily's acceptance case)", () => {
    // Info: (20260720 - Tzuhan) 期初 100L + 採購 50L,帳上消耗 200L → 缺口 50L 遠超 5% 容差
    const result = service.check(
      [dieselActivity("200")],
      [dieselStock("100", "50", "0")],
    );
    expect(result.status).toBe(ArticulationStatusEnum.VIOLATED);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({
      materialName: "柴油",
      reason: ArticulationViolationReasonEnum.MASS_GAP_EXCEEDS_TOLERANCE,
      expectedConsumption: "150",
      actualConsumption: "200",
      gap: "50",
    });
  });

  it("should pass when the gap is within the loss ratio tolerance", () => {
    // Info: (20260720 - Tzuhan) 預期消耗 1000L,帳上 960L → 缺口 40L = 4% < 5% 容差(合理損耗)
    const result = service.check(
      [dieselActivity("960")],
      [dieselStock("400", "700", "100")],
    );
    expect(result.status).toBe(ArticulationStatusEnum.PASSED);
    expect(result.violations).toHaveLength(0);
  });

  it("should violate exactly beyond the tolerance boundary and pass exactly on it", () => {
    // Info: (20260720 - Tzuhan) 預期 1000L,容差 50L:帳上 950L(缺口=50,邊界上)過;949L(缺口=51)不過
    const onBoundary = service.check(
      [dieselActivity("950")],
      [dieselStock("1000", "0", "0")],
    );
    expect(onBoundary.status).toBe(ArticulationStatusEnum.PASSED);

    const beyond = service.check(
      [dieselActivity("949")],
      [dieselStock("1000", "0", "0")],
    );
    expect(beyond.status).toBe(ArticulationStatusEnum.VIOLATED);
    expect(beyond.violations[0].gap).toBe("51");
  });

  it("should reject physically impossible closing stock (stock created from nothing)", () => {
    const result = service.check([], [dieselStock("100", "50", "200")]);
    expect(result.status).toBe(ArticulationStatusEnum.VIOLATED);
    expect(result.violations[0].reason).toBe(
      ArticulationViolationReasonEnum.NEGATIVE_EXPECTED_CONSUMPTION,
    );
  });

  it("should align units deterministically (stock in tonnes, consumption in kg)", () => {
    // Info: (20260720 - Tzuhan) 期初 2t + 採購 0 - 期末 1t = 預期 1t;帳上 1000kg = 1t → 精確守恆
    const stock: IMaterialStockRecord = {
      materialName: "重油",
      openingQuantity: "2",
      purchasedQuantity: "0",
      closingQuantity: "1",
      unit: MeasurementUnit.TONNE,
    };
    const activity: IActivityRecord = {
      scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
      sourceName: "重油",
      quantity: "1,000",
      unit: MeasurementUnit.KG,
    };
    const result = service.check([activity], [stock]);
    expect(result.status).toBe(ArticulationStatusEnum.PASSED);
  });

  it("should flag cross-dimension units as unverifiable (UNIT_MISMATCH)", () => {
    const result = service.check(
      [dieselActivity("100", MeasurementUnit.KWH)],
      [dieselStock("100", "0", "0")],
    );
    expect(result.status).toBe(ArticulationStatusEnum.VIOLATED);
    expect(result.violations[0].reason).toBe(
      ArticulationViolationReasonEnum.UNIT_MISMATCH,
    );
  });

  it("should be NOT_APPLICABLE without stock records (electricity-only inventory)", () => {
    const electricity: IActivityRecord = {
      scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
      sourceName: "外購電力",
      quantity: "1,200,000",
      unit: MeasurementUnit.KWH,
    };
    const result = service.check([electricity], []);
    expect(result.status).toBe(ArticulationStatusEnum.NOT_APPLICABLE);
    expect(result.violations).toHaveLength(0);
  });

  it("should require zero consumption when expected consumption is zero", () => {
    const result = service.check(
      [dieselActivity("10")],
      [dieselStock("100", "0", "100")],
    );
    expect(result.status).toBe(ArticulationStatusEnum.VIOLATED);
  });
});

describe("CarbonArticulationService plausibility (non-stockable)", () => {
  it("should warn but not freeze on implausible electricity usage (999 億度)", () => {
    const electricity: IActivityRecord = {
      scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
      sourceName: "外購電力",
      quantity: "99,900,000,000",
      unit: MeasurementUnit.KWH,
    };
    const result = service.check([electricity], []);
    // Info: (20260720 - Tzuhan) 超界僅警示:資料仍是事實(可能為集團級數據),不凍結
    expect(result.status).toBe(ArticulationStatusEnum.NOT_APPLICABLE);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      sourceName: "外購電力",
      reason: ArticulationWarningReasonEnum.QUANTITY_EXCEEDS_PLAUSIBLE_MAX,
    });
  });

  it("should not warn for plausible quantities and skip stockable units", () => {
    const result = service.check(
      [
        {
          scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
          sourceName: "外購電力",
          quantity: "1,200,000",
          unit: MeasurementUnit.KWH,
        },
        // Info: (20260720 - Tzuhan) 庫存類單位不跑合理性(由守恆檢核把關)
        dieselActivity("999999999999"),
      ],
      [],
    );
    expect(result.warnings).toHaveLength(0);
  });
});
