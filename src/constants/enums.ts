// Info: (20260514 - Tzuhan) Centralized constants to replace Prisma Enums

// Info: (20260525 - Tzuhan) 1. 擴充後的物理單位 Enum (The Flat Dictionary)
export enum MeasurementUnit {
  // Info: (20260525 - Tzuhan) --- 質量 (Mass) ---
  KG = "KG",
  TONNE = "TONNE",
  GRAM = "GRAM",

  // Info: (20260525 - Tzuhan) --- 體積 (Volume) ---
  LITER = "LITER",
  GALLON = "GALLON",
  M3 = "M3", // Info: (20260525 - Tzuhan) 立方公尺 (水、天然氣)

  // Info: (20260525 - Tzuhan) --- 能量與熱值 (Energy) ---
  KWH = "KWH",
  MWH = "MWH",
  GJ = "GJ", // Info: (20260525 - Tzuhan) 十億焦耳

  // Info: (20260525 - Tzuhan) --- 距離與運力 (Distance & Transport) ---
  KM = "KM",
  TKM = "TKM", // Info: (20260525 - Tzuhan) 延噸公里 (Scope 3 物流)
  PKM = "PKM", // Info: (20260525 - Tzuhan) 延人公里 (Scope 3 差旅)

  // Info: (20260525 - Tzuhan) --- 計數 (Count) ---
  PIECE = "PIECE",
}

// Info: (20260525 - Tzuhan) 2. 定義量綱類別 (Physical Dimensions)
export enum PhysicalDimension {
  MASS = "MASS",
  VOLUME = "VOLUME",
  ENERGY = "ENERGY",
  TRANSPORT = "TRANSPORT",
  MONEY = "MONEY",
  COUNT = "COUNT",
  UNKNOWN = "UNKNOWN",
}

// Info: (20260525 - Tzuhan) 3. 建立 O(1) 量綱映射表 (The Dimensional Guard Matrix)
export const UnitDimensionMap: Record<MeasurementUnit, PhysicalDimension> = {
  [MeasurementUnit.KG]: PhysicalDimension.MASS,
  [MeasurementUnit.TONNE]: PhysicalDimension.MASS,
  [MeasurementUnit.GRAM]: PhysicalDimension.MASS,

  [MeasurementUnit.LITER]: PhysicalDimension.VOLUME,
  [MeasurementUnit.GALLON]: PhysicalDimension.VOLUME,
  [MeasurementUnit.M3]: PhysicalDimension.VOLUME,

  [MeasurementUnit.KWH]: PhysicalDimension.ENERGY,
  [MeasurementUnit.MWH]: PhysicalDimension.ENERGY,
  [MeasurementUnit.GJ]: PhysicalDimension.ENERGY,

  [MeasurementUnit.KM]: PhysicalDimension.TRANSPORT,
  [MeasurementUnit.TKM]: PhysicalDimension.TRANSPORT,
  [MeasurementUnit.PKM]: PhysicalDimension.TRANSPORT,

  [MeasurementUnit.PIECE]: PhysicalDimension.COUNT,
};

// Info: (20260525 - Tzuhan) 4. 量綱一致性防護函數 (用於後端寫入與計算前)
export const verifyDimensionalConsistency = (
  docUnit: string,
  coefUnit: string,
): boolean => {
  const getDimension = (u: string): PhysicalDimension => {
    // Info: (20260526 - Tzuhan) 1. 若為標準物理單位
    if (UnitDimensionMap[u as MeasurementUnit]) {
      return UnitDimensionMap[u as MeasurementUnit];
    }
    // Info: (20260526 - Tzuhan)    // 2. 若為外幣字串 (透過 CountryCode 整合清單驗證)
    if (FIAT_CURRENCIES.includes(u)) {
      return PhysicalDimension.MONEY;
    }
    return PhysicalDimension.UNKNOWN;
  };

  const docDim = getDimension(docUnit);
  const coefDim = getDimension(coefUnit);
  return docDim === coefDim && docDim !== PhysicalDimension.UNKNOWN;
};

