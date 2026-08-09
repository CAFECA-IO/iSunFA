/**
 * Info: (20260806 - Tzuhan) 待匯入解析結果端點(E2EE 密文):GET 取回、PUT 保存(version 樂觀鎖)、DELETE 清除。
 *
 * 存在的理由:解析一份 64 頁報告要跑十幾次 LLM、好幾分鐘,而結果原本只在 React state ——
 * 重整或關頁就沒了,「先不匯入、等一下再決定」根本無法表達。
 *
 * 純端口:授權 → 限流 → 存取裁決 → 驗證 → Service;明文只存在於前端。
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { describeError } from "@/lib/utils/error_message";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import {
  CarbonPendingImportPutSchema,
  CarbonPendingImportDeleteSchema,
} from "@/validators";
import { CarbonPendingImportService } from "@/services/carbon_pending_import.service";
import {
  resolveCarbonAccess,
  CarbonAccessLevelEnum,
} from "@/services/carbon_access.guard";

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
    const access = await resolveCarbonAccess(
      sessionUser.address,
      channel,
      CarbonAccessLevelEnum.VIEW,
    );
    if (!access.allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonPendingImportService();
    const pendingImport = await service.getPendingImport(channel);
    // Info: (20260806 - Tzuhan) 回傳存取中繼資料:canEdit 供前端決定要不要顯示匯入按鈕、accountBookId 供切保存模式
    return jsonOk({
      pendingImport,
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
      `[API] /chat/carbon/pending-import GET error: ${describeError(error)}`,
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

    const parsed = CarbonPendingImportPutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }
    const access = await resolveCarbonAccess(
      sessionUser.address,
      parsed.data.channel,
      CarbonAccessLevelEnum.EDIT,
    );
    if (!access.allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonPendingImportService();
    /**
     * Info: (20260806 - Tzuhan) 明文模式(帳本會話)沒有 ECIES 收件人,而 DB 欄位為 non-null,
     * 故以已驗證的使用者位址補齊 —— 那是紀錄用的擁有者標記,不是任何權限來源
     * (授權由 resolveCarbonAccess 以 channel 前綴與 TeamRole 裁決,不看這個欄位)。
     * 與 /chat/carbon/report PUT 同一慣例。
     */
    const result = await service.savePendingImport({
      ...parsed.data,
      recipientPublicKey: parsed.data.recipientPublicKey ?? sessionUser.address,
    });
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
      `[API] /chat/carbon/pending-import PUT error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function DELETE(request: NextRequest) {
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

    const parsed = CarbonPendingImportDeleteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }
    /**
     * Info: (20260806 - Tzuhan) 清除需編輯權而非 DELETE 權。
     *
     * 這裡刪的是「尚未落地的候選內容」,不是報告或會話本身;
     * 用 DELETE 層級(個人限擁有者、帳本限 OWNER/ADMIN)會讓 EDITOR
     * 匯入完卻無法收掉自己的預覽卡 —— 能寫入報告的人當然能捨棄候選。
     */
    const access = await resolveCarbonAccess(
      sessionUser.address,
      parsed.data.channel,
      CarbonAccessLevelEnum.EDIT,
    );
    if (!access.allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonPendingImportService();
    const result = await service.deletePendingImport(parsed.data.channel);
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
      `[API] /chat/carbon/pending-import DELETE error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
