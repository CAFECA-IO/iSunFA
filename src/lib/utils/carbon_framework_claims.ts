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
  /**
   * Info: (20260821 - Emily) 條 4：主體合規宣告，命中的原文片段。
   *
   * Info: (20260824 - Luphia) **全部**命中，依紙面順序（見 `allComplianceClaims`）。
   * 它是 UAT 印給人看的修正清單，只給第一筆會讓人一句一句地重跑驗收。
   */
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
    complianceClaims: allComplianceClaims(squeezed),
  };
};

/**
 * Info: (20260824 - Luphia) 條 4 要回報**全部**命中，不是第一筆（PR review）。
 *
 * ## 原本只回報一筆
 *
 * 先前是 `COMPLIANCE_CLAIM_PATTERNS.map((p) => squeezed.match(p)?.[0])` ——
 * 非 global 的 regex 配 `String.match` 只給第一筆，而清單今天只有一條，
 * 所以整份報告不管有幾句合規宣告，`complianceClaims` 的長度恆為 1。
 *
 * 閘門不受影響（一筆就足以讓 `expectZero` 紅），壞的是**給人看的那一半**：
 * 這個陣列會被 UAT 印出來當修正清單。少報的後果是「改一句 → 重跑驗收
 * （要重新產或重讀 PDF）→ 才發現下一句」，一份紙上有三句就要跑三輪。
 *
 * 而檔頭列的「不用字串清單」的理由正是它的鏡像 —— 那邊是**重複報**，
 * 這邊是**少報**，兩者都讓讀者對「紙上到底有幾個問題」得到錯的數字。
 *
 * ## 為什麼在這裡複製成 global，而不是給常數加 `g`
 *
 * `COMPLIANCE_CLAIM_PATTERNS` 是**共用**的：`carbon_report_outline.test.ts`
 * 拿同一份 regex 對 33 節 guidance 逐節 `pattern.test(...)`。帶 `g` 的 regex
 * 的 `test` 會推進 `lastIndex`，於是同一個物件在迴圈裡的第二次呼叫從上次
 * 停的位置開始找 —— 結果是**隔一節漏一節**，而那個掃描仍然是綠的。
 * 那正好是這次要修的 bug 的另一種形狀（判準看起來有守住，實際上沒有）。
 *
 * 所以 global 只活在這支函式裡，每次呼叫重新建，`lastIndex` 不跨呼叫。
 *
 * ## 同一段被兩條 pattern 命中時只算一次
 *
 * 以 `index` + 命中字串為鍵去重。清單變長之後兩條 pattern 撞在同一句上
 * 是遲早的事，而那是**一個**問題不是兩個。刻意**不**以字串為鍵：
 * 同一句話在紙上出現兩次是兩個要改的地方，去重會把數量抹掉。
 *
 * 界（誠實寫出）：只去重「完全相同的區間」。兩條 pattern 命中**重疊但不
 * 相同**的區間（例如一條抓 `符合IFRS`、另一條抓 `合IFRS`）仍會報兩筆。
 * 做區間合併是過度設計 —— 真的出現時，那兩條 pattern 本身就該合併。
 */
const allComplianceClaims = (squeezed: string): string[] => {
  const bySpan = new Map<string, { index: number; text: string }>();

  COMPLIANCE_CLAIM_PATTERNS.forEach((pattern) => {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    );
    for (const hit of squeezed.matchAll(global)) {
      if (hit.index === undefined) continue;
      bySpan.set(`${hit.index}:${hit[0]}`, { index: hit.index, text: hit[0] });
    }
  });

  // Info: (20260824 - Luphia) 依紙面順序回報：使用者是照著紙一句一句改的
  return [...bySpan.values()]
    .sort((left, right) => left.index - right.index)
    .map((hit) => hit.text);
};
