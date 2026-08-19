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
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { buildShortTermHistory } from "@/lib/faith_memory/short_term";
import {
  isFaithMemoryEnabled,
  loadFaithMemoryForPrompt,
} from "@/services/faith_memory.service";
import { runWithUsageCapture } from "@/lib/llm/usage_scope";
import { extractAndRecordFaithMemory } from "@/services/faith_memory_extraction.service";

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
  /**
   * Info: (20260817 - Luphia) 任務短期記憶：同一段對話的前文（第一輪 C-2）。
   * 由 client 傳上來——費思不寫 DB，聊天室訊息又是端對端加密，
   * server 沒有任何管道讀得到前文（見 lib/faith_memory/short_term.ts）。
   */
  history?: unknown;
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

  /**
   * Info: (20260817 - Luphia) 先截到上界，之後的估算與注入都用這一份（第一輪 C-2）。
   * 估算與實際送出的內容必須同源，否則 hold 會小於實耗，
   * 而「hold 是成本上界」正是 settleSpend 只退不補的前提。
   */
  const history = buildShortTermHistory(params.history);

  const teamId = await resolveBillingTeamId(accountBookId, userId);
  /**
   * Info: (20260817 - Luphia) 長期記憶（第一輪 C-1）：付費方案專屬，讀取側 fail-closed。
   * 必須在預扣之前載入——注入的內容要計入 hold，理由同短期記憶。
   *
   * Info: (20260818 - Luphia) 方案判定提前並在此處取得一次（第三輪 A-3）：
   * 它同時決定「要不要注入記憶」與「這一輪會不會跑萃取」，
   * 而後者要計入預扣——萃取是第二次 LLM 呼叫，原本完全沒人付錢。
   */
  const memoryEnabled = await isFaithMemoryEnabled(teamId, params.nowSec);
  const memory = memoryEnabled
    ? await loadFaithMemoryForPrompt({ userId, teamId, nowSec: params.nowSec })
    : { text: "", totalChars: 0 };

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
    // Info: (20260817 - Luphia) 注入的前文與長期記憶一併計入預扣（第一輪 C-1 / C-2）
    history.totalChars + memory.totalChars,
    // Info: (20260818 - Luphia) 會跑萃取就要把那次呼叫也算進上界（第三輪 A-3）
    memoryEnabled,
  );

  const spend = await spendCredits({
    teamId,
    userId,
    featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
    cost: holdCredits,
    idempotencyKey,
    nowSec: params.nowSec,
    // Info: (20260813 - Luphia) 按 token 計量、有結算步驟，餘額不足時封頂放行（設計書 §5.4）
    allowPartial: true,
  });

  /**
   * Info: (20260814 - Luphia) 重放（同一把鍵已扣款且未退還）不重跑 LLM：
   * 冪等鍵保護的是扣款，照跑等於同一筆錢買到無限次呼叫。
   * 前一次失敗而已退款的情況不會走到這裡——spendCredits 會改用重試鍵重新扣款。
   */
  if (spend.replayed) {
    throw new ApiError(
      API_ERRORS.TW_DUPLICATE_REQUEST.code,
      API_ERRORS.TW_DUPLICATE_REQUEST.message,
      API_ERRORS.TW_DUPLICATE_REQUEST.status,
    );
  }

  // Info: (20260814 - Luphia) 結算與退款一律用回傳的鍵（重試時會是衍生鍵）
  const billingKey = spend.idempotencyKey;

  // Info: (20260808 - Luphia) 2. 呼叫 LLM；失敗即全額退還預扣，不留懸帳
  let generation: Awaited<ReturnType<ChatService["generateFaithResponse"]>>;
  let capturedTotalTokens = 0;
  try {
    /**
     * Info: (20260818 - Luphia) 把回覆與萃取一起框進用量捕捉範圍（第三輪 A-3）。
     *
     * 萃取原本完全在計費之外：`recordLlmUsage` 有被呼叫，但不在任何範圍內，
     * `usage_scope.ts:47` 的 `if (!scope) return` 會把它整包丟掉——
     * 與第一輪抓到的段落草稿漏計是同一個形狀。
     *
     * 兩次呼叫都在同一個範圍裡，因此下面的結算是這一輪的**總**用量，
     * 而預扣也已把萃取的上界算進去（見 estimateFaithHoldCredits）。
     */
    const captured = await runWithUsageCapture(async () => {
      const reply = await chatService.generateFaithResponse(
        message,
        tags,
        file,
        mimeType,
        billing.maxOutputTokens,
        history.turns,
        memory.text,
      );

      /**
       * Info: (20260817 - Luphia) 萃取長期記憶（第一輪 C-1）。
       *
       * 在**回覆已經產生之後**執行，且 `extractAndRecordFaithMemory` 永不拋錯：
       * 「記憶沒寫成功」不該讓使用者看不到答案（規範 §4.2 末條）。
       *
       * Info: (20260818 - Luphia) 移進捕捉範圍內、且在結算之前（第三輪 A-3）：
       * 它燒掉的 tokens 要算進這一輪的帳。
       */
      if (memoryEnabled) {
        await extractAndRecordFaithMemory({
          userId,
          teamId,
          userMessage: message,
          assistantReply: reply.text,
          nowSec: params.nowSec,
        });
      }

      return reply;
    });
    generation = captured.result;
    capturedTotalTokens = captured.usage.totalTokens;
  } catch (llmError) {
    await refundCredits({
      idempotencyKey: billingKey,
      operatorUserId: userId,
    });
    throw llmError;
  }

  // Info: (20260808 - Luphia) 3. 結算：以 SDK usageMetadata 為準，無條件進位、最低 1 點
  /**
   * Info: (20260818 - Luphia) 以**捕捉到的總用量**結算（第三輪 A-3）：
   * 回覆 + 萃取兩次呼叫。捕捉不到（範圍為 0）時退回 SDK 回報的單次用量，
   * 不要因為觀測缺失而少收——但也不會多收，因為預扣已是上界。
   */
  const actualCredits = settleFaithCredits(
    Math.max(capturedTotalTokens, generation.usage.totalTokens),
    billing,
  );
  /**
   * Info: (20260813 - Luphia) nowSec 與 context 供「預扣被餘額封頂」時追補差額用
   * （設計書 §5.4）：純錢包預扣沒有額度用量列可沿用視窗與 teamId，只能由此注入。
   */
  const settlement = await settleSpend({
    idempotencyKey: billingKey,
    /**
     * Info: (20260815 - Luphia) 結算當下的時間（PR #6652 第二輪 C-7）：
     * 追補要記進此刻的視窗，而不是請求開始時的——長訊息跨過 5 小時邊界時，
     * 寫回舊視窗等於寫進一個已經過期的桶。
     */
    settledAtSec: Math.floor(Date.now() / 1000),
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
