import { useState } from 'react';
import Image from 'next/image';
import OwnedTeams from '@/components/beta/subscriptions_page/owned_teams';
import { useTranslation } from 'next-i18next';
import { TPlanType, IUserOwnedTeam, TPaymentStatus } from '@/interfaces/subscription';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';

// ToDo: (20250102 - Liz) 這邊的資料是假的，之後要改成從 API 拿 userOwnedTeams: IUserOwnedTeam[];
const FAKE_OWNED_TEAMS: IUserOwnedTeam[] = [
  {
    id: 1,
    name: 'Personal',
    plan: TPlanType.BEGINNER,
    enableAutoRenewal: false,
    nextRenewal: 0,
    expiredDate: 0,
    paymentStatus: TPaymentStatus.FREE,
  },
  {
    id: 2,
    name: 'Team A',
    plan: TPlanType.PROFESSIONAL,
    enableAutoRenewal: true,
    nextRenewal: 1736501802970,
    expiredDate: 0,
    paymentStatus: TPaymentStatus.UNPAID,
  },
  {
    id: 3,
    name: 'Team B',
    plan: TPlanType.ENTERPRISE,
    enableAutoRenewal: false,
    nextRenewal: 0,
    expiredDate: 1630406400000,
    paymentStatus: TPaymentStatus.PAID,
  },
];

const SubscriptionsPageBody = () => {
  const { t } = useTranslation(['subscriptions']);
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  // ToDo: (20250102 - Liz) 串接 API 來開啟或關閉自動續約
  const turnOnAutoRenewal = () => {
    // ToDo: (20250102 - Liz) 打 API 開啟自動續約
    // ToDo: (20250102 - Liz) 打完開啟自動續約的 API 成功後，要關閉 Modal，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
  };
  const turnOffAutoRenewal = () => {
    // ToDo: (20250102 - Liz) 打 API 關閉自動續約
    // ToDo: (20250102 - Liz) 打完關閉自動續約的 API 成功後，要關閉 Modal，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
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

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <div className="flex items-center gap-8px">
        <Image src="/icons/my_subscription.svg" alt="my_subscription_icon" width={16} height={16} />
        <h1>{t('subscriptions:SUBSCRIPTIONS_PAGE.MY_SUBSCRIPTIONS')}</h1>
        <span className="h-1px flex-auto bg-divider-stroke-lv-1"></span>
      </div>

      <OwnedTeams
        userOwnedTeams={FAKE_OWNED_TEAMS}
        setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
        setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
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
    </main>
  );
};

export default SubscriptionsPageBody;
