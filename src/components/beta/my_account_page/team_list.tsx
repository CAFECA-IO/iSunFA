import React, { useState /* useCallback, useEffect */ } from 'react';
import TeamItem from '@/components/beta/my_account_page/team_item';
import { ITeam } from '@/interfaces/team';
// import APIHandler from '@/lib/utils/api_handler';
// import { APIName } from '@/constants/api_connection';
// import { IPaginatedData } from '@/interfaces/pagination';
// import { SkeletonList } from '@/components/skeleton/skeleton';
import { FAKE_TEAM_LIST } from '@/constants/team';

const TeamList: React.FC = () => {
  // Deprecated: (20250217 - Julian) Remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamList, setTeamList] = useState<ITeam[]>(FAKE_TEAM_LIST);
  // const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20250224 - Julian) 取得使用者擁有的所有團隊 API
  // const { trigger: getUserOwnedTeamsAPI } = APIHandler<IPaginatedData<ITeam[]>>(APIName.LIST_TEAM);

  // // Info: (20250224 - Julian) 打 API 取得使用者擁有的所有團隊
  // const getUserOwnedTeams = useCallback(async () => {
  //   setIsLoading(true);

  //   try {
  //     const { data: ownedTeams, success } = await getUserOwnedTeamsAPI();

  //     if (success && ownedTeams && ownedTeams.data) {
  //       setTeamList(ownedTeams.data);
  //     }
  //   } catch (error) {
  //     // Deprecated: (20250117 - Liz)
  //     // eslint-disable-next-line no-console
  //     console.log('取得使用者擁有的所有團隊失敗');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  // useEffect(() => {
  //   getUserOwnedTeams();
  // }, [getUserOwnedTeams]);

  const displayedList = teamList.map((team) => <TeamItem key={team.id} {...team} />);

  // Info: (20250224 - Julian) 如果打 API 還在載入中，顯示載入中頁面
  // if (isLoading) {
  //   return <SkeletonList count={6} />;
  // }

  return <div className="flex flex-col gap-8px">{displayedList}</div>;
};

export default TeamList;