export enum EsgGenerationSource {
  MANUAL_ENTRY = "MANUAL_ENTRY", // Info: (20260521 - Tzuhan) 人工輸入或修正。
  SYSTEM_DETERMINISTIC = "SYSTEM_DETERMINISTIC", // Info: (20260521 - Tzuhan) 規則引擎命中（例如：免計碳排的繳費單），100% 決定論。
  AI_GENERATED = "AI_GENERATED", // Info: (20260521 - Tzuhan) AI 順利萃取資料，並結合資料庫得出具備一定信心的標準碳排數據。
  AI_SPECULATIVE = "AI_SPECULATIVE", // Info: (20260521 - Tzuhan) RAG 未命中，AI 執行語意降級，系統強制套用「該大類最高碳排係數」的保守推測值。
}

export enum JournalGenerationSource {
  MANUAL_ENTRY = "MANUAL_ENTRY", // Info: (20260521 - Tzuhan) 人工輸入或修正。
  SYSTEM_DETERMINISTIC = "SYSTEM_DETERMINISTIC", // Info: (20260521 - Tzuhan) 系統決定論。包含規則引擎命中，與 Vector RAG 精準匹配到合法科目。
  SYSTEM_SUSPENSE = "SYSTEM_SUSPENSE", // Info: (20260521 - Tzuhan) 系統強制懸記。RAG 匹配失敗時，系統強制打入暫付款或 PL 隔離區的虛擬配平。
  AI_SPECULATIVE = "AI_SPECULATIVE", // Info: (20260522 - Tzuhan) AI 選擇之科目，必須經人工覆核。
}

export enum VoucherPaymentStatus {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export enum DocumentType {
  ACCRUAL_NOTICE = "ACCRUAL_NOTICE",
  PAYMENT_RECEIPT = "PAYMENT_RECEIPT",
  OTHERS = "OTHERS",
}

export enum CountryCode {
  TW = "TW",
  US = "US",
  JP = "JP",
  CN = "CN",
  HK = "HK",
  KR = "KR",
}

// Info: (20260526 - Tzuhan) 將法幣與國家代碼整合
export const CurrencyMap: Record<CountryCode, string> = {
  [CountryCode.TW]: "TWD",
  [CountryCode.US]: "USD",
  [CountryCode.JP]: "JPY",
  [CountryCode.CN]: "CNY",
  [CountryCode.HK]: "HKD",
  [CountryCode.KR]: "KRW",
};

export const FIAT_CURRENCIES = Object.values(CurrencyMap);

export enum EsgFallbackCategory {
  // Info: (20260521 - Tzuhan) --- 能源與燃料 (Scope 1 & 2) ---
  ELECTRICITY_AND_HEAT = "外購電力與熱能",
  NATURAL_GAS = "天然氣與瓦斯",
  GASOLINE_AND_AVIATION = "汽油與航空燃油",
  DIESEL_AND_HEAVY_OIL = "柴油與重油",
  COAL_AND_SOLID_FUEL = "煤炭與固體燃料",
  BIOMASS_AND_ALTERNATIVE = "生質能與替代燃料",

  // Info: (20260521 - Tzuhan) --- 逸散與環境 (Scope 1 & 3) ---
  REFRIGERANT_AND_INDUSTRIAL_GAS = "冷媒與工業氣體",
  WATER_AND_WASTEWATER = "自來水與污水處理",
  WASTE_MANAGEMENT = "廢棄物處理與回收",

  // Info: (20260521 - Tzuhan) --- 交通與物流 (Scope 1 & 3) ---
  LAND_TRANSPORT_AND_COMMUTE = "陸上交通與通勤",
  AVIATION = "航空運輸",
  FREIGHT_AND_LOGISTICS = "貨運與物流",

  // Info: (20260521 - Tzuhan) --- 採購商品 (Scope 3 - 實體物品) ---
  PLASTICS_AND_RUBBER = "塑膠與橡膠製品",
  METALS_AND_MINERALS = "金屬與礦物製品",
  PAPER_AND_WOOD = "紙製品與木材",
  ELECTRONICS_AND_ELECTRICAL = "電子與電機設備",
  CHEMICALS_AND_SOLVENTS = "化學品與溶劑",
  AGRICULTURE_AND_FOOD = "農林漁牧與食品",
  TEXTILES_AND_APPAREL = "紡織與服飾",

  // Info: (20260521 - Tzuhan) --- 採購服務與資本財 (Scope 3 - 無形服務) ---
  IT_AND_TELECOM = "資訊與通訊服務",
  ACCOMMODATION_AND_DINING = "住宿與餐飲服務",
  REAL_ESTATE_AND_EQUIPMENT_RENTAL = "不動產與設備租賃",
  PROFESSIONAL_SERVICES = "專業與各項服務",

