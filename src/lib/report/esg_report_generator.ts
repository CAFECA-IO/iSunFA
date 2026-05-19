import Decimal from "decimal.js";
import * as crypto from "crypto";
import {
  IEsgReport,
  IEsgReportItem,
  IEsgReportDetailedRecord,
} from "@/interfaces/esg_report";
import { IEsgRecordDetail } from "@/interfaces/esg";
import { MoneyUtil } from "@/lib/utils/money";

const ESG_CATEGORY_MAP: Record<string, "scope1" | "scope2" | "scope3"> = {
  SCOPE_1: "scope1",
  SCOPE_2: "scope2",
  SCOPE_3: "scope3",
};

export function generateEsgReport(esgRecords: IEsgRecordDetail[]): IEsgReport {
  const categoryMap = {
    scope1: new Map<string, { name: string; amount: Decimal }>(),
    scope2: new Map<string, { name: string; amount: Decimal }>(),
    scope3: new Map<string, { name: string; amount: Decimal }>(),
  };

  const categoryRecords = {
    scope1: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    scope2: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    scope3: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
  };

  let totalScope1 = MoneyUtil.toDecimal(0);
  let totalScope2 = MoneyUtil.toDecimal(0);
  let totalScope3 = MoneyUtil.toDecimal(0);

  esgRecords.forEach((record) => {
    const scopeKey = record.scope;
    const category = scopeKey ? ESG_CATEGORY_MAP[scopeKey] : undefined;

    if (!category) {
      throw new Error(
        `[ESG Integrity Violation] 發現無法對應範疇的碳排紀錄 (Record ID: ${record.id}, Scope: ${scopeKey})`,
      );
    }

    if (!record.activityType) {
      throw new Error(
        `[ESG Audit Error] 碳排紀錄缺少活動名稱，拒絕列入盤查 (Record ID: ${record.id})`,
      );
    }

    // Info: (20260518 - Tzuhan) [REFACTOR] 重新命名為 emissionDecimal，避免與 record.amount(活動數據) 產生語意混淆，並套用防腐層
    const emissionDecimal = MoneyUtil.toDecimal(record.emissions || 0);
    const name = record.activityType;

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 嚴格區分「0 碳排」與「缺乏係數 (null)」。
    // 透過 Nullish Coalescing (??) 保留 null。若強制給 0 會構成嚴重漂綠造假！
    const dbCoefficient = record.coefficient?.emissionFactor ?? null;

    const detailedRecord = {
      id: record.id,
      activityType: name,
      // Info: (20260518 - Tzuhan) 套用防腐層確保解析安全
      originalData: MoneyUtil.toDecimal(record.amount || 0).toString(),
      unit: record.unit || "",
      // Info: (20260518 - Tzuhan) 維持 Decimal 字串精度，防堵微量碳排截斷
      emissions: emissionDecimal.toString(),
      emissionFactor: dbCoefficient, // Info: (20260518 - Tzuhan) 忠實傳遞真理係數或 null
    };

    // Info: (20260512 - Tzuhan) 根據活動類型分流與高精度加總
    const map = categoryMap[category];
    const currentAmount = map.get(name)?.amount || MoneyUtil.toDecimal(0);
    map.set(name, { name, amount: currentAmount.plus(emissionDecimal) });

    if (category === "scope1") totalScope1 = totalScope1.plus(emissionDecimal);
    else if (category === "scope2")
      totalScope2 = totalScope2.plus(emissionDecimal);
    else if (category === "scope3")
      totalScope3 = totalScope3.plus(emissionDecimal);

    categoryRecords[category].push(detailedRecord);
  });

  const totalEmissions = totalScope1.plus(totalScope2).plus(totalScope3);

  const mapToArray = (
    map: Map<string, { name: string; amount: Decimal }>,
    baseTotal: Decimal,
    scopeName: string,
  ): IEsgReportItem[] => {
    return Array.from(map.entries())
      .map(([name, data]) => ({
        id: crypto
          .createHash("sha256")
          .update(`${scopeName}-${name}`)
          .digest("hex"),
        name: data.name,
        amount: data.amount.toString(),
        percentageOfScope: baseTotal.isZero()
          ? 0
          : data.amount.dividedBy(baseTotal).times(100).toNumber(),
      }))
      .sort((a, b) =>
        MoneyUtil.toDecimal(b.amount).comparedTo(MoneyUtil.toDecimal(a.amount)),
      );
  };

  const scope1Items = mapToArray(categoryMap.scope1, totalScope1, "scope1");
  const scope2Items = mapToArray(categoryMap.scope2, totalScope2, "scope2");
  const scope3Items = mapToArray(categoryMap.scope3, totalScope3, "scope3");

  const metrics = {
    totalEmissions: totalEmissions.toString(),
    scope1Proportion: totalEmissions.isZero()
      ? 0
      : totalScope1.dividedBy(totalEmissions).times(100).toNumber(),
    scope2Proportion: totalEmissions.isZero()
      ? 0
      : totalScope2.dividedBy(totalEmissions).times(100).toNumber(),
    scope3Proportion: totalEmissions.isZero()
      ? 0
      : totalScope3.dividedBy(totalEmissions).times(100).toNumber(),
  };

  const calculateRecords = (
    records: Omit<IEsgReportDetailedRecord, "percentage">[],
    scopeTotal: Decimal,
  ): IEsgReportDetailedRecord[] => {
    return records
      .map((record) => {
        // Info: (20260518 - Tzuhan) [AUDIT FIX] 暴露不合理數據 (若排放量不為 0 但原始數據為 0，直接拋錯)，使用防腐層驗證排放量
        if (
          MoneyUtil.toDecimal(record.originalData).isZero() &&
          !MoneyUtil.toDecimal(record.emissions).isZero()
        ) {
          throw new Error(
            `[ESG Audit Error] 發現憑空產生的碳排數據 (Record ID: ${record.id})`,
          );
        }

        return {
          ...record,
          percentage: scopeTotal.isZero()
            ? 0
            : MoneyUtil.toDecimal(record.emissions)
                .dividedBy(scopeTotal)
                .times(100)
                .toNumber(),
        };
      })
      .sort((a, b) =>
        MoneyUtil.toDecimal(b.emissions).comparedTo(
          MoneyUtil.toDecimal(a.emissions),
        ),
      );
  };

  return {
    sections: {
      scope1: {
        items: scope1Items,
        records: calculateRecords(categoryRecords.scope1, totalScope1),
        total: totalScope1.toString(),
      },
      scope2: {
        items: scope2Items,
        records: calculateRecords(categoryRecords.scope2, totalScope2),
        total: totalScope2.toString(),
      },
      scope3: {
        items: scope3Items,
        records: calculateRecords(categoryRecords.scope3, totalScope3),
        total: totalScope3.toString(),
      },
      grossEmissions: { total: totalEmissions.toString() },
    },
    metrics,
  };
}
