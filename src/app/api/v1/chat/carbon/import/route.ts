// Info: (20260716 - Emily) 整份報告匯入端點(#56):multipart 收檔 → 內容驗證 → LLM 切段對應大綱 → 匯入預覽資料
// Info: (20260716 - Emily) 純端口:授權 → 限流(LLM bucket,昂貴呼叫) → 檔案裁決 → Service;
// Info: (20260716 - Emily) 不寫入任何資料 — 匯入落地由前端預覽卡確認後走既有報告保存路徑

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { matchesDeclaredMimeType } from "@/lib/file_signature";
import { ReportImportService } from "@/services/report_import.service";
import {
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
  CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES,
} from "@/constants/carbon_chatbot";

// Info: (20260716 - Emily) 匯入格式白名單:pdf(inline 萃取)與 md/純文字(直讀);
// Info: (20260716 - Emily) docx 需先轉換管線,Gemini inline 不支援 — 列於 #56 後續,不在本清單
const IMPORT_ACCEPTED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "text/markdown",
  "text/plain",
];

const TEXT_MIME_TYPES: readonly string[] = ["text/markdown", "text/plain"];

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260716 - Emily) LLM bucket:匯入為昂貴推論呼叫,與 chat/draft 共用額度
    const limited = enforceCarbonRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LLM,
    );
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language");
    if (!(file instanceof File)) {
      return jsonFail(API_ERRORS.VA_NO_FILE_UPLOADED);
    }

    if (!IMPORT_ACCEPTED_MIME_TYPES.includes(file.type)) {
      return jsonFail(API_ERRORS.VA_INVALID_DOCUMENT_TYPE);
    }
    if (file.size > CARBON_CHAT_MAX_ATTACHMENT_BYTES) {
      return jsonFail(API_ERRORS.VA_FILE_TOO_LARGE);
    }
    // Info: (20260716 - Emily) pdf 走 Gemini inline,超過安全值無法降級 → 直接拒收(明確錯誤優於靜默失敗)
    if (
      file.type === "application/pdf" &&
      file.size > CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES
    ) {
      return jsonFail(API_ERRORS.VA_FILE_TOO_LARGE);
    }

    // Info: (20260716 - Emily) magic bytes 複驗(#6517 同一防線):宣告與內容不符即拒
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesDeclaredMimeType(buffer, file.type)) {
      return jsonFail(API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH);
    }

    const isText = TEXT_MIME_TYPES.includes(file.type);
    const service = new ReportImportService();
    const result = await service.importReport(
      {
        name: file.name,
        mimeType: file.type,
        data: isText ? buffer.toString("utf-8") : buffer.toString("base64"),
        isText,
      },
      typeof language === "string" ? language : undefined,
    );

    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/import POST error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_REPORT_IMPORT_FAILED);
  }
}
