// Info: (20260720 - Tzuhan) 憑證聯動端點(#53):列出帳本可匯入碳盤查的 EsgRecord 活動數據
// Info: (20260720 - Tzuhan) 純端口:授權 → 限流(READ,無 LLM) → 帳本閱覽裁決 → service
// Info: (20260720 - Tzuhan) 亦為 #54 證據鏈元件的實時資料來源(同一權限、同一形狀)

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { describeError } from "@/lib/utils/error_message";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { canViewAccountBook } from "@/lib/carbon_access";
import { CarbonEsgLinkService } from "@/services/carbon_esg_link.service";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const limited = enforceCarbonRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const accountBookId = request.nextUrl.searchParams.get("accountBookId");
    if (!accountBookId || accountBookId.length > 100) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }

    // Info: (20260720 - Tzuhan) 帳本閱覽裁決(#52 同語意、同錯誤碼):非帳本成員一律拒絕
    const allowed = await canViewAccountBook(
      sessionUser.address,
      accountBookId,
    );
    if (!allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonEsgLinkService();
    const result = await service.listBookActivities(accountBookId);
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
      `[API] /chat/carbon/esg-records GET error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
