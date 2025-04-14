import { ITeam, ITeamMember } from '@/interfaces/team';
import MemberItem from '@/components/beta/team_page/member_item';

interface MemberListProps {
  memberList: ITeamMember[];
  team: ITeam;
  getMemberList: () => Promise<void>;
}

const MemberList = ({ memberList, team, getMemberList }: MemberListProps) => {
  return memberList.map((member) => (
    <MemberItem key={member.id} member={member} team={team} getMemberList={getMemberList} />
  ));
};

export default MemberList;
