import { Dispatch, SetStateAction } from 'react';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import { IUserOwnedTeam } from '@/interfaces/subscription';

interface UserOwnedTeamsProps {
  userOwnedTeams: IUserOwnedTeam[];
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForCancelSubscription: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>; // Info: (20250410 - Anna) 傳取消訂閱的Modal
}

const OwnedTeams = ({
  userOwnedTeams,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  setTeamForCancelSubscription, // Info: (20250410 - Anna) 傳取消訂閱的Modal
}: UserOwnedTeamsProps) => {
  return (
    <main className="flex flex-col gap-40px">
      {userOwnedTeams.map((team) => (
        <OwnedTeam
          key={team.id}
          team={team}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
          setTeamForCancelSubscription={setTeamForCancelSubscription} // Info: (20250410 - Anna) 傳取消訂閱的Modal
        />
      ))}
    </main>
  );
};

export default OwnedTeams;
