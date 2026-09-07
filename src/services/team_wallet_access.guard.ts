import { TeamMember } from "@/generated";
import { isTeamManagerRole } from "@/constants/team";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { teamRepo } from "@/repositories/team.repo";

/**
 * Info: (20260807 - Luphia) 團隊錢包授權 Guard（設計書 §6.4 權限矩陣）。
 * API 層不寫角色判斷，一律經此收斂：
 * - 查看錢包 / 消耗額度：任何有效成員
 * - 購點 / 分配 / 收回 / 看 Ledger：OWNER 或 ADMIN
 */

export async function assertTeamMember(
  userId: string,
  teamId: string,
): Promise<TeamMember> {
  const member = await teamRepo.getTeamMember(userId, teamId);
  if (!member) {
    throw new ApiError(
      API_ERRORS.TW_NOT_TEAM_MEMBER.code,
      API_ERRORS.TW_NOT_TEAM_MEMBER.message,
      API_ERRORS.TW_NOT_TEAM_MEMBER.status,
    );
  }
  return member;
}

export async function assertWalletManager(
  userId: string,
  teamId: string,
): Promise<TeamMember> {
  const member = await assertTeamMember(userId, teamId);
  if (!isTeamManagerRole(member.role)) {
    throw new ApiError(
      API_ERRORS.TW_WALLET_FORBIDDEN.code,
      API_ERRORS.TW_WALLET_FORBIDDEN.message,
      API_ERRORS.TW_WALLET_FORBIDDEN.status,
    );
  }
  return member;
}

export function isWalletManager(member: TeamMember): boolean {
  return isTeamManagerRole(member.role);
}
