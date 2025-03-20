import { ITeam, ITeamMember } from '@/interfaces/team';
import MemberItem from '@/components/beta/team_page/member_item';

interface MemberListProps {
  memberList: ITeamMember[];
  team: ITeam;
}

const MemberList = ({ memberList, team }: MemberListProps) => {
  return memberList.map((member) => <MemberItem key={member.id} member={member} team={team} />);
};

export default MemberList;
