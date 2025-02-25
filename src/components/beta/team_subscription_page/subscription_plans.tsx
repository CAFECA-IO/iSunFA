import { useRouter } from 'next/router';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import { PLANS } from '@/constants/subscription';
import SubscriptionPlan from '@/components/beta/team_subscription_page/subscription_plan';

interface SubscriptionPlansProps {
  team: IUserOwnedTeam;
  getOwnedTeam: () => Promise<void>;
}

const SubscriptionPlans = ({ team, getOwnedTeam }: SubscriptionPlansProps) => {
  const router = useRouter();

  const plans = PLANS.map((plan) => {
    const goToPaymentHandler = () => {
      // Info: (20250114 - Liz) 這裡帶入 plan.id 作為 query string，用來表示使用者想要選擇的方案
      const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/payment?sp=${plan.id}`;
      router.push(PAYMENT_PAGE);
    };
    return (
      <SubscriptionPlan
        key={plan.id}
        team={team}
        plan={plan}
        getOwnedTeam={getOwnedTeam}
        goToPaymentHandler={goToPaymentHandler}
      />
    );
  });

  return <main className="flex justify-center gap-10px">{plans}</main>;
};

export default SubscriptionPlans;
