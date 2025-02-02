import { Dispatch, SetStateAction } from 'react';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import { IUserOwnedTeam } from '@/interfaces/subscription';

interface UserOwnedTeamsProps {
  userOwnedTeams: IUserOwnedTeam[];
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
}

const OwnedTeams = ({
  userOwnedTeams,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
}: UserOwnedTeamsProps) => {
  return (
    <main className="flex flex-col gap-40px">
      {userOwnedTeams.map((team) => (
        <OwnedTeam
          key={team.id}
          team={team}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
        />
      ))}
    </main>
  );
};

export default OwnedTeams;
