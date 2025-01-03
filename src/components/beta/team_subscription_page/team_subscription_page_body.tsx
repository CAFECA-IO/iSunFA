import { IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';
import { formatTimestamp } from '@/constants/time';
import { useTranslation } from 'next-i18next';
import SubscriptionFAQ from '@/components/beta/team_subscription_page/subscription_faq';

interface TeamSubscriptionPageBodyProps {
  team: IUserOwnedTeam;
}

const TeamSubscriptionPageBody = ({ team }: TeamSubscriptionPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);
  const isPlanBeginner = team.plan === TPlanType.BEGINNER;
  const hasNextRenewal = team.nextRenewal > 0;
  const hasExpiredDate = team.expiredDate > 0;

  return (
    <main className="flex flex-col gap-40px">
      <h1 className="text-center text-36px font-bold text-surface-brand-secondary">
        {t('subscriptions:SUBSCRIPTIONS_PAGE.CHOOSE_THE_PLAN_THAT_FITS_YOUR_TEAM')}
      </h1>

      <section className="flex">
        <div className="w-24px flex-none rounded-l-lg border border-stroke-brand-primary bg-surface-brand-primary"></div>

        <section className="flex flex-auto items-center gap-40px rounded-r-lg border border-stroke-brand-primary bg-surface-brand-primary-5 p-24px">
          <h2 className="text-36px font-bold text-text-brand-primary-lv1">{team.name}</h2>

          <div className="w-1px self-stretch bg-surface-neutral-depth"></div>

          <div className="flex flex-auto flex-col items-end">
            <p className="text-xl font-semibold capitalize leading-32px text-text-brand-secondary-lv1">
              {team.plan}
            </p>

            {!isPlanBeginner && hasNextRenewal && (
              <p className="text-xs font-normal">
                <span className="leading-5 text-text-neutral-tertiary">
                  {t('subscriptions:SUBSCRIPTIONS_PAGE.NEXT_RENEWAL')}:{' '}
                </span>
                <span className="text-text-neutral-primary">
                  {formatTimestamp(team.nextRenewal)}
                </span>
              </p>
            )}

            {!isPlanBeginner && hasExpiredDate && (
              <p className="text-xs font-normal">
                <span className="leading-5 text-text-neutral-tertiary">
                  {t('subscriptions:SUBSCRIPTIONS_PAGE.EXPIRED_DATE')}:{' '}
                </span>
                <span className="text-text-neutral-primary">
                  {formatTimestamp(team.expiredDate)}
                </span>
              </p>
            )}
          </div>
        </section>
      </section>

      <SubscriptionFAQ />
    </main>
  );
};

export default TeamSubscriptionPageBody;
