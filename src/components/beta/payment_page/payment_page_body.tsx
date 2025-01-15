import { useState } from 'react';
import { IPlan, IUserOwnedTeam } from '@/interfaces/subscription';
import { PLANS } from '@/constants/subscription';
import PlanInfo from '@/components/beta/payment_page/plan_info';
import PaymentInfo from '@/components/beta/payment_page/payment_info';
import CreditCardInfo from '@/components/beta/payment_page/credit_card_info';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';

interface PaymentPageBodyProps {
  team: IUserOwnedTeam;
  subscriptionPlan?: IPlan;
}

const PaymentPageBody = ({ team, subscriptionPlan }: PaymentPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);

  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  // ToDo: (20250114 - Liz) 串接 API 來開啟或關閉自動續約
  const turnOnAutoRenewal = () => {
    // ToDo: (20250114 - Liz) 打 API 開啟自動續約
    // ToDo: (20250114 - Liz) 打完開啟自動續約的 API 成功後，要關閉 Modal，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
  };
  const turnOffAutoRenewal = () => {
    // ToDo: (20250114 - Liz) 打 API 關閉自動續約
    // ToDo: (20250114 - Liz) 打完關閉自動續約的 API 成功後，要關閉 Modal，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
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

  // Info: (20250114 - Liz) 如果沒有 subscriptionPlan，表示是要修改已經訂閱方案的付款資料，所以要找出 team 的 plan 資料。如果有 subscriptionPlan，表示是要訂閱新方案，所以直接使用 subscriptionPlan。
  const plan = subscriptionPlan ?? PLANS.find((p) => p.id === team.plan);

  return (
    <main className="flex min-h-full gap-40px">
      <PlanInfo team={team} plan={plan} />

      <section className="flex flex-auto flex-col gap-24px">
        <PaymentInfo plan={plan} />

        <CreditCardInfo
          team={team}
          plan={plan}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
        />
      </section>

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
    </main>
  );
};

export default PaymentPageBody;
