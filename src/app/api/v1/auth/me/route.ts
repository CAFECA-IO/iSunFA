import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { MODULES } from "@/constants/modules";
import { publicClient } from "@/lib/viem_public";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";
import { getUserPlan, type IUserPlanSnapshot } from "@/services/plan.service";
import { TEAM_PLAN } from "@/constants/subscription_quota";

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

    /**
     * Info: (20260819 - Luphia) 方案集中於 `plan.service`（route 只呼叫與回傳）。
     *
     * 這支端點原本一個 plan 欄位都沒回，於是前端 `user.plan` 永遠 undefined、
     * 徽章與方案頁一律 fallback 成免費版——付了訂閱費、DB 也寫進去了，
     * 畫面卻還說你是免費版。
     *
     * Info: (20260821 - Luphia) **純 DB、零 RPC**（產品裁定 20260821）：付款完成
     * 即視為會員卡有效，鑄卡狀態與方案顯示無關。先前這裡讀鏈上卡片並回
     * `planSource`——那條路徑已整個移除，`planSource` 欄位隨之取消
     * （沒有第二個來源，就沒有「來源」要說明）。
     *
     * 查不到不讓登入壞掉：這支是前端所有畫面的前置條件（`refreshAuth` 拿不到
     * payload 就等於未登入）。方案只是徽章上的一行字，退成免費版顯示並留 log。
     */
    let planSnapshot: IUserPlanSnapshot = {
      plan: TEAM_PLAN.FREE,
      ownedPlans: [],
    };
    try {
      planSnapshot = await getUserPlan({
        userId: user.id,
        nowSec: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      console.warn(
        `[API] /auth/me failed to resolve plan for ${user.id}:`,
        err,
      );
    }

    return jsonOk({
      ...user,
      custody,
      address: user.address,
      modules: MODULES.filter((m) => m.basic).map((m) => m.key),
      isAdmin: user.role === "ADMIN",
      identityAddress: user.identityAddress,
      pendingCredits,
      plan: planSnapshot.plan,
      ownedPlans: planSnapshot.ownedPlans,
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
