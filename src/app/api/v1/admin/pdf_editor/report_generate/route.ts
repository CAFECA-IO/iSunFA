import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { AiReportGenerateSchema } from "@/validators";
import { PdfEditorService } from "@/services/pdf_editor.service";

/**
 * Info: (20260605 - Julian) PDF 編輯器智慧化：AI 產生報告
 * POST /api/v1/admin/pdf_editor/report_generate
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260605 - Julian) 檢查 user 權限
    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    // Info: (20260605 - Julian) 解析 request body，並驗證參數
    const payload = await req.json();
    const parsed = AiReportGenerateSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260605 - Julian) 提取參數
    const { data, instruction } = parsed.data;

    // Info: (20260720 - Julian) 呼叫 service，並傳入 req.signal 讓使用者中止時連底層 LLM 一起取消
    const result = await PdfEditorService.generateAiReport(
      data,
      instruction,
      req.signal,
    );

    return jsonOk({ result });
  } catch (error) {
    // Info: (20260720 - Julian) 使用者中止：客戶端已離線，無需視為錯誤或噪音記錄
    // ToDo: (20260721 - Luphia) 中止回傳 IS_UNKNOWN 語意不精確，建議新增專屬 aborted 錯誤碼以區隔真正的未知錯誤
    if (req.signal.aborted) {
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }
    console.error("[API] /admin/pdf_editor/report_generate error:", error);
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      return jsonFail(API_ERRORS.IN_SERVER_CONFIGURATION_ERROR);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
