import {
  FAITH_MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS,
  FAITH_MEMORY_EXTRACTION_OVERHEAD_TOKENS,
} from "@/constants/faith_memory";
import {
  FAITH_INPUT_CHARS_PER_TOKEN,
  FAITH_PROMPT_OVERHEAD_TOKENS,
  IFaithBillingSetting,
} from "@/constants/llm";

/**
 * Info: (20260809 - Luphia) 費思計費純函式（設計書 §5.3 預扣—結算）。
 * 不碰 DB、不碰 LLM，只做決定論的點數數學；計費設定由呼叫端注入
 * （設定存於 DB 的 FaithBillingSetting，見 faith_billing_setting.repo）：
 * - hold：以輸入估算 + maxOutputTokens 上界預扣，保證結算永遠 ≤ 預扣（只退不補）。
 * - settle：以 SDK usageMetadata.totalTokenCount 為準，無條件進位、每輪最低 1 點。
 */

/**
 * Info: (20260817 - Luphia) `historyChars` 為任務短期記憶注入 prompt 的字元數（第一輪 C-2）。
 *
 * **必須計入預扣**：注入的前文會讓真實 input tokens 高於估算，
 * 而 hold 一旦不再是成本上界，`settleSpend()` 的「actual ≤ held、只退不補」前提就破了
 * ——依現行實作那會收斂為不退款，等於系統默默吸收差額，帳面上還看不出原因
 * （規範 faith_personal_memory.md §5 對長期記憶注入提出同一個修正）。
 *
 * 傳入的字元數必須是**實際送進 prompt 的那一份**（由 `buildShortTermHistory` 截斷後回傳），
 * 而不是呼叫端手上未截斷的原始歷史，否則估算與實耗又會分家。
 */
export function estimateFaithHoldCredits(
  messageLength: number,
  hasImage: boolean,
  setting: IFaithBillingSetting,
  historyChars = 0,
  /**
   * Info: (20260818 - Luphia) 這一輪是否會跑記憶萃取（第三輪 A-3）。
   *
   * 萃取是**第二次 LLM 呼叫**，內容是本輪的提問加回覆。原本它完全不計費，
   * 等於每輪費思對話都多燒一次同量級的呼叫而沒有人付錢。
   *
   * 要計費就得先算得出上界，否則 hold 不再是成本上界、
   * `settleSpend` 的「只退不補」前提就破了——而那是這條管線的核心不變式。
   * 萃取的輸入上界是「指令 + 提問 + 回覆」，回覆的 token 數又以
   * `maxOutputTokens` 封頂，因此整條算得出來。
   */
  includesExtraction = false,
): bigint {
  const inputEstimate =
    FAITH_PROMPT_OVERHEAD_TOKENS +
    Math.ceil(messageLength / FAITH_INPUT_CHARS_PER_TOKEN) +
    Math.ceil(Math.max(0, historyChars) / FAITH_INPUT_CHARS_PER_TOKEN) +
    (hasImage ? setting.imageInputTokenEstimate : 0);

  const extractionTokens = includesExtraction
    ? FAITH_MEMORY_EXTRACTION_OVERHEAD_TOKENS +
      Math.ceil(messageLength / FAITH_INPUT_CHARS_PER_TOKEN) +
      // Info: (20260818 - Luphia) 回覆會整段進萃取的 prompt，其上界就是本輪的輸出上界
      setting.maxOutputTokens +
      FAITH_MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS
    : 0;

  const worstCaseTokens =
    inputEstimate + setting.maxOutputTokens + extractionTokens;
  const credits = Math.ceil(worstCaseTokens / setting.tokensPerCredit);
  return BigInt(Math.max(1, credits));
}

export function settleFaithCredits(
  totalTokens: number,
  setting: IFaithBillingSetting,
): bigint {
  if (!Number.isFinite(totalTokens) || totalTokens < 0) {
    // Info: (20260807 - Luphia) usageMetadata 缺失或異常時收最低 1 點，絕不憑空放大
    return BigInt(1);
  }
  const credits = Math.ceil(totalTokens / setting.tokensPerCredit);
  return BigInt(Math.max(1, credits));
}
