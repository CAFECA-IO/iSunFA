// Info: (20260716 - Emily) 決定論 CO2e 計算 facade(#6519):carbon chatbot 專用,無 voucher/tx 依賴
// Info: (20260716 - Emily) 重用既有引擎:EmissionFactorRepo(四軌降級+保守擇高,本 facade 為其首個正式呼叫端)、
// Info: (20260716 - Emily) UnitConverter(量綱守門)、EsgCalculatorService(單/多氣體+GWP)。
// Info: (20260716 - Emily) 鐵律:全程字串/Decimal 不經 number 中轉(ADR 003);無 LLM;無法裁決一律進待補清單(ADR 007)

import { MoneyUtil } from "@/lib/utils/money";
import { UnitConverter } from "@/lib/utils/unit_converter";
import {
  EsgCalculatorService,
  ICalculationResult,
} from "@/services/esg.calculator.service";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";
import { MeasurementUnit } from "@/constants/enums";
import {
  COEFFICIENT_UNIT_ALIASES,
  CarbonPendingReasonEnum,
} from "@/constants/carbon_calculation";
import { activityDedupeKey } from "@/lib/carbon_inventory";
import { parseActivityQuantity } from "@/lib/carbon_quantity";
import {
  IActivityRecord,
  IComputedLedger,
  IComputedLedgerEntry,
  IPendingLedgerEntry,
} from "@/types/carbon_chatbot.types";

// Info: (20260716 - Emily) 係數查詢介面(可注入 mock;預設接 EmissionFactorRepo 靜態方法)
export interface IFactorLookup {
  findFallbackCoefficientId(keyword: string): Promise<string | null>;
  getCoefficientById(id: string): Promise<{
    id: string;
    name: string;
    unit: string;
    // Info: (20260716 - Emily) 邊界收斂為字串(Decimal-as-string): facade 內全程不碰 number，杜絕浮點精度流失
    emissionFactor: string;
    source: string;
    ghgFactors?: unknown;
  } | null>;
}

const defaultFactorLookup: IFactorLookup = {
  // Info: (20260716 - Emily) chatbot 為個人模型無 accountBookId,傳空字串 → 租戶軌自然落空,官方/靜態軌照常
  findFallbackCoefficientId: (keyword) =>
    EmissionFactorRepo.findFallbackCoefficient(keyword, ""),
  // Info: (20260716 - Emily) 上游可能回 number(靜態字典)，於介面邊界一次性字串化，之後 facade 全程字串
  getCoefficientById: async (id) => {
    const coefficient = await EmissionFactorRepo.getCoefficientById(id);
    if (!coefficient) return null;
    return {
      ...coefficient,
      emissionFactor: String(coefficient.emissionFactor),
    };
  },
};

// Info: (20260720 - Emily) 數量解析抽至零依賴 lib(#6520 純邏輯呼叫端不得連動 prisma);
// Info: (20260720 - Emily) re-export 維持既有呼叫端不變
export { parseActivityQuantity };

// Info: (20260716 - Emily) 係數單位正規化:完整字串或括號內代碼比對別名表;無法正規化回 null
export const normalizeCoefficientUnit = (
  unit: string,
): MeasurementUnit | null => {
  const lowered = unit.trim().toLowerCase();
  if (COEFFICIENT_UNIT_ALIASES[lowered]) {
    return COEFFICIENT_UNIT_ALIASES[lowered];
  }
  const parenthetical = lowered.match(/[(（]([^)）]+)[)）]/)?.[1];
  if (parenthetical && COEFFICIENT_UNIT_ALIASES[parenthetical]) {
    return COEFFICIENT_UNIT_ALIASES[parenthetical];
  }
  // Info: (20260716 - Emily) MeasurementUnit 值本身(如活動數據的 "KWH")也接受
  const upper = unit.trim().toUpperCase();
  if ((Object.values(MeasurementUnit) as string[]).includes(upper)) {
    return upper as MeasurementUnit;
  }
  return null;
};

export class CarbonCalculationService {
  private readonly lookup: IFactorLookup;

  constructor(lookup: IFactorLookup = defaultFactorLookup) {
    this.lookup = lookup;
  }

