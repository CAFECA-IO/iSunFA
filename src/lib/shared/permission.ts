import { ALL_PERMISSIONS, TEAM_ROLE_TRANSITIONS } from '@/constants/team/permissions';
import {
  IAlterTeamRole,
  ITeamRoleCanDo,
  IWhatTeamRoleCanDo,
  TeamPermissionAction,
} from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';

export function convertTeamRoleCanDo(input: IWhatTeamRoleCanDo): ITeamRoleCanDo | IAlterTeamRole {
  // Info: (20250313 - Tzuhan) 檢查是否是變更角色權限
  if (input.canDo === TeamPermissionAction.CHANGE_TEAM_ROLE) {
    return {
      teamRole: input.teamRole,
      canAlter: TEAM_ROLE_TRANSITIONS[input.teamRole] || [],
    };
  }

  // Info: (20250313 - Tzuhan) 檢查 `canDo` 是否是合法的操作
  if (!(input.canDo in ALL_PERMISSIONS)) {
    throw new Error(`Invalid canDo value: ${input.canDo}`);
  }

  return {
    teamRole: input.teamRole,
    canDo: input.canDo,
    yesOrNo: ALL_PERMISSIONS[input.canDo as TeamPermissionAction].includes(input.teamRole),
  };
}

/**
 * Info: (20250602 - Shirley) Check if a team member can leave the team
 *
 * @param memberRole The member's role in the team
 * @returns An object containing the result and any error message
 */
export function canLeaveTeam(memberRole: TeamRole): { canLeave: boolean; errorMessage?: string } {
  // Check against ALL_PERMISSIONS directly
  if (!ALL_PERMISSIONS[TeamPermissionAction.LEAVE_TEAM].includes(memberRole)) {
    return {
      canLeave: false,
      errorMessage:
        memberRole === TeamRole.OWNER ? 'OWNER_IS_UNABLE_TO_LEAVE' : 'PERMISSION_DENIED',
    };
  }

  return { canLeave: true };
}
