// Info: (20260803 - Tzuhan) ISO 14064-1:2018 子代碼 → GHG Protocol 範疇/類別 映射(Issue B)
// Info: (20260803 - Tzuhan) 見 issue_drafts/inventory_table_import/00_plan.md 的 Issue B 第 1 點。
//
// Info: (20260803 - Tzuhan) 為什麼需要「子代碼」這一層:
// Info: (20260803 - Tzuhan) computedLedger 的 scopeCategory 用 GhgProtocolCategory(範疇一/二 + 15 類),
// Info: (20260803 - Tzuhan) 而盤查報告用 ISO 14064 的類別一~六。**類別層是 1:多,映不過去**——
// Info: (20260803 - Tzuhan) 「類別三」同時包含上游運輸、下游運輸、通勤、差旅,對應到四個不同的 Scope 3 類別。
// Info: (20260803 - Tzuhan) 但表3.8 的子代碼(3.1、3.2、3.3…)是 1:1 的,所以映射必須發生在子代碼這一層。
//
// Info: (20260803 - Tzuhan) 這張表是唯讀常數而非 LLM 判斷:歸類決定了排放量落在哪個範疇,
// Info: (20260803 - Tzuhan) 錯了會讓查核者對著錯的範疇小計看半天。歸類是規則不是理解。

import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";

/**
 * Info: (20260803 - Tzuhan) 表3.8 的子代碼。字串值即原文的代碼,
 * 供解析器以代碼(而非中文名稱)比對 —— 中文名稱各家報告寫法不一,代碼是標準的。
 */
export enum Iso14064SubCategory {
  STATIONARY_COMBUSTION = "1.1",
  MOBILE_COMBUSTION = "1.2",
  INDUSTRIAL_PROCESS = "1.3",
  FUGITIVE = "1.4",
  LAND_USE = "1.5",
  PURCHASED_ELECTRICITY = "2.1",
  PURCHASED_ENERGY = "2.2",
  UPSTREAM_TRANSPORT = "3.1",
  DOWNSTREAM_TRANSPORT = "3.2",
  EMPLOYEE_COMMUTING = "3.3",
  CUSTOMER_VISITOR_TRANSPORT = "3.4",
  BUSINESS_TRAVEL = "3.5",
  PURCHASED_GOODS = "4.1",
  CAPITAL_GOODS = "4.2",
  SOLID_LIQUID_WASTE = "4.3",
  ASSET_USE = "4.4",
  SERVICE_USE = "4.5",
  PRODUCT_USE_PHASE = "5.1",
  DOWNSTREAM_LEASED_ASSET = "5.2",
  PRODUCT_END_OF_LIFE = "5.3",
  INVESTMENT = "5.4",
  OTHER_INDIRECT = "6",
}

/**
 * Info: (20260807 - Tzuhan) 子代碼的**標準名稱**(ISO 14064-1:2018 的類別名)。
 *
 * ## 為什麼需要
 *
 * 桑基圖的末端節點原本只印代碼(`2.1 3470.34`)。代碼對系統夠用,對讀者不夠 ——
 * 這張圖是給查證人員與主管看的,而「2.1」要回頭翻表才知道是外購電力。
 * 實測回報就是「尾端看不出流向哪裡」。
 *
 * ## 為什麼不用原文報告裡的名稱
 *
 * 解析器刻意只認代碼(見 `findSubCategory`):中文名稱各家報告寫法不一
 * (「外購電力」/「電力(外購)」/「購入電力」),而代碼是標準的。
 * 顯示名若改跟原文,同一個 2.1 在不同報告會印出不同名字,圖與圖之間就對不起來。
 * 這裡用**標準本身的名稱**,是決定性的,且不隨 LLM 輸出漂移。
 *
 * ## 為什麼只有中英
 *
 * 沿用 `formatGhgCategoryLabel` / `formatIsoCategoryLabel` 同一慣例
 * (zh 系 → nameZh,其餘 → nameEn)。這裡是領域術語而非介面文案,
 * 因此不進 i18n 檔 —— 那五份檔案是給介面字串用的,把標準的類別名散進去,
 * 五份就會各自漂移。
 */
export interface IIso14064SubCategoryDetail {
  nameZh: string;
  nameEn: string;
}

export const Iso14064SubCategoryDetails: Readonly<
  Record<Iso14064SubCategory, IIso14064SubCategoryDetail>
