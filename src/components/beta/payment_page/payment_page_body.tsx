import { useEffect, useState } from 'react';
import { IPlan, IUserOwnedTeam } from '@/interfaces/subscription';
import { PLANS } from '@/constants/subscription';
import PlanInfo from '@/components/beta/payment_page/plan_info';
import PaymentInfo from '@/components/beta/payment_page/payment_info';
import CreditCardInfo from '@/components/beta/payment_page/credit_card_info';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

interface PaymentPageBodyProps {
  team: IUserOwnedTeam;
  subscriptionPlan?: IPlan;
  getUserOwnedTeam: () => void;
}

const PaymentPageBody = ({ team, subscriptionPlan, getUserOwnedTeam }: PaymentPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);

  // Info: (20250114 - Liz) 如果沒有 subscriptionPlan，表示是要修改已經訂閱方案的付款資料，所以要找出 team 的 plan 資料。如果有 subscriptionPlan，表示是要訂閱新方案，所以直接使用 subscriptionPlan。
  const plan = subscriptionPlan ?? PLANS.find((p) => p.id === team.plan);

  // Info: (20250116 - Liz) 未完成訂閱的狀態下，阻止離開頁面，並且顯示提示 Modal
  const [isDirty, setIsDirty] = useState(true); // Info: (20250116 - Liz) 是否需要阻止離開
  const [isConfirmLeaveModalOpen, setIsConfirmLeaveModalOpen] = useState(false);
  const [nextRoute, setNextRoute] = useState<string | null>(null); // Info: (20250116 - Liz) 儲存即將導向的網址
  const router = useRouter();
  // Info: (20250116 - Liz) 開啟或關閉自動續約的 Modal 資料
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

  const handleLeave = () => {
    setIsConfirmLeaveModalOpen(false);
    setIsDirty(false); // Info: (20250116 - Liz) 清除阻止狀態
    if (nextRoute) {
      router.push(nextRoute); // Info: (20250116 - Liz) 導向下一頁
    }
  };

  const handleCancel = () => {
    setIsConfirmLeaveModalOpen(false);
    setNextRoute(null); // Info: (20250116 - Liz) 清除儲存的路由
  };

  const messageModalDataForLeavePage: IMessageModal = {
    title: 'Subscription is not done yet',
    content: 'Your subscription is not done yet, are you sure you want to leave this page?',
    submitBtnStr: 'Leave',
    submitBtnFunction: handleLeave,
    messageType: MessageType.WARNING,
    backBtnFunction: handleCancel,
    backBtnStr: 'Keep finishing my subscription',
  };

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (isDirty) {
        setIsConfirmLeaveModalOpen(true);
        setNextRoute(url); // Info: (20250116 - Liz) 儲存下一個路由
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'Route change blocked because of unfinished subscription.'; // Info: (20250116 - Liz)
        // throw new Error('Route change blocked because of unfinished subscription.'); // Info: (20250116 - Liz) 阻止路由變化 (dev 環境會顯示錯誤訊息是正常的) (prod 環境不會顯示錯誤訊息) 如果想刪除上面的 eslint-disable-next-line，就要改成使用這行
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    // Info: (20250116 - Liz) 攔截路由變化
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);

    // Info: (20250116 - Liz) 使用 beforePopState 攔截瀏覽器的返回事件(像是按下瀏覽器的返回按鈕)
    router.beforePopState(() => {
      if (isDirty) {
        setIsConfirmLeaveModalOpen(true);
        return false; // Info: (20250116 - Liz) 阻止返回
      }
      return true; // Info: (20250116 - Liz) 允許返回
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [isDirty, router]);

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
          getUserOwnedTeam={getUserOwnedTeam}
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

      {isConfirmLeaveModalOpen && (
        <MessageModal
          messageModalData={messageModalDataForLeavePage}
          isModalVisible={!!isConfirmLeaveModalOpen}
          modalVisibilityHandler={handleCancel}
        />
      )}
    </main>
  );
};

export default PaymentPageBody;
