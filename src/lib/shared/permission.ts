import {
  ALL_PERMISSIONS,
  GRACE_PERIOD_SECONDS,
  TEAM_ROLE_TRANSITIONS,
} from '@/constants/team/permissions';
import { TeamRole } from '@/interfaces/team';
import { IResolvedTeamPermission, TeamPermissionAction } from '@/interfaces/permissions';
import { getTimestampNow } from '@/lib/utils/common';

export function convertTeamRoleCanDo(input: {
  teamRole: TeamRole;
  canDo: TeamPermissionAction;
}): IResolvedTeamPermission {
  const { teamRole, canDo } = input;

  if (!(canDo in TeamPermissionAction)) {
    throw new Error(`Invalid permission action: ${canDo}`);
  }

  if (canDo === TeamPermissionAction.CHANGE_TEAM_ROLE) {
    const alterableRoles = TEAM_ROLE_TRANSITIONS[teamRole] ?? [];
    return {
      teamRole,
      canDo,
      can: alterableRoles.length > 0,
      alterableRoles,
    };
  }

  const can = ALL_PERMISSIONS[canDo]?.includes(teamRole) ?? false;

  return {
    teamRole,
    canDo,
    can,
  };
}

export function getGracePeriodInfo(expiredAt: number): {
  inGracePeriod: boolean;
  gracePeriodEndAt: number;
} {
  const now = getTimestampNow();
  const gracePeriodEndAt = expiredAt + GRACE_PERIOD_SECONDS;
  return {
    inGracePeriod: now > expiredAt && now <= gracePeriodEndAt,
    gracePeriodEndAt,
  };
}