> = {
  [Iso14064SubCategory.STATIONARY_COMBUSTION]: {
    nameZh: "固定式燃燒",
    nameEn: "Stationary combustion",
  },
  [Iso14064SubCategory.MOBILE_COMBUSTION]: {
    nameZh: "移動式燃燒",
    nameEn: "Mobile combustion",
  },
  [Iso14064SubCategory.INDUSTRIAL_PROCESS]: {
    nameZh: "工業製程",
    nameEn: "Industrial process",
  },
  [Iso14064SubCategory.FUGITIVE]: {
    nameZh: "逸散排放",
    nameEn: "Fugitive emissions",
  },
  [Iso14064SubCategory.LAND_USE]: {
    nameZh: "土地使用與變化",
    nameEn: "Land use and land-use change",
  },
  [Iso14064SubCategory.PURCHASED_ELECTRICITY]: {
    nameZh: "外購電力",
    nameEn: "Purchased electricity",
  },
  [Iso14064SubCategory.PURCHASED_ENERGY]: {
    nameZh: "外購能源(蒸汽/熱/冷)",
    nameEn: "Purchased energy (steam, heat, cooling)",
  },
  [Iso14064SubCategory.UPSTREAM_TRANSPORT]: {
    nameZh: "上游運輸與配送",
    nameEn: "Upstream transport and distribution",
  },
  [Iso14064SubCategory.DOWNSTREAM_TRANSPORT]: {
    nameZh: "下游運輸與配送",
    nameEn: "Downstream transport and distribution",
  },
  [Iso14064SubCategory.EMPLOYEE_COMMUTING]: {
    nameZh: "員工通勤",
    nameEn: "Employee commuting",
  },
  [Iso14064SubCategory.CUSTOMER_VISITOR_TRANSPORT]: {
    nameZh: "客戶與訪客運輸",
    nameEn: "Client and visitor transport",
  },
  [Iso14064SubCategory.BUSINESS_TRAVEL]: {
    nameZh: "商務旅行",
    nameEn: "Business travel",
  },
  [Iso14064SubCategory.PURCHASED_GOODS]: {
    nameZh: "採購商品",
    nameEn: "Purchased goods",
  },
  [Iso14064SubCategory.CAPITAL_GOODS]: {
    nameZh: "資本設備",
    nameEn: "Capital goods",
  },
  [Iso14064SubCategory.SOLID_LIQUID_WASTE]: {
    nameZh: "固體與液體廢棄物處理",
    nameEn: "Disposal of solid and liquid waste",
  },
  [Iso14064SubCategory.ASSET_USE]: {
    nameZh: "資產使用",
    nameEn: "Use of assets",
  },
  [Iso14064SubCategory.SERVICE_USE]: {
    nameZh: "服務使用",
    nameEn: "Use of services",
  },
  [Iso14064SubCategory.PRODUCT_USE_PHASE]: {
    nameZh: "產品使用階段",
    nameEn: "Use stage of the product",
  },
  [Iso14064SubCategory.DOWNSTREAM_LEASED_ASSET]: {
    nameZh: "下游租賃資產",
    nameEn: "Downstream leased assets",
  },
  [Iso14064SubCategory.PRODUCT_END_OF_LIFE]: {
    nameZh: "產品生命終期",
    nameEn: "End of life of the product",
  },
  [Iso14064SubCategory.INVESTMENT]: {
    nameZh: "投資",
    nameEn: "Investments",
  },
  [Iso14064SubCategory.OTHER_INDIRECT]: {
    nameZh: "其他來源之間接排放",
    nameEn: "Indirect emissions from other sources",
  },
};

/**
 * Info: (20260807 - Tzuhan) 子代碼顯示名:`2.1 外購電力`。
 *
 * **代碼放前面**是刻意的:讀者要能拿這個標籤回頭在原文表3.8 裡逐格對照,
 * 而原文只有代碼。名稱是為了看得懂,代碼是為了查得到,兩者都要。
 *
 * 未知代碼原樣返回,不猜 —— 一個編出來的類別名會讓查核者對著錯的分類看半天。
 */
export const formatIsoSubCategoryLabel = (
  subCategory: string,
  language: string,
  maxWidth?: number,
): string => {
  const detail = Iso14064SubCategoryDetails[subCategory as Iso14064SubCategory];
  if (!detail) return subCategory;
  const name = language.startsWith("zh") ? detail.nameZh : detail.nameEn;
  const label = `${subCategory} ${name}`;
  if (maxWidth === undefined) return label;
  return truncateToDisplayWidth(label, maxWidth, subCategory);
};

