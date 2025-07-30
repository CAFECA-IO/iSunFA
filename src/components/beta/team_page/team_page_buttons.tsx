import { useState } from 'react';
import { Button } from '@/components/button/button';
import { FiUser, FiInfo } from 'react-icons/fi';
import { IoMdLogOut } from 'react-icons/io';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ILeaveTeam, ITeam } from '@/interfaces/team';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import loggerFront from '@/lib/utils/logger_front';

interface TeamPageButtonsProps {
  team: ITeam;
  openMemberListModal: () => void;
}

const TeamPageButtons = ({ team, openMemberListModal }: TeamPageButtonsProps) => {
  const { t } = useTranslation(['team']);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  const leaveTeamPermission = convertTeamRoleCanDo({
    teamRole: team.role,
    canDo: TeamPermissionAction.LEAVE_TEAM,
  });

  // Info: (20250321 - Liz) 離開團隊 API
  const { trigger: leaveTeamAPI } = APIHandler<ILeaveTeam>(APIName.LEAVE_TEAM);

  const leaveTeam = async () => {
    if (!team.id || isLeaving) return;
    setIsLeaving(true);

    try {
      const { success } = await leaveTeamAPI({ params: { teamId: team.id } });

      if (!success) {
        loggerFront.error('離開團隊失敗!');
      }
    } catch (error) {
      loggerFront.error('離開團隊失敗:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <main className="ml-auto flex gap-16px">
      <Button
        variant="tertiary"
        size="small"
        className="text-xs leading-5"
        onClick={openMemberListModal}
      >
        <FiUser size={16} />
        <span>{t('team:TEAM_PAGE.MEMBER')}</span>
      </Button>

      <Link
        href={`${ISUNFA_ROUTE.TEAM_PAGE}/${team.id}/info`}
        className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
      >
        <FiInfo size={16} />
      </Link>

      {leaveTeamPermission.can && (
        <button
          type="button"
          className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          disabled={isLeaving}
          onClick={leaveTeam}
        >
          <IoMdLogOut size={16} />
        </button>
      )}
    </main>
  );
};

export default TeamPageButtons;
