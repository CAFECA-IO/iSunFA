/**
 * Info: (20260821 - Emily) 揭露框架的宣告用語 —— **產出端與驗收端共用同一份字串**。
 *
 * ## 三層不是三選一
 *
 * - **計算層** GHG Protocol：已經是係數與分類的骨幹（`true_esg_coefficients`、
 *   `esg_activity_type`），ISO 14064-1 的子代碼是映射到它上面（`iso14064_subcategory`）。
 * - **查證層** ISO 14064-1 / -3：`CARBON_REPORT_STANDARD` / `CARBON_VERIFICATION_STANDARD`。
 * - **揭露層** IFRS S1/S2（= TIFRS）：本檔。
 *
 * 使用者可以選的只有**揭露層**：要不要把報告包成 IFRS S1/S2 的架構。
 * 「ISO 14064-1 還是 GHG Protocol」在頂層是分類錯誤，不是選項。
 *
 * ## 為什麼是「架構對齊」而不是「合規」
 *
 * 產品要能宣稱對齊 IFRS S1/S2（那是 33 段大綱的來源），但使用報告的企業**不得**
 * 宣告合規 —— 金管會的適用時程分階段，未到期的企業提前宣告是實質的紅線。
 *
 * 「我們宣稱、企業不宣稱」在實務上守不住：**那份報告就是企業的揭露文件**，
 * 企業 publish 出去，宣稱就是企業做的。可以守的是**改變宣稱的內容**：
 *
 *     「本報告依 IFRS S1/S2 之架構編製」   關於**文件結構**的陳述   → 可以
 *     「本公司符合 IFRS S1/S2」            關於**主體**的合規宣告   → 不可以
 *
 * 所以架構對齊聲明可以印，但**必須**同時印免責句；而主體合規的說法一律禁止。
 */

export enum CarbonDisclosureFrameworkEnum {
  /** Info: (20260821 - Emily) 只出盤查報告書（給查證人員），不印任何揭露框架字樣 */
  INVENTORY_ONLY = "INVENTORY_ONLY",
  /** Info: (20260821 - Emily) 包成 IFRS S1/S2 架構的揭露報告 */
  IFRS_S1_S2 = "IFRS_S1_S2",
}

/**
 * Info: (20260821 - Emily) 架構對齊聲明。印它就等於宣告「本報告走揭露層」，
 * 因此它同時是驗收端判斷「這份報告該不該出現 IFRS 字樣」的依據。
 */
export const FRAMEWORK_ALIGNMENT_PHRASE = "本報告依 IFRS S1/S2 之架構編製";

/**
 * Info: (20260821 - Emily) 必印的免責句。與對齊聲明是一組，不得只印其中一句 ——
 * 只印對齊聲明會讓讀者把「架構對齊」讀成「合規」，那正是要擋的那件事。
 */
export const FRAMEWORK_DISCLAIMER_PHRASE = "本報告不構成 IFRS S1/S2 之合規聲明";

/**
 * Info: (20260821 - Emily) 主體合規宣告的樣式 —— **永遠**禁止出現在紙上。
 * 比對的是 `squeezeForMatch` 壓過的文字(NFKC + 去空白),樣式裡不留空白。
 *
 * ## 界是兩軸(PR review 第二輪指出第一版只寫了一軸)
 *
 * **動詞軸**:符合/遵循/依循/遵照/依照/按照/依據/達成/通過。
 * 第一版只有前四種語感,「依據 IFRS S2 規定」「已達成 IFRS S1 要求」全過 ——
 * 而「依據」正是揭露版 guidance 自己用過的動詞(ch1-5,已改為「參照」,見該檔)。
 * **名稱軸**:IFRS / TIFRS / 國際財務報導準則。第一版只有 IFRS,
 * 而 TIFRS 這個同義詞是本檔檔頭自己寫的;它先前被條 2 蓋住,
 * 但條 2 在印了對齊聲明後就關閉 —— 掩護會在 #54 上線那一刻消失。
 *
 * ## 動詞與名稱之間容許 0–12 字,但不得跨子句
 *
 * 排除類必須**全形半形都排**:`squeezeForMatch` 的 NFKC 會把全形逗號/分號/冒號
 * 正規化成半形(，→, ；→; ：→:),只排全形的話,壓過的文字上每一個逗號都攔不住,
 * 「通過第三方查證,並依 IFRS 架構揭露」會跨子句誤報(15 案例實測,見 PR)。
 * 句號 。 與頓號 、 不受 NFKC 影響,兩類都列。
 *
 * ## 仍然漏得掉的(誠實寫出)
 *
 * 動詞清單外的說法:「本公司**秉持** IFRS S2 精神」「**落實** IFRS S1」。
 * 刻意不做語意判斷。清單只能變長,每次在紙上看到新說法就加一條並記出處。
 *
 * 否定回顧 `(?<![不未尚])` 讓「尚不符合 IFRS」這種意思相反的話不被誤報。
 */
export const COMPLIANCE_CLAIM_PATTERNS: ReadonlyArray<RegExp> = [
  /(?<![不未尚])(符合|遵循|依循|遵照|依照|按照|依據|達成|通過)[^。、，；,;.\n]{0,12}?(T?IFRS|國際財務報導準則)/,
];

/**
 * Info: (20260821 - Emily) 我們**沒有**對齊、因此任何情況都不該出現的揭露框架。
 * IFRS 不在這裡 —— 它由對齊聲明有條件放行（見 `uat_carbon_report.ts` 的該條判準）。
 */
export const UNALIGNED_FRAMEWORKS: ReadonlyArray<string> = [
  "TCFD",
  "SASB",
  "GRI",
  "CDP",
];
