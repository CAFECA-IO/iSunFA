// Info: (20260720 - Emily) 質量守恆勾稽護欄(#6520 / issue 22):純決定性檢核,無 LLM、無 DB、無狀態
// Info: (20260720 - Emily) 等式:期初庫存 + 本期採購 = 本期投入(消耗) + 期末庫存(± LOSS_RATIO_TOLERANCE)
// Info: (20260720 - Emily) 哲學:violation 不擋資料入帳(資料仍是事實),但凍結報告數據段落並讓費思追問;
// Info: (20260720 - Emily) 非庫存類(電力/運輸)改跑合理性區間,超界僅警示(可能是集團級數據,不武斷凍結)
// Info: (20260720 - Emily) 全程 Decimal 字串經 MoneyUtil,不經 number 中轉(ADR 003)

import { MoneyUtil } from "@/lib/utils/money";
import { UnitConverter } from "@/lib/utils/unit_converter";
import { MeasurementUnit } from "@/constants/enums";
import {
  LOSS_RATIO_TOLERANCE,
  STOCKABLE_UNITS,
  PLAUSIBILITY_MAX_BY_UNIT,
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
  ArticulationWarningReasonEnum,
} from "@/constants/carbon_articulation";
import { parseActivityQuantity } from "@/services/carbon_calculation.service";
import { activityDedupeKey } from "@/lib/carbon_inventory";
import {
  IActivityRecord,
  IMaterialStockRecord,
  IArticulationResult,
  IArticulationViolation,
  IArticulationWarning,
} from "@/types/carbon_chatbot.types";

// Info: (20260720 - Emily) 物料名稱決定性正規化:去空白 + 小寫(庫存紀錄 ↔ 活動數據的對齊鍵)
export const normalizeMaterialName = (name: string): string =>
  name.trim().toLowerCase();

// Info: (20260720 - Emily) 單位是否屬可盤點物料(質量/體積)
export const isStockableUnit = (unit: string): boolean =>
  (STOCKABLE_UNITS as string[]).includes(unit);

