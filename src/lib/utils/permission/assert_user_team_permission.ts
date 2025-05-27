import { convertTeamRoleCanDo, getGracePeriodInfo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { LeaveStatus, TeamRole } from '@/interfaces/team';
import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { updateTeamMemberSession } from '@/lib/utils/session';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { GRACE_PERIOD_SECONDS } from '@/constants/team/permissions';
import { TPlanType } from '@/interfaces/subscription';

const ACTION_USE_ACTUAL_ROLE: TeamPermissionAction[] = [
  // Info: (20250411 - Tzuhan) 團隊管理
  TeamPermissionAction.LEAVE_TEAM,
  TeamPermissionAction.DELETE_TEAM,
  TeamPermissionAction.MODIFY_PLAN,
  TeamPermissionAction.MODIFY_SUBSCRIPTION,
  TeamPermissionAction.VIEW_SUBSCRIPTION_INVOICE,
  TeamPermissionAction.CHANGE_TEAM_ROLE,

  // Info: (20250411 - Tzuhan) 成員管理
  TeamPermissionAction.INVITE_MEMBER,

  // Info: (20250411 - Tzuhan) 帳本管理
  TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER,
  TeamPermissionAction.CANCEL_ACCOUNT_BOOK_TRANSFER,
  TeamPermissionAction.ACCEPT_ACCOUNT_BOOK_TRANSFER,
  TeamPermissionAction.DECLINE_ACCOUNT_BOOK_TRANSFER,
];

type TeamAndTeamMemberRoleInfo = {
  actualRole: TeamRole; // Info: (20250411 - Tzuhan) 使用者在團隊中的真實角色（資料庫）
  effectiveRole: TeamRole; // Info: (20250411 - Tzuhan) 實際被允許的角色，若訂閱過期則為 Viewer
  expiredAt: number; // Info: (20250411 - Tzuhan) 團隊訂閱過期時間（Unix 秒數），若無有效訂閱則為 0
  inGracePeriod: boolean; // Info: (20250411 - Tzuhan) 是否在寬限期內
  gracePeriodEndAt: number; // Info: (20250411 - Tzuhan) 團隊訂閱寬限期結束時間（Unix 秒數）
  isExpired: boolean;
  planType: TPlanType;
};

export async function assertUserIsTeamMember(
  userId: number,
  teamId: number
): Promise<TeamAndTeamMemberRoleInfo> {
  const nowInSecond = getTimestampNow();

  const member = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      role: true,
      team: {
        select: {
          subscriptions: {
            orderBy: { expiredDate: SortOrder.DESC },
            take: 1,
            select: {
              expiredDate: true,
              startDate: true,
              plan: true,
            },
          },
        },
      },
    },
  });

  if (!member) {
    const error = new Error(STATUS_MESSAGE.USER_NOT_IN_TEAM);
    error.name = STATUS_CODE.USER_NOT_IN_TEAM;
    throw error;
  }

  const { role, team } = member;
  const subscription = team.subscriptions[0];
  const expiredAt = subscription?.expiredDate ?? 0;
  const startAt = subscription?.startDate ?? 0;

  const isValid = startAt <= nowInSecond && expiredAt > nowInSecond;
  const isInGrace = expiredAt <= nowInSecond && expiredAt > nowInSecond - GRACE_PERIOD_SECONDS;

  const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);

  const isExpired = !(isValid || isInGrace);

  return {
    actualRole: role as TeamRole,
    effectiveRole: isExpired ? TeamRole.VIEWER : (role as TeamRole),
    expiredAt,
    inGracePeriod,
    gracePeriodEndAt,
    isExpired,
    planType: isValid || isInGrace ? (subscription?.plan?.type as TPlanType) : TPlanType.BEGINNER,
  };
}

/**
 *  Info: (20250411 - Tzuhan) 驗證某用戶是否能在指定團隊執行特定操作，考慮有效角色與降級狀況
 */
type AssertUserCanOptions = {
  userId: number;
  teamId: number;
  action: TeamPermissionAction;
  strict?: boolean; // Info: (20250411 - Tzuhan) 預設 false，若開啟，會對 undefined 權限也當作錯誤處理
};

/**
 *  // Info: (20250411 - Tzuhan) 檢查用戶在指定團隊是否有指定操作權限。
 * - `actualRole`: 真實角色
 * - `effectiveRole`: 降級後有效角色
 * - `can`: 是否有權限
 */
export const assertUserCan = async ({
  userId,
  teamId,
  action,
}: AssertUserCanOptions): Promise<{
  actualRole: TeamRole;
  effectiveRole: TeamRole;
  can: boolean;
  alterableRoles?: TeamRole[];
}> => {
  const { actualRole, effectiveRole } = await assertUserIsTeamMember(userId, teamId);

  // Info: (20250411 - Tzuhan) 根據行為是否為敏感操作，決定使用哪種角色進行判斷
  const useActual = ACTION_USE_ACTUAL_ROLE.includes(action);
  const roleToUse = useActual ? actualRole : effectiveRole;

  const result = convertTeamRoleCanDo({ teamRole: roleToUse, canDo: action });

  return {
    actualRole,
    effectiveRole,
    can: result.can,
    alterableRoles: result.alterableRoles, // Info: (20250411 - Tzuhan) 只有 CHANGE_TEAM_ROLE 會有值
  };
};

export const getEffectiveTeamMeta = async (userId: number, teamId: number) => {
  const { effectiveRole, expiredAt, inGracePeriod } = await assertUserIsTeamMember(userId, teamId);
  await updateTeamMemberSession(userId, teamId, effectiveRole);
  return { effectiveRole, expiredAt, inGracePeriod };
};

type AssertUserCanByAccountBookOptions = {
  userId: number;
  accountBookId: number;
  action: TeamPermissionAction;
};

export function throwObjectError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  throw error;
}

export const assertUserCanByAccountBook = async ({
  userId,
  accountBookId,
  action,
}: AssertUserCanByAccountBookOptions): Promise<{
  teamId: number;
  actualRole: TeamRole;
  effectiveRole: TeamRole;
  can: boolean;
  alterableRoles?: TeamRole[];
}> => {
  const accountBook = await prisma.accountBook.findFirst({
    where: {
      id: accountBookId,
    },
    select: {
      teamId: true,
    },
  });

  if (!accountBook?.teamId) {
    throwObjectError(
      STATUS_CODE.TEAM_NOT_FOUND_FROM_COMPANY,
      STATUS_MESSAGE.TEAM_NOT_FOUND_FROM_COMPANY
    );
  }

  const result = await assertUserCan({
    userId,
    teamId: accountBook!.teamId,
    action,
  });

  return {
    teamId: accountBook!.teamId,
    ...result,
  };
};
