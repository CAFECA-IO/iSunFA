import { IEsgActivityType } from "@/constants/esg_activity_type";
import { EsgScope } from "@/interfaces/esg";
import { CoefficientCategory, ICoefficient } from "@/interfaces/coefficient";

export interface IEmissionSources {
  id: string;
  name: string;
  activityType: IEsgActivityType;
  coefficient: ICoefficient;
}

export interface IActivityData {
  activityType: IEsgActivityType;
  emissionSources: IEmissionSources[];
}

export interface IEsgEmissionSourcesSummary {
  totalEmissionSourcesCount: number;
  estimatedAnnualTotalEmission: number;
  top3EmissionSources: {
    name: string;
    value: number;
  }[];
  scopeDistribution: {
    scope: EsgScope;
    count: number;
  }[];
}

export const mockSummaryData: IEsgEmissionSourcesSummary = {
  totalEmissionSourcesCount: 10,
  estimatedAnnualTotalEmission: 15420.8,
  top3EmissionSources: [
    {
      name: "台中廠區 - A 棟電表",
      value: 8420.5,
    },
    {
      name: "熱軋鋼捲採購 - 中鋼",
      value: 3250.2,
    },
    {
      name: "公司貨車 ABC-1234 今天想去哪裡",
      value: 1240.8,
    },
  ],
  scopeDistribution: [
    {
      scope: EsgScope.SCOPE_1,
      count: 5,
    },
    {
      scope: EsgScope.SCOPE_2,
      count: 3,
    },
    {
      scope: EsgScope.SCOPE_3,
      count: 2,
    },
  ],
};

export const mockEmissionSources: IEmissionSources[] = [
  {
    id: "2026042100000001",
    name: "台中廠區 - A 棟電表",
    activityType: {
      key: "ELECTRICITY_USAGE",
      value: "電力使用",
      scope: EsgScope.SCOPE_2,
      description: "如：電費單度數",
    },
    coefficient: {
      id: "1",
      category: CoefficientCategory.STANDARD,
      name: "電力使用",
      description: "電力使用",
      emissionFactor: 1.3,
      unit: "kgCO2e/kWh",
      source: "電力使用",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000002",
    name: "熱軋鋼捲採購 - 中鋼",
    activityType: {
      key: "PURCHASED_GOODS",
      value: "購買的商品",
      scope: EsgScope.SCOPE_3,
      description: "如：電費單度數",
    },
    coefficient: {
      id: "2",
      category: CoefficientCategory.STANDARD,
      name: "熱軋鋼捲採購 - 中鋼",
      description: "熱軋鋼捲採購 - 中鋼",
      emissionFactor: 2.2,
      unit: "kgCO2e/kWh",
      source: "熱軋鋼捲採購 - 中鋼",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000003",
    name: "公司貨車 ABC-1234",
    activityType: {
      key: "PURCHASED_GOODS",
      value: "購買的商品",
      scope: EsgScope.SCOPE_3,
      description: "如：電費單度數",
    },
    coefficient: {
      id: "3",
      category: CoefficientCategory.STANDARD,
      name: "公司貨車 ABC-1234",
      description: "公司貨車 ABC-1234",
      emissionFactor: 3.5,
      unit: "kgCO2e/kWh",
      source: "公司貨車 ABC-1234",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000004",
    name: "台中廠區 - 鍋爐",
    activityType: {
      key: "STATIONARY_COMBUSTION",
      value: "定點燃燒",
      scope: EsgScope.SCOPE_1,
      description: "如：鍋爐、發電機、瓦斯",
    },
    coefficient: {
      id: "4",
      category: CoefficientCategory.CUSTOM,
      name: "台中廠區 - 鍋爐",
      description: "台中廠區 - 鍋爐",
      emissionFactor: 0.5,
      unit: "kgCO2e/kWh",
      source: "台中廠區 - 鍋爐",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000005",
    name: "售出產品加工",
    activityType: {
      key: "PROCESSING_OF_SOLD_PRODUCTS",
      value: "售出產品加工",
      scope: EsgScope.SCOPE_3,
      description: "如：售出產品加工",
    },
    coefficient: {
      id: "4",
      category: CoefficientCategory.CUSTOM,
      name: "售出產品加工",
      description: "售出產品加工",
      emissionFactor: 0.03,
      unit: "kgCO2e/kWh",
      source: "售出產品加工",
      createdAt: 0,
      updatedAt: 0,
    },
  },
];
