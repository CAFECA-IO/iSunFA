import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
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
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || (operator.role !== "OWNER" && operator.role !== "ADMIN")) {
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
