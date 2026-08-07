import {
  FAITH_IMAGE_INPUT_TOKEN_ESTIMATE,
  FAITH_INPUT_CHARS_PER_TOKEN,
  FAITH_MAX_OUTPUT_TOKENS,
  FAITH_PROMPT_OVERHEAD_TOKENS,
  FAITH_TOKENS_PER_CREDIT,
} from "@/constants/llm";

/**
 * Info: (20260807 - Luphia) 費思計費純函式（設計書 §5.3 預扣—結算）。
 * 不碰 DB、不碰 LLM，只做決定論的點數數學：
 * - hold：以輸入估算 + maxOutputTokens 上界預扣，保證結算永遠 ≤ 預扣（只退不補）。
 * - settle：以 SDK usageMetadata.totalTokenCount 為準，無條件進位、每輪最低 1 點。
 */

export function estimateFaithHoldCredits(
  messageLength: number,
  hasImage: boolean,
): bigint {
  const inputEstimate =
    FAITH_PROMPT_OVERHEAD_TOKENS +
    Math.ceil(messageLength / FAITH_INPUT_CHARS_PER_TOKEN) +
    (hasImage ? FAITH_IMAGE_INPUT_TOKEN_ESTIMATE : 0);
  const worstCaseTokens = inputEstimate + FAITH_MAX_OUTPUT_TOKENS;
  const credits = Math.ceil(worstCaseTokens / FAITH_TOKENS_PER_CREDIT);
  return BigInt(Math.max(1, credits));
}

export function settleFaithCredits(totalTokens: number): bigint {
  if (!Number.isFinite(totalTokens) || totalTokens < 0) {
    // Info: (20260807 - Luphia) usageMetadata 缺失或異常時收最低 1 點，絕不憑空放大
    return BigInt(1);
  }
  const credits = Math.ceil(totalTokens / FAITH_TOKENS_PER_CREDIT);
  return BigInt(Math.max(1, credits));
}
