import { IUserOwnedTeam } from '@/interfaces/subscription';
import { PLANS } from '@/constants/subscription';
import SubscriptionPlan from '@/components/beta/team_subscription_page/subscription_plan';

interface SubscriptionPlansProps {
  team: IUserOwnedTeam;
  getTeamData: () => Promise<void>;
}

const SubscriptionPlans = ({ team, getTeamData }: SubscriptionPlansProps) => {
  return (
    <main className="flex justify-center gap-10px">
      {PLANS.map((plan) => (
        <SubscriptionPlan key={plan.id} team={team} plan={plan} getTeamData={getTeamData} />
      ))}
    </main>
  );
};

export default SubscriptionPlans;
