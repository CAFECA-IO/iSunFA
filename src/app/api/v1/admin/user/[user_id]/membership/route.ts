import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getMembershipExp } from "@/services/point_account.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { MEMBERSHIP_TIER_ZH } from "@/constants/point_payment";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const userId = (await params).user_id;
    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    /**
     * Info: (20261015 - Luphia) EXP 改由個人點數帳本推導（區塊鏈退役）。
     * 原本讀 MembershipSystem 合約的累計值；定義見 `MEMBERSHIP_EXP_ENTRY_TYPES`。
     */
    const { exp, tier } = await getMembershipExp(targetUser.id);

    return jsonOk({
      exp: Number(exp),
      mode: tier,
      modeZh: MEMBERSHIP_TIER_ZH[tier],
    });
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
