import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ChatService } from "@/services/chat.service";

// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) API Route to handle Carbon Chatbot conversational flow with Gemini backend.
export async function POST(request: NextRequest) {
  try {
    const { history, currentStep, language, attachments } =
      await request.json();

    if (!history || !Array.isArray(history)) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const chatService = new ChatService();
    const reply = await chatService.generateCarbonChatbotResponse(
      history,
      currentStep,
      language,
      attachments,
    );

    return jsonOk({ reply });
  } catch (error) {
    console.error("[API] /chat/carbon error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
