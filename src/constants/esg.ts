// Info: (20260604 - Tzuhan) 台灣電力公司 2023 年度公告電力排碳係數 (kgCO2e/kWh)
export const TAIPOWER_EMISSION_FACTOR_2023 = 0.495;

import { EsgActivityTypeKey } from "@/constants/esg_activity_type";

// Info: (20260617 - Julian) 碳排放的三大範疇
export enum EsgScope {
  SCOPE_1 = "SCOPE_1",
  SCOPE_2 = "SCOPE_2",
  SCOPE_3 = "SCOPE_3",
}

export enum EsgIntensity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

// Info: (20260617 - Julian) GHG Protocol 共 15 類
export enum GhgProtocolCategory {
  SCOPE_1_DIRECT = "SCOPE_1_DIRECT", //Info: (20260617 - Julian) 直接溫室氣體排放 (範疇一)
  SCOPE_2_INDIRECT = "SCOPE_2_INDIRECT", //Info: (20260617 - Julian) 能源間接溫室氣體排放 (範疇二)
  SCOPE_3_CAT_1 = "SCOPE_3_CAT_1", // Info: (20260617 - Julian) Category 1: 購買商品與服務 / Purchased Goods & Services
  SCOPE_3_CAT_2 = "SCOPE_3_CAT_2", // Info: (20260617 - Julian) Category 2: 資本財 / Capital Goods
  SCOPE_3_CAT_3 = "SCOPE_3_CAT_3", // Info: (20260617 - Julian) Category 3: 燃料與能源相關活動 / Fuel- & Energy-Related Activities
  SCOPE_3_CAT_4 = "SCOPE_3_CAT_4", // Info: (20260617 - Julian) Category 4: 上游運輸與配送 / Upstream Transportation & Distribution
  SCOPE_3_CAT_5 = "SCOPE_3_CAT_5", // Info: (20260617 - Julian) Category 5: 營運產生的廢棄物 / Waste Generated in Operations
  SCOPE_3_CAT_6 = "SCOPE_3_CAT_6", // Info: (20260617 - Julian) Category 6: 商務差旅 / Business Travel
  SCOPE_3_CAT_7 = "SCOPE_3_CAT_7", // Info: (20260617 - Julian) Category 7: 員工通勤 / Employee Commuting
  SCOPE_3_CAT_8 = "SCOPE_3_CAT_8", // Info: (20260617 - Julian) Category 8: 上游租賃資產 / Upstream Leased Assets
  SCOPE_3_CAT_9 = "SCOPE_3_CAT_9", // Info: (20260617 - Julian) Category 9: 下游運輸與配送 / Downstream Transportation & Distribution
  SCOPE_3_CAT_10 = "SCOPE_3_CAT_10", // Info: (20260617 - Julian) Category 10: 售出產品的加工 / Processing of Sold Products
  SCOPE_3_CAT_11 = "SCOPE_3_CAT_11", // Info: (20260617 - Julian) Category 11: 售出產品的使用 / Use of Sold Products
  SCOPE_3_CAT_12 = "SCOPE_3_CAT_12", // Info: (20260617 - Julian) Category 12: 售出產品的終端處理 / End-of-Life Treatment of Sold Products
  SCOPE_3_CAT_13 = "SCOPE_3_CAT_13", // Info: (20260617 - Julian) Category 13: 下游租賃資產 / Downstream Leased Assets
  SCOPE_3_CAT_14 = "SCOPE_3_CAT_14", // Info: (20260617 - Julian) Category 14: 連鎖加盟 / Franchises
  SCOPE_3_CAT_15 = "SCOPE_3_CAT_15", // Info: (20260617 - Julian) Category 15: 投資 / Investments
}

// Info: (20260617 - Julian) ISO 14064-1 共 6 類
export enum Iso14064Category {
  CATEGORY_1 = "CATEGORY_1", // Info: (20260617 - Julian) 類別一：直接溫室氣體排放與移除 / Direct greenhouse gas emissions and removals
  CATEGORY_2 = "CATEGORY_2", // Info: (20260617 - Julian) 類別二：輸入能源之間接溫室氣體排放 / Indirect greenhouse gas emissions from imported energy
  CATEGORY_3 = "CATEGORY_3", // Info: (20260617 - Julian) 類別三：運輸之間接溫室氣體排放 / Indirect greenhouse gas emissions from transportation
  CATEGORY_4 = "CATEGORY_4", // Info: (20260617 - Julian) 類別四：組織使用產品之間接溫室氣體排放 / Indirect greenhouse gas emissions from products used by organization
  CATEGORY_5 = "CATEGORY_5", // Info: (20260617 - Julian) 類別五：使用組織產品之間接溫室氣體排放 / Indirect greenhouse gas emissions associated with the use of products from the organization
  CATEGORY_6 = "CATEGORY_6", // Info: (20260617 - Julian) 類別六：其他來源之間接溫室氣體排放 / Indirect greenhouse gas emissions from other sources
}

