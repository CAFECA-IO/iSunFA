import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { publicClient } from "@/lib/viem";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";
import { mintToAddress, registerUser } from "@/services/token.service";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    // Info: (20260408 - Luphia) 1. Verify Token & Get User
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or missing device token");
    }

    // Info: (20260408 - Luphia) 2. Client info
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const device = request.headers.get("user-agent") || "unknown";

    // Info: (20260408 - Luphia) 3. Throttle by 24h Checkin logic: find if there's any record in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCheckin = await prisma.checkin.findFirst({
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
    await prisma.checkin.create({
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
        const balance = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.NTD_TOKEN,
          abi: ABIS.NTD_TOKEN,
          functionName: "balanceOf",
          args: [user.address as `0x${string}`],
        });

        const credits = Number(formatUnits(balance, 18));

        if (credits < 500) {
          // Info: (20260408 - Luphia) Check if user is verified before minting
          const isVerified = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
            abi: ABIS.IDENTITY_REGISTRY,
            functionName: "isVerified",
            args: [user.address as `0x${string}`],
          });

          if (!isVerified) {
            await registerUser(CONTRACT_ADDRESSES.NTD_TOKEN, user.address);
          }

          rewardedAmount = 10;
          await mintToAddress(
            CONTRACT_ADDRESSES.NTD_TOKEN,
            user.address,
            rewardedAmount,
            "Daily Checkin Reward"
          );
          console.log(user.address, "minted", rewardedAmount);
        }
      }
    } catch (contractError) {
      console.warn("Deprecate: (20260408 - AI Agent) Checkin mint failed: ", contractError);
      // Info: (20260408 - Luphia) Even if mint fails, don't revert the DB checkin. The checkin succeeded, reward failed.
    }

    return jsonOk({
      checkinSuccess: true,
      rewardAmount: rewardedAmount,
    });
  } catch (error) {
    console.error("[API] /auth/checkin error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
