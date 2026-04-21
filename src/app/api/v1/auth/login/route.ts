import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { webAuthnService } from "@/services/webauthn.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { AppError } from "@/lib/utils/error";
import { createTeamForUsersWithoutTeam } from "@/services/team.service";
import { createAccountBookForTeamsWithoutOne } from "@/services/account_book.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, authentication, challengeToken } = body;

    let result;
    if (address) {
      // Info: (20260105 - Tzuhan) 原有邏輯
      result = await webAuthnService.loginWithAddress(address, authentication);
    } else if (challengeToken) {
      // Info: (20260105 - Tzuhan) [New] 無地址登入
      result = await webAuthnService.loginWithCredential(
        challengeToken,
        authentication,
      );
    } else {
      throw new AppError(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260308 - Luphia) 為沒有團隊的使用者建立一個團隊與帳簿
    await createTeamForUsersWithoutTeam();
    await createAccountBookForTeamsWithoutOne();

    // Info: (20251223 - Tzuhan) result 包含 { dewt, user }
    return jsonOk(result);
  } catch (error) {
    console.error("[API] Login error:", error);
    if (error instanceof AppError) {
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }
    return jsonFail(API_ERRORS.AUTH_LOGIN_FAILED);
  }
}