/**
 * Info: (20260807 - Emily) 顯示寬度:全形(CJK、全形標點)算 2,其餘算 1。
 *
 * 這不是雞蛋裡挑骨頭 —— 版面上會不會疊字取決於實際佔寬,
 * 而中文 12 字與英文 12 字在畫面上差一倍。以字元數為單位的上限
 * 必然在其中一種語言上是錯的。
 */
export const displayWidth = (text: string): number =>
  [...text].reduce(
    (width, char) => width + (FULLWIDTH_PATTERN.test(char) ? 2 : 1),
    0,
  );

// Info: (20260807 - Emily) CJK 統一表意文字、假名、諺文與 CJK 標點(全形括號等)
const FULLWIDTH_PATTERN =
  /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;

// Info: (20260807 - Emily) 截斷用的省略符號(全形,寬度 1 —— U+2026 為窄形)
const ELLIPSIS = "\u2026";

/**
 * Info: (20260807 - Emily) 依顯示寬度截斷,並保證 `keepPrefix` 完整留下。
 *
 * `keepPrefix` 是子代碼 —— 它是讀者回原文表3.8 逐格對照的唯一線索,
 * 截掉代碼等於把這個標籤變成看得懂但查不到。名稱可以短,代碼不能缺。
 * 連代碼都放不下時就只回代碼:寧可少了名稱,不要給一個半截的名稱。
 */
export const truncateToDisplayWidth = (
  text: string,
  maxWidth: number,
  keepPrefix: string,
): string => {
  if (displayWidth(text) <= maxWidth) return text;
  const prefixWidth = displayWidth(keepPrefix);
  // Info: (20260807 - Emily) +1 為省略符號的寬度
  const nameBudget = maxWidth - prefixWidth - 1 - 1;
  if (nameBudget <= 0) return keepPrefix;
  const name = text.slice(keepPrefix.length).trimStart();
  let kept = "";
  let width = 0;
  for (const char of name) {
    const charWidth = FULLWIDTH_PATTERN.test(char) ? 2 : 1;
    if (width + charWidth > nameBudget) break;
    kept += char;
    width += charWidth;
  }
  if (!kept.trim()) return keepPrefix;
  return `${keepPrefix} ${kept.trimEnd()}${ELLIPSIS}`;
};

/**
 * Info: (20260803 - Tzuhan) 子代碼 → ISO 類別。取代碼首位數字即可,但仍寫成明表:
 * 從字串切字元會在「6」(單層,無小數點)上出錯,而那正是最容易漏測的一筆。
 */
export const ISO_CATEGORY_BY_SUBCATEGORY: Readonly<
  Record<Iso14064SubCategory, Iso14064Category>
> = {
  [Iso14064SubCategory.STATIONARY_COMBUSTION]: Iso14064Category.CATEGORY_1,
  [Iso14064SubCategory.MOBILE_COMBUSTION]: Iso14064Category.CATEGORY_1,
  [Iso14064SubCategory.INDUSTRIAL_PROCESS]: Iso14064Category.CATEGORY_1,
  [Iso14064SubCategory.FUGITIVE]: Iso14064Category.CATEGORY_1,
  [Iso14064SubCategory.LAND_USE]: Iso14064Category.CATEGORY_1,
  [Iso14064SubCategory.PURCHASED_ELECTRICITY]: Iso14064Category.CATEGORY_2,
  [Iso14064SubCategory.PURCHASED_ENERGY]: Iso14064Category.CATEGORY_2,
  [Iso14064SubCategory.UPSTREAM_TRANSPORT]: Iso14064Category.CATEGORY_3,
  [Iso14064SubCategory.DOWNSTREAM_TRANSPORT]: Iso14064Category.CATEGORY_3,
  [Iso14064SubCategory.EMPLOYEE_COMMUTING]: Iso14064Category.CATEGORY_3,
  [Iso14064SubCategory.CUSTOMER_VISITOR_TRANSPORT]: Iso14064Category.CATEGORY_3,
  [Iso14064SubCategory.BUSINESS_TRAVEL]: Iso14064Category.CATEGORY_3,
  [Iso14064SubCategory.PURCHASED_GOODS]: Iso14064Category.CATEGORY_4,
  [Iso14064SubCategory.CAPITAL_GOODS]: Iso14064Category.CATEGORY_4,
  [Iso14064SubCategory.SOLID_LIQUID_WASTE]: Iso14064Category.CATEGORY_4,
  [Iso14064SubCategory.ASSET_USE]: Iso14064Category.CATEGORY_4,
  [Iso14064SubCategory.SERVICE_USE]: Iso14064Category.CATEGORY_4,
  [Iso14064SubCategory.PRODUCT_USE_PHASE]: Iso14064Category.CATEGORY_5,
  [Iso14064SubCategory.DOWNSTREAM_LEASED_ASSET]: Iso14064Category.CATEGORY_5,
  [Iso14064SubCategory.PRODUCT_END_OF_LIFE]: Iso14064Category.CATEGORY_5,
  [Iso14064SubCategory.INVESTMENT]: Iso14064Category.CATEGORY_5,
  [Iso14064SubCategory.OTHER_INDIRECT]: Iso14064Category.CATEGORY_6,
};

