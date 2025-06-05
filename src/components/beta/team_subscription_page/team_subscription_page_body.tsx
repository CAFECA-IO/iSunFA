import { IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { timestampToString, getRemainingDays } from '@/lib/utils/common';
import { Trans, useTranslation } from 'next-i18next';
import SubscriptionFAQ from '@/components/beta/team_subscription_page/subscription_faq';
import SubscriptionPlans from '@/components/beta/team_subscription_page/subscription_plans';
import { Button } from '@/components/button/button';
import { TbArrowBackUp } from 'react-icons/tb';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

interface TeamSubscriptionPageBodyProps {
  team: IUserOwnedTeam;
  getOwnedTeam: () => Promise<void>;
}

const TeamSubscriptionPageBody = ({ team, getOwnedTeam }: TeamSubscriptionPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { plan, name, paymentStatus, enableAutoRenewal, expiredTimestamp, nextRenewalTimestamp } =
    team;

  const nowTimestamp = Date.now() / 1000;

  // Info: (20250526 - Julian) 「plan 為 Beginner」或「已過期」
  const isPlanBeginner = plan === TPlanType.BEGINNER || expiredTimestamp < nowTimestamp;

  // Info: (20250526 - Julian) 「paymentStatus 為 Trial」且「還沒過期」
  const isTrial = paymentStatus === TPaymentStatus.TRIAL && expiredTimestamp > nowTimestamp;

  // Info: (20250425 - Julian) 以（）拆分文字
  const trialStr = t('subscriptions:PLAN_NAME.TRIAL').split(/[（）]/, 2);

  // Info: (20250529 - Julian) 返回上一頁
  const goBack = () => router.push(ISUNFA_ROUTE.SUBSCRIPTIONS);

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
    <main className="flex flex-col gap-lv-6 tablet:gap-40px">
      {/* Info: (20250529 - Julian) Mobile back button */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('subscriptions:SUBSCRIPTIONS_PAGE.PLAN_FOR') + team.name}
        </p>
      </div>

      <h1 className="text-center text-28px font-bold text-surface-brand-secondary tablet:text-36px">
        {t('subscriptions:SUBSCRIPTIONS_PAGE.CHOOSE_THE_PLAN_THAT_FITS_YOUR_TEAM')}
      </h1>

      <div>
        <section className="flex overflow-hidden rounded-sm border border-stroke-brand-primary bg-surface-neutral-surface-lv2 tablet:rounded-lg">
          <div className="w-24px flex-none bg-surface-brand-primary"></div>

          <section className="flex flex-auto items-center gap-lv-5 bg-surface-brand-primary-5 px-lv-5 py-lv-3 tablet:gap-40px tablet:p-24px">
            <h2 className="text-lg font-bold text-text-brand-secondary-lv1 tablet:text-36px">
              {name}
            </h2>

            <div className="w-1px self-stretch bg-surface-neutral-depth"></div>

            <div className="flex flex-auto flex-col items-end">
              <p className="text-base font-semibold capitalize leading-32px text-text-brand-primary-lv1 tablet:text-xl">
                {planName}
              </p>

              {expiredTime}
            </div>
          </section>
        </section>
        <SubscriptionPlans team={team} getOwnedTeam={getOwnedTeam} />
      </div>

      <SubscriptionFAQ />
    </main>
  );
};

export default TeamSubscriptionPageBody;
