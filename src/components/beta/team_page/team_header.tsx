import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Image from 'next/image';
import { TbCopyCheckFilled, TbCopy } from 'react-icons/tb';
import { FiEdit2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { ITeam } from '@/interfaces/team';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import loggerFront from '@/lib/utils/logger_front';

interface TeamHeaderProps {
  team: ITeam;
  setTeamToChangeImage: Dispatch<SetStateAction<ITeam | undefined>>;
}

const TeamHeader = ({ team, setTeamToChangeImage }: TeamHeaderProps) => {
  const { t } = useTranslation(['team']);
  const [copied, setCopied] = useState<boolean>(false);

  const modifyImagePermission = convertTeamRoleCanDo({
    teamRole: team.role,
    canDo: TeamPermissionAction.MODIFY_IMAGE,
  });

  const copyTeamId = async () => {
    try {
      await navigator.clipboard.writeText(team.id.toString());
      setCopied(true);
    } catch (error) {
      loggerFront.error('Failed to copy:', error);
    }
  };

  // Info: (20250218 - Liz) 使用 useEffect 清理 setTimeout 的 timer 以避免 memory leak
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <section className="flex flex-auto flex-col items-start gap-8px tablet:flex-row tablet:items-center">
      <div className="flex items-start gap-lv-4 tablet:gap-8px">
        <button
          type="button"
          className="group relative shrink-0"
          onClick={() => setTeamToChangeImage(team)}
          disabled={!modifyImagePermission.can}
        >
          <Image
            src={team.imageId}
            width={60}
            height={60}
            alt="team_image"
            className="h-60px w-60px rounded-sm border-2 border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
          ></Image>

          {modifyImagePermission.can && (
            <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm border border-stroke-neutral-quaternary text-sm text-black opacity-0 backdrop-blur-sm group-hover:opacity-100">
              <FiEdit2 size={24} />
            </div>
          )}
        </button>
        <h1 className="text-44px font-bold text-text-neutral-primary">{team.name.value}</h1>
      </div>

      <div className="ml-auto flex items-center text-text-neutral-tertiary tablet:ml-0">
        <span className="text-xl font-semibold leading-8">#{team.id}</span>
        <button type="button" onClick={copyTeamId} className="flex items-center p-10px">
          {copied ? <TbCopyCheckFilled size={16} /> : <TbCopy size={16} />}
          {copied && <span className="text-sm">{t('team:TEAM_PAGE.COPIED')}!</span>}
        </button>
      </div>
    </section>
  );
};

export default TeamHeader;
