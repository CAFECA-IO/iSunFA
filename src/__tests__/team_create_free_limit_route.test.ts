import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST as createTeam } from "@/app/api/v1/user/team/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { assertCanOwnAnotherFreeTeam } from "@/services/team.service";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260819 - Luphia) 免費團隊上限真的擋在建立團隊的路徑上（產品決定 20260819）。
 *
 * 測到函式不等於測到接線（checklist §1.7）——那正是 #6684 review 抓到的高 finding，
 * 所以這條規則從一開始就直接匯入 route handler 驗。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({ id: "user-1" })),
}));
jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    createTeam: jest.fn(async () => ({ id: "team-new" })),
    createTeamMember: jest.fn(async () => ({ id: "member-1" })),
    listMemberTeam: jest.fn(async () => []),
  },
}));
jest.mock("@/services/team.service", () => ({
  assertCanOwnAnotherFreeTeam: jest.fn(async () => undefined),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function request(): {
  request: NextRequest;
} {
  return {
    request: new NextRequest("https://isunfa.com/api/v1/user/team", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer dewt",
      },
      body: JSON.stringify({ name: "新團隊" }),
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-1" });
  asMock(assertCanOwnAnotherFreeTeam).mockResolvedValue(undefined);
});

describe("POST /api/v1/user/team", () => {
  it("上限未達時照常建立", async () => {
    const response = await createTeam(request().request);

    expect(response.status).toBe(200);
    expect(asMock(assertCanOwnAnotherFreeTeam)).toHaveBeenCalledWith(
      "user-1",
      expect.any(Number),
    );
    expect(asMock(teamRepo.createTeam)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260819 - Luphia) 擋在建立**之前**，而且錯誤碼要傳得出去。
   *
   * 兩個斷言缺一不可：沒有建立團隊（建完再擋等於留下一個沒人要的空團隊），
   * 且回應帶著 `TW000026`（原本這支 route 的 catch 一律回 IS_UNKNOWN，
   * 使用者只會看到「未知錯誤」而不知道是方案的界線）。
   */
  it("已擁有免費團隊時擋下，且不建立任何資料", async () => {
    asMock(assertCanOwnAnotherFreeTeam).mockRejectedValue(
      new ApiError(
        API_ERRORS.TW_FREE_TEAM_LIMIT.code,
        API_ERRORS.TW_FREE_TEAM_LIMIT.message,
        API_ERRORS.TW_FREE_TEAM_LIMIT.status,
      ),
    );

    const response = await createTeam(request().request);
    const json = (await response.json()) as { errorCode?: string };

    expect(response.status).not.toBe(200);
    expect(json.errorCode).toBe("TW000026");
    expect(asMock(teamRepo.createTeam)).not.toHaveBeenCalled();
    expect(asMock(teamRepo.createTeamMember)).not.toHaveBeenCalled();
  });
});
