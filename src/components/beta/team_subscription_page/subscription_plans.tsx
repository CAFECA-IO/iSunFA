import { useRouter } from 'next/router';
import { IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import { PLANS, TRAIL_PLAN } from '@/constants/subscription';
import SubscriptionPlan from '@/components/beta/team_subscription_page/subscription_plan';

interface SubscriptionPlansProps {
  team: IUserOwnedTeam;
  getOwnedTeam: () => Promise<void>;
}

const SubscriptionPlans = ({ team, getOwnedTeam }: SubscriptionPlansProps) => {
  const router = useRouter();

  const nowTimestamp = Date.now() / 1000;

  // Info: (20250422 - Julian) 如果為試用期，則將免費版換成為試用版
  const isTrial =
    team.paymentStatus === TPaymentStatus.TRIAL && team.expiredTimestamp > nowTimestamp;
  const planListWithTrial = PLANS.map((plan) => {
    if (plan.id === TPlanType.BEGINNER) {
      return TRAIL_PLAN;
    }
    return plan;
  });

  const planList = isTrial ? planListWithTrial : PLANS;

  const plans = planList.map((plan) => {
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

  return (
    <main className="overflow-x-auto">
      <div className="mx-auto flex w-max gap-10px pt-lv-5 tablet:pt-40px">{plans}</div>
    </main>
  );
};

export default SubscriptionPlans;
