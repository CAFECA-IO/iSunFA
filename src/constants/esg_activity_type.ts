import { EsgScope, GhgProtocolCategory } from "@/constants/esg";

export type EsgActivityTypeKey =
  | "STATIONARY_COMBUSTION"
  | "MOBILE_COMBUSTION"
  | "FUGITIVE_EMISSION"
  | "PROCESS_EMISSION"
  | "ELECTRICITY_USAGE"
  | "HEAT_AND_STEAM"
  | "PURCHASED_COOLING"
  | "PURCHASED_GOODS"
  | "CAPITAL_GOODS"
  | "FUEL_AND_ENERGY_RELATED_ACTIVITIES"
  | "UPSTREAM_LOGISTICS"
  | "WASTE_DISPOSAL"
  | "BUSINESS_TRAVEL"
  | "EMPLOYEE_COMMUTING"
  | "UPSTREAM_LEASED_ASSETS"
  | "DOWNSTREAM_LOGISTICS"
  | "PROCESSING_OF_SOLD_PRODUCTS"
  | "USE_OF_SOLD_PRODUCTS"
  | "END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS"
  | "DOWNSTREAM_LEASED_ASSETS"
  | "FRANCHISES"
  | "INVESTMENTS"
  | "WATER_CONSUMPTION";

export interface IEsgActivityType {
  key: EsgActivityTypeKey;
  value: string;
  scope: EsgScope;
  description: string;
}

// Info: (20260417 - Julian) ESG 活動類型
export const EsgActivityTypeMapping: IEsgActivityType[] = [
  // Info: (20260417 - Julian) 範疇一：直接排放 (Direct Emissions)
  {
    key: "STATIONARY_COMBUSTION",
    value: "定點燃燒",
    scope: EsgScope.SCOPE_1,
    description: "如：鍋爐、發電機、瓦斯",
  },
  {
    key: "MOBILE_COMBUSTION",
    value: "移動燃燒",
    scope: EsgScope.SCOPE_1,
    description: "如：公司公務車油耗",
  },
  {
    key: "FUGITIVE_EMISSION",
    value: "逸散排放",
    scope: EsgScope.SCOPE_1,
    description: "如：冷氣冷媒填充、滅火器、化糞池",
  },
  {
    key: "PROCESS_EMISSION",
    value: "製程排放",
    scope: EsgScope.SCOPE_1,
    description: "如：生產過程化學反應產生的溫室氣體",
  },

  // Info: (20260417 - Julian) 範疇二：能源間接排放 (Energy Indirect Emissions)
  {
    key: "ELECTRICITY_USAGE",
    value: "電力使用",
    scope: EsgScope.SCOPE_2,
    description: "如：電費單度數",
  },
  {
    key: "HEAT_AND_STEAM",
    value: "熱能與蒸汽",
    scope: EsgScope.SCOPE_2,
    description: "如：外購的熱能或蒸汽",
  },
  {
    key: "PURCHASED_COOLING",
    value: "外購冷能",
    scope: EsgScope.SCOPE_2,
    description: "如：外購的冷能",
  },

  // Info: (20260417 - Julian) 範疇三：其他間接排放 (Other Indirect Emissions - GHG Protocol 15 Categories)
  {
    key: "PURCHASED_GOODS",
    value: "購買商品與服務",
    scope: EsgScope.SCOPE_3,
    description: "如：供應鏈採購的產品或服務",
  },
  {
    key: "CAPITAL_GOODS",
    value: "資本財",
    scope: EsgScope.SCOPE_3,
    description: "如：購買的設備、建築物等固定資產",
  },
  {
    key: "FUEL_AND_ENERGY_RELATED_ACTIVITIES",
    value: "燃料與能源相關活動",
    scope: EsgScope.SCOPE_3,
    description: "如：非範疇一與二的能源相關排放",
  },
  {
    key: "UPSTREAM_LOGISTICS",
    value: "上游運輸",
    scope: EsgScope.SCOPE_3,
    description: "如：貨物配送與物流",
  },
  {
    key: "WASTE_DISPOSAL",
    value: "廢棄物處理",
    scope: EsgScope.SCOPE_3,
    description: "如：公司產生的垃圾與資源回收",
  },
  {
    key: "BUSINESS_TRAVEL",
    value: "商務差旅",
    scope: EsgScope.SCOPE_3,
    description: "如：員工出差（飛機、高鐵、計程車）",
  },
  {
    key: "EMPLOYEE_COMMUTING",
    value: "員工通勤",
    scope: EsgScope.SCOPE_3,
    description: "如：員工上下班交通 (可包含遠距辦公)",
  },
  {
    key: "UPSTREAM_LEASED_ASSETS",
    value: "上游租賃資產",
    scope: EsgScope.SCOPE_3,
    description: "如：承租資產營運的排放",
  },
  {
    key: "DOWNSTREAM_LOGISTICS",
    value: "下游運輸",
    scope: EsgScope.SCOPE_3,
    description: "如：客戶產品運輸與配送",
  },
  {
    key: "PROCESSING_OF_SOLD_PRODUCTS",
    value: "售出產品加工",
    scope: EsgScope.SCOPE_3,
    description: "如：客戶對售出半成品進行加工的排放",
  },
  {
    key: "USE_OF_SOLD_PRODUCTS",
    value: "售出產品使用",
    scope: EsgScope.SCOPE_3,
    description: "如：產品在其生命週期內使用產生的排放",
  },
  {
    key: "END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS",
    value: "售出產品廢棄處理",
    scope: EsgScope.SCOPE_3,
    description: "如：顧客丟棄產品後的處理排放",
  },
  {
    key: "DOWNSTREAM_LEASED_ASSETS",
    value: "下游租賃資產",
    scope: EsgScope.SCOPE_3,
    description: "如：出租給他人的資產營運排放",
  },
  {
    key: "FRANCHISES",
    value: "特許經營/加盟",
    scope: EsgScope.SCOPE_3,
    description: "如：加盟商的營運排放",
  },
  {
    key: "INVESTMENTS",
    value: "投資",
    scope: EsgScope.SCOPE_3,
    description: "如：來自股權、債券等金融投資的排放",
  },

  // Info: (20260417 - Julian) 其他常規追蹤項目
  {
    key: "WATER_CONSUMPTION",
    value: "水資源消耗",
    scope: EsgScope.SCOPE_3,
    description: "如：自來水用量",
  },
];

/**
 * Info: (20260721 - Tzuhan) 活動類型 → GHG Protocol 範疇/類別的決定性映射(#53):
 * 每個活動類型在 GHG Protocol 下的歸類是標準定義、無歧義 — 紀錄未標範疇時據此補位,
 * 不必因欄位缺漏而無法入報告(水資源依 GHG Protocol 慣例歸 Cat 1 採購商品與服務)。
 */
export const EsgActivityTypeGhgCategoryMap: Record<
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
