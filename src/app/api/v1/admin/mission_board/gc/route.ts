import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { MISSION_ADMIN_ACTION } from "@/constants/mission_board";
import { garbageCollectMissionFolders } from "@/services/mission_board.service";

export async function POST(req: NextRequest) {
  try {
    const { body } = await validateAdminFido2(req);

    if (body.action !== MISSION_ADMIN_ACTION.GC) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20261015 - Luphia) 「哪些資料夾還有對應任務」改由 DB 判斷，見 garbageCollectMissionFolders
    const { deleted, details } = await garbageCollectMissionFolders();

    return jsonOk({
      success: true,
      deleted,
      details,
    });
  } catch (error) {
    console.error("GC Action Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
