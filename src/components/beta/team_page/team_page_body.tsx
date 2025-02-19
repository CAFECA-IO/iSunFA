import { useState } from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';
import UploadTeamPictureModal from '@/components/beta/team_page/upload_team_picture_modal';
import TeamHeader from '@/components/beta/team_page/team_header';
import { useTranslation } from 'next-i18next';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamPageBody = ({ team }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);

  const [teamToUploadPicture, setTeamToUploadPicture] = useState<ITeam | undefined>();

  return (
    <main className="flex flex-col gap-40px">
      <TeamHeader team={team} setTeamToUploadPicture={setTeamToUploadPicture} />

      <div className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src="/icons/open_book.svg" alt="open_book" width={16} height={15.235}></Image>
          <span>{t('team:TEAM_PAGE.LIBRARY')}</span>
        </div>
        <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
      </div>

      {/* // Info: (20250218 - Liz) Modal */}
      {teamToUploadPicture && (
        <UploadTeamPictureModal
          teamToUploadPicture={teamToUploadPicture}
          setTeamToUploadPicture={setTeamToUploadPicture}
        />
      )}
    </main>
  );
};

export default TeamPageBody;
