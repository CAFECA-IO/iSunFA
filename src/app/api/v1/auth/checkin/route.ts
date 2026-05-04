import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { checkinRepo } from "@/repositories/checkin.repo";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { publicClient } from "@/lib/viem";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";
import {
  claimDailyCheckIn,
  registerUserViaMembership,
} from "@/services/member.service";
import { CURRENCY_UNIT, REWARD_AMOUNTS } from "@/constants/price";
import { paymentRepo } from "@/repositories/payment.repo";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";

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

    // Info: (20260408 - Luphia) 5. Check balance and maybe mint
    let rewardedAmount = 0;
    console.log(user.address, "checkin");
    try {
      if (user.address) {
        await registerUserViaMembership(user.address);
        const balance = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.CREDIT_POINT,
          abi: ABIS.CREDIT_POINT,
          functionName: "balanceOf",
          args: [user.address as `0x${string}`],
        });

        const credits = Number(formatUnits(balance, 18));

        if (credits < REWARD_AMOUNTS.FREE_PLAN_LIMIT) {
          // Info: (20260408 - Luphia) Check if user is blacklisted before minting
          const isBlacklisted = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.DYNAMIC_KYC_MEMBERSHIP,
            abi: ABIS.DYNAMIC_KYC_MEMBERSHIP,
            functionName: "isBlacklisted",
            args: [user.address as `0x${string}`],
          });

          if (isBlacklisted) {
            console.warn(
              `User ${user.address} is blacklisted, skipping checkin mint`,
            );
            return;
          }

          rewardedAmount = REWARD_AMOUNTS.DAILY_CHECKIN_REWARD;
          const mintResult = await claimDailyCheckIn(user.address);

          if (mintResult.success) {
            await paymentRepo.createOrder({
              userId: user.id,
              type: ORDER_TYPE.CHECK_IN_REWARD,
              amount: rewardedAmount,
              unit: CURRENCY_UNIT.ICP,
              status: ORDER_STATUS.COMPLETED,
              challenge: "reward",
              data: {},
              transactionHash: (mintResult.data as { tx: string })?.tx || "",
            });
            console.log(user.address, "checked in", rewardedAmount);
          } else {
            throw new Error(
              `MembershipSystem checkin failed: ${mintResult.message}`,
            );
          }
        }
      }
    } catch (contractError) {
      console.warn("Checkin transaction blocked or failed: ", contractError);
    }

    return jsonOk({
      checkinSuccess: true,
      rewardAmount: rewardedAmount,
    });
  } catch (error) {
    console.error("[API] /auth/checkin error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
