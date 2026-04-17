// const UNIT_LIST = ["kWh", "L", "kg", "m³", "km", "ton", "次", "件"];

// Info: (20260417 - Julian) ESG 活動類型列舉
export enum EsgActivityType {
  // 範疇一：直接排放 (Direct Emissions)
  STATIONARY_COMBUSTION = "定點燃燒",// 如：鍋爐、發電機、瓦斯
  MOBILE_COMBUSTION = "移動燃燒",// 如：公司公務車油耗
  FUGITIVE_EMISSION = "逸散排放",// 如：冷氣冷媒填充、滅火器


  // 範疇二：能源間接排放 (Energy Indirect Emissions)
  ELECTRICITY_USAGE = "電力使用",// 最常見，如：電費單度數
  HEAT_AND_STEAM = "熱能與蒸汽",// 外購的熱能或蒸汽


  // 範疇三：其他間接排放 (Other Indirect Emissions)
  BUSINESS_TRAVEL = "商務差旅",// 員工出差（飛機、高鐵、計程車）
  EMPLOYEE_COMMUTING = "員工通勤",// 員工上下班交通
  PURCHASED_GOODS = "購買商品與服務",// 供應鏈採購
  UPSTREAM_LOGISTICS = "上游運輸",// 貨物配送與物流
  WASTE_DISPOSAL = "廢棄物處理",// 公司產生的垃圾與資源回收
  WATER_CONSUMPTION = "水資源消耗"
}
