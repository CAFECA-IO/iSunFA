import { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { IoArrowForward } from 'react-icons/io5';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { PLANS } from '@/constants/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';
import { useTranslation /* Trans */ } from 'next-i18next';
import { THREE_DAYS_IN_MS } from '@/constants/time';
import { timestampToString, getRemainingDays } from '@/lib/utils/common';
import { ISUNFA_ROUTE } from '@/constants/url';
import { Button } from '@/components/button/button';

interface OwnedTeamProps {
  team: IUserOwnedTeam;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForCancelSubscription?: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  isBillingButtonHidden?: boolean;
}

const OwnedTeam = ({
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  setTeamForCancelSubscription,
  isBillingButtonHidden = false,
}: OwnedTeamProps) => {
  const { t } = useTranslation(['subscriptions']);

  const TEAM_SUBSCRIPTION_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}`;
  const BILLING_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/billing`;
  const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/payment`;

  const isPlanBeginner = team.plan === TPlanType.BEGINNER;
  const teamUsingPlan = PLANS.find((plan) => plan.id === team.plan);

  // Info: (20250422 - Julian) 是否為試用期
  const isTrial = team.paymentStatus === TPaymentStatus.TRIAL;

  const formatPrice = teamUsingPlan
    ? `$ ${teamUsingPlan.price.toLocaleString('zh-TW')} / ${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.MONTH')}`
    : null;
  const price = isPlanBeginner
    ? t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE')
    : isTrial
      ? `(${t('subscriptions:SUBSCRIPTIONS_PAGE.FREE_TRIAL')})`
      : formatPrice;

  // Info: (20250422 - Julian) 是否開啟自動續訂
  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // Info: (20250110 - Liz) 付款失敗三天後會自動降級到 Beginner 方案
  const remainingDays = getRemainingDays(team.expiredTimestamp * 1000 + THREE_DAYS_IN_MS);
  // Info: (20250422 - Julian) 計算試用期剩餘天數
  // const trialRemainingDays = getRemainingDays(team.nextRenewalTimestamp * 1000);

  // Info: (20250110 - Liz) 檢查是否即將降級
  const isReturningToBeginnerSoon = remainingDays > 0 && remainingDays <= 3;

  // Info: (20250422 - Julian) 檢查是否顯示到期日等資訊
  const isShowExpiredDate = !isPlanBeginner && !isTrial;
  // Info: (20250422 - Julian) 檢查是否顯示「帳單」按鈕
  const isShowBillingButton = !isPlanBeginner && !isBillingButtonHidden && !isTrial;

  const changePlanBtn = (
    // ToDo: (20250425 - Julian) 暫時不會用到
    // isTrial ? (
    // <Button type="button" className="w-full" disabled>
    //   <Trans
    //     i18nKey="subscriptions:SUBSCRIPTIONS_PAGE.LEFT_DAYS"
    //     values={{ days: trialRemainingDays }}
    //   />
    // </Button>
    // ) :
    <Link href={TEAM_SUBSCRIPTION_PAGE}>
      <Button type="button" className="w-full">
        {t('subscriptions:SUBSCRIPTIONS_PAGE.CHANGE_PLAN')} <IoArrowForward size={20} />
      </Button>
    </Link>
  );

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

        {/* Info: (20250421 - Julian) 下次續訂/到期日 */}
        {isShowExpiredDate ? (
          <section className="flex flex-auto flex-col justify-center gap-24px">
            <div>
              {/* Info: (20250421 - Julian) 已付款 */}
              {team.paymentStatus === TPaymentStatus.PAID &&
                (team.enableAutoRenewal ? (
                  <div className="text-2xl font-semibold text-text-neutral-tertiary">
                    {`${t('subscriptions:SUBSCRIPTIONS_PAGE.NEXT_RENEWAL')}: `}
                    <span className="text-text-neutral-primary">
                      {team.expiredTimestamp
                        ? timestampToString(team.expiredTimestamp).dateWithSlash
                        : ''}
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-semibold text-text-neutral-tertiary">
                    {`${t('subscriptions:SUBSCRIPTIONS_PAGE.EXPIRED_DATE')}: `}
                    <span className="text-text-neutral-primary">
                      {team.expiredTimestamp
                        ? timestampToString(team.expiredTimestamp).dateWithSlash
                        : ''}
                    </span>
                  </div>
                ))}

              {/* Info: (20250421 - Julian) 付款失敗 */}
              {team.paymentStatus === TPaymentStatus.PAYMENT_FAILED && (
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

            {/* Info: (20250421 - Julian) 「取消訂閱」按鈕 */}
            <div className="flex flex-col items-start gap-20px">
              {!isPlanBeginner && setTeamForCancelSubscription && (
                <p
                  className="cursor-pointer text-base font-semibold leading-6 tracking-wide text-red-600"
                  onClick={() => setTeamForCancelSubscription(team)}
                >
                  {t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL_SUBSCRIPTION_TITLE')}
                </p>
              )}

              {/* Info: (20250410 - Anna) 設計稿有改，「開啟自動續訂Toggle」先隱藏 */}
              <div className="hidden">
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
            </div>
          </section>
        ) : (
          <section className="flex-auto"></section>
        )}

        <section className="flex flex-none flex-col justify-center gap-16px">
          {changePlanBtn}

          {isShowBillingButton && (
            <Link href={BILLING_PAGE}>
              <Button type="button" className="w-full">
                {t('subscriptions:SUBSCRIPTIONS_PAGE.BILLING')}
              </Button>
            </Link>
          )}
        </section>
      </section>
    </main>
  );
};

export default OwnedTeam;
