import { ALL_PERMISSIONS, TEAM_ROLE_TRANSITIONS } from '@/constants/team/permissions';
import {
  IAlterTeamRole,
  ITeamRoleCanDo,
  IWhatTeamRoleCanDo,
  TeamPermissionAction,
  TeamRoleCanDoKey,
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
 * Info: (20250601 - Shirley) Check if a user with the given role can update another member's role
 * @param userRole Current user's role in the team
 * @param targetMemberRole Target member's current role
 * @param newRole The new role to assign to the target member
 * @returns An object containing the result and any error message
 */
export function canUpdateMemberRole(
  userRole: TeamRole,
  targetMemberRole: TeamRole,
  newRole: TeamRole
): { canUpdate: boolean; errorMessage?: string } {
  // Cannot update a member to OWNER role
  if (newRole === TeamRole.OWNER) {
    return {
      canUpdate: false,
      errorMessage: 'CANNOT_UPDATE_TO_OWNER',
    };
  }

  // Check if user has permission to change roles in general
  const canChangeRoleResult = convertTeamRoleCanDo({
    teamRole: userRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });

  if (!(TeamRoleCanDoKey.CAN_ALTER in canChangeRoleResult)) {
    return {
      canUpdate: false,
      errorMessage: 'PERMISSION_DENIED',
    };
  }

  // Get the roles this user can alter
  const canAlterRoles = canChangeRoleResult.canAlter;

  // Check if the user can set the target to the new role
  if (!canAlterRoles.includes(newRole)) {
    return {
      canUpdate: false,
      errorMessage: 'CANNOT_ASSIGN_THIS_ROLE',
    };
  }

  // Additional restrictions for ADMIN users
  if (userRole === TeamRole.ADMIN) {
    // ADMIN cannot update other ADMIN (OWNER case already handled above)
    if (targetMemberRole === TeamRole.ADMIN) {
      return {
        canUpdate: false,
        errorMessage: 'ADMIN_CANNOT_UPDATE_ADMIN_OR_OWNER',
      };
    }

    // ADMIN cannot promote members to ADMIN
    if (newRole === TeamRole.ADMIN) {
      return {
        canUpdate: false,
        errorMessage: 'ADMIN_CANNOT_PROMOTE_TO_ADMIN',
      };
    }
  }

  return { canUpdate: true };
}

/**
 * Info: (20250601 - Shirley) Check if a user with the given role can delete a team member
 * @param userRole Current user's role in the team
 * @param targetMemberRole Target member's current role
 * @returns An object containing the result and any error message
 */
export function canDeleteMember(
  userRole: TeamRole,
  targetMemberRole: TeamRole
): { canDelete: boolean; errorMessage?: string } {
  // Check if user has basic permission to change roles
  const canChangeRoleResult = convertTeamRoleCanDo({
    teamRole: userRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });

  if (!(TeamRoleCanDoKey.CAN_ALTER in canChangeRoleResult)) {
    return {
      canDelete: false,
      errorMessage: 'PERMISSION_DENIED',
    };
  }

  // Cannot delete OWNER
  if (targetMemberRole === TeamRole.OWNER) {
    return {
      canDelete: false,
      errorMessage: 'CANNOT_DELETE_OWNER',
    };
  }

  // Additional restrictions for ADMIN users
  if (userRole === TeamRole.ADMIN) {
    // ADMIN cannot delete other ADMINs
    if (targetMemberRole === TeamRole.ADMIN) {
      return {
        canDelete: false,
        errorMessage: 'ADMIN_CANNOT_DELETE_ADMIN',
      };
    }
  }

  return { canDelete: true };
}

/**
 * Info: (20250601 - Shirley) Check if a team member can leave the team
 *
 * @param memberRole The member's role in the team
 * @returns An object containing the result and any error message
 */
export function canLeaveTeam(memberRole: TeamRole): { canLeave: boolean; errorMessage?: string } {
  // Simply check against permissions for roles that can leave
  // Note: This relies on ALL_PERMISSIONS[TeamPermissionAction.LEAVE_TEAM]
  // being correctly configured to exclude OWNER role
  const canLeaveTeamResult = convertTeamRoleCanDo({
    teamRole: memberRole,
    canDo: TeamPermissionAction.LEAVE_TEAM,
  });

  // Check the result of permission check
  if (
    !(TeamRoleCanDoKey.YES_OR_NO in canLeaveTeamResult) ||
    !(canLeaveTeamResult as ITeamRoleCanDo).yesOrNo
  ) {
    return {
      canLeave: false,
      errorMessage: 'PERMISSION_DENIED',
    };
  }

  return { canLeave: true };
}
