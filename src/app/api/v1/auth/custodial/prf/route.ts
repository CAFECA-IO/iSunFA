import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { custodialPrfSchema } from "@/validators";
import { custodialPrfService } from "@/services/custodial_prf.service";

/**
 * Info: (20260812 - Luphia) 託管帳號索取 PRF 替身秘密。
 *
 * 用途與 `custodial/sign` 同構:那支取代 `fido2ClientService.startLogin()`,
 * 這支取代 `getPrfSecret()` 的 WebAuthn 呼叫。前端一律經 `requestPrfSecret()`,
 * passkey 走驗證器、託管走這裡 —— 加解密流程本身完全不分岔。
 *
 * 沒有這支的話,託管帳號會卡在一個永遠不會成功的 passkey 系統對話框前面
 * （ADR 016 對 `startLogin` 的那條警告,對 PRF 一字不改地成立）。
 *
 * **這條端點回傳的是可以解開該使用者對話內容的秘密**,因此:
 * - 身分一律取自 DeWT,不接受呼叫端指定 userId
 * - passkey 帳號一律拒絕（在 service 擋,見 custodial_prf.service）
 * - 與簽章同一個限流桶:偷到一枚 DeWT 就批次撈秘密的成本不該是零
 *
 * POST /api/v1/auth/custodial/prf
 * body: { prfSalt }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const limited = enforceCarbonRateLimit(
      user.id,
      RateLimitBucketEnum.SIGNING,
    );
    if (limited) return limited;

    const body = await request.json();
    const parsed = custodialPrfSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const prfSecret = await custodialPrfService.derive({
      userId: user.id,
      prfSalt: parsed.data.prfSalt,
    });

    // Info: (20260812 - Luphia) 只記成功與使用者,不記 salt 也不記秘密 —— 兩者都足以還原金鑰
    logger.info("[API] custodial prf derived", { userId: user.id });

    return jsonOk({ prfSecret });
  } catch (error) {
    logger.error("Custodial prf derivation failed", {
      message: (error as Error).message,
    });
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
