import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
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
    if (error instanceof Error && error.message.includes("AI_SERVICE")) {
      return jsonFail(API_ERRORS.IN_SERVER_CONFIGURATION_ERROR);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
