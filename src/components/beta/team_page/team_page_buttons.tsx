import { Button } from '@/components/button/button';
import { FiUser, FiInfo, FiEdit } from 'react-icons/fi';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ITeam } from '@/interfaces/team';

interface TeamPageButtonsProps {
  team: ITeam;
}

const TeamPageButtons = ({ team }: TeamPageButtonsProps) => {
  return (
    <main className="flex gap-16px">
      <Button variant="tertiary" size="small" className="text-xs leading-5">
        <FiUser size={16} />
        <span>Member</span>
      </Button>

      <Link
        href={`${ISUNFA_ROUTE.TEAM_PAGE}/${team.id}/info`}
        className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
      >
        <FiInfo size={16} />
      </Link>

      <button
        type="button"
        className="rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
      >
        <FiEdit size={16} />
      </button>
    </main>
  );
};

export default TeamPageButtons;
