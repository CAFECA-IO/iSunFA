import { randomUUID } from "crypto";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import {
  estimateFaithHoldCredits,
  settleFaithCredits,
} from "@/lib/faith_billing";
import { ChatService } from "@/services/chat.service";
import {
  assertAccountBookMember,
  mapServiceError,
} from "@/services/account_book_access.guard";
import {
  refundCredits,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";
import { ApiError } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260808 - Luphia) 費思對話計費編排（設計書 §5.3）。
 * 自 /api/v1/chat route 抽出：route 為純端口（auth / 限流 / 回應映射），
 * 「預扣 → 呼叫 LLM → 以 usageMetadata 結算退差額 / 失敗全額退還」的業務流程收斂於此。
 * 額度不足時上拋 QuotaExceededError，由 route 轉為 402 + payload。
 *
 * Info: (20260812 - Luphia) 扣費團隊由帳本推導（設計書 §5.3「使用前提」）：
 * 費思僅在選定帳本後可用，team context 一律 server 端決定，不接受 client 自報。
 */

export interface IFaithBilledChatParams {
  userId: string;
  accountBookId: string;
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
    toppedUp: string;
    totalTokens: number;
    tokensPerCredit: number;
  };
}

/**
 * Info: (20260812 - Luphia) 帳本 → 扣費團隊。沿用報表 / 分類帳共用的授權收斂點
 * （assertAccountBookMember：帳本不存在或非所屬團隊成員即擋下），
 * 並在 Service 邊界把哨兵字串錯誤包成 ApiError，不讓 guard 的內部訊息噴到前端（CLAUDE.md §6）。
 */
async function resolveBillingTeamId(
  accountBookId: string,
  userId: string,
): Promise<string> {
  try {
    const accountBook = await assertAccountBookMember(accountBookId, userId);
    return accountBook.teamId;
  } catch (error) {
    const def = mapServiceError(error);
    throw new ApiError(def.code, def.message, def.status);
  }
}

export async function runFaithBilledChat(
  params: IFaithBilledChatParams,
  // Info: (20260808 - Luphia) chatService 可注入以利單測；正式路徑用預設實例
  chatService: ChatService = new ChatService(),
): Promise<IFaithBilledChatResult> {
  const {
    userId,
    accountBookId,
    message,
    tags,
    file,
    mimeType,
    clientMessageId,
  } = params;

  const teamId = await resolveBillingTeamId(accountBookId, userId);

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
    // Info: (20260813 - Luphia) 按 token 計量、有結算步驟，餘額不足時封頂放行（設計書 §5.4）
    allowPartial: true,
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
  /**
   * Info: (20260813 - Luphia) nowSec 與 context 供「預扣被餘額封頂」時追補差額用
   * （設計書 §5.4）：純錢包預扣沒有額度用量列可沿用視窗與 teamId，只能由此注入。
   */
  const settlement = await settleSpend({
    idempotencyKey,
    actualCost: actualCredits,
    operatorUserId: userId,
    nowSec: params.nowSec,
    context: {
      teamId,
      userId,
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
    },
  });

  return {
    reply: generation.text,
    billing: {
      idempotencyKey,
      source: settlement.source,
      held: settlement.held,
      charged: settlement.charged,
      refunded: settlement.refunded,
      // Info: (20260813 - Luphia) 封頂預扣的追補額，供點數歷程對帳
      toppedUp: settlement.toppedUp,
      totalTokens: generation.usage.totalTokens,
      tokensPerCredit: billing.tokensPerCredit,
    },
  };
}
