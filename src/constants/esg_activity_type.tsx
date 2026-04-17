// const UNIT_LIST = ["kWh", "L", "kg", "m³", "km", "ton", "次", "件"];

export type EsgActivityTypeKey = 'STATIONARY_COMBUSTION' | 'MOBILE_COMBUSTION' | 'FUGITIVE_EMISSION' | 'PROCESS_EMISSION' | 'ELECTRICITY_USAGE' | 'HEAT_AND_STEAM' | 'PURCHASED_COOLING' | 'PURCHASED_GOODS' | 'CAPITAL_GOODS' | 'FUEL_AND_ENERGY_RELATED_ACTIVITIES' | 'UPSTREAM_LOGISTICS' | 'WASTE_DISPOSAL' | 'BUSINESS_TRAVEL' | 'EMPLOYEE_COMMUTING' | 'UPSTREAM_LEASED_ASSETS' | 'DOWNSTREAM_LOGISTICS' | 'PROCESSING_OF_SOLD_PRODUCTS' | 'USE_OF_SOLD_PRODUCTS' | 'END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS' | 'DOWNSTREAM_LEASED_ASSETS' | 'FRANCHISES' | 'INVESTMENTS' | 'WATER_CONSUMPTION';

export interface IEsgActivityType {
  key: EsgActivityTypeKey;
  value: string;
  description: string;
}

// Info: (20260417 - Julian) ESG 活動類型
export const EsgActivityTypeMapping: IEsgActivityType[] =[
  // 範疇一：直接排放 (Direct Emissions)
  {
    key: 'STATIONARY_COMBUSTION',
    value: "定點燃燒",
    description: "如：鍋爐、發電機、瓦斯",
  },
  {
    key: 'MOBILE_COMBUSTION',
    value: "移動燃燒",
    description: "如：公司公務車油耗",
  },
  {
    key: 'FUGITIVE_EMISSION',
    value: "逸散排放",
    description: "如：冷氣冷媒填充、滅火器、化糞池",
  },
  {
    key: 'PROCESS_EMISSION',
    value: "製程排放",
    description: "如：生產過程化學反應產生的溫室氣體",
  },

  // 範疇二：能源間接排放 (Energy Indirect Emissions)
  {
    key: 'ELECTRICITY_USAGE',
    value: "電力使用",
    description: "如：電費單度數",
  },
  {
    key: 'HEAT_AND_STEAM',
    value: "熱能與蒸汽",
    description: "如：外購的熱能或蒸汽",
  },
  {
    key: 'PURCHASED_COOLING',
    value: "外購冷能",
    description: "如：外購的冷能",
  },

  // 範疇三：其他間接排放 (Other Indirect Emissions - GHG Protocol 15 Categories)
  {
    key: 'PURCHASED_GOODS',
    value: "購買商品與服務",
    description: "如：供應鏈採購的產品或服務",
  },
  {
    key: 'CAPITAL_GOODS',
    value: "資本財",
    description: "如：購買的設備、建築物等固定資產",
  },
  {
    key: 'FUEL_AND_ENERGY_RELATED_ACTIVITIES',
    value: "燃料與能源相關活動",
    description: "如：非範疇一與二的能源相關排放",
  },
  {
    key: 'UPSTREAM_LOGISTICS',
    value: "上游運輸",
    description: "如：貨物配送與物流",
  },
  {
    key: 'WASTE_DISPOSAL',
    value: "廢棄物處理",
    description: "如：公司產生的垃圾與資源回收",
  },
  {
    key: 'BUSINESS_TRAVEL',
    value: "商務差旅",
    description: "如：員工出差（飛機、高鐵、計程車）",
  },
  {
    key: 'EMPLOYEE_COMMUTING',
    value: "員工通勤",
    description: "如：員工上下班交通 (可包含遠距辦公)",
  },
  {
    key: 'UPSTREAM_LEASED_ASSETS',
    value: "上游租賃資產",
    description: "如：承租資產營運的排放",
  },
  {
    key: 'DOWNSTREAM_LOGISTICS',
    value: "下游運輸",
    description: "如：客戶產品運輸與配送",
  },
  {
    key: 'PROCESSING_OF_SOLD_PRODUCTS',
    value: "售出產品加工",
    description: "如：客戶對售出半成品進行加工的排放",
  },
  {
    key: 'USE_OF_SOLD_PRODUCTS',
    value: "售出產品使用",
    description: "如：產品在其生命週期內使用產生的排放",
  },
  {
    key: 'END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS',
    value: "售出產品廢棄處理",
    description: "如：顧客丟棄產品後的處理排放",
  },
  {
    key: 'DOWNSTREAM_LEASED_ASSETS',
    value: "下游租賃資產",
    description: "如：出租給他人的資產營運排放",
  },
  {
    key: 'FRANCHISES',
    value: "特許經營/加盟",
    description: "如：加盟商的營運排放",
  },
  {
    key: 'INVESTMENTS',
    value: "投資",
    description: "如：來自股權、債券等金融投資的排放",
  },

  // 其他常規追蹤項目
  {
    key: 'WATER_CONSUMPTION',
    value: "水資源消耗",
    description: "如：自來水用量",
  },
]

