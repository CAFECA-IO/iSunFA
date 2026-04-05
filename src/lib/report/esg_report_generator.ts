import { IEsgReport, IEsgReportItem } from "@/interfaces/esg_report";
import { Prisma } from "@/generated/browser";
import { safeDivide } from "@/lib/utils/math";

export function generateEsgReport(
  esgRecords: Prisma.EsgRecordGetPayload<Record<string, never>>[]
): IEsgReport {
  const scope1Map = new Map<string, { name: string; amount: number }>();
  const scope2Map = new Map<string, { name: string; amount: number }>();
  const scope3Map = new Map<string, { name: string; amount: number }>();

  let totalScope1 = 0;
  let totalScope2 = 0;
  let totalScope3 = 0;

  esgRecords.forEach((record) => {
    const scope = record.scope;
    const amount = Number(record.emissions);
    // Info: (20260406 - Luphia) 根據活動類型統計
    const name = record.activityType || "未分類排放";

    // Info: (20260406 - Luphia) 根據活動類型分組
    if (scope === "SCOPE_1") {
      const current = scope1Map.get(name)?.amount || 0;
      scope1Map.set(name, { name, amount: current + amount });
      totalScope1 += amount;
    } else if (scope === "SCOPE_2") {
      const current = scope2Map.get(name)?.amount || 0;
      scope2Map.set(name, { name, amount: current + amount });
      totalScope2 += amount;
    } else if (scope === "SCOPE_3") {
      const current = scope3Map.get(name)?.amount || 0;
      scope3Map.set(name, { name, amount: current + amount });
      totalScope3 += amount;
    }
  });

  const totalEmissions = totalScope1 + totalScope2 + totalScope3;

  const mapToArray = (
    map: Map<string, { name: string; amount: number }>,
    baseTotal: number
  ): IEsgReportItem[] => {
    return Array.from(map.entries())
      .map(([id, data]) => ({
        id: Buffer.from(id).toString("base64"), // Info: (20260406 - Luphia) 安全唯一 ID
        name: data.name,
        amount: data.amount,
        percentageOfScope: baseTotal !== 0 ? (data.amount / baseTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount); // Info: (20260406 - Luphia) 按數量降序排列
  };

  const scope1Items = mapToArray(scope1Map, totalScope1);
  const scope2Items = mapToArray(scope2Map, totalScope2);
  const scope3Items = mapToArray(scope3Map, totalScope3);

  const metrics = {
    totalEmissions,
    scope1Proportion: safeDivide(totalScope1, totalEmissions) * 100,
    scope2Proportion: safeDivide(totalScope2, totalEmissions) * 100,
    scope3Proportion: safeDivide(totalScope3, totalEmissions) * 100,
  };

  return {
    sections: {
      scope1: { items: scope1Items, total: totalScope1 },
      scope2: { items: scope2Items, total: totalScope2 },
      scope3: { items: scope3Items, total: totalScope3 },
      grossEmissions: { total: totalEmissions },
    },
    metrics,
  };
}
