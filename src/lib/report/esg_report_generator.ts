import Decimal from "decimal.js";
import * as crypto from "crypto";
import {
  IEsgReport,
  IEsgReportItem,
  IEsgReportDetailedRecord,
} from "@/interfaces/esg_report";
import { IEsgRecordDetail } from "@/interfaces/esg";

// Info: (20260512 - Tzuhan) 定義映射字典，移除 if-else 硬編碼，未來可擴充 ISO Categories
const ESG_CATEGORY_MAP: Record<string, "scope1" | "scope2" | "scope3"> = {
  SCOPE_1: "scope1",
  SCOPE_2: "scope2",
  SCOPE_3: "scope3",
};

export function generateEsgReport(esgRecords: IEsgRecordDetail[]): IEsgReport {
  // Info: (20260512 - Tzuhan) 記錄每個 scope 裡各活動的加總
  const categoryMap = {
    scope1: new Map<string, { name: string; amount: Decimal }>(),
    scope2: new Map<string, { name: string; amount: Decimal }>(),
    scope3: new Map<string, { name: string; amount: Decimal }>(),
  };

  const categoryRecords = {
    scope1: [] as Omit<
      IEsgReportDetailedRecord,
      "coefficient" | "percentage"
    >[],
    scope2: [] as Omit<
      IEsgReportDetailedRecord,
      "coefficient" | "percentage"
    >[],
    scope3: [] as Omit<
      IEsgReportDetailedRecord,
      "coefficient" | "percentage"
    >[],
  };

  let totalScope1 = new Decimal(0);
  let totalScope2 = new Decimal(0);
  let totalScope3 = new Decimal(0);

  esgRecords.forEach((record) => {
    const scopeKey = record.scope;
    const category = scopeKey ? ESG_CATEGORY_MAP[scopeKey] : undefined;
    if (!category) return; // Info: (20260512 - Tzuhan) 忽略未定義的範疇

    const amount = new Decimal(record.emissions || 0);
    const name = record.activityType || "未分類排放";

    const detailedRecord = {
      id: record.id,
      activityType: name,
      originalData: Number(record.amount) || 0,
      unit: record.unit || "",
      emissions: amount.toNumber(),
    };

    // Info: (20260512 - Tzuhan) 根據活動類型分流與高精度加總
    const map = categoryMap[category];
    const currentAmount = map.get(name)?.amount || new Decimal(0);
    map.set(name, { name, amount: currentAmount.plus(amount) });

    if (category === "scope1") totalScope1 = totalScope1.plus(amount);
    else if (category === "scope2") totalScope2 = totalScope2.plus(amount);
    else if (category === "scope3") totalScope3 = totalScope3.plus(amount);

    categoryRecords[category].push(detailedRecord);
  });

  const totalEmissions = totalScope1.plus(totalScope2).plus(totalScope3);

  // Info: (20260512 - Tzuhan) 產生陣列並計算佔比
  const mapToArray = (
    map: Map<string, { name: string; amount: Decimal }>,
    baseTotal: Decimal,
    scopeName: string,
  ): IEsgReportItem[] => {
    return Array.from(map.entries())
      .map(([name, data]) => ({
        // Info: (20260512 - Tzuhan) 改用 Hash 取代 Buffer Base64，確保穩定且唯一
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
      .sort((a, b) => Number(b.amount) - Number(a.amount));
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
    records: Omit<IEsgReportDetailedRecord, "coefficient" | "percentage">[],
    scopeTotal: Decimal,
  ): IEsgReportDetailedRecord[] => {
    return records
      .map((record) => {
        // Info: (20260512 - Tzuhan) 修正除以零與漂綠漏洞
        const coeff =
          record.originalData !== 0
            ? new Decimal(record.emissions)
                .dividedBy(record.originalData)
                .toNumber()
            : null;

        return {
          ...record,
          coefficient: coeff,
          // Info: (20260512 - Tzuhan) 佔比分母修正為該範疇的加總 (scopeTotal)
          percentage: scopeTotal.isZero()
            ? 0
            : new Decimal(record.emissions)
                .dividedBy(scopeTotal)
                .times(100)
                .toNumber(),
        };
      })
      .sort((a, b) => b.emissions - a.emissions);
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