// {
//   // 範疇一：直接排放 (Direct Emissions)
//   STATIONARY_COMBUSTION: "定點燃燒",// 如：鍋爐、發電機、瓦斯
//   MOBILE_COMBUSTION: "移動燃燒",// 如：公司公務車油耗
//   FUGITIVE_EMISSION: "逸散排放",// 如：冷氣冷媒填充、滅火器、化糞池
//   PROCESS_EMISSION: "製程排放",// 如：生產過程化學反應產生的溫室氣體

//   // 範疇二：能源間接排放 (Energy Indirect Emissions)
//   ELECTRICITY_USAGE: "電力使用",// 最常見，如：電費單度數
//   HEAT_AND_STEAM: "熱能與蒸汽",// 外購的熱能或蒸汽
//   PURCHASED_COOLING: "外購冷能",// 外購的冷能  

//   // 範疇三：其他間接排放 (Other Indirect Emissions - GHG Protocol 15 Categories)
//   PURCHASED_GOODS: "購買商品與服務",// (Category 1) 供應鏈採購的產品或服務
//   CAPITAL_GOODS: "資本財",// (Category 2) 購買的設備、建築物等固定資產
//   FUEL_AND_ENERGY_RELATED_ACTIVITIES: "燃料與能源相關活動",// (Category 3) 非範疇一與二的能源相關排放
//   UPSTREAM_LOGISTICS: "上游運輸",// (Category 4) 貨物配送與物流
//   WASTE_DISPOSAL: "廢棄物處理",// (Category 5) 公司產生的垃圾與資源回收
//   BUSINESS_TRAVEL: "商務差旅",// (Category 6) 員工出差（飛機、高鐵、計程車）
//   EMPLOYEE_COMMUTING: "員工通勤",// (Category 7) 員工上下班交通 (可包含遠距辦公)
//   UPSTREAM_LEASED_ASSETS: "上游租賃資產",// (Category 8) 承租資產營運的排放
//   DOWNSTREAM_LOGISTICS: "下游運輸",// (Category 9) 客戶產品運輸與配送
//   PROCESSING_OF_SOLD_PRODUCTS: "售出產品加工",// (Category 10) 客戶對售出半成品進行加工的排放
//   USE_OF_SOLD_PRODUCTS: "售出產品使用",// (Category 11) 產品在其生命週期內使用產生的排放
//   END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS: "售出產品廢棄處理",// (Category 12) 顧客丟棄產品後的處理排放
//   DOWNSTREAM_LEASED_ASSETS: "下游租賃資產",// (Category 13) 出租給他人的資產營運排放
//   FRANCHISES: "特許經營/加盟",// (Category 14) 加盟商的營運排放
//   INVESTMENTS: "投資",// (Category 15) 來自股權、債券等金融投資的排放
  
//   // 其他常規追蹤項目
//   WATER_CONSUMPTION: "水資源消耗"// 如：自來水用量
// }
