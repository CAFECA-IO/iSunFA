import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { isLlmKeyMissingError } from "@/services/chat.service";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
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
    // Info: (20260731 - Julian) 回傳專屬的 IS_REQUEST_ABORTED（499）而非 IS_UNKNOWN（500），
    // Info: (20260731 - Julian) 使「使用者取消」與「真正的未知錯誤」在日誌與監控上可區隔，不污染 5xx 錯誤率
    if (req.signal.aborted) {
      return jsonFail(API_ERRORS.IS_REQUEST_ABORTED);
    }
    console.error("[API] /admin/pdf_editor/report_generate error:", error);
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
    /**
     * Info: (20260812 - Luphia) 已分類的錯誤原樣回,不要收成 IS_UNKNOWN。
     *
     * 移除 env fallback 之後,`ensureClient()` 多了一條失敗途徑:系統設定進入
     * UNTRUSTED 時 `get()` 直接拋 `AppError(IS_SETTING_STATE_UNTRUSTED)`。
     * 落到 IS_UNKNOWN 的話,「資料庫設定驗簽失敗」這個最需要被維運看到的成因,
     * 在畫面上與任何未知錯誤沒有區別 —— 與這批修正自己的主張矛盾。
     * 形式沿用 repo 既有慣例（如 admin/system_setting/route.ts）。
     */
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
