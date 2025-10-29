import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import TeamItem from '@/components/beta/my_account_page/team_item';
import { ITeam } from '@/interfaces/team';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useUserCtx } from '@/contexts/user_context';
import loggerFront from '@/lib/utils/logger_front';

const TeamList: React.FC = () => {
  const { t } = useTranslation(['team']);
  const { userAuth } = useUserCtx();
  const [teamList, setTeamList] = useState<ITeam[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20250224 - Julian) 取得使用者擁有的所有團隊 API
  const { trigger: getTeamsAPI } = APIHandler<IPaginatedData<ITeam[]>>(APIName.LIST_TEAM);

  // Info: (20250224 - Julian) 打 API 取得使用者擁有的所有團隊
  const getUserOwnedTeams = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: ownedTeams, success } = await getTeamsAPI({ params: { userId: userAuth?.id } });

      if (success && ownedTeams && ownedTeams.data) {
        setTeamList(ownedTeams.data);
      }
    } catch (error) {
      (error as Error).message += ' (from getUserOwnedTeams)';
      loggerFront.error('取得使用者擁有的所有團隊失敗');
    } finally {
      setIsLoading(false);
    }
  }, [userAuth?.id]);

  useEffect(() => {
    getUserOwnedTeams();
  }, [getUserOwnedTeams]);

  const displayedList =
    teamList.length > 0 ? (
      teamList.map((team) => <TeamItem key={team.id} {...team} />)
    ) : (
      <div className="flex w-full flex-col items-center justify-center text-neutral-300">
        <Image src="/images/empty.svg" width={120} height={135} alt="empty_icon" />
        <p>{t('team:MY_ACCOUNT_PAGE.TEAM_LIST_IS_EMPTY')}</p>
      </div>
    );

  // Info: (20250224 - Julian) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) {
    return <SkeletonList count={6} />;
  }

  return <div className="flex w-full flex-col items-stretch gap-8px">{displayedList}</div>;
};

export default TeamList;