/**
 * Info: (20260803 - Tzuhan) 兩套分類體系的邊界本來就不完全重合,故映射分「精確」與「近似」兩種。
 * 近似者必須在報告的對帳說明裡揭露 —— 隱藏一個判斷,查核者就無法質疑它;
 * 而無法被質疑的判斷在查帳系統裡等於沒有依據。
 */
export enum SubCategoryMappingFidelityEnum {
  EXACT = "EXACT",
  APPROXIMATE = "APPROXIMATE",
}

export interface ISubCategoryMapping {
  scope: GhgProtocolCategory;
  fidelity: SubCategoryMappingFidelityEnum;
  /** Info: (20260803 - Tzuhan) 近似的理由。EXACT 者不需要,APPROXIMATE 者必須寫,否則揭露不出內容 */
  approximationNote?: string;
}

/**
 * Info: (20260803 - Tzuhan) 子代碼 → GHG Protocol 範疇/類別。
 * ISO 14064-1:2018 第 5.2.4 節與附錄 B 的類別定義為依據。
 */
export const SCOPE_BY_ISO_SUBCATEGORY: Readonly<
  Record<Iso14064SubCategory, ISubCategoryMapping>
> = {
  // Info: (20260803 - Tzuhan) 類別一整組都是直接排放,對應範疇一(含 1.5 土地使用變更)
  [Iso14064SubCategory.STATIONARY_COMBUSTION]: {
    scope: GhgProtocolCategory.SCOPE_1_DIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.MOBILE_COMBUSTION]: {
    scope: GhgProtocolCategory.SCOPE_1_DIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.INDUSTRIAL_PROCESS]: {
    scope: GhgProtocolCategory.SCOPE_1_DIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.FUGITIVE]: {
    scope: GhgProtocolCategory.SCOPE_1_DIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.LAND_USE]: {
    scope: GhgProtocolCategory.SCOPE_1_DIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  // Info: (20260803 - Tzuhan) 類別二 = 輸入能源的間接排放 = 範疇二
  [Iso14064SubCategory.PURCHASED_ELECTRICITY]: {
    scope: GhgProtocolCategory.SCOPE_2_INDIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.PURCHASED_ENERGY]: {
    scope: GhgProtocolCategory.SCOPE_2_INDIRECT,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.UPSTREAM_TRANSPORT]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_4,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.DOWNSTREAM_TRANSPORT]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_9,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.EMPLOYEE_COMMUTING]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_7,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  /**
   * Info: (20260803 - Tzuhan) 近似 ①:GHG Protocol 沒有「客戶與訪客運輸」這一類。
   * 客戶前往營業場所的運輸最接近 Category 9(下游運輸與配送),但 Cat 9 的原義是
   * 售出產品的配送,不是人的移動。歸在此處會與 3.2 下游運輸落在同一範疇類別,
   * 兩者小計因此無法在範疇視角下分離 —— 這一點必須讓查核者知道。
   */
  [Iso14064SubCategory.CUSTOMER_VISITOR_TRANSPORT]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_9,
    fidelity: SubCategoryMappingFidelityEnum.APPROXIMATE,
    approximationNote:
      "GHG Protocol 無對應類別;歸入 Cat 9 下游運輸與配送,與 3.2 下游運輸合併於同一範疇類別",
  },
  [Iso14064SubCategory.BUSINESS_TRAVEL]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_6,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.PURCHASED_GOODS]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_1,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.CAPITAL_GOODS]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_2,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.SOLID_LIQUID_WASTE]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_5,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.ASSET_USE]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_8,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  /**
   * Info: (20260803 - Tzuhan) 近似 ②:ISO 的「4.5 服務使用」涵蓋外購服務,
   * GHG Protocol 把商品與服務同放 Category 1(Purchased Goods & Services)。
   * 因此 4.1 與 4.5 會併入同一個範疇類別,兩者小計在範疇視角下無法分離。
   */
  [Iso14064SubCategory.SERVICE_USE]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_1,
    fidelity: SubCategoryMappingFidelityEnum.APPROXIMATE,
    approximationNote:
      "GHG Protocol Cat 1 同時涵蓋商品與服務;4.5 服務使用與 4.1 採購貨物合併於同一範疇類別",
  },
  [Iso14064SubCategory.PRODUCT_USE_PHASE]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_11,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.DOWNSTREAM_LEASED_ASSET]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_13,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.PRODUCT_END_OF_LIFE]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_12,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  [Iso14064SubCategory.INVESTMENT]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_15,
    fidelity: SubCategoryMappingFidelityEnum.EXACT,
  },
  /**
   * Info: (20260803 - Tzuhan) 近似 ③:類別六是 ISO 的「其他來源」開放類別,
   * 定義上就沒有固定對應。歸入 Cat 15 投資是本系統的**選擇**而非標準規定,
   * 故一律標為近似;實務上這一格幾乎都是 NA(本案三廠址皆為 NA)。
   */
  [Iso14064SubCategory.OTHER_INDIRECT]: {
    scope: GhgProtocolCategory.SCOPE_3_CAT_15,
    fidelity: SubCategoryMappingFidelityEnum.APPROXIMATE,
    approximationNote:
      "ISO 類別六為開放類別,無標準對應;暫歸 Cat 15 並於對帳揭露(本案三廠址皆為 NA)",
  },
};

