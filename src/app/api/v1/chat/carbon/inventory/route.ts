// Info: (20260716 - Emily) 盤查狀態帳本端點(#6518,E2EE 密文):GET 取回、PUT 保存(version 樂觀鎖)
// Info: (20260716 - Emily) 純端口: 授權 → 限流 → 頻道所有權 → 驗證 → Service；明文只存在於前端

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonInventoryStatePutSchema } from "@/validators";
import { CarbonInventoryStateService } from "@/services/carbon_inventory_state.service";
import {
  resolveCarbonAccess,
  CarbonAccessLevelEnum,
} from "@/lib/carbon_access";

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

    const channel = request.nextUrl.searchParams.get("channel");
    if (!channel) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }
    // Info: (20260716 - Emily) #52 存取裁決:個人會話限擁有者;帳本會話依 TeamRole(VIEWER 可閱覽)
    const access = await resolveCarbonAccess(
      sessionUser.address,
      channel,
      CarbonAccessLevelEnum.VIEW,
    );
    if (!access.allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonInventoryStateService();
    const state = await service.getState(channel);
    // Info: (20260716 - Emily) #52 回傳存取中繼資料:canEdit 供前端切唯讀、accountBookId 供切保存模式
    return jsonOk({
      state,
      access: { canEdit: access.canEdit, accountBookId: access.accountBookId },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/inventory GET error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const limited = enforceCarbonRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.SAVE,
    );
    if (limited) return limited;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }

    const parsed = CarbonInventoryStatePutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }
    // Info: (20260716 - Emily) #52 寫入需編輯權(帳本會話 EDITOR 以上;個人會話限擁有者)
    const access = await resolveCarbonAccess(
      sessionUser.address,
      parsed.data.channel,
      CarbonAccessLevelEnum.EDIT,
    );
    if (!access.allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonInventoryStateService();
    const result = await service.saveState(parsed.data);
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
      `[API] /chat/carbon/inventory PUT error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
