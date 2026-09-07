/**
 * Info: (20260819 - Luphia) 團隊角色（產品決定 20260819：**取消 ADMIN**）。
 *
 * ADMIN 的問題是它握有「會花 OWNER 的錢」的權限卻不是持卡人：邀請成員會即時
 * 向訂閱那張卡補收席次費用，而 merchant-initiated 交易沒有持卡人當下的授權。
 * 先前為此加了兩道補丁——單期補收總額上限（TW000016）、只有 OWNER 能授予 OWNER
 * （`canGrantRole`）——兩者都是在補「代理人可以動別人的錢」這個結構問題。
 *
 * 取消之後，會動錢與動成員的動作一律限 OWNER；EDITOR / VIEWER 的能力不變。
 * 既有的 ADMIN 成員由 `scripts/backfill_remove_team_admin.ts` 降為 EDITOR
 * （降級而非升級：失去權限可以由 OWNER 個別補回，多發權限收不回來）。
 */
export enum TeamRole {
  OWNER = "OWNER",
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
 * Info: (20260818 - Luphia) 管理職。
 *
 * 這個組合原本以字面字串散落在各端點（`role !== "OWNER" && role !== "ADMIN"`），
 * 每一處都是一次拼錯的機會，而拼錯的方向是「權限放寬」。
 *
 * Info: (20260819 - Luphia) 取消 ADMIN 之後只剩 OWNER。**清單保留而不是改寫成
 * `role === "OWNER"`**：管理職是一個會變的集合（哪天要加回受限的代理人角色時，
 * 改這裡一處即可），而散回字面比對就是把先前收斂掉的錯誤機會再放出去。
 */
export const TEAM_MANAGER_ROLES: readonly TeamRole[] = [TeamRole.OWNER];

export function isTeamManagerRole(role: string | null | undefined): boolean {
  return TEAM_MANAGER_ROLES.includes(role as TeamRole);
}
