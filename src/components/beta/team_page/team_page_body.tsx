import Image from 'next/image';
import { PiCopySimple } from 'react-icons/pi';
import { ITeam } from '@/interfaces/team';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamPageBody = ({ team }: TeamPageBodyProps) => {
  // Deprecated: (20250218 - Liz)
  // eslint-disable-next-line no-console
  console.log('team', team);

  // ToDo: (20250218 - Liz)
  const copyTeamId = () => {};

  return (
    <main className="flex flex-col gap-40px">
      <section className="flex items-center gap-8px">
        <Image src={team.imageId} width={60} height={60} alt="team_image"></Image>
        <h1 className="text-44px font-bold text-text-neutral-primary">{team.name.value}</h1>
        <div className="flex items-center text-text-neutral-tertiary">
          <span className="text-xl font-bold leading-8">#{team.id}</span>
          <button type="button" onClick={copyTeamId} className="p-10px">
            <PiCopySimple size={16} />
          </button>
        </div>
      </section>
    </main>
  );
};

export default TeamPageBody;
