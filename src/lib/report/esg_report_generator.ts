import Decimal from "decimal.js";
import * as crypto from "crypto";
import {
  IEsgReport,
  IEsgReportItem,
  IEsgReportDetailedRecord,
  IEsgReportMetrics,
} from "@/interfaces/esg_report";
import { IEsgRecordDetail } from "@/interfaces/esg";
import { MoneyUtil } from "@/lib/utils/money";
import {
  Iso14064Category,
  DQI_UNCERTAINTY_MAP,
  DEFAULT_EF_UNCERTAINTY,
} from "@/constants/esg";
import { UncertaintyCalculator } from "@/lib/report/uncertainty_calculator";
import { Prisma } from "@/generated";

const ESG_CATEGORY_MAP: Record<string, "scope1" | "scope2" | "scope3"> = {
  SCOPE_1: "scope1",
  SCOPE_2: "scope2",
  SCOPE_3: "scope3",
};

const ISO_CATEGORY_MAP: Record<
  string,
  "iso1" | "iso2" | "iso3" | "iso4" | "iso5" | "iso6"
> = {
  [Iso14064Category.CATEGORY_1]: "iso1",
  [Iso14064Category.CATEGORY_2]: "iso2",
  [Iso14064Category.CATEGORY_3]: "iso3",
  [Iso14064Category.CATEGORY_4]: "iso4",
  [Iso14064Category.CATEGORY_5]: "iso5",
  [Iso14064Category.CATEGORY_6]: "iso6",
};

