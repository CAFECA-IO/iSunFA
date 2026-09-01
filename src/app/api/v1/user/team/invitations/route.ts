import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { listPendingInvitationsForUser } from "@/services/team_invitation.service";

/**
 * Info: (20260325 - Tzuhan) List pending invitations for the currently logged-in user
 *
 * Info: (20260825 - Julian) 改走 service 的共用查詢，帶來兩個行為改變：
 *
 * 1. **email 邀請現在也看得到。** 原本直查 `getPendingInvitationsByAddress`，
 *    而 email 邀請的 `inviteeAddress` 是 NULL —— 已註冊的人被 email 邀請時，
 *    這一頁完全看不到那封邀請。
 * 2. **過期的邀請不再列出。** 過期不是一種 status（時間到了不會有任何程式碼執行），
 *    所以原本的查詢照樣把它們列出來，而它們點下去接受不了。
 *
 * 與小鈴鐺共用同一支的理由：鈴鐺上那則邀請通知點下去就是導到這一頁。
 * 兩邊各查一次的話，症狀會是「通知說有一封邀請，點進去這一頁說沒有」。
 *
 * Info: (20260826 - Julian) 限流走 `NOTIFICATION_READ`（review：既有護欄）。
 *
 * 這支端點原本沒有限流，那是既有狀態；但**兩條路徑合流是這次造成的** ——
 * 它現在與鈴鐺呼叫同一支 `listPendingInvitationsForUser`，同樣兩趟 DB
 *（查已驗證信箱 + 查邀請表）。放著不限流的話，`NOTIFICATION_READ`
 * 的 30/分就多了一條完全等價的旁路，那個數字也就不再是上限。
 *
 * 刻意共用**同一個桶**而不是另開一個：同一位使用者、同一份成本，
 * 分兩個桶等於把上限乘二。桶的意義是「這個人每分鐘可以讓我們做幾次
 * 這件事」，而這裡的「這件事」是同一件。
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260826 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.NOTIFICATION_READ,
    );
    if (limited) return limited;

    const invitations = await listPendingInvitationsForUser({
      userId: sessionUser.id,
      address: sessionUser.address,
      nowMs: Date.now(),
    });

    return jsonOk(invitations);
  } catch (error) {
    console.error("[API] /team/invitations GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
