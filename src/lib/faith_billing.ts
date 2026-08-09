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

export function estimateFaithHoldCredits(
  messageLength: number,
  hasImage: boolean,
  setting: IFaithBillingSetting,
): bigint {
  const inputEstimate =
    FAITH_PROMPT_OVERHEAD_TOKENS +
    Math.ceil(messageLength / FAITH_INPUT_CHARS_PER_TOKEN) +
    (hasImage ? setting.imageInputTokenEstimate : 0);
  const worstCaseTokens = inputEstimate + setting.maxOutputTokens;
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
