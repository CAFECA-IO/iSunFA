import { useState } from 'react';
import Image from 'next/image';
import OwnedTeams from '@/components/beta/subscriptions_page/owned_teams';
import { useTranslation, Trans } from 'next-i18next';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

interface SubscriptionsPageBodyProps {
  userOwnedTeams: IUserOwnedTeam[];
  getUserOwnedTeams: () => Promise<void>;
}

const SubscriptionsPageBody = ({
  userOwnedTeams,
  getUserOwnedTeams,
}: SubscriptionsPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);
  // Info: (20250116 - Liz) 開啟或關閉自動續約的 Modal 狀態
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  // Info: (20250410 - Anna) 開啟或關閉取消訂閱的 Modal 狀態
  const [teamForCancelSubscription, setTeamForCancelSubscription] = useState<
    IUserOwnedTeam | undefined
  >();

  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  const closeCancelSubscriptionModal = () => {
    setTeamForCancelSubscription(undefined);
  };

  // Info: (20250120 - Liz) 開啟自動續約、關閉自動續約 API
  const { trigger: updateSubscriptionAPI } = APIHandler<IUserOwnedTeam>(
    APIName.UPDATE_SUBSCRIPTION
  );

  // Info: (20250120 - Liz) 打 API 開啟自動續約
  const turnOnAutoRenewal = async () => {
    if (!teamForAutoRenewalOn) return;
    const teamId = teamForAutoRenewalOn.id;
    const planId = teamForAutoRenewalOn.plan;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: true },
    });
    // Info: (20250120 - Liz) 打完開啟自動續約的 API 成功後，關閉 Modal，並且重新打 API 取得最新的 userOwnedTeam
    if (success) {
      closeAutoRenewalModal();
      getUserOwnedTeams();
    }
  };

  // Info: (20250120 - Liz) 打 API 關閉自動續約
  const turnOffAutoRenewal = async () => {
    if (!teamForAutoRenewalOff) return;
    const teamId = teamForAutoRenewalOff.id;
    const planId = teamForAutoRenewalOff.plan;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: false },
    });
    // Info: (20250120 - Liz) 打完關閉自動續約的 API 成功後，關閉 Modal，並且重新打 API 取得最新的 userOwnedTeam
    if (success) {
      closeAutoRenewalModal();
      getUserOwnedTeams();
    }
  };

  // Info: (20250410 - Anna) 打 API 取消訂閱
  const cancelSubscription = async () => {
    if (!teamForCancelSubscription) return;
    const teamId = teamForCancelSubscription.id;
    const planId = teamForCancelSubscription.plan;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: false }, // Info: (20250410 - Anna) 關閉自動續約即為取消訂閱
    });
    if (success) {
      closeCancelSubscriptionModal();
      getUserOwnedTeams();
    }
  };

  const messageModalDataForTurnOnRenewal: IMessageModal = {
    title: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_ON_AUTO_RENEWAL_TITLE'),
    content: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_ON_AUTO_RENEWAL_MESSAGE'),
    submitBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.YES_TURN_ON_AUTO_RENEWAL'),
    submitBtnFunction: turnOnAutoRenewal,
    messageType: MessageType.WARNING,
    backBtnFunction: closeAutoRenewalModal,
    backBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL'),
  };

  const messageModalDataForTurnOffRenewal: IMessageModal = {
    title: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_OFF_AUTO_RENEWAL_TITLE'),
    content: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_OFF_AUTO_RENEWAL_MESSAGE'),
    submitBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.YES_TURN_OFF_AUTO_RENEWAL'),
    submitBtnFunction: turnOffAutoRenewal,
    messageType: MessageType.WARNING,
    backBtnFunction: closeAutoRenewalModal,
    backBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL'),
  };

  // Info: (20250410 - Anna) 取消訂閱的Modal
  const messageModalDataForCancelSubscription: IMessageModal = {
    title: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL_SUBSCRIPTION_TITLE'),
    content: (
      <div className="max-w-300px leading-6">
        <Trans
          i18nKey="subscriptions:SUBSCRIPTIONS_PAGE.CANCEL_SUBSCRIPTION_MESSAGE"
          components={{
            bold: <span className="font-semibold" />,
            br: <br />,
            red: <span className="text-red-600" />,
          }}
          values={{
            planName: t(`subscriptions:PLAN_NAME.${teamForCancelSubscription?.plan.toUpperCase()}`),
          }}
        />
      </div>
    ),
    submitBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.YES_CANCEL_SUBSCRIPTION'),
    submitBtnFunction: cancelSubscription,
    messageType: MessageType.WARNING,
    backBtnFunction: closeCancelSubscriptionModal,
    backBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL'),
    backBtnClassName: 'border-orange-500 text-orange-600',
    submitBtnClassName:
      'bg-orange-400 text-orange-900 hover:bg-button-surface-strong-primary-hover',
  };

  return (
    <main className="flex min-h-full flex-col gap-40px">
      {/* Info: (20250529 - Julian) Page Title for mobile */}
      <div className="block w-full text-left text-base font-semibold text-text-neutral-secondary tablet:hidden">
        {t('subscriptions:SUBSCRIPTIONS_PAGE.SUBSCRIPTION_PLANS')}
      </div>
      <div className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2">
          <Image
            src="/icons/my_subscription.svg"
            alt="my_subscription_icon"
            width={16}
            height={16}
          />
          <h1>{t('subscriptions:SUBSCRIPTIONS_PAGE.MY_SUBSCRIPTIONS')}</h1>
        </div>
        <span className="h-1px flex-auto bg-divider-stroke-lv-4"></span>
      </div>
      <OwnedTeams
        userOwnedTeams={userOwnedTeams}
        setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
        setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
        setTeamForCancelSubscription={setTeamForCancelSubscription}
      />
      {teamForAutoRenewalOn && (
        <MessageModal
          messageModalData={messageModalDataForTurnOnRenewal}
          isModalVisible={!!teamForAutoRenewalOn}
          modalVisibilityHandler={closeAutoRenewalModal}
        />
      )}
      {teamForAutoRenewalOff && (
        <MessageModal
          messageModalData={messageModalDataForTurnOffRenewal}
          isModalVisible={!!teamForAutoRenewalOff}
          modalVisibilityHandler={closeAutoRenewalModal}
        />
      )}

      {/* Info: (20250410 - Anna) 取消訂閱的Modal */}
      {teamForCancelSubscription && (
        <MessageModal
          messageModalData={messageModalDataForCancelSubscription}
          isModalVisible={!!teamForCancelSubscription}
          modalVisibilityHandler={closeCancelSubscriptionModal}
        />
      )}
    </main>
  );
};

export default SubscriptionsPageBody;
