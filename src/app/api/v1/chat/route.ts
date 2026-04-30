import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { ChatService } from "@/services/chat.service";

export async function POST(request: NextRequest) {
  try {
    const { message, tags, file, mimeType } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail({
        code: "IN000099",
        message: "Server configuration error",
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    const chatService = new ChatService(apiKey);
    const reply = await chatService.generateResponse(
      message,
      tags,
      file,
      mimeType,
    );

    return jsonOk({ reply });
  } catch (error) {
    console.error("[API] /chat error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
