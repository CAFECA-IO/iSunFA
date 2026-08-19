import { userRepo } from "@/repositories/user.repo";
import { teamRepo } from "@/repositories/team.repo";
import { TeamRole } from "@/constants/team";
import { TEAM_PLAN } from "@/constants/subscription_quota";
import { resolveEffectivePlanId } from "@/services/spend.service";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260819 - Luphia) 一個人只能**擁有**一個免費團隊（產品決定 20260819）。
 *
 * 邀請量的兩道上限（同時未接受數、每日寄送數）是 per-team 的，而建立團隊先前
 * 沒有數量上限也沒有限流——一個帳號建 10 個免費團隊就有 10 份額度，兩道上限
 * 一次都不會觸發（review #6684 中）。
 *
 * 只算 **OWNER**：被別人邀請加入的團隊不是他能開的量，算進去等於因為別人的行為
 * 擋住他建立自己的團隊。
 *
 * 付費團隊不受限——那些團隊每一席都在收費，本來就有經濟上的煞車。
 *
 * 「什麼是免費方案」交給 `resolveEffectivePlanId`（唯一判斷點）：過期或非 ACTIVE
 * 的訂閱一律視為免費，否則「訂閱過期的團隊」會變成繞過這道上限的方法。
 */
export async function assertCanOwnAnotherFreeTeam(
  userId: string,
  nowSec: number,
): Promise<void> {
  const owned = await teamRepo.listOwnedTeamsWithSubscription(userId);
  const freeTeams = owned.filter(
    (team) =>
      resolveEffectivePlanId(team.subscription, nowSec) === TEAM_PLAN.FREE,
  );

  if (freeTeams.length > 0) {
    logger.info("free team limit reached", {
      userId,
      ownedTeams: owned.length,
      freeTeams: freeTeams.length,
    });
    throw new ApiError(
      API_ERRORS.TW_FREE_TEAM_LIMIT.code,
      API_ERRORS.TW_FREE_TEAM_LIMIT.message,
      API_ERRORS.TW_FREE_TEAM_LIMIT.status,
    );
  }
}

// Info: (20260308 - Luphia) 找出所有沒團隊的使用者，使用 getOrCreateUserTeam 為他建立一個
export const createTeamForUsersWithoutTeam = async () => {
  const usersWithoutTeam = await userRepo.findMany({
    where: {
      teamMembers: {
        none: {},
      },
    },
  });

  const results = [];
  for (const user of usersWithoutTeam) {
    const team = await getOrCreateUserTeam(user.id, user.name || undefined);
    results.push(team);
  }

  return results;
};

// Info: (20260308 - Luphia) 為使用者建立一個團隊
export const getOrCreateUserTeam = async (
  userId: string,
  userName?: string,
) => {
  const teams = await teamRepo.listMemberTeam(userId);
  if (teams.length > 0) {
    return teams[0];
  }

  const team = await teamRepo.createTeam({
    name: userName ? `${userName}'s Team` : "New Team",
  });

  await teamRepo.createTeamMember({
    team: { connect: { id: team.id } },
    user: { connect: { id: userId } },
    role: TeamRole.OWNER,
  });

  return team;
};

// Info: (20260308 - Luphia) 修改團隊資料
export const updateTeam = async (
  teamId: string,
  data: { name?: string }, // Info: (20260508 - Julian) 目前只提供修改名稱，未來可擴充其他欄位
) => {
  return teamRepo.updateTeam(teamId, data);
};

// Info: (20260308 - Luphia) 增加一個團隊成員
export const addTeamMember = async (
  teamId: string,
  userId: string,
  role: TeamRole = TeamRole.VIEWER,
) => {
  return teamRepo.createTeamMember({
    team: { connect: { id: teamId } },
    user: { connect: { id: userId } },
    role,
  });
};

// Info: (20260308 - Luphia) 移除一個團隊成員
export const removeTeamMember = async (teamMemberId: string) => {
  return teamRepo.deleteTeamMember(teamMemberId);
};

// Info: (20260308 - Luphia) 軟刪除指定團隊
export const softDeleteTeam = async (teamId: string) => {
  return teamRepo.updateTeam(teamId, { deletedAt: new Date() });
};
