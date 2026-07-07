import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { AiMermaidModifySchema } from "@/validators";
import { PdfEditorService } from "@/services/pdf_editor.service";
import { MermaidChartType } from "@/constants/mermaid_chart";

/**
 * Info: (20260623 - Julian) PDF 編輯器智慧化：AI 修改 Mermaid 圖表
 * POST /api/v1/admin/pdf_editor/mermaid_modify
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260623 - Julian) 檢查 user 權限
    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    // Info: (20260623 - Julian) 解析 request body 並驗證
    const payload = await req.json();
    const parsed = AiMermaidModifySchema.safeParse(payload);

    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const { originalChart, chartType, instruction } = parsed.data;

    // Info: (20260623 - Julian) 呼叫 Service
    const result = await PdfEditorService.modifyMermaidChart(
      originalChart,
      chartType as MermaidChartType,
      instruction,
    );

    return jsonOk({ result });
  } catch (error) {
    console.error("[API] /admin/pdf_editor/mermaid_modify error:", error);
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      return jsonFail(API_ERRORS.IN_SERVER_CONFIGURATION_ERROR);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
