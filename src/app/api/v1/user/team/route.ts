import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { assertCanOwnAnotherFreeTeam } from "@/services/team.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const teams = await teamRepo.listMemberTeam(sessionUser.id);
    return jsonOk(teams);
  } catch (error) {
    console.error("[API] /team GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return jsonFail(API_ERRORS.VA_TEAM_NAME_IS_REQUIRED);
    }

    /**
     * Info: (20260819 - Luphia) 一個人只能擁有一個免費團隊（產品決定 20260819）。
     * 擋在建立**之前**：建完再擋等於留下一個沒人要的空團隊。
     */
    await assertCanOwnAnotherFreeTeam(
      sessionUser.id,
      Math.floor(Date.now() / 1000),
    );

    const team = await teamRepo.createTeam({ name: body.name.trim() });
    await teamRepo.createTeamMember({
      team: { connect: { id: team.id } },
      user: { connect: { id: sessionUser.id } },
      role: "OWNER",
    });

    return jsonOk(team);
  } catch (error) {
    /**
     * Info: (20260819 - Luphia) `ApiError` 原樣回：免費團隊上限的錯誤要讓前端讀得到
     * 錯誤碼，否則使用者只看到一個「未知錯誤」的 500。
     */
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /team POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
