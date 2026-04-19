import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { MODULES } from "@/constants/modules";
import { publicClient } from "@/lib/viem_public";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    // Info: (20251224 - Tzuhan) 1. Verify Token & Get User
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or missing device token");
    }

    // Info: (20260419 - Luphia) fetch pending balance from blockchain
    let pendingCredits = 0;
    try {
      if (user.address) {
        const balance = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.CREDIT_POINT as `0x${string}`,
          abi: ABIS.CREDIT_POINT,
          functionName: "balanceOf",
          args: [user.address as `0x${string}`],
          blockTag: "pending",
        });
        pendingCredits = Number(formatUnits(balance as bigint, 18));
      }
    } catch (err) {
      console.warn("Failed to fetch pending balance:", err);
    }

    // ToDo: (20260116 - Luphia) Use Blockchain Data for Plan & Credits
    // let plan: string = DEFAULT_PLAN;
    // let credits = 0;

    if (user.identityAddress) {
      try {
        // Info: (20260116 - Luphia) Use Blockchain Data for Plan & Credits
        // Commented out as getPlan/getCredits are not in ABI currently
        /* 
        const [chainPlan, chainCredits] = await Promise.all([
          publicClient.readContract({
            address: user.identityAddress as Address,
            abi: ABIS.IDENTITY,
            functionName: 'getPlan',
          }),
          publicClient.readContract({
            address: user.identityAddress as Address,
            abi: ABIS.IDENTITY,
            functionName: 'getCredits',
          }),
        ]);
        plan = chainPlan as string;
        credits = Number(chainCredits);
        */
      } catch (err) {
        console.warn(
          "Deprecate: (20260310 - Tzuhan) ",
          `[API] /auth/me failed to read contract for ${user.identityAddress}:`,
          err,
        );
      }
    }

    return jsonOk({
      ...user,
      address: user.address,
      modules: MODULES.filter((m) => m.basic).map((m) => m.key),
      isAdmin: user.role === "ADMIN",
      identityAddress: user.identityAddress,
      pendingCredits,
    });
  } catch (error) {
    console.error(
      "Deprecate: (20260310 - Tzuhan) ",
      "[API] /auth/me error:",
      error,
    );
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
