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
}

const OwnedTeam = ({
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  setTeamForCancelSubscription,
}: OwnedTeamProps) => {
  const { t } = useTranslation(['subscriptions']);
  const { id, plan, name, paymentStatus, enableAutoRenewal, expiredTimestamp } = team;

  const nowTimestamp = Date.now() / 1000;

  const TEAM_SUBSCRIPTION_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${id}`;
  const BILLING_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${id}/billing`;
  const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${id}/payment`;

  // Info: (20250526 - Julian) 「plan 為 Beginner」或「已過期」
  const isPlanBeginner = plan === TPlanType.BEGINNER || expiredTimestamp < nowTimestamp;
  const teamUsingPlan = PLANS.find((item) => item.id === plan);

  // Info: (20250526 - Julian) 「paymentStatus 為 Trial」且「還沒過期」
  const isTrial = paymentStatus === TPaymentStatus.TRIAL && expiredTimestamp > nowTimestamp;

  // Info: (20250526 - Julian) 免費版名稱固定
  const planName = isPlanBeginner
    ? t('subscriptions:PLAN_NAME.BEGINNER')
    : t(`subscriptions:PLAN_NAME.${plan.toUpperCase()}`);

  const formatPrice = teamUsingPlan
    ? `$ ${teamUsingPlan.price.toLocaleString('zh-TW')} / ${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.MONTH')}`
    : null;
  const price = isPlanBeginner
    ? t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE')
    : isTrial
      ? `(${t('subscriptions:SUBSCRIPTIONS_PAGE.FREE_TRIAL')})`
      : formatPrice;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // Info: (20250110 - Liz) 付款失敗三天後會自動降級到 Beginner 方案
  const remainingDays = getRemainingDays(expiredTimestamp * 1000 + THREE_DAYS_IN_MS);
  // Info: (20250422 - Julian) 計算試用期剩餘天數
  // const trialRemainingDays = getRemainingDays(nextRenewalTimestamp * 1000);

  // Info: (20250110 - Liz) 檢查是否即將降級
  const isReturningToBeginnerSoon = remainingDays > 0 && remainingDays <= 3;

  // Info: (20250422 - Julian) 檢查是否顯示到期日等資訊
  const isShowExpiredDate = !isPlanBeginner && !isTrial;

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
    <main className="flex flex-col overflow-hidden rounded-lg border border-stroke-brand-primary bg-surface-neutral-surface-lv2 tablet:flex-row">
      <div className="hidden w-24px flex-none bg-surface-brand-primary tablet:block"></div>
      <div className="block h-24px flex-none bg-surface-brand-primary tablet:hidden"></div>

      <section className="flex flex-auto flex-col gap-40px bg-surface-brand-primary-5 p-24px tablet:flex-row">
        <div className="flex flex-col gap-12px">
          <h2 className="text-base font-semibold text-text-brand-secondary-lv1 tablet:text-xl">
            {name}
          </h2>
          <h1 className="w-200px text-28px font-bold text-text-brand-primary-lv1 tablet:text-36px">
            {planName}
          </h1>
          <p className="text-sm font-medium text-text-neutral-tertiary tablet:text-lg">{price}</p>
        </div>

        <div className="hidden w-1px bg-surface-neutral-depth tablet:block"></div>
        <div className="block h-1px bg-surface-neutral-depth tablet:hidden"></div>

        {/* Info: (20250421 - Julian) 下次續訂/到期日 */}
        {isShowExpiredDate ? (
          <section className="flex flex-auto flex-col justify-center gap-24px">
            <div>
              {/* Info: (20250421 - Julian) 已付款 */}
              {paymentStatus === TPaymentStatus.PAID &&
                (enableAutoRenewal ? (
                  <div className="text-lg font-semibold text-text-neutral-tertiary tablet:text-2xl">
                    {`${t('subscriptions:SUBSCRIPTIONS_PAGE.NEXT_RENEWAL')}: `}
                    <span className="text-text-neutral-primary">
                      {expiredTimestamp ? timestampToString(expiredTimestamp).dateWithSlash : ''}
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-semibold text-text-neutral-tertiary">
                    {`${t('subscriptions:SUBSCRIPTIONS_PAGE.EXPIRED_DATE')}: `}
                    <span className="text-text-neutral-primary">
                      {expiredTimestamp ? timestampToString(expiredTimestamp).dateWithSlash : ''}
                    </span>
                  </div>
                ))}

              {/* Info: (20250421 - Julian) 付款失敗 */}
              {paymentStatus === TPaymentStatus.PAYMENT_FAILED && (
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
                  isOn={enableAutoRenewal}
                  onClick={
                    enableAutoRenewal ? openTurnOffAutoRenewalModal : openTurnOnAutoRenewalModal
                  }
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-auto"></section>
        )}

        <div className="flex flex-none flex-col justify-center gap-16px">
          {changePlanBtn}

          <Link href={BILLING_PAGE}>
            <Button type="button" className="w-full" variant="hollowYellow">
              {t('subscriptions:SUBSCRIPTIONS_PAGE.BILLING')}
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
};

export default OwnedTeam;
