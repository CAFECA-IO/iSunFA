import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { custodialSignSchema } from "@/validators";
import { custodialSigningService } from "@/services/custodial_signing.service";

/**
 * Info: (20260810 - Luphia) 託管帳號的簽章端點。
 *
 * 用途：取代前端的 fido2ClientService.startLogin()。託管帳號（第三方登入）沒有 passkey，
 * 但它的 User.pubKeyX / pubKeyY 就是託管金鑰的公鑰，所以這裡回傳的是一份
 * **真正的 WebAuthn assertion**——後續的 encodeWebAuthnSignature 與後端的
 * verifySignature 完全不需要改動，鏈上的 fido2_account.sol 也照樣驗得過。
 *
 * 因此所有既有流程（付款、優惠券、團隊邀請…）都維持「必須有有效簽章」，
 * 不需要為託管帳號開任何繞過邏輯——那才是這個設計比逐一改端點更安全的地方。
 *
 * POST /api/v1/auth/custodial/sign
 * body: { challenge } 或 { userOp }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const parsed = custodialSignSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const assertion = await custodialSigningService.sign({
      user,
      challenge: parsed.data.challenge,
      userOp: parsed.data.userOp,
    });

    return jsonOk({ assertion });
  } catch (error) {
    console.error("[API] Custodial sign error:", error);
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