export class CarbonArticulationService {
  /**
   * Info: (20260720 - Emily) 全量勾稽(冪等:同輸入同輸出):
   * 1. 每筆庫存紀錄執行守恆等式檢核(消耗側 = 同名活動數據加總,單位經 UnitConverter 對齊)
   * 2. 非庫存類活動跑合理性區間(警示不凍結)
   * 任一數值無法決定性解析/對齊 → violation(無法驗證即不可放行,Fail Fast)
   */
  check(
    activities: IActivityRecord[],
    stockRecords: IMaterialStockRecord[],
  ): IArticulationResult {
    const violations: IArticulationViolation[] = [];
    stockRecords.forEach((record) => {
      const violation = this.checkConservation(record, activities);
      if (violation) violations.push(violation);
    });

    const warnings = this.checkPlausibility(activities);

    let status: ArticulationStatusEnum;
    if (violations.length > 0) {
      status = ArticulationStatusEnum.VIOLATED;
    } else if (stockRecords.length === 0) {
      // Info: (20260720 - Emily) 純電力/運輸盤查無庫存紀錄屬合法情境:不適用而非未通過
      status = ArticulationStatusEnum.NOT_APPLICABLE;
    } else {
      status = ArticulationStatusEnum.PASSED;
    }

    return {
      status,
      violations,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Info: (20260720 - Emily) 單筆守恆檢核。回傳 null = 通過(含容差內損耗);非 null = violation。
   * 預期消耗 = 期初 + 採購 - 期末;實際消耗 = 正規化同名活動數據換算至庫存單位後加總。
   */
  private checkConservation(
    record: IMaterialStockRecord,
    activities: IActivityRecord[],
  ): IArticulationViolation | null {
    const base: Pick<IArticulationViolation, "materialName" | "unit"> = {
      materialName: record.materialName,
      unit: record.unit,
    };

    const opening = parseActivityQuantity(record.openingQuantity);
    const purchased = parseActivityQuantity(record.purchasedQuantity);
    const closing = parseActivityQuantity(record.closingQuantity);
    if (!opening || !purchased || !closing) {
      return {
        ...base,
        reason: ArticulationViolationReasonEnum.UNPARSABLE_QUANTITY,
        expectedConsumption: "0",
        actualConsumption: "0",
        gap: "0",
      };
    }

    // Info: (20260720 - Emily) 期末 > 期初+採購 → 庫存無中生有,物理不可能,直接凍結
    const expected = MoneyUtil.subtract(MoneyUtil.add(opening, purchased), closing);
    if (MoneyUtil.isNegative(expected)) {
      return {
        ...base,
        reason: ArticulationViolationReasonEnum.NEGATIVE_EXPECTED_CONSUMPTION,
        expectedConsumption: expected,
        actualConsumption: "0",
        gap: MoneyUtil.abs(expected),
      };
    }

    // Info: (20260720 - Emily) 消耗側加總:同名活動(正規化比對)換算至庫存單位;跨量綱 = 無法驗證 → 凍結
    const targetName = normalizeMaterialName(record.materialName);
    const matched = activities.filter(
      (a) => normalizeMaterialName(a.sourceName) === targetName,
    );
    let actual = "0";
    for (const activity of matched) {
      const parsed = parseActivityQuantity(activity.quantity);
      if (!parsed) {
        // Info: (20260720 - Emily) 消耗數值無法解析:計算引擎已列待補,守恆側視為無法驗證
        return {
          ...base,
          reason: ArticulationViolationReasonEnum.UNPARSABLE_QUANTITY,
          expectedConsumption: expected,
          actualConsumption: actual,
          gap: expected,
        };
      }
      if (activity.unit === record.unit) {
        actual = MoneyUtil.add(actual, parsed);
      } else {
        try {
          actual = MoneyUtil.add(
            actual,
            UnitConverter.convert(parsed, activity.unit, record.unit).toString(),
          );
        } catch {
          return {
            ...base,
            reason: ArticulationViolationReasonEnum.UNIT_MISMATCH,
            expectedConsumption: expected,
            actualConsumption: actual,
            gap: expected,
          };
        }
      }
    }

    // Info: (20260720 - Emily) 缺口 ≤ 預期消耗 × 損耗容差 → 合理損耗放行;預期為 0 時實際也必須為 0
    const gap = MoneyUtil.abs(MoneyUtil.subtract(expected, actual));
    const tolerance = MoneyUtil.multiply(expected, LOSS_RATIO_TOLERANCE);
    const withinTolerance = MoneyUtil.toDecimal(gap).lte(
      MoneyUtil.toDecimal(tolerance),
    );
    if (withinTolerance) return null;

    return {
      ...base,
      reason: ArticulationViolationReasonEnum.MASS_GAP_EXCEEDS_TOLERANCE,
      expectedConsumption: expected,
      actualConsumption: actual,
      gap,
    };
  }

  // Info: (20260720 - Emily) 非庫存類合理性區間:超出物理量級邊界僅警示(per unit 常數;無法解析者交由計算引擎待補)
  private checkPlausibility(
    activities: IActivityRecord[],
  ): IArticulationWarning[] {
    const warnings: IArticulationWarning[] = [];
    activities.forEach((activity) => {
      if (isStockableUnit(activity.unit)) return;
      const plausibleMax =
        PLAUSIBILITY_MAX_BY_UNIT[activity.unit as MeasurementUnit];
      if (!plausibleMax) return;
      const parsed = parseActivityQuantity(activity.quantity);
      if (!parsed) return;
      if (MoneyUtil.toDecimal(parsed).gt(MoneyUtil.toDecimal(plausibleMax))) {
        warnings.push({
          activityKey: activityDedupeKey(activity),
          sourceName: activity.sourceName,
          reason: ArticulationWarningReasonEnum.QUANTITY_EXCEEDS_PLAUSIBLE_MAX,
          quantity: parsed,
          plausibleMax,
          unit: activity.unit,
        });
      }
    });
    return warnings;
  }
}
