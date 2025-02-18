import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TbCopyCheckFilled, TbCopy } from 'react-icons/tb';
import { ITeam } from '@/interfaces/team';
import { useTranslation } from 'next-i18next';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamPageBody = ({ team }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);
  const [copied, setCopied] = useState<boolean>(false);

  const copyTeamId = async () => {
    try {
      await navigator.clipboard.writeText(team.id);
      setCopied(true);
    } catch (error) {
      // Deprecated: (20250218 - Liz)
      // eslint-disable-next-line no-console
      console.error('Failed to copy:', error);
    }
  };

  // Info: (20250218 - Liz) 使用 useEffect 清理 setTimeout 的 timer 以避免 memory leak
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <main className="flex flex-col gap-40px">
      <section className="flex items-center gap-8px">
        <Image src={team.imageId} width={60} height={60} alt="team_image"></Image>
        <h1 className="text-44px font-bold text-text-neutral-primary">{team.name.value}</h1>
        <div className="flex items-center text-text-neutral-tertiary">
          <span className="text-xl font-bold leading-8">#{team.id}</span>
          <button type="button" onClick={copyTeamId} className="flex items-center p-10px">
            {copied ? <TbCopyCheckFilled size={16} /> : <TbCopy size={16} />}
            {copied && <span className="text-sm">{t('team:TEAM_PAGE.COPIED')}!</span>}
          </button>
        </div>
      </section>
    </main>
  );
};

export default TeamPageBody;
