import Image from 'next/image';
import { IPlan, IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { FiArrowRight } from 'react-icons/fi';
import { useTranslation, Trans } from 'next-i18next';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useState } from 'react';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { getRemainingDays } from '@/lib/utils/common';

interface SubscriptionPlanProps {
  team: IUserOwnedTeam;
  plan: IPlan;
  getOwnedTeam: () => Promise<void>;
  goToPaymentHandler: () => void;
  bordered?: boolean;
}

const SubscriptionPlan = ({
  team,
  plan,
  getOwnedTeam,
  goToPaymentHandler,
  bordered,
}: SubscriptionPlanProps) => {
  const { t } = useTranslation(['subscriptions']);
  const { toastHandler } = useModalContext();

  // Info: (20250421 - Julian) 試用期間的 selected plan 為免費版
  const isTrial = team.paymentStatus === TPaymentStatus.TRIAL;
  const isSelected = isTrial ? plan.id === TPlanType.TRIAL : team.plan === plan.id;

  // Info: (20250421 - Julian) 試用版 UI 同免費方案
  const isBeginner = plan.id === TPlanType.BEGINNER || plan.id === TPlanType.TRIAL;
  const isProfessional = plan.id === TPlanType.PROFESSIONAL;
  const isEnterprise = plan.id === TPlanType.ENTERPRISE;

  /* Info: (20250421 - Julian) 降級方案：
  /* 1. 原為企業版，選擇專業版
  /* 2. 原為企業版，選擇免費版
  /* 3. 原為專業版，選擇免費版 */
  const isDowngrade =
    (team.plan === TPlanType.ENTERPRISE && (isBeginner || isProfessional)) ||
    (team.plan === TPlanType.PROFESSIONAL && isBeginner);

  const [isDowngradeMessageModalOpen, setIsDowngradeMessageModalOpen] = useState(false);

  const borderedStyle = bordered ? 'border border-stroke-neutral-quaternary' : '';

  const { trigger: downgrade } = APIHandler(APIName.UPDATE_SUBSCRIPTION);

  const selectSubscriptionPlan = () => {
    if (isDowngrade) {
      setIsDowngradeMessageModalOpen(true);
    } else {
      goToPaymentHandler();
    }
  };

  const closeDowngradeMessageModal = () => {
    setIsDowngradeMessageModalOpen(false);
  };

  // Info: (20250421 - Julian) 降級方案
  const downgradeSubscription = async () => {
    if (!isDowngrade) return;

    try {
      const { success } = await downgrade({
        params: { teamId: team.id },
        body: { plan: plan.id },
      });

      if (success) {
        // Info: (20250421 - Julian) 顯示成功訊息
        toastHandler({
          id: ToastId.DOWNGRADE_TO_BEGINNER_PLAN,
          type: ToastType.SUCCESS,
          content: t('subscriptions:PAYMENT_PAGE.DOWNGRADED_TO_BEGINNER_PLAN'),
          closeable: true,
        });
      }
    } catch (error) {
      // Info: (20250421 - Julian) 顯示錯誤訊息
      toastHandler({
        id: ToastId.DOWNGRADE_TO_BEGINNER_PLAN,
        type: ToastType.ERROR,
        content: 'Failed to downgrade, error: ' + error,
        closeable: true,
      });
    } finally {
      closeDowngradeMessageModal();
      getOwnedTeam(); // Info: (20250120 - Liz) 重新打 API 取得最新的 userOwnedTeam
    }
  };

  const btnContent =
    isTrial && isSelected ? (
      <button
        type="button"
        className="flex items-center justify-center gap-8px rounded-xs border px-32px py-14px font-medium disabled:border-button-stroke-disable disabled:text-button-text-disable"
        disabled
      >
        {t('subscriptions:SUBSCRIPTIONS_PAGE.FREE_TRIAL')}
      </button>
    ) : (
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
    );

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
      className={`relative flex w-290px flex-col justify-start gap-24px rounded-sm bg-surface-neutral-surface-lv2 px-32px py-16px ${isSelected ? 'border border-stroke-brand-primary' : borderedStyle}`}
    >
      {isSelected && (
        <Image
          src="/icons/star_badge.svg"
          alt="star_badge"
          width={64}
          height={64}
          className="absolute -right-21px -top-16px z-10"
        />
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
              {plan.id !== TPlanType.BEGINNER
                ? `${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_PREFIX')}+ $${plan.extraMemberPrice}${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_SUFFIX')}`
                : ''}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-44px font-bold text-text-brand-secondary-lv2">
              {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE')}
              {isTrial && (
                <span className="text-base font-semibold text-text-neutral-tertiary">
                  {' '}
                  <Trans
                    i18nKey="subscriptions:SUBSCRIPTION_PLAN_CONTENT.TRAIL_REMAINING_DAYS"
                    values={{
                      days: getRemainingDays(team.nextRenewalTimestamp * 1000),
                    }}
                  />
                </span>
              )}
            </p>
            <div className="invisible h-30px"></div>
          </div>
        )}
      </div>

      {/* Info: (20250421 - Julian) 這裡的按鈕是用來選擇方案的，當前選擇的方案會 disable */}
      {btnContent}

      <ul className="flex min-h-350px flex-col gap-4px text-xs">
        {(isProfessional || isTrial) && (
          <li className="flex items-start gap-4px">
            <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
            <p className="font-semibold">
              {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.EVERYTHING_IN_BEGINNER_PLUS')}
            </p>
          </li>
        )}

        {isEnterprise && (
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
      {isProfessional && (
        <p className="mt-auto flex flex-col text-xs">
          <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
            {t('subscriptions:PLANS_FEATURES_NAME.FREE_TRIAL')}
          </span>
          <span className="min-h-100px text-xs font-medium leading-5 text-text-neutral-tertiary">
            {`* ${t('subscriptions:PLANS_FEATURES_VALUE.30_DAYS_ON_TEAM_CREATION')}`}
          </span>
        </p>
      )}
      {isEnterprise && (
        <p className="mt-auto flex flex-col text-xs">
          <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
            {t('subscriptions:PLANS_FEATURES_NAME.NOTE')}
          </span>
          <span className="min-h-100px text-xs font-medium leading-5 text-text-neutral-tertiary">
            {`* ${t('subscriptions:PLANS_FEATURES_VALUE.NOTE_DES')}`}
          </span>
        </p>
      )}
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
      {isDowngradeMessageModalOpen && isDowngrade && (
        <MessageModal
          messageModalData={downgradeMessageModal}
          isModalVisible={isDowngradeMessageModalOpen}
          modalVisibilityHandler={closeDowngradeMessageModal}
        />
      )}
    </section>
  );
};

export default SubscriptionPlan;
