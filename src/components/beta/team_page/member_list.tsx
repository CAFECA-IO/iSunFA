import { ITeamMember } from '@/interfaces/team';
import MemberItem from '@/components/beta/team_page/member_item';

interface MemberListProps {
  memberList: ITeamMember[];
}

const MemberList = ({ memberList }: MemberListProps) => {
  return memberList.map((member) => <MemberItem key={member.id} member={member} />);
};

export default MemberList;
