import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { systemSettingChallengeSchema } from "@/validators";
import { systemSettingService } from "@/services/system_setting.service";

/**
 * Info: (20260809 - Luphia) 取得待簽設定的 challenge。
 * POST /api/v1/admin/system_setting/challenge
 *
 * 這一步不寫入任何東西，待簽的值在簽章完成前只存在於瀏覽器與這次請求中，
 * 因此不需要伺服器端暫存區，也就沒有「未簽章的設定殘留在 DB」的風險。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }
    if (user.role !== Role.SUPER_ADMIN) {
      return jsonFail(API_ERRORS.AUTH_SUPER_ADMIN_REQUIRED);
    }

    const body = await request.json();
    const parsed = systemSettingChallengeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const challenge = await systemSettingService.buildChallenge(
      parsed.data.values,
      parsed.data.baseVersion,
    );
    return jsonOk(challenge);
  } catch (error) {
    console.error("[API] System setting challenge error:", error);
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