export interface IGhgCategoryDetail {
  key: GhgProtocolCategory;
  nameZh: string;
  nameEn: string;
  scope: EsgScope;
  categoryNumber?: number; // Info: (20260617 - Julian) GHG 的子分類為範疇三的 1~15
}

export interface IIsoCategoryDetail {
  key: Iso14064Category;
  nameZh: string;
  nameEn: string;
  categoryNumber: number;
}

// Info: (20260617 - Julian) GHG Protocol 完整分類資訊對應表
export const GhgCategoryDetails: Record<
  GhgProtocolCategory,
  IGhgCategoryDetail
> = {
  [GhgProtocolCategory.SCOPE_1_DIRECT]: {
    key: GhgProtocolCategory.SCOPE_1_DIRECT,
    nameZh: "直接溫室氣體排放 (範疇一)",
    nameEn: "Direct GHG Emissions (Scope 1)",
    scope: EsgScope.SCOPE_1,
  },
  [GhgProtocolCategory.SCOPE_2_INDIRECT]: {
    key: GhgProtocolCategory.SCOPE_2_INDIRECT,
    nameZh: "能源間接溫室氣體排放 (範疇二)",
    nameEn: "Energy Indirect GHG Emissions (Scope 2)",
    scope: EsgScope.SCOPE_2,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_1]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_1,
    nameZh: "購買的商品與服務",
    nameEn: "Purchased Goods & Services",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 1,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_2]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_2,
    nameZh: "資本財",
    nameEn: "Capital Goods",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 2,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_3]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_3,
    nameZh: "燃料與能源相關活動 (未包含於範疇一或二)",
    nameEn:
      "Fuel- and Energy-Related Activities (Not Included in Scope 1 or 2)",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 3,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_4]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_4,
    nameZh: "上游運輸與配送",
    nameEn: "Upstream Transportation & Distribution",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 4,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_5]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_5,
    nameZh: "營運產生的廢棄物",
    nameEn: "Waste Generated in Operations",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 5,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_6]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_6,
    nameZh: "商務差旅",
    nameEn: "Business Travel",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 6,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_7]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_7,
    nameZh: "員工通勤",
    nameEn: "Employee Commuting",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 7,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_8]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_8,
    nameZh: "上游租賃資產",
    nameEn: "Upstream Leased Assets",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 8,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_9]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_9,
    nameZh: "下游運輸與配送",
    nameEn: "Downstream Transportation & Distribution",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 9,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_10]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_10,
    nameZh: "售出產品的加工",
    nameEn: "Processing of Sold Products",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 10,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_11]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_11,
    nameZh: "售出產品的使用",
    nameEn: "Use of Sold Products",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 11,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_12]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_12,
    nameZh: "售出產品的終端處理",
    nameEn: "End-of-Life Treatment of Sold Products",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 12,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_13]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_13,
    nameZh: "下游租賃資產",
    nameEn: "Downstream Leased Assets",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 13,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_14]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_14,
    nameZh: "連鎖加盟",
    nameEn: "Franchises",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 14,
  },
  [GhgProtocolCategory.SCOPE_3_CAT_15]: {
    key: GhgProtocolCategory.SCOPE_3_CAT_15,
    nameZh: "投資",
    nameEn: "Investments",
    scope: EsgScope.SCOPE_3,
    categoryNumber: 15,
  },
};

// Info: (20260617 - Julian) ISO 14064-1 分類資訊對應表
export const IsoCategoryDetails: Record<Iso14064Category, IIsoCategoryDetail> =
  {
    [Iso14064Category.CATEGORY_1]: {
      key: Iso14064Category.CATEGORY_1,
      nameZh: "類別一：直接溫室氣體排放與移除",
      nameEn: "Category 1: Direct greenhouse gas emissions and removals",
      categoryNumber: 1,
    },
    [Iso14064Category.CATEGORY_2]: {
      key: Iso14064Category.CATEGORY_2,
      nameZh: "類別二：輸入能源之間接溫室氣體排放",
      nameEn:
        "Category 2: Indirect greenhouse gas emissions from imported energy",
      categoryNumber: 2,
    },
    [Iso14064Category.CATEGORY_3]: {
      key: Iso14064Category.CATEGORY_3,
      nameZh: "類別三：運輸之間接溫室氣體排放",
      nameEn:
        "Category 3: Indirect greenhouse gas emissions from transportation",
      categoryNumber: 3,
    },
    [Iso14064Category.CATEGORY_4]: {
      key: Iso14064Category.CATEGORY_4,
      nameZh: "類別四：組織使用產品之間接溫室氣體排放",
      nameEn:
        "Category 4: Indirect greenhouse gas emissions from products used by organization",
      categoryNumber: 4,
    },
    [Iso14064Category.CATEGORY_5]: {
      key: Iso14064Category.CATEGORY_5,
      nameZh: "類別五：使用組織產品之間接溫室氣體排放",
      nameEn:
        "Category 5: Indirect greenhouse gas emissions associated with the use of products from the organization",
      categoryNumber: 5,
    },
    [Iso14064Category.CATEGORY_6]: {
      key: Iso14064Category.CATEGORY_6,
      nameZh: "類別六：其他來源之間接溫室氣體排放",
      nameEn:
        "Category 6: Indirect greenhouse gas emissions from other sources",
      categoryNumber: 6,
    },
  };

