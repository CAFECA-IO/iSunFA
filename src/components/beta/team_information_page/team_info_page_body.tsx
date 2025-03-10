import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';
import UploadTeamPictureModal from '@/components/beta/team_page/upload_team_picture_modal';
import TeamHeader from '@/components/beta/team_page/team_header';
import { useTranslation } from 'next-i18next';
import NoTeamInfo from '@/components/beta/team_information_page/no_team_info';
import TeamInformation from '@/components/beta/team_information_page/teamInformation';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useRouter } from 'next/router';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamInformationPageBody = ({ team }: TeamPageBodyProps) => {
  const { t } = useTranslation(['team']);
  const router = useRouter();
  const { teamId } = router.query; // Info:(20250224 - Anna) 取得網址的 teamId
  const [teamInfo, setTeamInfo] = useState<ITeam | undefined>();
  const hasFetched = useRef(false); // Info:(20250226 - Anna) 使用 useRef 避免 API 被執行兩次
  const [teamToUploadPicture, setTeamToUploadPicture] = useState<ITeam | undefined>();
  const isNoTeamInfo = !teamInfo;

  // Info: (20250226 - Anna) 取得團隊 Info API
  const { trigger: getTeamInfoByTeamIdAPI } = APIHandler<ITeam>(APIName.GET_TEAM_BY_ID);

  // Info: (20250226 - Anna) 打 API 取得團隊 Info
  const getTeamInfoByTeamId = useCallback(async () => {
    if (!teamId || hasFetched.current) return; // Info:(20250226 - Anna) 確保 API 只打一次
    hasFetched.current = true; // Info:(20250226 - Anna) 標記已執行過 API

    try {
      const { data: teamInfoData, success } = await getTeamInfoByTeamIdAPI({
        params: { teamId },
      });
      // Info: (20250226 - Anna) 打印 API 回傳的資料（Debug）
      // eslint-disable-next-line no-console
      console.log('API 回傳資料:', teamInfoData);
      if (success && teamInfoData) {
        setTeamInfo(teamInfoData);
      }
    } catch (error) {
      // Deprecated: (20250226 - Anna) 打印錯誤訊息（Debug）
      // eslint-disable-next-line no-console
      console.log('取得團隊資訊失敗');
    }
  }, []);

  useEffect(() => {
    getTeamInfoByTeamId(); // Info: (20250226 - Anna) 在 useEffect 中調用 API
  }, [teamId]);

  return (
    <main className="flex flex-col gap-40px">
      <div className="flex items-center">
        <TeamHeader team={team} setTeamToUploadPicture={setTeamToUploadPicture} />
      </div>
      <div className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src="/icons/open_book.svg" alt="open_book" width={16} height={15.235}></Image>
          <span>{t('team:TEAM_PAGE.LIBRARY')}</span>
        </div>
        <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
      </div>
      {isNoTeamInfo && <NoTeamInfo />}

      {/* Info:(20250307 - Anna) 讓子組件能直接更新 teamInfo，團隊修改後 UI 立即更新 */}
      {!isNoTeamInfo && <TeamInformation teamInfo={teamInfo} setTeamInfo={setTeamInfo} />}

      {/* Info: (20250226 - Anna) Modals */}
      {teamToUploadPicture && (
        <UploadTeamPictureModal
          teamToUploadPicture={teamToUploadPicture}
          setTeamToUploadPicture={setTeamToUploadPicture}
        />
      )}
    </main>
  );
};

export default TeamInformationPageBody;
