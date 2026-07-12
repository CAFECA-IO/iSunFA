import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ChatService } from "@/services/chat.service";
import { chatroomService } from "@/services/chatroom.service";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";

// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260712 - Luphia) 取得 AI 回覆，使用者訊息與 AI 回覆皆加密入庫；AI 回覆另經 Centrifugo 回傳（前端只訂閱）
export async function POST(request: NextRequest) {
  try {
    const {
      history,
      currentStep,
      language,
      channel,
      recipientPublicKey,
      init,
    } = await request.json();

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

    if (!history || !Array.isArray(history)) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const reply = await chatService.generateCarbonChatbotResponse(
      history,
      currentStep,
      language,
    );

    // Info: (20260712 - Luphia) 有頻道與收件者公鑰時，記錄使用者訊息並記錄+發佈 AI 回覆；否則直接回傳（相容用）
    if (channel && recipientPublicKey) {
      const typedHistory = history as { role: string; text: string }[];
      const lastUserMessage = [...typedHistory]
        .reverse()
        .find((item) => item?.role === "user");

      if (lastUserMessage?.text) {
        await chatroomService.recordUserMessage({
          channel,
          recipientPublicKey,
          text: lastUserMessage.text,
          purpose: CARBON_CHAT_PURPOSE,
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