// Info: (20260617 - Julian) 轉換對應表：GHG Protocol 類別 -> ISO 14064-1 類別
export const GhgToIsoMapping: Record<GhgProtocolCategory, Iso14064Category> = {
  [GhgProtocolCategory.SCOPE_1_DIRECT]: Iso14064Category.CATEGORY_1,
  [GhgProtocolCategory.SCOPE_2_INDIRECT]: Iso14064Category.CATEGORY_2,
  [GhgProtocolCategory.SCOPE_3_CAT_1]: Iso14064Category.CATEGORY_4,
  [GhgProtocolCategory.SCOPE_3_CAT_2]: Iso14064Category.CATEGORY_4,
  [GhgProtocolCategory.SCOPE_3_CAT_3]: Iso14064Category.CATEGORY_4,
  [GhgProtocolCategory.SCOPE_3_CAT_4]: Iso14064Category.CATEGORY_3,
  [GhgProtocolCategory.SCOPE_3_CAT_5]: Iso14064Category.CATEGORY_4,
  [GhgProtocolCategory.SCOPE_3_CAT_6]: Iso14064Category.CATEGORY_3,
  [GhgProtocolCategory.SCOPE_3_CAT_7]: Iso14064Category.CATEGORY_3,
  [GhgProtocolCategory.SCOPE_3_CAT_8]: Iso14064Category.CATEGORY_4,
  [GhgProtocolCategory.SCOPE_3_CAT_9]: Iso14064Category.CATEGORY_3,
  [GhgProtocolCategory.SCOPE_3_CAT_10]: Iso14064Category.CATEGORY_5,
  [GhgProtocolCategory.SCOPE_3_CAT_11]: Iso14064Category.CATEGORY_5,
  [GhgProtocolCategory.SCOPE_3_CAT_12]: Iso14064Category.CATEGORY_5,
  [GhgProtocolCategory.SCOPE_3_CAT_13]: Iso14064Category.CATEGORY_5,
  [GhgProtocolCategory.SCOPE_3_CAT_14]: Iso14064Category.CATEGORY_5,
  [GhgProtocolCategory.SCOPE_3_CAT_15]: Iso14064Category.CATEGORY_5,
};

// Info: (20260617 - Julian) 轉換對應表：ISO 14064-1 類別 -> GHG Protocol 類別
export const IsoToGhgMapping: Record<Iso14064Category, GhgProtocolCategory[]> =
  {
    [Iso14064Category.CATEGORY_1]: [],
    [Iso14064Category.CATEGORY_2]: [],
    [Iso14064Category.CATEGORY_3]: [
      GhgProtocolCategory.SCOPE_3_CAT_4,
      GhgProtocolCategory.SCOPE_3_CAT_6,
      GhgProtocolCategory.SCOPE_3_CAT_7,
      GhgProtocolCategory.SCOPE_3_CAT_9,
    ],
    [Iso14064Category.CATEGORY_4]: [
      GhgProtocolCategory.SCOPE_3_CAT_1,
      GhgProtocolCategory.SCOPE_3_CAT_2,
      GhgProtocolCategory.SCOPE_3_CAT_3,
      GhgProtocolCategory.SCOPE_3_CAT_5,
      GhgProtocolCategory.SCOPE_3_CAT_8,
    ],
    [Iso14064Category.CATEGORY_5]: [
      GhgProtocolCategory.SCOPE_3_CAT_10,
      GhgProtocolCategory.SCOPE_3_CAT_11,
      GhgProtocolCategory.SCOPE_3_CAT_12,
      GhgProtocolCategory.SCOPE_3_CAT_13,
      GhgProtocolCategory.SCOPE_3_CAT_14,
      GhgProtocolCategory.SCOPE_3_CAT_15,
    ],
    [Iso14064Category.CATEGORY_6]: [],
  };

