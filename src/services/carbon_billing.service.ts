import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import type { BillableFeatureCode } from "@/constants/subscription_quota";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import {
  estimateFaithHoldCredits,
  settleFaithCredits,
} from "@/lib/faith_billing";
import {
  runWithUsageCapture,
  type ICapturedLlmUsage,
} from "@/lib/llm/usage_scope";
import {
  assertAccountBookMember,
  mapServiceError,
} from "@/services/account_book_access.guard";
import {
  refundCredits,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";
import {
  ensurePersonalCreditCharge,
  PersonalPaymentRequiredError,
} from "@/services/personal_credit.service";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
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
  /**
   * Info: (20260813 - Luphia) 工作本體。用量不需由此回傳：整段會被 runWithUsageCapture
   * 包住，管線內每一次 LLM 呼叫的 tokens 都會自動累加（設計書 §5.5）。
   */
  run: () => Promise<T>;
}

export interface IBilledCarbonTaskResult<T> {
  result: T;
  billing: {
    idempotencyKey: string;
    charged: string;
    totalTokens: number;
    // Info: (20260813 - Luphia) 本次管線的 LLM 呼叫次數（匯入可達十餘次），供觀測與對帳
    llmCallCount: number;
    // Info: (20260813 - Luphia) 扣款來源：團隊額度管線，或無帳本會話的個人鏈上點數
    paidBy: "TEAM" | "PERSONAL";
  };
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

  const billing = await faithBillingSettingRepo.resolveSetting();
  const holdCredits = estimateFaithHoldCredits(
    inputChars,
    hasAttachment,
    billing,
  );

  /**
   * Info: (20260813 - Luphia) 無帳本會話改扣**個人鏈上點數**（產品拍板 20260813）。
   *
   * 沒有帳本就沒有計費團隊，但不因此擋下用戶——改由他自己的點數付。
   * 個人點數在鏈上、扣款需簽章，故走「建單 → 402 → 付款 → 重送」兩段流程
   * （見 personal_credit.service）。託管帳號的簽章由伺服器代行，體感是直接扣。
   *
   * 這條路徑**不做預扣—結算**：鏈上退差額要再一筆交易與簽章，成本高於差額本身。
   * 因此以預扣估算（輸入估算 + 回覆上限）一次收足，屬保守計價——
   * 綁定帳本即可改走團隊額度管線，享實耗結算。這個差別是引導綁帳本的正當理由，
   * 不是懲罰。
   */
  if (!accountBookId) {
    const charge = await ensurePersonalCreditCharge({
      userId,
      credits: Number(holdCredits),
      idempotencyKey,
      category: featureCode,
    });
    if (!charge.paid) {
      logger.info("carbon task awaiting personal credit payment", {
        channel: channel ?? "(none)",
        featureCode,
        orderId: charge.orderId,
      });
      throw new PersonalPaymentRequiredError(
        API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED,
        { orderId: charge.orderId, cost: charge.cost },
      );
    }

    const paidOutcome = await runWithUsageCapture(run);
    return {
      result: paidOutcome.result,
      billing: {
        idempotencyKey,
        charged: String(charge.cost),
        totalTokens: paidOutcome.usage.totalTokens,
        llmCallCount: paidOutcome.usage.callCount,
        paidBy: "PERSONAL",
      },
    };
  }

  const teamId = await resolveBillingTeamId(accountBookId, userId);

  await spendCredits({
    teamId,
    userId,
    featureCode,
    cost: holdCredits,
    idempotencyKey,
    nowSec,
    // Info: (20260813 - Luphia) 按 token 計量、有結算步驟，餘額不足時封頂放行（設計書 §5.4）
    allowPartial: true,
  });

  let outcome: { result: T; usage: ICapturedLlmUsage };
  try {
    // Info: (20260813 - Luphia) 整段管線的 LLM 用量由捕捉範圍累加（含 fan-out 的每一次呼叫）
    outcome = await runWithUsageCapture(run);
  } catch (taskError) {
    // Info: (20260813 - Luphia) 工作失敗即全額退還預扣，不留懸帳（設計書 §5.2）
    await refundCredits({ idempotencyKey, operatorUserId: userId });
    throw taskError;
  }

  /**
   * Info: (20260813 - Luphia) SDK 未回報用量時 settleFaithCredits 收斂為最低 1 點：
   * 寧可少收，也不憑空推估用量——那等於讓帳面出現無法查證的數字。
   */
  const totalTokens = outcome.usage.totalTokens;
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
      llmCallCount: outcome.usage.callCount,
      paidBy: "TEAM",
    },
  };
}
