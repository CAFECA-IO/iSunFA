import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ChatService,
  isLlmQuotaError,
  isLlmTimeoutError,
} from "@/services/chat.service";
import { chatroomService } from "@/services/chatroom.service";
import { AttachmentExtractionService } from "@/services/attachment_extraction.service";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import {
  CARBON_CHAT_PURPOSE,
  CARBON_CHAT_AI_CONTEXT_SIZE,
  buildAttachmentDraftSummary,
  buildChatDraftSummary,
  isCarbonChatChannelOwnedBy,
} from "@/constants/carbon_chatbot";
import { CarbonChatRequestSchema } from "@/validators";
import {
  ChatRoleEnum,
  IAttachment,
  IActivityRecord,
} from "@/types/carbon_chatbot.types";
import {
  IParagraphDraft,
  IContextFact,
} from "@/interfaces/carbon_paragraph_draft";

// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260712 - Luphia) 取得 AI 回覆，使用者訊息與 AI 回覆皆加密入庫；AI 回覆另經 Centrifugo 回傳（前端只訂閱）
// Info: (20260714 - Emily) 手動解構驗證改為集中 Zod validator；新增 attachments(metadata 入加密 payload,base64 不入庫)
// Info: (20260714 - Emily) DeWT 授權: 比照 history route，並檢查 channel 所有權(頻道內含用戶 address)
export async function POST(request: NextRequest) {
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  // Info: (20260716 - Emily) 限流(#6516):DeWT 驗證後、業務邏輯前 Fail Fast
  const limited = enforceCarbonRateLimit(
    sessionUser.address,
    RateLimitBucketEnum.LLM,
  );
  if (limited) return limited;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = CarbonChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }

  const {
    history,
    currentStep,
    language,
    channel,
    recipientPublicKey,
    init,
    attachments,
  } = parsed.data;

  // Info: (20260714 - Emily) 頻道所有權裁決: 只允許讀寫自己 address 前綴的頻道，防跨用戶寫入
  if (channel && !isCarbonChatChannelOwnedBy(channel, sessionUser.address)) {
    return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
  }

  try {
    const chatService = new ChatService();

    // Info: (20260712 - Luphia) 進入 channel 的前置作業：由 AI 產生開場招呼詞，加密後經 Centrifugo 回傳
    if (init) {
      if (!channel || !recipientPublicKey) {
        return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
      }
      const greeting = await chatService.generateCarbonChatbotGreeting(
        currentStep,
        language,
      );
      // Info: (20260714 - Emily) envelope 隨 HTTP 回帶: Centrifugo 遞送失效時前端仍可解密顯示(以訊息 id 去重)
      const greetingEnvelope = await chatroomService.recordAndPublishAiReply({
        channel,
        recipientPublicKey,
        text: greeting,
        purpose: CARBON_CHAT_PURPOSE,
      });
      return jsonOk({ published: true, envelopes: [greetingEnvelope] });
    }

    if (!history) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260714 - Emily) 有附件時在「送給 AI 的副本」最後一則使用者訊息標註檔名，
    // Info: (20260714 - Emily) 讓 AI 知道使用者上傳了佐證；入庫的原文不加註，避免重整後畫面重複顯示
    const attachmentNames = (attachments ?? []).map((a) => a.name);
    const historyForAi =
      attachmentNames.length > 0
        ? history.map((item, index) => {
            const isLastUserMessage =
              item.role === "user" &&
              index === history.map((h) => h.role).lastIndexOf("user");
            if (!isLastUserMessage) return item;
            return {
              ...item,
              text: `${item.text}\n[使用者已上傳附件: ${attachmentNames.join(", ")}]`,
            };
          })
        : history;

    // Info: (20260714 - Emily) 結構化回覆: 對話內容 + 段落完成訊號(readyParagraphId 已經白名單裁決)
    // Info: (20260716 - Emily) #6518:extraction 為已裁決的事實萃取，回帶前端合併進盤查狀態帳本
    const { reply, readyParagraphId, extraction, revisionParagraphId } =
      await chatService.generateCarbonChatbotStructuredResponse(
        historyForAi,
        currentStep,
        language,
      );

    const conversationContext = history
      .slice(-CARBON_CHAT_AI_CONTEXT_SIZE)
      .map((item) => ({
        role: item.role === "user" ? ChatRoleEnum.USER : ChatRoleEnum.AI,
        text: item.text,
      }));

    // Info: (20260714 - Emily) 附件→段落管線: 附件已於選檔時上傳 Laria(僅帶 metadata+cid),
    // Info: (20260714 - Emily) 管線經 recoverLaria 取回內容 → 萃取 → 白名單裁決 → 生成草稿(graceful fallback)
    let drafts: IParagraphDraft[] = [];
    let degraded = false;
    let attachmentActivities: IActivityRecord[] = [];
    // Info: (20260716 - Emily) #55 附件事實回帶:前端據此發起段落修訂(修訂數值僅能引用這些事實)
    let attachmentFacts: IContextFact[] = [];
    const attachmentsMeta: IAttachment[] | undefined = attachments;
    if (attachments && attachments.length > 0) {
      const pipeline = new AttachmentExtractionService();
      const result = await pipeline.runAttachmentToParagraphPipeline({
        attachments,
        conversationContext,
        language,
      });
      drafts = result.drafts;
      degraded = result.degraded;
      attachmentActivities = result.activities;
      attachmentFacts = result.facts;
    }

    // Info: (20260714 - Emily) 對話蒐集完成的段落: 自動生成草稿寫入報告(打斷「無限訪談迴圈」的出口)
    // Info: (20260716 - Emily) #55 修訂請求優先:目標段落交由前端對照卡確認,不在此自動生成
    if (
      readyParagraphId &&
      readyParagraphId !== revisionParagraphId &&
      !drafts.some((d) => d.paragraphId === readyParagraphId)
    ) {
      try {
        const draftService = new ParagraphDraftService();
        const draft = await draftService.generateParagraphDraft({
          paragraphId: readyParagraphId,
          // Info: (20260714 - Emily) 帶入 AI 最新彙整回覆，草稿以彙整後的資訊為準
          conversationContext: [
            ...conversationContext,
            { role: ChatRoleEnum.AI, text: reply },
          ],
          language,
        });
        drafts.push(draft);
      } catch (draftError) {
        // Info: (20260714 - Emily) 草稿失敗不阻斷對話，僅標記降級(用戶可用目錄的 AI 撰寫鈕重試)
        logger.error(
          `[API] /chat/carbon ready-paragraph draft failed: ${JSON.stringify(draftError)}`,
        );
        degraded = true;
      }
    }

    // Info: (20260712 - Luphia) 有頻道與收件者公鑰時，記錄使用者訊息並記錄+發佈 AI 回覆；否則直接回傳（相容用）
    if (channel && recipientPublicKey) {
      const lastUserMessage = [...history]
        .reverse()
        .find((item) => item.role === "user");

      if (lastUserMessage?.text || attachmentNames.length > 0) {
        await chatroomService.recordUserMessage({
          channel,
          recipientPublicKey,
          text: lastUserMessage?.text ?? "",
          purpose: CARBON_CHAT_PURPOSE,
          // Info: (20260714 - Emily) 入庫 metadata(name/size/mimeType/cid)；原檔已於選檔時由 Laria 分片保存
          attachments: attachmentsMeta,
        });
      }

      // Info: (20260714 - Emily) envelope 隨 HTTP 回帶: Centrifugo 遞送失效時前端仍可解密顯示(以訊息 id 去重)
      const replyEnvelope = await chatroomService.recordAndPublishAiReply({
        channel,
        recipientPublicKey,
        text: reply,
        purpose: CARBON_CHAT_PURPOSE,
      });
      const envelopes = [replyEnvelope];

      // Info: (20260714 - Emily) 草稿摘要為決定性模板訊息(不經 LLM)，帶 relatedParagraphIds 供段落 chip 還原
      // Info: (20260714 - Emily) 模板依來源選擇: 有附件用附件版，純對話蒐集完成用對話版
      if (drafts.length > 0) {
        const sections = drafts.map((d) => d.title).join("、");
        const summaryText =
          attachments && attachments.length > 0
            ? buildAttachmentDraftSummary(
                language,
                drafts.length,
                sections,
                degraded,
              )
            : buildChatDraftSummary(language, sections);
        const summaryEnvelope = await chatroomService.recordAndPublishAiReply({
          channel,
          recipientPublicKey,
          text: summaryText,
          purpose: CARBON_CHAT_PURPOSE,
          relatedParagraphIds: drafts.map((d) => d.paragraphId),
          // Info: (20260714 - Emily) 草稿隨加密訊息遞送: 長請求 HTTP 中斷時，報告更新仍經 Centrifugo/歷史送達
          drafts,
        });
        envelopes.push(summaryEnvelope);
      }

      return jsonOk({
        published: true,
        envelopes,
        drafts,
        degraded,
        extraction,
        attachmentActivities,
        revisionParagraphId,
        attachmentFacts,
      });
    }

    return jsonOk({
      reply,
      drafts,
      degraded,
      extraction,
      attachmentActivities,
      revisionParagraphId,
      attachmentFacts,
    });
  } catch (error) {
    logger.error(`[API] /chat/carbon error: ${JSON.stringify(error)}`);
    // Info: (20260714 - Emily) 額度耗盡回專屬錯誤碼，前端提示稍候重試(與一般系統錯誤區分)
    if (isLlmQuotaError(error)) {
      return jsonFail(API_ERRORS.IS_LLM_QUOTA_EXCEEDED);
    }
    // Info: (20260716 - Emily) 同步路徑逾時(#6515): 前端提示重試，與一般系統錯誤區分
    if (isLlmTimeoutError(error)) {
      return jsonFail(API_ERRORS.IS_LLM_TIMEOUT);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
