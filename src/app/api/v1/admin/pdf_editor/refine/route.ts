import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { isLlmKeyMissingError } from "@/services/chat.service";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { AiRefineSchema } from "@/validators";
import { PdfEditorService } from "@/services/pdf_editor.service";

/**
 * Info: (20260603 - Julian) PDF 編輯器智慧化：AI 文本微調
 * POST /api/v1/admin/pdf_editor/refine
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260603 - Julian) 檢查 user 權限
    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    // Info: (20260605 - Julian) 解析 request body 並驗證
    const payload = await req.json();
    const parsed = AiRefineSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const { text, action } = parsed.data;

    // Info: (20260605 - Julian) 呼叫 Service
    const result = await PdfEditorService.refineText(text, action);

    return jsonOk({ result });
  } catch (error) {
    console.error("[API] /admin/pdf_editor/refine error:", error);
    /**
     * Info: (20260812 - Luphia) 用具名分類取代比對訊息字串。
     *
     * 原本是拿錯誤訊息去比對金鑰名稱那串字,而
     * `IS_GEMINI_API_KEY_UNDEFINED` 這個錯誤碼早就定義好、全庫零使用 ——
     * 於是「缺金鑰」被歸進通用的伺服器設定錯誤,而它的解法(去 /admin/settings
     * 設定金鑰)和其他設定問題完全不同。
     *
     * 比對字串也不穩:那句訊息在 ChatService 裡,任何人改動它就會讓這個分支靜默失效。
     */
    if (isLlmKeyMissingError(error)) {
      return jsonFail(API_ERRORS.IS_GEMINI_API_KEY_UNDEFINED);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
