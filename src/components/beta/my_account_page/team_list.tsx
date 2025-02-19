import React, { useState } from 'react';
import TeamItem from '@/components/beta/my_account_page/team_item';
import { FAKE_TEAM_LIST } from '@/constants/team';

const TeamList: React.FC = () => {
  // Deprecated: (20250217 - Julian) Remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamList, setTeamList] = useState(FAKE_TEAM_LIST);

  const displayedList = teamList.map((team) => <TeamItem key={team.id} {...team} />);

  return <div className="flex flex-col gap-8px">{displayedList}</div>;
};

export default TeamList;