/**
 * Info: (20260803 - Tzuhan) 類別層的標籤 → 子代碼。**只有類別六**需要這條路。
 *
 * 實測:類別一~五在原文都有子代碼欄(1.1、2.1、3.1…),但類別六是 ISO 的開放類別,
 * 本身沒有子項,原文的子代碼欄寫的是「-」。我原本只認代碼,於是這一列讀不出來、
 * 落進 unparsedRows,整張表因此不予入帳 —— 一個合法的空類別擋掉整份匯入。
 *
 * 刻意只列類別六:其他類別若出現「沒有子代碼」的列,那是真的異常,
 * 應該繼續落進 unparsedRows 讓人看到,不該被這條捷徑吸收掉。
 */
export const CATEGORY_LABEL_TO_SUBCATEGORY: Readonly<
  Record<string, Iso14064SubCategory>
> = {
  類別六: Iso14064SubCategory.OTHER_INDIRECT,
};

/**
 * Info: (20260803 - Tzuhan) 以原文的子代碼字串取映射。找不到即回 null(不猜)。
 * 接受「3.1」與「3.1 上游運輸」兩種寫法:原文的儲存格常把代碼與名稱寫在一起。
 */
export const findSubCategory = (raw: string): Iso14064SubCategory | null => {
  const code = raw.trim().match(/^([0-9]+(?:\.[0-9]+)?)/)?.[1];
  if (!code) return null;
  const found = Object.values(Iso14064SubCategory).find(
    (value) => value === code,
  );
  return found ?? null;
};

/**
 * Info: (20260803 - Tzuhan) 近似映射的清單,供對帳說明逐條揭露。
 * 由映射表推導而非另手維護一份 —— 兩份清單遲早不一致,而不一致的後果是漏揭露。
 */
export const listApproximateMappings = (): {
  subCategory: Iso14064SubCategory;
  note: string;
}[] =>
  Object.entries(SCOPE_BY_ISO_SUBCATEGORY)
    .filter(
      ([, mapping]) =>
        mapping.fidelity === SubCategoryMappingFidelityEnum.APPROXIMATE,
    )
    .map(([subCategory, mapping]) => ({
      subCategory: subCategory as Iso14064SubCategory,
      note: mapping.approximationNote ?? "",
    }));
