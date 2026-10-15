import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { MISSION_ADMIN_ACTION } from "@/constants/mission_board";
import { bumpTask, cancelTask } from "@/services/mission_board.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mission_id: string }> },
) {
  try {
    const { body } = await validateAdminFido2(req);

    const resolvedParams = await params;
    const taskId = Number(resolvedParams.mission_id);
    // Info: (20261015 - Luphia) DB 主鍵是整數；小數或負數直接擋下，不讓它走到查詢才失敗
    if (!Number.isSafeInteger(taskId) || taskId < 0) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const actionType = body.action;

    if (actionType === MISSION_ADMIN_ACTION.CANCEL) {
      await cancelTask(taskId);
      return jsonOk({ success: true });
    } else if (actionType === MISSION_ADMIN_ACTION.BUMP) {
      // Info: (20261015 - Luphia) 懸賞加一成只改紀錄，不再 approve / 轉代幣
      await bumpTask(taskId);
      return jsonOk({ success: true });
    } else {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }
  } catch (error: unknown) {
    console.error("Mission Action Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
