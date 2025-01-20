import { useState } from 'react';
import { IUserOwnedTeam, ITeamInvoice, TPlanType } from '@/interfaces/subscription';
import CreditCardInfo from '@/components/beta/billing_page/credit_card_info';
import InvoiceList from '@/components/beta/billing_page/invoice_list';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

const FAKE_INVOICE_LIST: ITeamInvoice[] = [
  {
    id: 100000,
    teamId: 3,
    status: false,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100001,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100002,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100003,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100004,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100005,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
];

interface BillingPageBodyProps {
  team: IUserOwnedTeam;
  getTeamData: () => Promise<void>;
}

const BillingPageBody = ({ team, getTeamData }: BillingPageBodyProps) => {
  const { t } = useTranslation(['subscriptions']);

  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invoiceList, setInvoiceList] = useState<ITeamInvoice[]>(FAKE_INVOICE_LIST);

  // Info: (20250116 - Liz) 開啟或關閉自動續約的 Modal 狀態
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  // Info: (20250120 - Liz) 開啟自動續約、關閉自動續約 API
  const { trigger: updateSubscriptionAPI } = APIHandler(APIName.UPDATE_SUBSCRIPTION);

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
      getTeamData();
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
      getTeamData();
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

  // Info: (20250115 - Liz) InvoiceList filter 的條件: ========================
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invoiceId, setInvoiceId] = useState<number>();
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [status, setStatus] = useState<boolean>();
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [issuedTimestamp, setIssuedTimestamp] = useState<number>();
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [planId, setPlanId] = useState<string>();
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [amountDue, setAmountDue] = useState<number>();

  // ToDo: (20250115 - Liz) 呼叫 API 取得 InvoiceList 並且設定到 invoiceList state
  // setInvoiceList(invoiceListData);
  // const getInvoiceList = () => {};

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex flex-col gap-12px">
        <OwnedTeam
          team={team}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
          isBillingButtonHidden
        />

        <CreditCardInfo />
      </section>

      {/* // ToDo: (20250113 - Liz) FilterSection */}
      <section></section>

      <InvoiceList invoiceList={invoiceList} />

      {/* // Info: (20250115 - Liz) Modals */}
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

export default BillingPageBody;
