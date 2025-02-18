import Image from 'next/image';
import { IPlan, IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';
import { FiArrowRight } from 'react-icons/fi';
import { PLANS } from '@/constants/subscription';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useState } from 'react';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';

interface SubscriptionPlanProps {
  team: IUserOwnedTeam;
  plan: IPlan;
  getOwnedTeam: () => Promise<void>;
}

const SubscriptionPlan = ({ team, plan, getOwnedTeam }: SubscriptionPlanProps) => {
  const { t } = useTranslation(['subscriptions']);
  const { toastHandler } = useModalContext();
  const router = useRouter();
  const isSelected = team.plan === plan.id;
  const isBeginner = plan.id === TPlanType.BEGINNER;
  const [isDowngradeMessageModalOpen, setIsDowngradeMessageModalOpen] = useState(false);

  const goToPaymentPage = () => {
    // Info: (20250114 - Liz) 這裡帶入 plan.id 作為 query string，用來表示使用者想要選擇的方案
    const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/payment?sp=${plan.id}`;
    router.push(PAYMENT_PAGE);
  };

  const selectSubscriptionPlan = () => {
    if (isBeginner) {
      setIsDowngradeMessageModalOpen(true);
    } else {
      goToPaymentPage();
    }
  };

  const closeDowngradeMessageModal = () => {
    setIsDowngradeMessageModalOpen(false);
  };

  // Info: (20250121 - Liz) 打 API 來變更使用者的訂閱方案為 Beginner (基礎版 Free)
  const downgradeSubscription = async () => {
    if (!isBeginner) return;

    const url = `/api/v2/team/${team.id}/checkout`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plan),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      // Info: (20250120 - Julian) 顯示成功訊息
      toastHandler({
        id: ToastId.DOWNGRADE_TO_BEGINNER_PLAN,
        type: ToastType.SUCCESS,
        content: t('subscriptions:PAYMENT_PAGE.DOWNGRADED_TO_BEGINNER_PLAN'),
        closeable: true,
      });
    } catch (error) {
      // console.log('Failed to downgrade, error:', error);
    } finally {
      closeDowngradeMessageModal();
      getOwnedTeam(); // Info: (20250120 - Liz) 重新打 API 取得最新的 userOwnedTeam
    }
  };

  const downgradeMessageModal: IMessageModal = {
    title: t('subscriptions:MODAL.DOWNGRADE_MESSAGE_MODAL_TITLE'),
    content: (
      <div className="text-sm font-normal text-alert-surface-surface-info">
        <p>
          {t('subscriptions:MODAL.DOWNGRADE_MESSAGE_MODAL_CONTENT_PREFIX')}
          <span className="font-semibold">{t('subscriptions:PLAN_NAME.BEGINNER')}</span>
          {t('subscriptions:MODAL.DOWNGRADE_MESSAGE_MODAL_CONTENT_SUFFIX')}
        </p>
        <p className="text-text-state-error">
          {t('subscriptions:MODAL.DOWNGRADE_MESSAGE_MODAL_SECONDARY_CONTENT')}
        </p>
      </div>
    ),
    submitBtnStr: t('subscriptions:MODAL.DOWNGRADE_MESSAGE_MODAL_SUBMIT'),
    submitBtnFunction: downgradeSubscription,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDowngradeMessageModal,
    backBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL'),
  };

  return (
    <section
      className={`relative flex w-290px flex-col justify-start gap-24px rounded-sm bg-surface-neutral-surface-lv2 px-32px py-16px ${isSelected ? 'border border-stroke-brand-primary' : ''}`}
    >
      {isSelected && (
        <Image
          src="/icons/star_badge.svg"
          alt="star_badge"
          width={64}
          height={64}
          className="absolute -right-21px -top-16px z-1"
        ></Image>
      )}

      <div className="flex flex-col gap-24px text-center">
        <h2 className="text-xl font-bold text-text-brand-primary-lv1">
          {t(`subscriptions:PLAN_NAME.${plan.id.toUpperCase()}`)}
        </h2>
        {plan.price > 0 ? (
          <div>
            <p>
              <span className="text-44px font-bold text-text-brand-secondary-lv2">
                $ {plan.price.toLocaleString('zh-TW')}
              </span>
              <span className="text-base font-semibold text-text-neutral-tertiary">
                {' '}
                {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.NTD_SLASH_MONTH')}
              </span>
            </p>

            <p className="h-30px text-base font-semibold text-text-brand-primary-lv1">
              {plan.id === TPlanType.PROFESSIONAL
                ? `${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_PREFIX')}+ $${plan.extraMemberPrice}${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_SUFFIX')}`
                : ''}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-44px font-bold text-text-brand-secondary-lv2">
              {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE')}
            </p>
            <div className="invisible h-30px"></div>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`flex items-center justify-center gap-8px rounded-xs px-32px py-14px ${isSelected ? 'pointer-events-none border border-stroke-brand-primary text-button-text-primary hover:border-button-stroke-secondary-hover hover:text-button-text-secondary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable' : 'bg-button-surface-strong-primary text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable'}`}
        onClick={selectSubscriptionPlan}
      >
        <span className="text-lg font-medium">
          {isSelected
            ? t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.SELECTED')
            : t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.SELECT_THIS_PLAN')}
        </span>
        {!isSelected && <FiArrowRight size={24} />}
      </button>

      <ul className="flex flex-col gap-4px text-xs">
        {plan.id === TPlanType.PROFESSIONAL && (
          <li className="flex items-start gap-4px">
            <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
            <p className="font-semibold">
              {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.EVERYTHING_IN_BEGINNER_PLUS')}
            </p>
          </li>
        )}

        {plan.id === TPlanType.ENTERPRISE && (
          <li className="flex items-start gap-4px">
            <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
            <p className="font-semibold">
              {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.EVERYTHING_IN_PROFESSIONAL_PLUS')}
            </p>
          </li>
        )}

        {plan.features.map((feature) => (
          <li key={feature.id} className="flex items-start gap-4px">
            <Image
              src="/icons/green_check.svg"
              alt="green_check"
              width={16}
              height={16}
              className="flex-none"
            />

            <div className="flex flex-auto flex-wrap gap-4px">
              <p className="font-semibold">
                {t(`subscriptions:PLANS_FEATURES_NAME.${feature.name.toUpperCase()}`)}
              </p>
              <span>:</span>

              {Array.isArray(feature.value) ? (
                <ul className="font-semibold text-text-support-baby">
                  {feature.value.map((value) => (
                    <li key={value}>
                      {t(`subscriptions:PLANS_FEATURES_VALUE.${value.toUpperCase()}`)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-semibold text-text-support-baby">
                  {t(`subscriptions:PLANS_FEATURES_VALUE.${feature.value.toUpperCase()}`)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!isBeginner && (
        <p className="mt-auto flex flex-col text-xs">
          <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
            {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.YOU_CAN_CANCEL_YOUR_SUBSCRIPTION_ANYTIME')}
          </span>
          <span className="text-xs font-medium leading-5 text-text-neutral-tertiary">
            {`* ${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.NOTE')}`}
          </span>
        </p>
      )}

      {isDowngradeMessageModalOpen && (
        <MessageModal
          messageModalData={downgradeMessageModal}
          isModalVisible={isDowngradeMessageModalOpen}
          modalVisibilityHandler={closeDowngradeMessageModal}
        />
      )}
    </section>
  );
};

interface SubscriptionPlansProps {
  team: IUserOwnedTeam;
  getOwnedTeam: () => Promise<void>;
}

const SubscriptionPlans = ({ team, getOwnedTeam }: SubscriptionPlansProps) => {
  return (
    <main className="flex justify-center gap-10px">
      {PLANS.map((plan) => (
        <SubscriptionPlan key={plan.id} team={team} plan={plan} getOwnedTeam={getOwnedTeam} />
      ))}
    </main>
  );
};

export default SubscriptionPlans;
