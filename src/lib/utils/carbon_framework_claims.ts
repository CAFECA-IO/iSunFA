/**
 * Info: (20260821 - Emily) 報告紙面上的**揭露框架宣告**稽核 —— 純函式，兩端共用。
 *
 * ## 為什麼抽出來
 *
 * 這四條判準原本寫在 `scripts/uat_carbon_report.ts` 裡。腳本不在 jest 的掃描範圍，
 * 所以「把判準改壞會不會紅」這個問題對它問不出來 —— 而現有的三份產出都沒有印過
 * 架構對齊聲明，也就是說**其中兩條從來沒有走過 true 分支**。
 * 抽到 `src/` 才能用合成輸入把四條各自逼紅一次。
 *
 * ## 正規化在函式裡面做，不是呼叫端的責任
 *
 * PDF 文字層會在任意位置換行，字面比對必然落空（本產品線已經因此誤判三次：
 * `表3.6` 的表號、`繪製上限`、`議定書`）。把 `squeezeForMatch` 放在呼叫端，
 * 下一個呼叫端就會忘。所以本函式收**原始文字**，自己壓。
 *
 * ## 四條為什麼這樣切（不重疊）
 *
 * - 條 1 `unalignedFrameworks`：我們沒有對齊的框架，**無 when 子句**，出現即違規。
 * - 條 2 `ifrsWithoutAlignment`：**當沒有印架構對齊聲明時**，IFRS 出現即違規。
 * - 條 3 `alignmentWithoutDisclaimer`：**當印了對齊聲明時**，必須也印免責句。
 * - 條 4 `complianceClaims`：主體合規的斷言，**無 when 子句**。
 *
 * 條 2 只看對齊聲明、條 3 才管那一對，是為了讓「印了聲明但漏免責句」只報一條
 * 而不是同時報兩條 —— 重複報會讓讀者以為有兩個獨立問題。
 *
 * ## 已知的洞（界，不是缺陷）
 *
 * 1. **條 4 的界就是 `COMPLIANCE_CLAIM_PATTERNS` 的長度。** 清單外的說法漏得掉
 *    （「已達成 IFRS S1 要求」沒有合規動詞）。清單只能變長。
 * 2. **條 2 抓不出「這句 IFRS 是誰寫的」。** 客戶原文自己提到 IFRS 時（逐字照錄）
 *    這條會紅，而那不是我們的宣告 —— 與「對帳附錄的逐字引用被報成表格語法外洩」
 *    同一形狀。已量：客戶原文與三份產出裡 `IFRS` 皆 0 次，所以今天不會誤報。
 *    真的遇到時要把判準收窄到「系統印的區塊」，不是現在憑空加例外。
 * 3. **只印免責句、沒印對齊聲明**時條 2 會紅。那個組合本身就不合理
 *    （替一個你沒對齊的框架印免責），所以讓它紅是對的，但失敗訊息會有點難讀。
 * 4. **`GRI` 是 `GRID` 的子字串。** 08-19 量過客戶原文與產出裡 `GRID` 皆 0 次。
 *    這條若哪天叫了，先確認不是 `GRID`（電網）再說。
 */
import {
  COMPLIANCE_CLAIM_PATTERNS,
  FRAMEWORK_ALIGNMENT_PHRASE,
  FRAMEWORK_DISCLAIMER_PHRASE,
  UNALIGNED_FRAMEWORKS,
} from "@/constants/carbon_report_framework";
import { squeezeForMatch } from "@/lib/utils/squeeze_for_match";

export interface ICarbonFrameworkClaimAudit {
  /** Info: (20260821 - Emily) 紙上有沒有印架構對齊聲明（判準的分流依據） */
  alignmentDeclared: boolean;
  /** Info: (20260821 - Emily) 紙上有沒有印免責句 */
  disclaimerPresent: boolean;
  /** Info: (20260821 - Emily) 條 1：我們沒有對齊的框架 */
  unalignedFrameworks: string[];
  /** Info: (20260821 - Emily) 條 2：沒宣告對齊卻出現 IFRS */
  ifrsWithoutAlignment: string[];
  /** Info: (20260821 - Emily) 條 3：宣告了對齊卻沒印免責句 */
  alignmentWithoutDisclaimer: string[];
  /** Info: (20260821 - Emily) 條 4：主體合規宣告，命中的原文片段 */
  complianceClaims: string[];
}

export const auditFrameworkClaims = (
  paperText: string,
): ICarbonFrameworkClaimAudit => {
  const squeezed = squeezeForMatch(paperText);
  const alignmentDeclared = squeezed.includes(
    squeezeForMatch(FRAMEWORK_ALIGNMENT_PHRASE),
  );
  const disclaimerPresent = squeezed.includes(
    squeezeForMatch(FRAMEWORK_DISCLAIMER_PHRASE),
  );

  return {
    alignmentDeclared,
    disclaimerPresent,
    unalignedFrameworks: UNALIGNED_FRAMEWORKS.filter((name) =>
      squeezed.includes(name),
    ),
    ifrsWithoutAlignment:
      squeezed.includes("IFRS") && !alignmentDeclared ? ["IFRS"] : [],
    alignmentWithoutDisclaimer:
      alignmentDeclared && !disclaimerPresent ? ["缺少免責句"] : [],
    complianceClaims: COMPLIANCE_CLAIM_PATTERNS.map(
      (pattern) => squeezed.match(pattern)?.[0],
    ).filter((hit): hit is string => hit !== undefined),
  };
};
