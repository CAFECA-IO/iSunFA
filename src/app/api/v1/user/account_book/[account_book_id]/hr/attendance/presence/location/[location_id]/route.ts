import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendancePresenceService } from "@/services/attendance_presence.service";

/**
 * Info: (20260813 - Julian) 單一地點的到班名單。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/presence/location/:location_id
 *
 * ## 為什麼這一支不寫 AuditLog，而匯出要寫
 *
 * 這是看板每 15 秒輪詢的端點。每次都寫一筆稽核，`AuditLog` 會被沖爆 ——
 * 而那正是 `AuditLogAction.READ` 的註解點名要避免的事：
 * 「真正該被看見的個資存取反而被淹沒。」
 *
 * 匯出不同：它是一個**刻意的、把名單帶走的動作**，次數以個位數計。
 *
 * ToDo: (20260813 - Julian) Demo 沒有範圍控制，任何員工都看得到全帳本的到班名單。
 * 正式版受 `mapVisibility` 約束（母文件 §D5），列於 demo 計畫書 §12.3 第 1 順位。
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; location_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { account_book_id: accountBookId, location_id: workLocationId } =
      await params;
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(
      await attendancePresenceService.getLocationRoster({
        accountBookId,
        workLocationId,
        observedAt: new Date(),
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance presence roster failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
