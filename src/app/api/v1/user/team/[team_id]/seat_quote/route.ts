import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { isTeamManagerRole } from "@/constants/team";
import { teamRepo } from "@/repositories/team.repo";
import { quoteSeatAddition } from "@/services/team_seat.service";
import { seatQuoteQuerySchema } from "@/validators";

/**
 * Info: (20260818 - Luphia) GET /api/v1/user/team/[team_id]/seat_quote?seats=1
 *
 * 加人**之前**先問「會被收多少錢」。在此之前這個問題沒有答案：金額只在
 * `chargeSeatAddition` 內部算出來、當場刷卡，畫面事前什麼都沒說，事後也只讀
 * `reusedPaidSeat`。使用者的原話是「我在邀請時完全不知道會被加收多少錢」。
 *
 * 完全唯讀：不建單、不扣款、不改席次。它與扣款走**同一支** `quoteSeatAddition`，
 * 所以這裡顯示的金額就是送出後會扣的金額。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;

    /**
     * Info: (20260818 - Luphia) 權限與邀請端點同一道（OWNER / ADMIN）。
     *
     * 這是團隊的帳單資訊，不該讓 EDITOR / VIEWER 看到；也刻意不比邀請寬鬆——
     * 「試算」與「真的送出」看到的規則要一致，否則畫面會對沒有權限的人報價。
     */
    /**
     * Info: (20260819 - Luphia) 走集中的 `isTeamManagerRole`，不要手寫字面比對。
     *
     * `constants/team.ts` 已經寫過理由：這個組合原本以字面字串散落在各端點
     * （`role !== "OWNER" && role !== "ADMIN"`），每一處都是一次拼錯的機會，
     * 而拼錯的方向是「權限放寬」。新端點沿用字面字串等於把收斂掉的機會再放出去。
     *
     * 而且它有立即的後果：另一條分支正在移除團隊的 ADMIN 角色，並加了一支掃整個
     * `src` 的測試擋 `"ADMIN"` 字面量。兩邊不論誰第二個合，這一行都會讓那支測試紅
     * ——那不是誤報，是它正確地發揮作用。
     */
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!isTeamManagerRole(operator?.role)) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const parsed = seatQuoteQuerySchema.safeParse({
      seats: request.nextUrl.searchParams.get("seats") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const quote = await quoteSeatAddition({
      teamId,
      seats: parsed.data.seats,
      nowMs: Date.now(),
      operatorUserId: sessionUser.id,
    });

    return jsonOk(quote);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
  }
}