export function generateEsgReport(esgRecords: IEsgRecordDetail[]): IEsgReport {
  const categoryMap = {
    scope1: new Map<string, { name: string; amount: Decimal }>(),
    scope2: new Map<string, { name: string; amount: Decimal }>(),
    scope3: new Map<string, { name: string; amount: Decimal }>(),
    iso1: new Map<string, { name: string; amount: Decimal }>(),
    iso2: new Map<string, { name: string; amount: Decimal }>(),
    iso3: new Map<string, { name: string; amount: Decimal }>(),
    iso4: new Map<string, { name: string; amount: Decimal }>(),
    iso5: new Map<string, { name: string; amount: Decimal }>(),
    iso6: new Map<string, { name: string; amount: Decimal }>(),
  };

  const categoryRecords = {
    scope1: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    scope2: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    scope3: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    iso1: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    iso2: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    iso3: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    iso4: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    iso5: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
    iso6: [] as Omit<IEsgReportDetailedRecord, "percentage">[],
  };

  let totalScope1 = MoneyUtil.toDecimal(0);
  let totalScope2 = MoneyUtil.toDecimal(0);
  let totalScope3 = MoneyUtil.toDecimal(0);

  let totalIso1 = MoneyUtil.toDecimal(0);
  let totalIso2 = MoneyUtil.toDecimal(0);
  let totalIso3 = MoneyUtil.toDecimal(0);
  let totalIso4 = MoneyUtil.toDecimal(0);
  let totalIso5 = MoneyUtil.toDecimal(0);
  let totalIso6 = MoneyUtil.toDecimal(0);

  esgRecords.forEach((record) => {
    const scopeKey = record.scope;
    const category = scopeKey ? ESG_CATEGORY_MAP[scopeKey] : undefined;

    const isoKey = record.isoCategory;
    const isoCategory = isoKey ? ISO_CATEGORY_MAP[isoKey] : undefined;

    if (!category) {
      throw new Error(
        `[ESG Integrity Violation] 發現無法對應範疇的碳排紀錄 (Record ID: ${record.id}, Scope: ${scopeKey})`,
      );
    }

    // Info: (20260707 - Tzuhan) 為了相容部分可能尚未賦予 ISO Category 的舊資料，若無對應則先略過 ISO 統計但不中斷
    if (isoKey && !isoCategory) {
      console.warn(`[ESG Warning] 未知的 ISO 分類: ${isoKey}`);
    }

    if (!record.activityType) {
      throw new Error(
        `[ESG Audit Error] 碳排紀錄缺少活動名稱，拒絕列入盤查 (Record ID: ${record.id})`,
      );
    }

    const emissionDecimal = MoneyUtil.toDecimal(record.emissions || 0);
    const name = record.activityType;

    const dbCoefficient = record.coefficient?.emissionFactor ?? null;

    // Info: (20260707 - Tzuhan) 計算單筆紀錄不確定性
    let baseUAd = new Prisma.Decimal(0.1); // Fallback
    if (record.dqiScore) {
      const dqiKey = MoneyUtil.toDecimal(record.dqiScore).toNumber();
      if (DQI_UNCERTAINTY_MAP[dqiKey]) {
        baseUAd = DQI_UNCERTAINTY_MAP[dqiKey];
      }
    }
    const uAd = UncertaintyCalculator.adjustUncertaintyByType(
      baseUAd,
      record.dqiType || "SECONDARY",
    );

    let uEf = DEFAULT_EF_UNCERTAINTY;
    if (record.coefficient?.uncertaintyPercentage) {
      // 假設 uncertaintyPercentage = 5.0 代表 5%
      uEf = new Prisma.Decimal(record.coefficient.uncertaintyPercentage).div(
        100,
      );
    }
    const uRecord = UncertaintyCalculator.calculateRecordUncertainty(uAd, uEf);

    const detailedRecord = {
      id: record.id,
      activityType: name,
      originalData: MoneyUtil.toDecimal(record.amount || 0).toString(),
      unit: record.unit || "",
      emissions: emissionDecimal.toString(),
      emissionFactor: dbCoefficient,
      uncertaintyPercent: uRecord.mul(100).toNumber(),
    };

    // Info: (20260707 - Tzuhan) GHG Protocol 累加
    const map = categoryMap[category];
    const currentAmount = map.get(name)?.amount || MoneyUtil.toDecimal(0);
    map.set(name, { name, amount: currentAmount.plus(emissionDecimal) });

    if (category === "scope1") totalScope1 = totalScope1.plus(emissionDecimal);
    else if (category === "scope2")
      totalScope2 = totalScope2.plus(emissionDecimal);
    else if (category === "scope3")
      totalScope3 = totalScope3.plus(emissionDecimal);

    categoryRecords[category].push(detailedRecord);

    // Info: (20260707 - Tzuhan) ISO 14064-1 累加
    if (isoCategory) {
      const isoMap = categoryMap[isoCategory];
      const currentIsoAmount =
        isoMap.get(name)?.amount || MoneyUtil.toDecimal(0);
      isoMap.set(name, {
        name,
        amount: currentIsoAmount.plus(emissionDecimal),
      });

      if (isoCategory === "iso1") totalIso1 = totalIso1.plus(emissionDecimal);
      else if (isoCategory === "iso2")
        totalIso2 = totalIso2.plus(emissionDecimal);
      else if (isoCategory === "iso3")
        totalIso3 = totalIso3.plus(emissionDecimal);
      else if (isoCategory === "iso4")
        totalIso4 = totalIso4.plus(emissionDecimal);
      else if (isoCategory === "iso5")
        totalIso5 = totalIso5.plus(emissionDecimal);
      else if (isoCategory === "iso6")
        totalIso6 = totalIso6.plus(emissionDecimal);

      categoryRecords[isoCategory].push(detailedRecord);
    }
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
          ? "0"
          : data.amount.dividedBy(baseTotal).times(100).toString(),
      }))
      .sort((a, b) =>
        MoneyUtil.toDecimal(b.amount).comparedTo(MoneyUtil.toDecimal(a.amount)),
      );
  };

  const scope1Items = mapToArray(categoryMap.scope1, totalScope1, "scope1");
  const scope2Items = mapToArray(categoryMap.scope2, totalScope2, "scope2");
  const scope3Items = mapToArray(categoryMap.scope3, totalScope3, "scope3");

  const iso1Items = mapToArray(categoryMap.iso1, totalIso1, "iso1");
  const iso2Items = mapToArray(categoryMap.iso2, totalIso2, "iso2");
  const iso3Items = mapToArray(categoryMap.iso3, totalIso3, "iso3");
  const iso4Items = mapToArray(categoryMap.iso4, totalIso4, "iso4");
  const iso5Items = mapToArray(categoryMap.iso5, totalIso5, "iso5");
  const iso6Items = mapToArray(categoryMap.iso6, totalIso6, "iso6");

  const metrics: IEsgReportMetrics = {
    totalEmissions: totalEmissions.toString(),
    scope1Proportion: totalEmissions.isZero()
      ? "0"
      : totalScope1.dividedBy(totalEmissions).times(100).toString(),
    scope2Proportion: totalEmissions.isZero()
      ? "0"
      : totalScope2.dividedBy(totalEmissions).times(100).toString(),
    scope3Proportion: totalEmissions.isZero()
      ? "0"
      : totalScope3.dividedBy(totalEmissions).times(100).toString(),
    iso1Proportion: totalEmissions.isZero()
      ? "0"
      : totalIso1.dividedBy(totalEmissions).times(100).toString(),
    iso2Proportion: totalEmissions.isZero()
      ? "0"
      : totalIso2.dividedBy(totalEmissions).times(100).toString(),
    iso3Proportion: totalEmissions.isZero()
      ? "0"
      : totalIso3.dividedBy(totalEmissions).times(100).toString(),
    iso4Proportion: totalEmissions.isZero()
      ? "0"
      : totalIso4.dividedBy(totalEmissions).times(100).toString(),
    iso5Proportion: totalEmissions.isZero()
      ? "0"
      : totalIso5.dividedBy(totalEmissions).times(100).toString(),
    iso6Proportion: totalEmissions.isZero()
      ? "0"
      : totalIso6.dividedBy(totalEmissions).times(100).toString(),
  };

  const calculateRecords = (
    records: Omit<IEsgReportDetailedRecord, "percentage">[],
    scopeTotal: Decimal,
  ): IEsgReportDetailedRecord[] => {
    return records
      .map((record) => {
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
            ? "0"
            : MoneyUtil.toDecimal(record.emissions)
                .dividedBy(scopeTotal)
                .times(100)
                .toString(),
        };
      })
      .sort((a, b) =>
        MoneyUtil.toDecimal(b.emissions).comparedTo(
          MoneyUtil.toDecimal(a.emissions),
        ),
      );
  };

  const calculateScopeUncertainty = (
    records: Omit<IEsgReportDetailedRecord, "percentage">[],
    scopeTotal: Decimal,
  ) => {
    if (scopeTotal.isZero() || records.length === 0)
      return { percent: 0, absolute: 0 };
    const items = records.map((r) => ({
      emissions: new Prisma.Decimal(r.emissions),
      uncertainty: r.uncertaintyPercent
        ? new Prisma.Decimal(r.uncertaintyPercent).div(100)
        : new Prisma.Decimal(0),
    }));
    const totalU = UncertaintyCalculator.calculateAggregatedUncertainty(items);
    return {
      percent: totalU.mul(100).toNumber(),
      absolute: totalU
        .mul(new Prisma.Decimal(scopeTotal.toString()))
        .toNumber(),
    };
  };

  const calculateGrossUncertainty = () => {
    const allRecords = [
      ...categoryRecords.scope1,
      ...categoryRecords.scope2,
      ...categoryRecords.scope3,
    ];
    if (totalEmissions.isZero() || allRecords.length === 0)
      return { percent: 0, absolute: 0 };

    const items = allRecords.map((r) => ({
      emissions: new Prisma.Decimal(r.emissions),
      uncertainty: r.uncertaintyPercent
        ? new Prisma.Decimal(r.uncertaintyPercent).div(100)
        : new Prisma.Decimal(0),
    }));
    const totalU = UncertaintyCalculator.calculateAggregatedUncertainty(items);
    return {
      percent: totalU.mul(100).toNumber(),
      absolute: totalU
        .mul(new Prisma.Decimal(totalEmissions.toString()))
        .toNumber(),
    };
  };

  const grossU = calculateGrossUncertainty();
  metrics.uncertaintyPercent = grossU.percent;
  metrics.absoluteUncertainty = grossU.absolute;

  const buildSection = (
    items: IEsgReportItem[],
    records: Omit<IEsgReportDetailedRecord, "percentage">[],
    total: Decimal,
  ) => {
    const u = calculateScopeUncertainty(records, total);
    return {
      items,
      records: calculateRecords(records, total),
      total: total.toString(),
      uncertaintyPercent: u.percent,
      absoluteUncertainty: u.absolute,
    };
  };

  return {
    sections: {
      scope1: buildSection(scope1Items, categoryRecords.scope1, totalScope1),
      scope2: buildSection(scope2Items, categoryRecords.scope2, totalScope2),
      scope3: buildSection(scope3Items, categoryRecords.scope3, totalScope3),
      iso1: buildSection(iso1Items, categoryRecords.iso1, totalIso1),
      iso2: buildSection(iso2Items, categoryRecords.iso2, totalIso2),
      iso3: buildSection(iso3Items, categoryRecords.iso3, totalIso3),
      iso4: buildSection(iso4Items, categoryRecords.iso4, totalIso4),
      iso5: buildSection(iso5Items, categoryRecords.iso5, totalIso5),
      iso6: buildSection(iso6Items, categoryRecords.iso6, totalIso6),
      grossEmissions: { total: totalEmissions.toString() },
    },
    metrics,
  };
}
