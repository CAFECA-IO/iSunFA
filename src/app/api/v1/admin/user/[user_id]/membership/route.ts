import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/generated/enums";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getMemberInfo } from "@/services/member.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");
    }

    const userId = (await params).user_id;
    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const info = await getMemberInfo(targetUser.address);
    if (!info.success || !info.data) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Failed to get membership info");
    }

    const { registrationTime, totalCheckInRewards, totalPurchasedPoints } = info.data;
    
    // Info: (20260417 - Luphia) Calculate EXP dynamically from MembershipSystem smart contract rewards & top-ups
    const registrationExp = registrationTime > 0 ? 100 : 0;
    const totalExp = registrationExp + totalCheckInRewards + totalPurchasedPoints;

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
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}
