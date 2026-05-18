import Decimal from "decimal.js";
import * as crypto from "crypto";
import {
  IEsgReport,
  IEsgReportItem,
  IEsgReportDetailedRecord,
} from "@/interfaces/esg_report";
import { IEsgRecordDetail } from "@/interfaces/esg";
import { MoneyUtil } from "@/lib/utils/money";

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

  // Info: (20260518 - Tzuhan) [AUDIT FIX] 移除了 Omit "coefficient"，因為我們現在直接從 DB 傳遞真理係數
  const categoryRecords = {
    scope1: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    scope2: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    scope3: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
  };

  let totalScope1 = new Decimal(0);
  let totalScope2 = new Decimal(0);
  let totalScope3 = new Decimal(0);

  esgRecords.forEach((record) => {
    const scopeKey = record.scope;
    const category = scopeKey ? ESG_CATEGORY_MAP[scopeKey] : undefined;

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除沉默丟失
    if (!category) {
      throw new Error(
        `[ESG Integrity Violation] 發現無法對應範疇的碳排紀錄 (Record ID: ${record.id}, Scope: ${scopeKey})`,
      );
    }

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 拒絕未分類與虛擬補數
    if (!record.activityType) {
      throw new Error(
        `[ESG Audit Error] 碳排紀錄缺少活動名稱，拒絕列入盤查 (Record ID: ${record.id})`,
      );
    }

    const amount = new Decimal(record.emissions || 0);
    const name = record.activityType;

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 精準對接 ICoefficient 介面的 emissionFactor
    const dbCoefficient = record.coefficient?.emissionFactor || 0;

    const detailedRecord = {
      id: record.id,
      activityType: name,
      originalData: Number(record.amount) || 0,
      unit: record.unit || "",
      // Info: (20260518 - Tzuhan) [AUDIT FIX] 捨棄 toNumber()，維持 Decimal 字串精度，防堵微量碳排截斷
      emissions: amount.toString() as unknown as number,
      coefficient: dbCoefficient, // Info: (20260518 - Tzuhan) 直接寫入真理係數
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
    return (
      Array.from(map.entries())
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
        // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除 Number 強制轉型，改用 Decimal 原生 comparedTo 確保極微小碳排排序穩定
        .sort((a, b) =>
          MoneyUtil.toDecimal(b.amount).comparedTo(
            MoneyUtil.toDecimal(a.amount),
          ),
        )
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

  // Info: (20260518 - Tzuhan) [AUDIT FIX] 計算函式現在只負責算 percentage，不再越權逆算 coefficient
  const calculateRecords = (
    records: Omit<IEsgReportDetailedRecord, "percentage">[],
    scopeTotal: Decimal,
  ): IEsgReportDetailedRecord[] => {
    return (
      records
        .map((record) => {
          // Info: (20260518 - Tzuhan) [AUDIT FIX] 暴露不合理數據 (若排放量不為 0 但原始數據為 0，直接拋錯)
          if (record.originalData === 0 && Number(record.emissions) !== 0) {
            throw new Error(
              `[ESG Audit Error] 發現憑空產生的碳排數據 (Record ID: ${record.id})`,
            );
          }

          return {
            ...record,
            // Info: (20260518 - Tzuhan) 佔比分母修正為該範疇的加總 (scopeTotal)
            percentage: scopeTotal.isZero()
              ? 0
              : new Decimal(record.emissions)
                  .dividedBy(scopeTotal)
                  .times(100)
                  .toNumber(),
          };
        })
        // Info: (20260518 - Tzuhan) [AUDIT FIX] 同樣拔除 Number，改用高精度 comparedTo
        .sort((a, b) =>
          MoneyUtil.toDecimal(b.emissions).comparedTo(
            MoneyUtil.toDecimal(a.emissions),
          ),
        )
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