// Info: (20260617 - Julian) 活動類別對應表：活動類別 -> GHG Protocol
export const EsgActivityTypeToGhgMapping: Record<
  EsgActivityTypeKey,
  GhgProtocolCategory
> = {
  STATIONARY_COMBUSTION: GhgProtocolCategory.SCOPE_1_DIRECT,
  MOBILE_COMBUSTION: GhgProtocolCategory.SCOPE_1_DIRECT,
  FUGITIVE_EMISSION: GhgProtocolCategory.SCOPE_1_DIRECT,
  PROCESS_EMISSION: GhgProtocolCategory.SCOPE_1_DIRECT,
  ELECTRICITY_USAGE: GhgProtocolCategory.SCOPE_2_INDIRECT,
  HEAT_AND_STEAM: GhgProtocolCategory.SCOPE_2_INDIRECT,
  PURCHASED_COOLING: GhgProtocolCategory.SCOPE_2_INDIRECT,
  PURCHASED_GOODS: GhgProtocolCategory.SCOPE_3_CAT_1,
  CAPITAL_GOODS: GhgProtocolCategory.SCOPE_3_CAT_2,
  FUEL_AND_ENERGY_RELATED_ACTIVITIES: GhgProtocolCategory.SCOPE_3_CAT_3,
  UPSTREAM_LOGISTICS: GhgProtocolCategory.SCOPE_3_CAT_4,
  WASTE_DISPOSAL: GhgProtocolCategory.SCOPE_3_CAT_5,
  BUSINESS_TRAVEL: GhgProtocolCategory.SCOPE_3_CAT_6,
  EMPLOYEE_COMMUTING: GhgProtocolCategory.SCOPE_3_CAT_7,
  UPSTREAM_LEASED_ASSETS: GhgProtocolCategory.SCOPE_3_CAT_8,
  DOWNSTREAM_LOGISTICS: GhgProtocolCategory.SCOPE_3_CAT_9,
  PROCESSING_OF_SOLD_PRODUCTS: GhgProtocolCategory.SCOPE_3_CAT_10,
  USE_OF_SOLD_PRODUCTS: GhgProtocolCategory.SCOPE_3_CAT_11,
  END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS: GhgProtocolCategory.SCOPE_3_CAT_12,
  DOWNSTREAM_LEASED_ASSETS: GhgProtocolCategory.SCOPE_3_CAT_13,
  FRANCHISES: GhgProtocolCategory.SCOPE_3_CAT_14,
  INVESTMENTS: GhgProtocolCategory.SCOPE_3_CAT_15,
  WATER_CONSUMPTION: GhgProtocolCategory.SCOPE_3_CAT_1,
};

// Info: (20260617 - Julian) 活動類別對應表：活動類別 -> ISO 14064-1
export const EsgActivityTypeToIsoMapping: Record<
  EsgActivityTypeKey,
  Iso14064Category
> = {
  STATIONARY_COMBUSTION: Iso14064Category.CATEGORY_1,
  MOBILE_COMBUSTION: Iso14064Category.CATEGORY_1,
  FUGITIVE_EMISSION: Iso14064Category.CATEGORY_1,
  PROCESS_EMISSION: Iso14064Category.CATEGORY_1,
  ELECTRICITY_USAGE: Iso14064Category.CATEGORY_2,
  HEAT_AND_STEAM: Iso14064Category.CATEGORY_2,
  PURCHASED_COOLING: Iso14064Category.CATEGORY_2,
  PURCHASED_GOODS: Iso14064Category.CATEGORY_4,
  CAPITAL_GOODS: Iso14064Category.CATEGORY_4,
  FUEL_AND_ENERGY_RELATED_ACTIVITIES: Iso14064Category.CATEGORY_4,
  UPSTREAM_LOGISTICS: Iso14064Category.CATEGORY_3,
  WASTE_DISPOSAL: Iso14064Category.CATEGORY_4,
  BUSINESS_TRAVEL: Iso14064Category.CATEGORY_3,
  EMPLOYEE_COMMUTING: Iso14064Category.CATEGORY_3,
  UPSTREAM_LEASED_ASSETS: Iso14064Category.CATEGORY_4,
  DOWNSTREAM_LOGISTICS: Iso14064Category.CATEGORY_3,
  PROCESSING_OF_SOLD_PRODUCTS: Iso14064Category.CATEGORY_5,
  USE_OF_SOLD_PRODUCTS: Iso14064Category.CATEGORY_5,
  END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS: Iso14064Category.CATEGORY_5,
  DOWNSTREAM_LEASED_ASSETS: Iso14064Category.CATEGORY_5,
  FRANCHISES: Iso14064Category.CATEGORY_5,
  INVESTMENTS: Iso14064Category.CATEGORY_5,
  WATER_CONSUMPTION: Iso14064Category.CATEGORY_4,
};
