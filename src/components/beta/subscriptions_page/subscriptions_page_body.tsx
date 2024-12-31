import Image from 'next/image';
import OwnedTeams from '@/components/beta/subscriptions_page/owned_teams';
import { useTranslation } from 'next-i18next';
import { TPlanType, IUserOwnedTeam } from '@/interfaces/subscription';

const FAKE_OWNED_TEAMS: IUserOwnedTeam[] = [
  {
    id: 1,
    name: 'Team A',
    plan: TPlanType.BEGINNER,
    nextRenewal: 0,
    expiredDate: 0,
    enableAutoRenewal: true,
  },
  {
    id: 2,
    name: 'Team B',
    plan: TPlanType.PROFESSIONAL,
    nextRenewal: 1630406400000,
    expiredDate: 0,
    enableAutoRenewal: true,
  },
  {
    id: 3,
    name: 'Team C',
    plan: TPlanType.ENTERPRISE,
    nextRenewal: 0,
    expiredDate: 1630406400000,
    enableAutoRenewal: false,
  },
];

const SubscriptionsPageBody = () => {
  const { t } = useTranslation('subscriptions');

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <div className="flex items-center gap-8px">
        <Image src="/icons/my_subscription.svg" alt="my_subscription_icon" width={16} height={16} />
        <h1>{t('subscriptions:SUBSCRIPTIONS_PAGE.MY_SUBSCRIPTIONS')}</h1>
        <span className="h-1px flex-auto bg-divider-stroke-lv-1"></span>
      </div>

      <OwnedTeams userOwnedTeams={FAKE_OWNED_TEAMS} />
    </main>
  );
};

export default SubscriptionsPageBody;
