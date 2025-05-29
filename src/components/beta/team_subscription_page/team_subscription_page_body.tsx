import { IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { timestampToString, getRemainingDays } from '@/lib/utils/common';
import { Trans, useTranslation } from 'next-i18next';
import SubscriptionFAQ from '@/components/beta/team_subscription_page/subscription_faq';
import SubscriptionPlans from '@/components/beta/team_subscription_page/subscription_plans';

interface TeamSubscriptionPageBodyProps {
  team: IUserOwnedTeam;
  getOwnedTeam: () => Promise<void>;
}

const TeamSubscriptionPageBody = ({ team, getOwnedTeam }: TeamSubscriptionPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);
  const { plan, name, paymentStatus, enableAutoRenewal, expiredTimestamp, nextRenewalTimestamp } =
    team;

  const nowTimestamp = Date.now() / 1000;

  // Info: (20250526 - Julian) 「plan 為 Beginner」或「已過期」
  const isPlanBeginner = plan === TPlanType.BEGINNER || expiredTimestamp < nowTimestamp;

  // Info: (20250526 - Julian) 「paymentStatus 為 Trial」且「還沒過期」
  const isTrial = paymentStatus === TPaymentStatus.TRIAL && expiredTimestamp > nowTimestamp;

  // Info: (20250425 - Julian) 以（）拆分文字
  const trialStr = t('subscriptions:PLAN_NAME.TRIAL').split(/[（）]/, 2);

  const planName = isTrial ? (
    <p className="text-xl font-semibold capitalize leading-32px text-text-brand-primary-lv1">
      {trialStr[0]} <span className="text-text-brand-secondary-lv2">({trialStr[1]})</span>
    </p>
  ) : isPlanBeginner ? ( // Info: (20250526 - Julian) 免費版名稱固定
    <p className="text-xl font-semibold capitalize leading-32px text-text-brand-primary-lv1">
      {t('subscriptions:PLAN_NAME.BEGINNER')}
    </p>
  ) : (
    <p className="text-xl font-semibold capitalize leading-32px text-text-brand-primary-lv1">
      {t(`subscriptions:PLAN_NAME.${plan.toUpperCase()}`)}
    </p>
  );

  const expiredTime = isTrial ? (
    <p className="text-xs font-semibold text-text-state-error">
      {trialStr[1]}:{' '}
      <Trans
        i18nKey="subscriptions:SUBSCRIPTIONS_PAGE.LEFT_DAYS"
        values={{
          days: getRemainingDays(nextRenewalTimestamp * 1000),
        }}
      />
    </p>
  ) : (
    !isPlanBeginner &&
    enableAutoRenewal && (
      <p className="text-xs font-normal">
        <span className="leading-5 text-text-neutral-tertiary">
          {t('subscriptions:SUBSCRIPTIONS_PAGE.NEXT_RENEWAL')}:{' '}
        </span>
        <span className="text-text-neutral-primary">
          {timestampToString(expiredTimestamp).dateWithSlash}
        </span>
      </p>
    )
  );

  return (
    <main className="flex flex-col gap-40px">
      <h1 className="text-center text-36px font-bold text-surface-brand-secondary">
        {t('subscriptions:SUBSCRIPTIONS_PAGE.CHOOSE_THE_PLAN_THAT_FITS_YOUR_TEAM')}
      </h1>

      <section className="flex overflow-hidden rounded-lg border border-stroke-brand-primary bg-surface-neutral-surface-lv2">
        <div className="w-24px flex-none bg-surface-brand-primary"></div>

        <section className="flex flex-auto items-center gap-40px bg-surface-brand-primary-5 p-24px">
          <h2 className="text-36px font-bold text-text-brand-secondary-lv1">{name}</h2>

          <div className="w-1px self-stretch bg-surface-neutral-depth"></div>

          <div className="flex flex-auto flex-col items-end">
            <p className="text-xl font-semibold capitalize leading-32px text-text-brand-primary-lv1">
              {planName}
            </p>

            {expiredTime}
          </div>
        </section>
      </section>

      <SubscriptionPlans team={team} getOwnedTeam={getOwnedTeam} />

      <SubscriptionFAQ />
    </main>
  );
};

export default TeamSubscriptionPageBody;
