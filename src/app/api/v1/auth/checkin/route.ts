import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { checkinRepo } from "@/repositories/checkin.repo";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { registerUserViaMembership } from "@/services/member.service";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    // Info: (20260408 - Luphia) 1. Verify Token & Get User
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260408 - Luphia) 2. Client info
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const device = request.headers.get("user-agent") || "unknown";

    // Info: (20260408 - Luphia) 3. Throttle by 24h Checkin logic: find if there's any record in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCheckin = await checkinRepo.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    if (recentCheckin) {
      // Info: (20260408 - Luphia) Already checked in today
      return jsonOk({
        checkinSuccess: false,
        message: "Already checked in within 24 hours.",
      });
    }

    // Info: (20260408 - Luphia) 4. Record the checkin
    await checkinRepo.create({
      data: {
        userId: user.id,
        ip,
        device,
      },
    });

    /**
     * Info: (20260809 - Luphia) 5. 確保鏈上會員註冊（AA 錢包 onboarding 的一環）。
     * 登入贈點機制已於 20260809 取消（產品決策）：不再檢查餘額、不再 mint
     * CHECK_IN_REWARD——本端點僅保留登入紀錄（稽核）與註冊確保，
     * rewardAmount 固定為 0，前端不再彈出獎勵視窗。
     */
    try {
      if (user.address) {
        await registerUserViaMembership(user.address);
      }
    } catch (contractError) {
      console.warn("Checkin registration blocked or failed: ", contractError);
    }

    return jsonOk({
      checkinSuccess: true,
      rewardAmount: 0,
    });
  } catch (error) {
    console.error("[API] /auth/checkin error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
