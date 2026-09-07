// Info: (20260714 - Emily) 聊天附件上傳端點:multipart 收檔 → Laria 分片持久化 → 回傳 cid
// Info: (20260714 - Emily) 取代 base64-in-JSON 傳輸(大檔會撐爆請求 body);訊息只帶 metadata+cid,內容由管線經 recoverLaria 取回

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { AttachmentSecurityService } from "@/services/attachment_security.service";
import { formatFileSize } from "@/lib/utils/common";
import {
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
} from "@/constants/carbon_chatbot";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260716 - Emily) 限流(#6516):DeWT 驗證後、業務邏輯前 Fail Fast
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.UPLOAD,
    );
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonFail(API_ERRORS.VA_NO_FILE_UPLOADED);
    }

    // Info: (20260714 - Emily) 服務端複驗(前端 Fail Fast 之外的防線):MIME 白名單與大小上限
    const allowedMimeTypes: readonly string[] =
      CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.type)) {
      return jsonFail(API_ERRORS.VA_INVALID_DOCUMENT_TYPE);
    }
    if (file.size > CARBON_CHAT_MAX_ATTACHMENT_BYTES) {
      return jsonFail(API_ERRORS.VA_FILE_TOO_LARGE);
    }

    // Info: (20260716 - Emily) 附件安全管線(#6517):magic bytes → 掃毒 → 配額(5GB) → Laria 上傳 → 記帳
    const securityService = new AttachmentSecurityService();
    const { cid } = await securityService.processUpload({
      address: sessionUser.address,
      file,
    });

    return jsonOk({
      name: file.name,
      size: formatFileSize(file.size),
      mimeType: file.type,
      cid,
    });
  } catch (error) {
    // Info: (20260716 - Emily) 服務層裁決(型別不符/掃毒命中/配額耗盡)原碼透傳，其餘包裝為上傳失敗
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/attachment POST error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UPLOAD_FAILED);
  }
}
