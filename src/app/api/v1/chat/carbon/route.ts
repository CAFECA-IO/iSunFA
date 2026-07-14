import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ChatService } from "@/services/chat.service";
import { chatroomService } from "@/services/chatroom.service";
import { AttachmentExtractionService } from "@/services/attachment_extraction.service";
import {
  CARBON_CHAT_PURPOSE,
  CARBON_CHAT_AI_CONTEXT_SIZE,
  buildAttachmentDraftSummary,
  isCarbonChatChannelOwnedBy,
} from "@/constants/carbon_chatbot";
import { CarbonChatRequestSchema } from "@/validators";
import { ChatRoleEnum } from "@/types/carbon_chatbot.types";
import { IParagraphDraft } from "@/interfaces/carbon_paragraph_draft";

// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260712 - Luphia) 取得 AI 回覆，使用者訊息與 AI 回覆皆加密入庫；AI 回覆另經 Centrifugo 回傳（前端只訂閱）
// Info: (20260714 - Emily) 手動解構驗證改為集中 Zod validator;新增 attachments(metadata 入加密 payload,base64 不入庫)
// Info: (20260714 - Emily) DeWT 授權:比照 history route,並檢查 channel 所有權(頻道內含用戶 address)
export async function POST(request: NextRequest) {
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

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

  // Info: (20260714 - Emily) 頻道所有權裁決:只允許讀寫自己 address 前綴的頻道,防跨用戶寫入
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
      // Info: (20260714 - Emily) envelope 隨 HTTP 回帶:Centrifugo 遞送失效時前端仍可解密顯示(以訊息 id 去重)
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

    // Info: (20260714 - Emily) 有附件時在「送給 AI 的副本」最後一則使用者訊息標註檔名,
    // Info: (20260714 - Emily) 讓 AI 知道使用者上傳了佐證;入庫的原文不加註,避免重整後畫面重複顯示
    const attachmentNames = (attachments ?? []).map((a) => a.name);
    const historyForAi =
      attachmentNames.length > 0
        ? history.map((item, index) => {
            const isLastUserMessage =
              item.role === "user" &&
              index ===
                history.map((h) => h.role).lastIndexOf("user");
            if (!isLastUserMessage) return item;
            return {
              ...item,
              text: `${item.text}\n[使用者已上傳附件: ${attachmentNames.join(", ")}]`,
            };
          })
        : history;

    const reply = await chatService.generateCarbonChatbotResponse(
      historyForAi,
      currentStep,
      language,
    );

    // Info: (20260714 - Emily) 附件→段落管線:萃取事實 → 白名單裁決段落 → 生成草稿(真 Gemini + graceful fallback)
    let drafts: IParagraphDraft[] = [];
    let degraded = false;
    if (attachments && attachments.length > 0) {
      const pipeline = new AttachmentExtractionService();
      const conversationContext = history
        .slice(-CARBON_CHAT_AI_CONTEXT_SIZE)
        .map((item) => ({
          role: item.role === "user" ? ChatRoleEnum.USER : ChatRoleEnum.AI,
          text: item.text,
        }));
      const result = await pipeline.runAttachmentToParagraphPipeline({
        attachments,
        conversationContext,
        language,
      });
      drafts = result.drafts;
      degraded = result.degraded;
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
          // Info: (20260714 - Emily) 只入庫 metadata(name/size/mimeType),base64 內容不落地
          attachments: attachments?.map((a) => ({
            name: a.name,
            size: a.size,
            mimeType: a.mimeType,
          })),
        });
      }

      // Info: (20260714 - Emily) envelope 隨 HTTP 回帶:Centrifugo 遞送失效時前端仍可解密顯示(以訊息 id 去重)
      const replyEnvelope = await chatroomService.recordAndPublishAiReply({
        channel,
        recipientPublicKey,
        text: reply,
        purpose: CARBON_CHAT_PURPOSE,
      });
      const envelopes = [replyEnvelope];

      // Info: (20260714 - Emily) 草稿摘要為決定性模板訊息(不經 LLM),帶 relatedParagraphIds 供段落 chip 還原
      if (drafts.length > 0) {
        const sections = drafts.map((d) => d.title).join("、");
        const summaryEnvelope = await chatroomService.recordAndPublishAiReply({
          channel,
          recipientPublicKey,
          text: buildAttachmentDraftSummary(
            language,
            drafts.length,
            sections,
            degraded,
          ),
          purpose: CARBON_CHAT_PURPOSE,
          relatedParagraphIds: drafts.map((d) => d.paragraphId),
        });
        envelopes.push(summaryEnvelope);
      }

      return jsonOk({ published: true, envelopes, drafts, degraded });
    }

    return jsonOk({ reply, drafts, degraded });
  } catch (error) {
    console.error("[API] /chat/carbon error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
