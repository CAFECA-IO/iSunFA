import { useState } from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';
import UploadTeamImageModal from '@/components/beta/team_page/upload_team_image_modal';
import TeamHeader from '@/components/beta/team_page/team_header';
import { useTranslation } from 'next-i18next';
import NoTeamInfo from '@/components/beta/team_information_page/no_team_info';
import TeamInformation from '@/components/beta/team_information_page/teamInformation';

interface TeamPageBodyProps {
  team: ITeam;
  setTeam: (team: ITeam) => void;
}

const TeamInformationPageBody = ({ team, setTeam }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);

  const [teamToChangeImage, setTeamToChangeImage] = useState<ITeam | undefined>();
  const isNoTeamInfo = !team;

  return (
    <main className="flex flex-col gap-40px">
      <div className="flex items-center">
        <TeamHeader team={team} setTeamToChangeImage={setTeamToChangeImage} />
      </div>
      <div className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2 font-medium text-divider-text-lv-2">
          <Image src="/icons/team_info.svg" alt="team_info" width={16} height={16} />
          <span>{t('team:TEAM_PAGE.INFORMATION')}</span>
        </div>
        <div className="h-1px flex-auto bg-divider-stroke-lv-4"></div>
      </div>
      {isNoTeamInfo && <NoTeamInfo />}

      {/* Info:(20250307 - Anna) 讓子組件能直接更新 teamInfo，團隊修改後 UI 立即更新 */}
      {!isNoTeamInfo && <TeamInformation teamInfo={team} setTeamInfo={setTeam} />}

      {/* Info: (20250226 - Anna) Modals */}
      {teamToChangeImage && (
        <UploadTeamImageModal
          teamToChangeImage={teamToChangeImage}
          setTeamToChangeImage={setTeamToChangeImage}
          getTeamData={async () => {}} // ToDo: (20250310 - Liz) 這裡要傳入取得團隊資料 API
        />
      )}
    </main>
  );
};

export default TeamInformationPageBody;
