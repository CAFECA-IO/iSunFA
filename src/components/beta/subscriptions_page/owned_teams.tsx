import { Dispatch, SetStateAction } from 'react';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import { IUserOwnedTeam } from '@/interfaces/subscription';

interface UserOwnedTeamsProps {
  userOwnedTeams: IUserOwnedTeam[];
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForCancelSubscription: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
}

const OwnedTeams = ({
  userOwnedTeams,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  setTeamForCancelSubscription,
}: UserOwnedTeamsProps) => {
  return (
    <main className="overflow-y-auto tablet:overflow-hidden">
      <div className="flex w-max gap-x-lv-5 gap-y-40px tablet:w-full tablet:flex-col">
        {userOwnedTeams.map((team) => (
          <OwnedTeam
            key={team.id}
            team={team}
            setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
            setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
            setTeamForCancelSubscription={setTeamForCancelSubscription}
          />
        ))}
      </div>
    </main>
  );
};

export default OwnedTeams;
