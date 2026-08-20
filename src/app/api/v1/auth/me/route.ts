import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { MODULES } from "@/constants/modules";
import { publicClient } from "@/lib/viem_public";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";
import {
  getUserPlan,
  PLAN_SOURCE,
  type IUserPlanSnapshot,
} from "@/services/plan.service";
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
     * Info: (20260819 - Luphia) 方案**集中於 `plan.service`，並以鏈上為準**
     *（產品決定 20260819）。
     *
     * 這支端點原本一個 plan 欄位都沒回（上面那段被註解掉的鏈上讀取是唯一的痕跡），
     * 於是前端 `user.plan` 永遠 undefined，徽章與方案頁一律 fallback 成免費版——
     * 付了訂閱費、`TeamSubscription` 也寫進去了，畫面卻還說你是免費版。
     *
     * 現在只呼叫一個入口：`getUserPlan()` 讀鏈上會員卡（權威）並以 DB 為快取，
     * route 不做任何方案判斷。`source` 一併回傳，前端才分得出「鏈上確認過」與
     * 「鏈上讀不到、暫時以 DB 顯示」。
     *
     * 查不到**不讓登入壞掉**：這支是前端所有畫面的前置條件（`refreshAuth` 拿不到
     * payload 就等於未登入）。方案只是徽章上的一行字，讓它的查詢錯誤把整個 session
     * 拖下去，代價與收益完全不成比例——退成免費版顯示，並留下 log。
     */
    let planSnapshot: IUserPlanSnapshot = {
      plan: TEAM_PLAN.FREE,
      ownedPlans: [],
      teams: [],
      source: PLAN_SOURCE.DB,
      mismatches: 0,
    };
    try {
      planSnapshot = await getUserPlan({
        userId: user.id,
        address: user.address,
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
      // Info: (20260819 - Luphia) 方案是鏈上確認過的，還是鏈上讀不到而暫以 DB 顯示
      planSource: planSnapshot.source,
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
