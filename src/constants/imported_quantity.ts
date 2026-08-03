// Info: (20260803 - Tzuhan) 匯入數量的三態(Issue B 第 2 點)
//
// Info: (20260803 - Tzuhan) 這是本次匯入最容易被做錯、且做錯不會有人發現的地方。
// Info: (20260803 - Tzuhan) 盤查報告在同一欄裡混用三種**語意完全不同**的儲存格:
// Info: (20260803 - Tzuhan)   NA     = 不適用(該排放源在此組織根本不存在)
// Info: (20260803 - Tzuhan)   NS     = 不顯著(存在但經重大性評估判定不需量化,因此沒有數字)
// Info: (20260803 - Tzuhan)   0.0000 = 已鑑別、已量化,結果就是零
// Info: (20260803 - Tzuhan)
// Info: (20260803 - Tzuhan) 三者若一律轉成 0,「沒有盤查」會長得跟「盤查後為零」一模一樣。
// Info: (20260803 - Tzuhan) 那不是精度損失,是**把未知偽裝成已知** —— 查核者會據此認為該排放源已被評估。
// Info: (20260803 - Tzuhan) 這與零捏造是同一條線:不知道的事不可以呈現成知道。

/**
 * Info: (20260803 - Tzuhan) 三態。只有 REPORTED 帶得出數值;另兩態的數值必須是 null 而非 0。
 */
export enum ImportedQuantityStateEnum {
  /** Info: (20260803 - Tzuhan) 已量化並揭露數字(含原文明寫的 0.0000) */
  REPORTED = "REPORTED",
  /** Info: (20260803 - Tzuhan) NA:不適用 */
  NOT_APPLICABLE = "NOT_APPLICABLE",
  /** Info: (20260803 - Tzuhan) NS:不顯著,未量化 */
  NOT_SIGNIFICANT = "NOT_SIGNIFICANT",
}

/**
 * Info: (20260803 - Tzuhan) 原文儲存格的標記寫法。大小寫與全形括號在實測都出現過,
 * 故比對前一律正規化;但**不接受空白儲存格自動視為 NA** ——
 * 空白代表原文沒寫,沒寫是「無法判定」而不是「不適用」,只能標為缺漏由勾稽攔下。
 */
export const NOT_APPLICABLE_TOKENS: readonly string[] = [
  "NA",
  "N/A",
  "N.A.",
  "不適用",
];

export const NOT_SIGNIFICANT_TOKENS: readonly string[] = [
  "NS",
  "N/S",
  "N.S.",
  "不顯著",
];

/**
 * Info: (20260803 - Tzuhan) 公噸 → 公斤。ledger 存 co2eKg,報告用公噸 CO2e。
 * 以字串常數交給 Decimal 乘,不寫成 number 1000:金額與碳排量一律禁止原生浮點運算。
 */
export const TONNE_TO_KG_MULTIPLIER = "1000";

/**
 * Info: (20260803 - Tzuhan) 勾稽容差(公噸 CO2e)。
 *
 * 實測:表3.8 三廠址總計相加 = 8332.5812,而表3.6 全公司總量印的是 8332.581 ——
 * 差 0.0002 來自**發布數字本身的四捨五入**,不是我們算錯。容差必須容納它,
 * 否則每一份正常的報告都會被判勾稽失敗,而一個總是失敗的勾稽等於沒有勾稽。
 *
 * 取 0.001 公噸(= 1 公斤):容得下小數第四位的進位差,又攔得住任何真實的錯帳
 * (實測最小的非零排放項是 0.0108 公噸,仍為此值的十倍)。
 */
export const RECONCILIATION_TOLERANCE_TONNE = "0.001";

/**
 * Info: (20260803 - Tzuhan) 範疇二的兩種報告基準(Issue B 第 4 點)。
 *
 * 所在地基準用電網平均排碳係數;市場基準採計購電合約與再生能源憑證。
 * 這份報告兩者相同(表3.6 與表3.7 數字一致,因為沒有綠電採購),但**一旦不同,
 * 把兩者都寫進同一個 ledger 就是重複計算**——同一度電被算兩次。
 * 故此維度必須存在於資料上,由 UI 切換,而不是靠「反正通常一樣」蒙過去。
 */
export enum EmissionBasisEnum {
  LOCATION = "LOCATION",
  MARKET = "MARKET",
}

// Info: (20260803 - Tzuhan) 原文的基準字樣(表3.8 的廠址總計列會標明)
export const LOCATION_BASIS_TOKENS: readonly string[] = ["所在地基準"];
export const MARKET_BASIS_TOKENS: readonly string[] = ["市場基準"];

/**
 * Info: (20260803 - Tzuhan) 帳本項目的來源(Issue B 的核心欄位)。
 *
 * 報告裡會同時出現兩種數字:本系統從活動數據算出來的,與外部已查證報告照抄來的。
 * 兩者的可信依據完全不同(一個可重算、一個是既成事實),混在一起之後
 * 就再也回答不了「這個數字是誰算的」—— 而那是查核者的第一個問題。
 */
export enum LedgerProvenanceEnum {
  /** Info: (20260803 - Tzuhan) 本系統由活動數據 × 排放係數 × GWP 決定性計算 */
  COMPUTED = "COMPUTED",
  /** Info: (20260803 - Tzuhan) 自上傳的盤查報告表格照抄並通過三層勾稽 */
  IMPORTED = "IMPORTED",
}
