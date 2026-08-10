import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import {
  ensureSecretVaultKey,
  getEnvHashChallenge,
} from "@/services/setup.env.service";
import { isVaultConfigured } from "@/lib/auth/key_vault";

/**
 * Info: (20260809 - Luphia) 補發保險庫主密鑰的第一步：備妥金鑰並取得待簽的 .env digest。
 *
 * 為什麼需要這條路徑：這把金鑰保護資料庫內的所有密文，因此必須留在 .env；
 * 而 .env 的任何變更都會讓 SUPER_ADMIN_SIGNATURE 失效，所以「加金鑰」與「重新簽署」
 * 必須是同一件事。部署精靈在系統完成初始化後就整個關閉了（會直接把使用者導去 /admin/reboot），
 * 於是原本只剩「手動改檔案再想辦法重簽」這種沒人想走的路。
 *
 * 這裡刻意不走 /api/v1/admin/setup/[action]：那條路徑沒有任何身分驗證
 * （它服務的是「系統還沒初始化」的階段），上線後不該再被開啟。
 * 改為 SUPER_ADMIN + passkey 簽章雙重把關，並直接呼叫 service 層。
 *
 * POST /api/v1/admin/system_setting/vault_key/challenge
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

    // Info: (20260809 - Luphia) 已經有可用金鑰就不重發，避免誤觸而讓既有密文再也解不開
    if (isVaultConfigured()) {
      return jsonOk({ alreadyConfigured: true });
    }

    const ensured = await ensureSecretVaultKey();
    if (!ensured.success) {
      return jsonFail(API_ERRORS.IS_SECRET_VAULT_MISSING);
    }

    // Info: (20260809 - Luphia) digest 必須在金鑰備妥「之後」才計算，新金鑰才會落在簽署範圍內
    const challenge = await getEnvHashChallenge();
    if (!challenge.success || !challenge.challenge) {
      return jsonFail(API_ERRORS.IS_CONFIG_MISSING);
    }

    return jsonOk({
      alreadyConfigured: false,
      challenge: challenge.challenge,
    });
  } catch (error) {
    console.error("[API] Vault key challenge error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
