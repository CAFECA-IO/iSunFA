import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import { jsonOk, jsonFail } from "@/lib/utils/response";
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
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260419 - Luphia) fetch pending balance from blockchain
    let pendingCredits: string = "0";
    try {
      if (user.address) {
        const balance = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.CREDIT_POINT as `0x${string}`,
          abi: ABIS.CREDIT_POINT,
          functionName: "balanceOf",
          args: [user.address as `0x${string}`],
          blockTag: "pending",
        });
        pendingCredits = formatUnits(balance as bigint, 18);
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

    /**
     * Info: (20260810 - Luphia) 讓前端知道這個帳號是 passkey 還是託管。
     * 託管使用者簽不出 FIDO2 assertion，付款等流程必須跳過喚起 passkey 的步驟，
     * 否則會卡在一個永遠不會成功的系統對話框。
     */
    const custody = await resolveCustodyType(user.id);

    return jsonOk({
      ...user,
      custody,
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
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
