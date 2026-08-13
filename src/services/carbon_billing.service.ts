import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import type { BillableFeatureCode } from "@/constants/subscription_quota";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import {
  estimateFaithHoldCredits,
  settleFaithCredits,
} from "@/lib/faith_billing";
import type { ILlmUsage } from "@/services/chat.service";
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
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260813 - Luphia) 碳盤查計費編排（設計書 §5.5，產品拍板 20260813）。
 *
 * 與費思同一套規則：token 計量、預扣—結算、失敗全額退還，費率沿用同一份
 * DB 計量設定（`FaithBillingSetting`，1,000 tokens = 1 點）——碳盤查與費思打的是
 * 同一個模型、同一種成本，分兩套費率只會讓後台調參時忘記其中一邊。
 *
 * 計費團隊由**會話綁定的帳本**推導（`Chatroom.accountBookId` → `AccountBook.teamId`），
 * 與費思「選定帳本才能使用」同一條推導路徑，client 一樣不自報 teamId。
 */

export interface IBilledCarbonTaskParams<T> {
  userId: string;
  // Info: (20260813 - Luphia) 會話頻道；帳本由此查出（舊的個人會話可能沒有帳本）
  channel: string | undefined;
  featureCode?: BillableFeatureCode;
  /**
   * Info: (20260813 - Luphia) 冪等鍵的業務主鍵，重試不重複扣款。
   * 呼叫端以 clientMessageId 等穩定值組成；缺值時退化為一次性鍵（重試會重複扣，
   * 因此前端應一律帶上）。
   */
  idempotencyKey: string;
  // Info: (20260813 - Luphia) 預扣估算的輸入量（字元數）與是否帶附件
  inputChars: number;
  hasAttachment: boolean;
  nowSec: number;
  run: () => Promise<{ result: T; usage: ILlmUsage | null }>;
}

export interface IBilledCarbonTaskResult<T> {
  result: T;
  // Info: (20260813 - Luphia) null = 未計費（無帳本的舊個人會話），供呼叫端記錄與觀測
  billing: {
    idempotencyKey: string;
    charged: string;
    totalTokens: number;
  } | null;
}

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

/**
 * Info: (20260813 - Luphia) 以額度包住一次碳盤查的 LLM 工作。
 *
 * 額度不足時 `spendCredits` 上拋 QuotaExceededError（402），**LLM 不會被呼叫**——
 * 這是計費的重點：先確定付得起再花錢，而不是花完才發現扣不到。
 */
export async function runBilledCarbonTask<T>(
  params: IBilledCarbonTaskParams<T>,
): Promise<IBilledCarbonTaskResult<T>> {
  const {
    userId,
    channel,
    featureCode = BILLABLE_FEATURE_CODE.CARBON_CHAT,
    idempotencyKey,
    inputChars,
    hasAttachment,
    nowSec,
    run,
  } = params;

  const accountBookId = channel
    ? await chatroomRepo.findAccountBookIdByChannel(channel)
    : null;

  /**
   * Info: (20260813 - Luphia) 無帳本的舊個人會話不計費（`Chatroom.accountBookId` 可為 null）。
   *
   * 沒有帳本就沒有計費團隊，硬要擋下等於讓既有會話一夕不能用。此處放行但留 log，
   * 讓「有多少用量沒被計費」是可觀測的；長期解法是要求碳盤查會話一律綁帳本
   * （設計書 §5.5 開放問題）。
   */
  if (!accountBookId) {
    logger.warn("carbon task ran unbilled: chatroom has no account book", {
      channel: channel ?? "(none)",
      featureCode,
    });
    const { result } = await run();
    return { result, billing: null };
  }

  const teamId = await resolveBillingTeamId(accountBookId, userId);
  const billing = await faithBillingSettingRepo.resolveSetting();
  const holdCredits = estimateFaithHoldCredits(
    inputChars,
    hasAttachment,
    billing,
  );

  await spendCredits({
    teamId,
    userId,
    featureCode,
    cost: holdCredits,
    idempotencyKey,
    nowSec,
  });

  let outcome: { result: T; usage: ILlmUsage | null };
  try {
    outcome = await run();
  } catch (taskError) {
    // Info: (20260813 - Luphia) 工作失敗即全額退還預扣，不留懸帳（設計書 §5.2）
    await refundCredits({ idempotencyKey, operatorUserId: userId });
    throw taskError;
  }

  /**
   * Info: (20260813 - Luphia) SDK 未回報用量時 settleFaithCredits 收斂為最低 1 點：
   * 寧可少收，也不憑空推估用量——那等於讓帳面出現無法查證的數字。
   */
  const totalTokens = outcome.usage?.totalTokens ?? 0;
  const actualCredits = settleFaithCredits(totalTokens, billing);
  const settlement = await settleSpend({
    idempotencyKey,
    actualCost: actualCredits,
    operatorUserId: userId,
    nowSec,
    context: { teamId, userId, featureCode },
  });

  return {
    result: outcome.result,
    billing: {
      idempotencyKey,
      charged: settlement.charged,
      totalTokens,
    },
  };
}
