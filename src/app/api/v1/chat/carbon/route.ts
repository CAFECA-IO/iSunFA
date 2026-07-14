import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ChatService } from "@/services/chat.service";
import { chatroomService } from "@/services/chatroom.service";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";
import { CarbonChatRequestSchema } from "@/validators";

// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260712 - Luphia) 取得 AI 回覆，使用者訊息與 AI 回覆皆加密入庫；AI 回覆另經 Centrifugo 回傳（前端只訂閱）
// Info: (20260714 - Emily) 手動解構驗證改為集中 Zod validator;新增 attachments(metadata 入加密 payload,base64 不入庫)
export async function POST(request: NextRequest) {
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
      await chatroomService.recordAndPublishAiReply({
        channel,
        recipientPublicKey,
        text: greeting,
        purpose: CARBON_CHAT_PURPOSE,
      });
      return jsonOk({ published: true });
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

      await chatroomService.recordAndPublishAiReply({
        channel,
        recipientPublicKey,
        text: reply,
        purpose: CARBON_CHAT_PURPOSE,
      });

      return jsonOk({ published: true });
    }

    return jsonOk({ reply });
  } catch (error) {
    console.error("[API] /chat/carbon error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
