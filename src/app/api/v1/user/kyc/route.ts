import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { grantRegistrationReward } from "@/services/point_account.service";
import { POINT_LEDGER_OUTCOME } from "@/constants/point_ledger";

/**
 * Info: (20261015 - Luphia) 付款前的身分初始化（區塊鏈退役）。
 *
 * 原本這裡在鏈上註冊會員（MembershipSystem.registerUser，順帶鑄造註冊獎勵）；
 * 前端 payment_modal 在 `user.isVerified` 為 false 時先打這一支再付款。
 * 鏈退役後註冊就是「註冊獎勵已入帳」（見 point_account.service 的 isVerified 說明），
 * 這支冪等地補發它，`/auth/me` 隨即回 isVerified = true。
 *
 * body（姓名等）原本就沒有寫入（`updateKYCData` 一直是註解掉的），這裡也不讀。
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const result = await grantRegistrationReward(user.id);
    if (
      result.outcome !== POINT_LEDGER_OUTCOME.OK &&
      result.outcome !== POINT_LEDGER_OUTCOME.DUPLICATE
    ) {
      console.error("[API] /user/kyc registration failed:", result.outcome);
      return jsonFail(API_ERRORS.NF_USER);
    }

    return jsonOk({
      registered: true,
      identityAddress: user.address,
    });
  } catch (error) {
    console.error("[API] /user/kyc error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
