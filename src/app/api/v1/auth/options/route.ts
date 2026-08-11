import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { webAuthnService } from "@/services/webauthn.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { AppError } from "@/lib/utils/error";
import { randomBytes } from "crypto";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  ChallengePurpose,
  isChallengePurpose,
} from "@/constants/challenge_purpose";

/**
 * Info: (20260116 - Tzuhan) 統一 WebAuthn 選項/挑戰碼入口
 * GET /api/v1/auth/options?action=register
 * GET /api/v1/auth/options?action=login&address=0x... (有狀態登入)
 * GET /api/v1/auth/options?action=login (無狀態/探索式登入)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const address = searchParams.get("address");

    // Info: (20260116 - Tzuhan) 1. 處理註冊挑戰碼
    if (action === "register") {
      const challenge = randomBytes(32).toString("base64url");
      return jsonOk({ challenge });
    }

    // Info: (20260116 - Tzuhan) 2. 處理登入挑戰碼
    if (action === "login") {
      if (address) {
        // Info: (20260116 - Tzuhan) 有地址 -> 查鏈同步 -> 存入 DB
        const challenge = await webAuthnService.generateLoginOptions(address);
        return jsonOk({ challenge });
      }

      /**
       * Info: (20260811 - Luphia) 無地址 -> Stateless Challenge（回傳 challenge + token）。
       *
       * purpose 決定這枚 token 之後能授權什麼。LOGIN 以外的用途一定發生在已登入狀態，
       * 因此必須帶 DeWT 並把 token 綁定到本人（sub）——否則一枚 token 可以拿去
       * 授權任何操作、任何人的操作。
       */
      const purposeParam = searchParams.get("purpose");
      const purpose = isChallengePurpose(purposeParam)
        ? purposeParam
        : ChallengePurpose.LOGIN;

      if (purpose === ChallengePurpose.LOGIN) {
        const { challenge, token } =
          await webAuthnService.generateStatelessLoginOptions();
        return jsonOk({ challenge, token });
      }

      const user = await getIdentityFromDeWT(
        request.headers.get("Authorization"),
      );
      if (!user) {
        return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
      }

      const { challenge, token } =
        await webAuthnService.generateStatelessLoginOptions(purpose, user.id);
      return jsonOk({ challenge, token });
    }

    throw new AppError(API_ERRORS.VL_MISSING_PARAMS);
  } catch (error) {
    console.error("[API] Options generation error:", error);
    if (error instanceof AppError) {
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }
    return jsonFail(API_ERRORS.IN_FAILED_TO_GENERATE_AUTH_OPT);
  }
}
