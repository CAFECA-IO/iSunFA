import { randomUUID } from "crypto";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import {
  estimateFaithHoldCredits,
  settleFaithCredits,
} from "@/lib/faith_billing";
import { ChatService } from "@/services/chat.service";
import {
  refundCredits,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";

/**
 * Info: (20260808 - Luphia) 費思對話計費編排（設計書 §5.3）。
 * 自 /api/v1/chat route 抽出：route 為純端口（auth / 限流 / 回應映射），
 * 「預扣 → 呼叫 LLM → 以 usageMetadata 結算退差額 / 失敗全額退還」的業務流程收斂於此。
 * 額度不足時上拋 QuotaExceededError，由 route 轉為 402 + payload。
 */

export interface IFaithBilledChatParams {
  userId: string;
  teamId: string;
  message: string;
  tags: string[];
  file?: string;
  mimeType?: string;
  clientMessageId?: string;
  nowSec: number;
}

export interface IFaithBilledChatResult {
  reply: string;
  billing: {
    idempotencyKey: string;
    source: string | null;
    held: string;
    charged: string;
    refunded: string;
    totalTokens: number;
    tokensPerCredit: number;
  };
}

export async function runFaithBilledChat(
  params: IFaithBilledChatParams,
  // Info: (20260808 - Luphia) chatService 可注入以利單測；正式路徑用預設實例
  chatService: ChatService = new ChatService(),
): Promise<IFaithBilledChatResult> {
  const { userId, teamId, message, tags, file, mimeType, clientMessageId } =
    params;

  // Info: (20260809 - Luphia) 計費設定為系統設定，自 DB 取得（查無設定列時 fail-safe 回預設值）
  const billing = await faithBillingSettingRepo.resolveSetting();

  // Info: (20260808 - Luphia) 1. 預扣：hold 為成本上界（輸入估算 + maxOutputTokens），只退不補
  const idempotencyKey = clientMessageId
    ? `faith:${userId}:${clientMessageId}`
    : `faith:${randomUUID()}`;
  const holdCredits = estimateFaithHoldCredits(
    message.length,
    Boolean(file),
    billing,
  );

  await spendCredits({
    teamId,
    userId,
    featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
    cost: holdCredits,
    idempotencyKey,
    nowSec: params.nowSec,
  });

  // Info: (20260808 - Luphia) 2. 呼叫 LLM；失敗即全額退還預扣，不留懸帳
  let generation: Awaited<ReturnType<ChatService["generateFaithResponse"]>>;
  try {
    generation = await chatService.generateFaithResponse(
      message,
      tags,
      file,
      mimeType,
      billing.maxOutputTokens,
    );
  } catch (llmError) {
    await refundCredits({ idempotencyKey, operatorUserId: userId });
    throw llmError;
  }

  // Info: (20260808 - Luphia) 3. 結算：以 SDK usageMetadata 為準，無條件進位、最低 1 點
  const actualCredits = settleFaithCredits(
    generation.usage.totalTokens,
    billing,
  );
  const settlement = await settleSpend({
    idempotencyKey,
    actualCost: actualCredits,
    operatorUserId: userId,
  });

  return {
    reply: generation.text,
    billing: {
      idempotencyKey,
      source: settlement.source,
      held: settlement.held,
      charged: settlement.charged,
      refunded: settlement.refunded,
      totalTokens: generation.usage.totalTokens,
      tokensPerCredit: billing.tokensPerCredit,
    },
  };
}
