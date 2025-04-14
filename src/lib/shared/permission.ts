import { ALL_PERMISSIONS, TEAM_ROLE_TRANSITIONS } from '@/constants/team/permissions';
import { TeamRole } from '@/interfaces/team';
import { IResolvedTeamPermission, TeamPermissionAction } from '@/interfaces/permissions';

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
