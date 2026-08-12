import { NextRequest } from "next/server";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/admin_guard";
import { systemSettingApplySchema } from "@/validators";
import { systemSettingService } from "@/services/system_setting.service";

/**
 * Info: (20260809 - Luphia) 系統設定的營運期讀寫端口。
 *
 * 與部署精靈的差別：精靈只在初始化期間可用（validateEnv 通過後即鎖死），
 * 這條路徑則是系統上線後修改設定的唯一入口——不需要改 .env，也不需要重啟服務。
 *
 * 權限：檢視限管理員；寫入限 SUPER_ADMIN，且必須附上對「設定內容 digest」的 passkey 簽章。
 */

// Info: (20260809 - Luphia) AppError 帶回其源自 API_ERRORS 的錯誤定義
function failFrom(error: unknown) {
  if (error instanceof AppError) {
    return jsonFail({
      code: error.apiCode,
      message: error.message,
      status: error.code,
    });
  }
  return jsonFail(API_ERRORS.IS_UNKNOWN);
}

/**
 * Info: (20260809 - Luphia) 列出目前設定（秘密值已遮蔽）與信任狀態。
 * GET /api/v1/admin/system_setting
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [settings, trust, history] = await Promise.all([
      systemSettingService.listForAdmin(),
      systemSettingService.getTrustState(),
      systemSettingService.listHistory(),
    ]);

    return jsonOk({ settings, trust, history });
  } catch (error) {
    logger.error("[API] List system settings error:", {
      message: (error as Error).message,
    });
    return failFrom(error);
  }
}

/**
 * Info: (20260809 - Luphia) 以 SUPER_ADMIN 簽章寫入設定。
 * POST /api/v1/admin/system_setting
 * body: { values, version, authentication }
 *
 * values 是「全量目標狀態」；伺服器會自行重算 digest 再驗簽，
 * 因此簽章綁定的是實際要寫進 DB 的內容，而不只是「同意執行一次操作」。
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const body = await request.json();
    const parsed = systemSettingApplySchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const result = await systemSettingService.applySigned({
      pending: parsed.data.values,
      signature: parsed.data.authentication as unknown as AuthenticationJSON,
      baseVersion: parsed.data.baseVersion,
    });

    return jsonOk(result);
  } catch (error) {
    logger.error("[API] Apply system settings error:", {
      message: (error as Error).message,
    });
    return failFrom(error);
  }
}
