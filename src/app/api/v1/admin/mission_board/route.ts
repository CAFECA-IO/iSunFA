import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { Role } from "@/constants/role";
import { listAdminTasks } from "@/services/mission_board.service";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    // Info: (20261015 - Luphia) 任務看板改由 DB 提供，不再逐批讀 MissionBoard 合約
    const allTasks = await listAdminTasks();

    return jsonOk(allTasks);
  } catch (error) {
    console.error("MissionBoard API Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
