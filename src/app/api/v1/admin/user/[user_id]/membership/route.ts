import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/generated";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getMemberInfo } from "@/services/member.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { REWARD_AMOUNTS } from "@/constants/price";

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

    const info = await getMemberInfo(targetUser.address);
    if (!info.success || !info.data) {
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    const { registrationTime, totalCheckInRewards, totalPurchasedPoints } =
      info.data;

    // Info: (20260417 - Luphia) Calculate EXP dynamically from MembershipSystem smart contract rewards & top-ups
    const registrationExp =
      registrationTime > 0 ? REWARD_AMOUNTS.REGISTRATION_REWARD : 0;
    const totalExp =
      registrationExp + totalCheckInRewards + totalPurchasedPoints;

    let mode = "Bronze";
    let modeZh = "銅卡";
    if (totalExp >= 2000) {
      mode = "Gold";
      modeZh = "金卡";
    } else if (totalExp >= 500) {
      mode = "Silver";
      modeZh = "銀卡";
    }

    return jsonOk({
      exp: totalExp,
      mode: mode,
      modeZh: modeZh,
    });
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
