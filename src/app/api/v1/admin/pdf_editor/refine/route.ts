import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { ChatService } from "@/services/chat.service";
import {
  AI_REFINE_INSTRUCTIONS,
  TEXT_REFINEMENT_PROMPT,
} from "@/constants/prompts/pdf_editor/text_refinement";

/**
 * Info: (20260603 - Julian) PDF 編輯器智慧化：AI 文本微調
 * POST /api/v1/admin/pdf_editor/refine
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    // Info: (20260603 - Julian) Requires admin role for this tool
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    // Info: (20260603 - Julian) 解析 request body
    const { text, action } = await req.json();

    if (!text || !action) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail(API_ERRORS.IN_SERVER_CONFIGURATION_ERROR);
    }

    // Info: (20260604 - Julian) 透過前端傳來的 action 提取 prompt
    // 若 action 屬於 AiRefineType，使用對應的 prompt；否則為用戶自訂指令，直接使用 action 作為 prompt
    const instruction = AI_REFINE_INSTRUCTIONS[action] || action;

    // Info: (20260603 - Julian) 組合提示詞
    const finalPrompt = `${TEXT_REFINEMENT_PROMPT}

    【待處理文本】：
    ${text}

    【使用者指令】：
    ${instruction}`;

    const chatService = new ChatService(apiKey);
    const reply = await chatService.generateRaw(finalPrompt);

    return jsonOk({ result: reply.trim() });
  } catch (error) {
    console.error("[API] /admin/pdf_editor/refine error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
