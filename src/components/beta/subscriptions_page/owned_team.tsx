import { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { IoArrowForward } from 'react-icons/io5';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { PLANS } from '@/constants/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';
import { useTranslation } from 'next-i18next';
import { formatTimestamp, ONE_DAY_IN_MS, THREE_DAYS_IN_MS } from '@/constants/time';
import { ISUNFA_ROUTE } from '@/constants/url';

interface OwnedTeamProps {
  team: IUserOwnedTeam;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  isBillingButtonHidden?: boolean;
}

const OwnedTeam = ({
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  isBillingButtonHidden = false,
}: OwnedTeamProps) => {
  const { t } = useTranslation(['subscriptions']);
  const TEAM_SUBSCRIPTION_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}`;
  const BILLING_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/billing`;
  const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/payment`;

  const isPlanBeginner = team.plan === TPlanType.BEGINNER;
  const teamUsingPlan = PLANS.find((plan) => plan.id === team.plan);

  const formatter = new Intl.NumberFormat('en-US');
  const formatPrice = teamUsingPlan ? `$ ${formatter.format(teamUsingPlan.price)} / Month` : null;
  const price = isPlanBeginner ? 'Free' : formatPrice;
  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // Info: (20250110 - Liz) 計算一個 timestamp 距離現在的剩餘天數
  const getRemainingDays = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    return Math.ceil(diff / ONE_DAY_IN_MS);
  };

  // Info: (20250110 - Liz) 付款失敗三天後會自動降級到 Beginner 方案
  const remainingDays = getRemainingDays(team.expiredTimestamp + THREE_DAYS_IN_MS);

  // Info: (20250110 - Liz) 檢查是否即將降級
  const isReturningToBeginnerSoon = remainingDays > 0 && remainingDays <= 3;

  return (
    <main className="flex overflow-hidden rounded-lg border border-stroke-brand-primary bg-surface-neutral-surface-lv2">
      <div className="w-24px flex-none bg-surface-brand-primary"></div>

      <section className="flex flex-auto gap-40px bg-surface-brand-primary-5 p-24px">
        <div className="flex flex-col gap-12px">
          <h2 className="text-xl font-semibold text-text-brand-secondary-lv1">{team.name}</h2>
          <h1 className="w-200px text-36px font-bold text-text-brand-primary-lv1">
            {t(`subscriptions:PLAN_NAME.${team.plan.toUpperCase()}`)}
          </h1>
          <p className="text-lg font-medium text-text-neutral-tertiary">{price}</p>
        </div>

        <div className="w-1px bg-surface-neutral-depth"></div>

        {isPlanBeginner && <section className="flex-auto"></section>}

        {!isPlanBeginner && (
          <section className="flex flex-auto flex-col justify-center gap-24px">
            <div>
              {team.paymentStatus === TPaymentStatus.PAID &&
                (team.enableAutoRenewal ? (
                  <div className="text-2xl font-semibold text-text-neutral-tertiary">
                    {`${t('subscriptions:SUBSCRIPTIONS_PAGE.NEXT_RENEWAL')}: `}
                    <span className="text-text-neutral-primary">
                      {team.expiredTimestamp ? formatTimestamp(team.expiredTimestamp) : ''}
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-semibold text-text-neutral-tertiary">
                    {`${t('subscriptions:SUBSCRIPTIONS_PAGE.EXPIRED_DATE')}: `}
                    <span className="text-text-neutral-primary">
                      {team.expiredTimestamp ? formatTimestamp(team.expiredTimestamp) : ''}
                    </span>
                  </div>
                ))}

              {team.paymentStatus === TPaymentStatus.UNPAID && (
                <div>
                  <div className="flex items-center gap-8px">
                    <p className="text-2xl font-semibold text-text-state-error">
                      {t('subscriptions:SUBSCRIPTIONS_PAGE.PAYMENT_FAILED')}
                    </p>
                    <Link
                      href={PAYMENT_PAGE}
                      className="text-sm font-semibold text-link-text-primary"
                    >
                      {t('subscriptions:SUBSCRIPTIONS_PAGE.UPDATE_PAYMENT')}
                    </Link>
                  </div>
                  {isReturningToBeginnerSoon && (
                    <p className="text-base font-semibold text-text-neutral-tertiary">
                      {t('subscriptions:SUBSCRIPTIONS_PAGE.RETURNING_TO_BEGINNER_IN')}
                      <span className="text-text-state-error">{remainingDays}</span>
                      {t('subscriptions:SUBSCRIPTIONS_PAGE.DAYS')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-20px">
              <span className="text-lg font-semibold text-text-neutral-primary">
                {t('subscriptions:SUBSCRIPTIONS_PAGE.ENABLE_AUTO_RENEWAL')}
              </span>
              <SimpleToggle
                isOn={isAutoRenewalEnabled}
                onClick={
                  isAutoRenewalEnabled ? openTurnOffAutoRenewalModal : openTurnOnAutoRenewalModal
                }
              />
            </div>
          </section>
        )}

        <section className="flex flex-none flex-col justify-center gap-16px">
          <Link
            href={TEAM_SUBSCRIPTION_PAGE}
            className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-24px py-10px text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <span className="text-base font-medium">
              {t('subscriptions:SUBSCRIPTIONS_PAGE.CHANGE_PLAN')}
            </span>
            <IoArrowForward size={20} />
          </Link>

          {!isPlanBeginner && !isBillingButtonHidden && (
            <Link
              href={BILLING_PAGE}
              className="flex items-center justify-center gap-8px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-24px py-10px text-button-text-primary-solid hover:border-button-stroke-primary-hover hover:bg-button-surface-soft-primary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <span className="text-base font-medium">
                {t('subscriptions:SUBSCRIPTIONS_PAGE.BILLING')}
              </span>
            </Link>
          )}
        </section>
      </section>
    </main>
  );
};

export default OwnedTeam;