  // Info: (20260521 - Tzuhan) --- 兜底防線 ---
  OTHER_UNKNOWN = "其他未知項目",
}

export enum UniversalAccountTag {
  // Info: (20260522 - Tzuhan) 資產 (Assets)
  CASH = "CASH",
  CASH_IN_BANK = "CASH_IN_BANK",
  ACCOUNTS_RECEIVABLE = "ACCOUNTS_RECEIVABLE",
  NOTES_RECEIVABLE = "NOTES_RECEIVABLE",
  INVENTORY = "INVENTORY",
  PREPAID_EXPENSE = "PREPAID_EXPENSE",
  PREPAID_RENT = "PREPAID_RENT",
  INPUT_TAX = "INPUT_TAX", // Info: (20260522 - Tzuhan) 進項稅額
  REFUNDABLE_DEPOSITS = "REFUNDABLE_DEPOSITS",
  FIXED_ASSETS = "FIXED_ASSETS",
  INTANGIBLE_ASSETS = "INTANGIBLE_ASSETS",

  // Info: (20260522 - Tzuhan) 負債 (Liabilities)
  SHORT_TERM_BORROWINGS = "SHORT_TERM_BORROWINGS",
  ACCOUNTS_PAYABLE = "ACCOUNTS_PAYABLE",
  NOTES_PAYABLE = "NOTES_PAYABLE",
  OTHER_PAYABLES = "OTHER_PAYABLES",
  ACCRUED_RENT = "ACCRUED_RENT",
  OUTPUT_TAX = "OUTPUT_TAX", // Info: (20260522 - Tzuhan) 銷項稅額
  INCOME_TAX_PAYABLE = "INCOME_TAX_PAYABLE",
  LONG_TERM_BORROWINGS = "LONG_TERM_BORROWINGS",

  // Info: (20260522 - Tzuhan) 權益 (Equity)
  COMMON_STOCK = "COMMON_STOCK",
  RETAINED_EARNINGS = "RETAINED_EARNINGS",

  // Info: (20260522 - Tzuhan) 收益 (Revenues)
  REVENUE = "REVENUE",
  SALES_REVENUE = "SALES_REVENUE",
  SERVICE_REVENUE = "SERVICE_REVENUE",
  INTEREST_REVENUE = "INTEREST_REVENUE",

  // Info: (20260522 - Tzuhan) 費損 (Expenses)
  EXPENSE = "EXPENSE",
  COST_OF_GOODS_SOLD = "COST_OF_GOODS_SOLD",
  WAGE_EXPENSE = "WAGE_EXPENSE",
  PENSION_EXPENSE = "PENSION_EXPENSE",
  RENT_EXPENSE = "RENT_EXPENSE",
  OFFICE_SUPPLIES = "OFFICE_SUPPLIES",
  TRAVEL_EXPENSE = "TRAVEL_EXPENSE",
  SHIPPING_EXPENSE = "SHIPPING_EXPENSE",
  TELECOM_EXPENSE = "TELECOM_EXPENSE",
  REPAIR_AND_MAINTENANCE = "REPAIR_AND_MAINTENANCE",
  MARKETING_EXPENSE = "MARKETING_EXPENSE",
  INSURANCE_EXPENSE = "INSURANCE_EXPENSE",
  ENTERTAINMENT_EXPENSE = "ENTERTAINMENT_EXPENSE",
  SOFTWARE_EXPENSE = "SOFTWARE_EXPENSE",
  DEPRECIATION_EXPENSE = "DEPRECIATION_EXPENSE",
  AMORTIZATION_EXPENSE = "AMORTIZATION_EXPENSE",
  MEAL_EXPENSE = "MEAL_EXPENSE",
  TRAINING_EXPENSE = "TRAINING_EXPENSE",
  DONATION_EXPENSE = "DONATION_EXPENSE",
  TAX_EXPENSE = "TAX_EXPENSE",
  BANK_FEE = "BANK_FEE",
  INTEREST_EXPENSE = "INTEREST_EXPENSE",
  MISCELLANEOUS_EXPENSE = "MISCELLANEOUS_EXPENSE",
  UTILITIES_EXPENSE = "UTILITIES_EXPENSE",

  UNKNOWN = "UNKNOWN",
}
