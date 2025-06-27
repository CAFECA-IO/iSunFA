import { useState } from 'react';
import Image from 'next/image';
import { ITeam, ITeamMember, TeamRole } from '@/interfaces/team';
import { FiTrash2, FiSave } from 'react-icons/fi';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IMember } from '@/interfaces/member';
import loggerFront from '@/lib/utils/logger_front';

interface MemberItemProps {
  member: ITeamMember;
  team: ITeam;
  getMemberList: () => Promise<void>;
}

const MemberItem = ({ member, team, getMemberList }: MemberItemProps) => {
  const { t } = useTranslation(['team']);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const teamRole = team.role; // Info: (20250321 - Liz) 使用者在此團隊的角色

  // Info: (20250320 - Liz) 刪除成員 API
  const { trigger: deleteMemberAPI } = APIHandler<{
    memberId: string;
  }>(APIName.DELETE_MEMBER);

  // Info: (20250320 - Liz) 更新成員角色 API
  const { trigger: updateMemberRoleAPI } = APIHandler<IMember>(APIName.UPDATE_MEMBER);

  // Info: (20250320 - Liz) 刪除成員
  const deleteMember = async () => {
    if (!member.id || !team.id || isDeleting) return;
    setIsDeleting(true);

    try {
      const { success } = await deleteMemberAPI({
        params: {
          teamId: team.id,
          memberId: member.id,
        },
      });

      if (!success) {
        loggerFront.error('刪除成員失敗!');
      }
      getMemberList();
    } catch (error) {
      loggerFront.error('刪除成員失敗:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Info: (20250320 - Liz) 更新成員角色
  const updateMemberRole = async () => {
    if (!member.id || !team.id || !role || isUpdating) return;
    setIsUpdating(true);

    try {
      const { success } = await updateMemberRoleAPI({
        params: {
          teamId: team.id,
          memberId: member.id,
        },
        body: {
          role,
        },
      });

      if (!success) {
        loggerFront.error('更新成員角色失敗!');
      }
      getMemberList();
    } catch (error) {
      loggerFront.error('更新成員角色失敗:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const result = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });
  const canAlterRoles = result.alterableRoles ? result.alterableRoles : [];
  const canEditThisRole = result.alterableRoles && result.alterableRoles.includes(member.role);
  const hasOtherRoleToChange =
    result.alterableRoles && result.alterableRoles.some((item) => item !== member.role);
  const isEditable = canEditThisRole && hasOtherRoleToChange;
  const isDeletable = canEditThisRole;

  return (
    <main className="flex items-center gap-80px">
      <section className="flex flex-auto items-center gap-8px">
        <Image
          src={member.imageId}
          alt="member_image"
          width={32}
          height={32}
          className="h-32px w-32px"
        ></Image>
        <div className="flex flex-col gap-4px">
          <span className="text-xs font-medium leading-5 text-text-neutral-primary">
            {member.name}
          </span>
          <span className="text-xs font-medium leading-5 text-text-neutral-secondary">
            {member.email}
          </span>
        </div>
      </section>

      <section className="flex items-center gap-16px">
        {!isEditable && (
          <div className="text-base font-semibold text-text-neutral-primary">
            {t(`team:TEAM_ROLE.${member.role.toUpperCase()}`)}
          </div>
        )}

        {/* Info: (20250220 - Liz) edit team role */}
        {isEditable && (
          <div className="flex items-center gap-4px">
            <section className="relative">
              <button
                type="button"
                className="flex w-160px items-center justify-between rounded-sm border border-input-stroke-input bg-dropdown-surface-menu-background-primary text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              >
                <span className="px-12px py-10px text-base font-medium text-input-text-input-filled">
                  {t(`team:TEAM_ROLE.${(role || member.role).toUpperCase()}`)}
                </span>
                <span className="px-12px py-10px text-icon-surface-single-color-primary">
                  {isRoleDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                </span>
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute inset-x-0 top-full z-10 mt-8px">
                  <div className="mb-20px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                    {canAlterRoles.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setRole(item);
                          setIsRoleDropdownOpen(false);
                        }}
                        className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover disabled:pointer-events-none disabled:text-input-text-disable"
                      >
                        {t(`team:TEAM_ROLE.${item.toUpperCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {role && (
              <button type="button" className="text-text-state-success" onClick={updateMemberRole}>
                <FiSave size={16} />
              </button>
            )}
          </div>
        )}

        {/* Info: (20250220 - Liz) delete member */}
        {isDeletable && (
          <button
            type="button"
            className="text-icon-surface-single-color-primary disabled:cursor-not-allowed disabled:text-button-text-disable"
            disabled={isDeleting}
            onClick={deleteMember}
          >
            <FiTrash2 size={16} />
          </button>
        )}
      </section>
    </main>
  );
};

export default MemberItem;
