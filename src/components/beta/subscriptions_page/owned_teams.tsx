import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import { IUserOwnedTeam } from '@/interfaces/subscription';

interface UserOwnedTeamsProps {
  userOwnedTeams: IUserOwnedTeam[];
}

const OwnedTeams = ({ userOwnedTeams }: UserOwnedTeamsProps) => {
  return (
    <main className="flex flex-col gap-40px">
      {userOwnedTeams.map((team) => (
        <OwnedTeam key={team.id} team={team} />
      ))}
    </main>
  );
};

export default OwnedTeams;
