import { EsgFallbackCategory } from "@/constants/enums";

export interface IEmissionFactorRule {
  taxIds: string[];
  aliases: string[];
  fallbackCategory: EsgFallbackCategory; // Info: (20260521 - Tzuhan) 強制對應 EsgParsingSchema 內的 Enum
}

export const ESG_DETERMINISTIC_RULES: IEmissionFactorRule[] = [
  // Info: (20260521 - Tzuhan) --- 能源與燃料 (Scope 1 & 2) ---
  {
    taxIds: ["04308811"], // Info: (20260521 - Tzuhan) 台電
    aliases: ["台灣電力", "台電", "台灣電力公司"],
    fallbackCategory: EsgFallbackCategory.ELECTRICITY_AND_HEAT,
  },
  {
    taxIds: [
      "03750800", // Info: (20260521 - Tzuhan) 欣欣天然氣
      "03444007", // Info: (20260521 - Tzuhan) 大台北區瓦斯
      "52538101", // Info: (20260521 - Tzuhan) 欣中天然氣
      "76005707", // Info: (20260521 - Tzuhan) 欣高石油氣
      "03373708", // Info: (20260521 - Tzuhan) 陽明山瓦斯
    ],
    aliases: ["天然氣", "瓦斯公司", "欣欣天然氣", "大台北瓦斯", "欣中天然氣"],
    fallbackCategory: EsgFallbackCategory.NATURAL_GAS,
  },
  {
    taxIds: [
      "03707901", // Info: (20260521 - Tzuhan) 台灣中油
      "86522210", // Info: (20260521 - Tzuhan) 台塑石化
      "23522245", // Info: (20260521 - Tzuhan) 全國加油站
      "23395932", // Info: (20260521 - Tzuhan) 統一精工 (Smile)
      "16084705", // Info: (20260521 - Tzuhan) 山隆通運 (山隆加油站)
      "23078441", // Info: (20260521 - Tzuhan) 北基國際
      "07505126", // Info: (20260521 - Tzuhan) 福懋興業 (福懋加油站)
    ],
    aliases: [
      "台灣中油",
      "中油",
      "台塑石油",
      "台塑石化",
      "全國加油站",
      "統一精工",
      "山隆加油站",
      "北基加油站",
      "福懋加油站",
    ],
    fallbackCategory: EsgFallbackCategory.GASOLINE_AND_AVIATION,
  },
  {
    taxIds: [], // Info: (20260521 - Tzuhan) 柴油/重油通常也來自中油，但獨立大類
    aliases: ["中油重油", "台塑柴油", "船用燃油", "重油供應商", "鍋爐燃料油"],
    fallbackCategory: EsgFallbackCategory.DIESEL_AND_HEAVY_OIL,
  },
  {
    taxIds: ["03566107"], // Info: (20260521 - Tzuhan) 煤炭進口商等
    aliases: ["台灣煤礦", "無煙煤", "煤炭供應商", "冶金煤"],
    fallbackCategory: EsgFallbackCategory.COAL_AND_SOLID_FUEL,
  },
  {
    taxIds: ["03794905"], // Info: (20260521 - Tzuhan) 台灣糖業
    aliases: ["台灣糖業", "台糖", "永豐餘生技", "生質柴油", "生質酒精"],
    fallbackCategory: EsgFallbackCategory.BIOMASS_AND_ALTERNATIVE,
  },

  // Info: (20260521 - Tzuhan) --- 逸散與環境 (Scope 1 & 3) ---
  {
    taxIds: ["22314545", "11822254"], // Info: (20260521 - Tzuhan) 聯華氣體、三福氣體
    aliases: [
      "聯華氣體",
      "三福氣體",
      "亞東工業氣體",
      "大陽日酸",
      "冷媒補充",
      "工業氣體",
    ],
    fallbackCategory: EsgFallbackCategory.REFRIGERANT_AND_INDUSTRIAL_GAS,
  },
  {
    taxIds: ["05937404", "01181829"], // Info: (20260521 - Tzuhan) 台灣自來水、臺北自來水
    aliases: ["台灣自來水", "臺北自來水", "自來水", "水費"],
    fallbackCategory: EsgFallbackCategory.WATER_AND_WASTEWATER,
  },
  {
    taxIds: ["16892695", "96979606"], // Info: (20260521 - Tzuhan) 可寧衛、日友環保
    aliases: [
      "可寧衛",
      "日友環保",
      "崑鼎",
      "台灣鋼聯",
      "廢棄物清運",
      "資源回收",
    ],
    fallbackCategory: EsgFallbackCategory.WASTE_MANAGEMENT,
  },

  // Info: (20260521 - Tzuhan) --- 交通與物流 (Scope 1 & 3) ---
  {
    taxIds: [
      "16446274", // Info: (20260521 - Tzuhan) 台灣高鐵
      "05041005", // Info: (20260521 - Tzuhan) 台灣鐵路
      "89758784", // Info: (20260521 - Tzuhan) 台北捷運
      "53535916", // Info: (20260521 - Tzuhan) 桃園捷運
      "28440598", // Info: (20260521 - Tzuhan) 高雄捷運
      "53140510", // Info: (20260521 - Tzuhan) 統聯客運
      "05901103", // Info: (20260521 - Tzuhan) 國光客運
    ],
    aliases: [
      "台灣高鐵",
      "高鐵",
      "台灣鐵路",
      "台鐵",
      "台北捷運",
      "北捷",
      "捷運",
      "統聯客運",
      "國光客運",
      "大都會客運",
      "台灣大車隊",
      "和泰智行",
      "yoxi",
      "Uber",
    ],
    fallbackCategory: EsgFallbackCategory.LAND_TRANSPORT_AND_COMMUTE,
  },
  {
    taxIds: [
      "03640201", // Info: (20260521 - Tzuhan) 中華航空
      "23485750", // Info: (20260521 - Tzuhan) 長榮航空
      "54366967", // Info: (20260521 - Tzuhan) 星宇航空
    ],
    aliases: [
      "中華航空",
      "華航",
      "長榮航空",
      "星宇航空",
      "機票",
      "航空",
      "Airlines",
    ],
    fallbackCategory: EsgFallbackCategory.AVIATION,
  },
  {
    taxIds: [
      "03741302", // Info: (20260521 - Tzuhan) 中華郵政
      "70826986", // Info: (20260521 - Tzuhan) 統一速達 (黑貓)
      "70825369", // Info: (20260521 - Tzuhan) 台灣宅配通
      "47214643", // Info: (20260521 - Tzuhan) 新竹物流
      "16084705", // Info: (20260521 - Tzuhan) 山隆通運
      "23136209", // Info: (20260521 - Tzuhan) 嘉里大榮
    ],
    aliases: [
      "中華郵政",
      "郵局",
      "統一速達",
      "黑貓宅急便",
      "台灣宅配通",
      "新竹物流",
      "嘉里大榮",
      "聯邦快遞",
      "FedEx",
      "DHL",
      "UPS",
    ],
    fallbackCategory: EsgFallbackCategory.FREIGHT_AND_LOGISTICS,
  },

  // Info: (20260521 - Tzuhan) --- 採購商品 (Scope 3 - 實體物品) ---
  {
    taxIds: ["07366304", "07366601"], // Info: (20260521 - Tzuhan) 台塑、南亞塑膠
    aliases: [
      "台灣塑膠",
      "南亞塑膠",
      "正新橡膠",
      "建大工業",
      "塑膠原料",
      "橡膠製品",
    ],
    fallbackCategory: EsgFallbackCategory.PLASTICS_AND_RUBBER,
  },
  {
    taxIds: ["07302409", "12140440"], // Info: (20260521 - Tzuhan) 中鋼、東和鋼鐵
    aliases: [
      "中國鋼鐵",
      "中鋼",
      "中龍鋼鐵",
      "東和鋼鐵",
      "燁輝",
      "大成鋼",
      "五金行",
    ],
    fallbackCategory: EsgFallbackCategory.METALS_AND_MINERALS,
  },
  {
    taxIds: ["33022511", "11036404"], // Info: (20260521 - Tzuhan) 正隆、永豐餘
    aliases: ["正隆", "永豐餘", "中華紙漿", "榮成紙業", "紙箱供應", "木材行"],
    fallbackCategory: EsgFallbackCategory.PAPER_AND_WOOD,
  },
  {
    taxIds: ["04377301", "84149961", "23091913"], // Info: (20260521 - Tzuhan) 鴻海、廣達、燦坤
    aliases: [
      "鴻海",
      "廣達",
      "緯創",
      "仁寶",
      "台達電",
      "華碩",
      "宏碁",
      "燦坤",
      "全國電子",
      "良興",
      "原價屋",
      "順發3C",
    ],
    fallbackCategory: EsgFallbackCategory.ELECTRONICS_AND_ELECTRICAL,
  },
  {
    taxIds: ["11306307", "03061103"], // Info: (20260521 - Tzuhan) 長春石化、李長榮
    aliases: [
      "長春石化",
      "李長榮化工",
      "和益化工",
      "台灣肥料",
      "台肥",
      "化學原料",
      "溶劑供應",
    ],
    fallbackCategory: EsgFallbackCategory.CHEMICALS_AND_SOLVENTS,
  },
  {
    taxIds: ["73251209", "07301103"], // Info: (20260521 - Tzuhan) 統一企業、大成
    aliases: [
      "統一企業",
      "大成長城",
      "卜蜂",
      "味全",
      "泰山",
      "全聯",
      "家樂福",
      "好市多",
      "大潤發",
    ],
    fallbackCategory: EsgFallbackCategory.AGRICULTURE_AND_FOOD,
  },
  {
    taxIds: ["34389006", "04364007"], // Info: (20260521 - Tzuhan) 儒鴻、聚陽
    aliases: [
      "儒鴻",
      "聚陽",
      "遠東新世紀",
      "福懋興業",
      "南緯",
      "制服訂製",
      "紡織廠",
    ],
    fallbackCategory: EsgFallbackCategory.TEXTILES_AND_APPAREL,
  },

  // Info: (20260521 - Tzuhan) --- 採購服務與資本財 (Scope 3 - 無形服務) ---
  {
    taxIds: [
      "96979933", // Info: (20260521 - Tzuhan) 中華電信
      "97176270", // Info: (20260521 - Tzuhan) 台灣大哥大
      "97174246", // Info: (20260521 - Tzuhan) 遠傳電信
    ],
    aliases: [
      "中華電信",
      "台灣大哥大",
      "台哥大",
      "遠傳電信",
      "遠傳",
      "亞太電信",
      "台灣之星",
      "是方電訊",
      "宏碁資訊",
      "精誠資訊",
      "微軟",
      "Google",
      "AWS",
      "Amazon Web Services",
    ],
    fallbackCategory: EsgFallbackCategory.IT_AND_TELECOM,
  },
  {
    taxIds: ["22956247", "89397604", "16096817"], // Info: (20260521 - Tzuhan) 王品、麥當勞、星巴克
    aliases: [
      "晶華酒店",
      "老爺酒店",
      "國賓大飯店",
      "萬豪酒店",
      "王品",
      "瓦城",
      "八方雲集",
      "麥當勞",
      "肯德基",
      "星巴克",
      "路易莎",
      "外送",
      "Uber Eats",
      "Foodpanda",
    ],
    fallbackCategory: EsgFallbackCategory.ACCOMMODATION_AND_DINING,
  },
  {
    taxIds: ["11335013", "70505105"], // Info: (20260521 - Tzuhan) 中租迪和、和運租車
    aliases: [
      "中租迪和",
      "和運租車",
      "格上租車",
      "裕融",
      "租賃",
      "設備出租",
      "商務中心",
    ],
    fallbackCategory: EsgFallbackCategory.REAL_ESTATE_AND_EQUIPMENT_RENTAL,
  },
  {
    taxIds: [],
    aliases: [
      "勤業眾信",
      "資誠",
      "安侯建業",
      "安永",
      "理律法律事務所",
      "廣告公司",
      "公關公司",
      "保全公司",
      "清潔公司",
      "人力派遣",
      "顧問費",
    ],
    fallbackCategory: EsgFallbackCategory.PROFESSIONAL_SERVICES,
  },

  // Info: (20260521 - Tzuhan) --- 兜底防線 ---
  {
    taxIds: [],
    aliases: ["其他雜項", "未分類支出", "零星採購", "其他供應商"],
    fallbackCategory: EsgFallbackCategory.OTHER_UNKNOWN,
  },
];
