import { Button } from '@/components/button/button';
import { FiUser, FiInfo, FiEdit } from 'react-icons/fi';
import { IoMdLogOut } from 'react-icons/io';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ITeam, TeamRole } from '@/interfaces/team';
import { useTranslation } from 'next-i18next';

interface TeamPageButtonsProps {
  team: ITeam;
}

const TeamPageButtons = ({ team }: TeamPageButtonsProps) => {
  const { t } = useTranslation(['team']);
  const { role } = team;
  const isOwner = role === TeamRole.OWNER;
  const isEditor = role === TeamRole.EDITOR;
  const isViewer = role === TeamRole.VIEWER;

  return (
    <main className="flex gap-16px">
      <Button variant="tertiary" size="small" className="text-xs leading-5">
        <FiUser size={16} />
        <span>{t('team:TEAM_PAGE.MEMBER')}</span>
      </Button>

      <Link
        href={`${ISUNFA_ROUTE.TEAM_PAGE}/${team.id}/info`}
        className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
      >
        <FiInfo size={16} />
      </Link>

      {isOwner && (
        <button
          type="button"
          className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        >
          <FiEdit size={16} />
        </button>
      )}

      {(isEditor || isViewer) && (
        <button
          type="button"
          className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        >
          <IoMdLogOut size={16} />
        </button>
      )}
    </main>
  );
};

export default TeamPageButtons;