  /**
   * Info: (20260716 - Emily) 計算總表(冪等:同輸入同輸出):
   * 逐筆 解析 → 選係數(擇高) → 單位換算 → CO2e;任一步無法裁決 → 待補清單。
   * 回傳含係數快照(factorId/value/source),供 #6521 稽核軌跡凍結。
   */
  async computeLedger(activities: IActivityRecord[]): Promise<IComputedLedger> {
    const entries: IComputedLedgerEntry[] = [];
    const pending: IPendingLedgerEntry[] = [];

    // Info: (20260716 - Emily) 循序處理維持結果順序決定性(筆數上限已由 validator 護欄)
    for (const activity of activities) {
      const activityKey = activityDedupeKey(activity);

      const parsedQuantity = parseActivityQuantity(activity.quantity);
      if (!parsedQuantity) {
        pending.push({
          activityKey,
          sourceName: activity.sourceName,
          reason: CarbonPendingReasonEnum.UNPARSABLE_QUANTITY,
        });
        continue;
      }

      // Info: (20260716 - Emily) 係數選取:findFallbackCoefficient 內建官方 DB → 靜態字典的
      // Info: (20260716 - Emily) 「保守擇高」(emissionFactor desc);查無 → 待補,嚴禁 LLM 或猜測補位
      const factorId = await this.lookup.findFallbackCoefficientId(
        activity.sourceName,
      );
      const coefficient = factorId
        ? await this.lookup.getCoefficientById(factorId)
        : null;
      if (!coefficient) {
        pending.push({
          activityKey,
          sourceName: activity.sourceName,
          reason: CarbonPendingReasonEnum.NO_FACTOR_MATCH,
        });
        continue;
      }

      // Info: (20260716 - Emily) 單位對齊:活動單位 → 係數單位;係數單位無法正規化或跨量綱 → 待補
      const factorUnit = normalizeCoefficientUnit(coefficient.unit);
      let convertedQuantity: string;
      if (factorUnit === activity.unit) {
        convertedQuantity = parsedQuantity;
      } else if (factorUnit) {
        try {
          convertedQuantity = UnitConverter.convert(
            parsedQuantity,
            activity.unit,
            factorUnit,
          ).toString();
        } catch {
          pending.push({
            activityKey,
            sourceName: activity.sourceName,
            reason: CarbonPendingReasonEnum.UNIT_MISMATCH,
          });
          continue;
        }
      } else {
        pending.push({
          activityKey,
          sourceName: activity.sourceName,
          reason: CarbonPendingReasonEnum.UNIT_MISMATCH,
        });
        continue;
      }

      // Info: (20260716 - Emily) 傳字串進 calculator,不經 number 中轉(修正 voucher 管線的 .toNumber() 風險)
      const result: ICalculationResult =
        EsgCalculatorService.calculateEmissions(convertedQuantity, {
          emissionFactor: coefficient.emissionFactor,
          ghgFactors: coefficient.ghgFactors,
        });

      entries.push({
        activityKey,
        scopeCategory: activity.scopeCategory,
        sourceName: activity.sourceName,
        quantityRaw: activity.quantity,
        convertedQuantity,
        convertedUnit: factorUnit,
        co2eKg: result.emissions,
        ghgBreakdown: result.ghgBreakdown,
        gwpVersion: result.gwpVersion,
        factor: {
          factorId: coefficient.id,
          name: coefficient.name,
          value: coefficient.emissionFactor,
          unit: coefficient.unit,
          source: coefficient.source,
        },
      });
    }

    // Info: (20260716 - Emily) 分 scope 小計與總計:MoneyUtil(decimal.js)累加,輸出字串
    const scopeSubtotals: Record<string, string> = {};
    entries.forEach((entry) => {
      const current = scopeSubtotals[entry.scopeCategory] ?? "0";
      scopeSubtotals[entry.scopeCategory] = MoneyUtil.add(
        current,
        entry.co2eKg,
      );
    });
    const totalCo2eKg = entries.reduce(
      (acc, entry) => MoneyUtil.add(acc, entry.co2eKg),
      "0",
    );

    return {
      entries,
      pending,
      scopeSubtotals,
      totalCo2eKg,
      computedAt: new Date().toISOString(),
    };
  }
}
