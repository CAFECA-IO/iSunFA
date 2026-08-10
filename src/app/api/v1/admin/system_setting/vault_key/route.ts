import { NextRequest } from "next/server";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { vaultKeyApplySchema } from "@/validators";
import { verifyAndFinalizeConfig } from "@/services/setup.auth.service";
import { restartService } from "@/services/setup.state.service";

/**
 * Info: (20260809 - Luphia) 補發保險庫主密鑰的第二步：驗章、寫入 .env、重啟服務。
 *
 * verifyAndFinalizeConfig 會再驗一次 FIDO2 簽章（比對 .env 內的 SUPER_ADMIN 公鑰與
 * 剛才那份 digest），因此就算這支端點的授權判斷有疏漏，沒有 SUPER_ADMIN passkey
 * 也改不動 .env。
 *
 * 寫入後一定要重啟：Next.js 只在啟動時載入 .env，不重啟的話 process.env 仍是舊的，
 * 加密照樣會失敗——那正是這次回報的症狀。
 *
 * POST /api/v1/admin/system_setting/vault_key
 * body: { authentication }
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
    const parsed = vaultKeyApplySchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const result = await verifyAndFinalizeConfig(
      parsed.data.authentication as unknown as AuthenticationJSON,
    );
    if (!result.success) {
      console.error("[API] Vault key finalize failed:", result.error);
      return jsonFail(API_ERRORS.AUTH_SETTING_SIGNATURE_INVALID);
    }

    // Info: (20260809 - Luphia) 回應先送出，重啟才會在一秒後發生（見 restartService）
    await restartService();

    return jsonOk({ restarting: true });
  } catch (error) {
    console.error("[API] Vault key apply error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
