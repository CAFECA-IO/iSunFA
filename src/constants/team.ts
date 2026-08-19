export enum TeamRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

/**
 * Info: (20260818 - Luphia) 授予角色的相對權限（第三輪 B-3）。
 *
 * 端點的權限閘是 OWNER || ADMIN，但對「要授予什麼角色」原本完全沒有檢查。
 * ADMIN 因此可以邀請一個新帳號**直接成為 OWNER**，用第二個帳號接受之後，
 * 團隊裡就多一位 OWNER——接著可以改任何人的角色，包含把原 OWNER 降級
 * （此時 OWNER 有兩位，「最後一位 OWNER」的保護不會觸發）。
 *
 * 規則與「變更既有成員角色」一致：**只有 OWNER 能授予 OWNER**。
 */
export function canGrantRole(
  operatorRole: string | null | undefined,
  targetRole: TeamRole,
): boolean {
  if (targetRole !== TeamRole.OWNER) return true;
  return operatorRole === TeamRole.OWNER;
}

/**
 * Info: (20260818 - Luphia) 管理職＝OWNER 或 ADMIN。
 *
 * 這個組合原本以字面字串散落在各端點（`role !== "OWNER" && role !== "ADMIN"`），
 * 每一處都是一次拼錯的機會，而拼錯的方向是「權限放寬」。
 */
export const TEAM_MANAGER_ROLES: readonly TeamRole[] = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
];

export function isTeamManagerRole(role: string | null | undefined): boolean {
  return TEAM_MANAGER_ROLES.includes(role as TeamRole);
}
