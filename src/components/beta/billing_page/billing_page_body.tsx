import { useState, useEffect } from 'react';
import { IUserOwnedTeam, ITeamInvoice, TPlanType } from '@/interfaces/subscription';
import CreditCardInfo from '@/components/beta/billing_page/credit_card_info';
import InvoiceList from '@/components/beta/billing_page/invoice_list';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler'; // Info: (20250116 - Anna)
import { APIName } from '@/constants/api_connection'; // Info: (20250116 - Anna)
import { IPaginatedData } from '@/interfaces/pagination'; // Info: (20250116 - Anna)
import SelectFilter from '@/components/filter_section/select_filter'; // Info: (20250116 - Anna)
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker'; // Info: (20250116 - Anna)
import { IDatePeriod } from '@/interfaces/date_period'; // Info: (20250116 - Anna)
import SearchInput from '@/components/filter_section/search_input'; // Info: (20250116 - Anna)

// Todo: (20250116 - Anna) dummy data 後續不需要再刪除
// const FAKE_INVOICE_LIST: ITeamInvoice[] = [
//   {
//     id: 100000,
//     teamId: 3,
//     status: false,
//     issuedTimestamp: 1630406400000,
//     dueTimestamp: 1630406400000,
//     planId: TPlanType.PROFESSIONAL,
//     planStartTimestamp: 1630406400000,
//     planEndTimestamp: 1630406400000,
//     planQuantity: 1,
//     planUnitPrice: 1000,
//     planAmount: 1000,
//     payer: {
//       name: 'John Doe',
//       address: '1234 Main St',
//       phone: '123-456-7890',
//       taxId: '123456789',
//     },
//     payee: {
//       name: 'Jane Doe',
//       address: '5678 Elm St',
//       phone: '098-765-4321',
//       taxId: '987654321',
//     },
//     subtotal: 899,
//     tax: 0,
//     total: 899,
//     amountDue: 899,
//   },
//   {
//     id: 100001,
//     teamId: 3,
//     status: true,
//     issuedTimestamp: 1630406400000,
//     dueTimestamp: 1630406400000,
//     planId: TPlanType.PROFESSIONAL,
//     planStartTimestamp: 1630406400000,
//     planEndTimestamp: 1630406400000,
//     planQuantity: 1,
//     planUnitPrice: 1000,
//     planAmount: 1000,
//     payer: {
//       name: 'John Doe',
//       address: '1234 Main St',
//       phone: '123-456-7890',
//       taxId: '123456789',
//     },
//     payee: {
//       name: 'Jane Doe',
//       address: '5678 Elm St',
//       phone: '098-765-4321',
//       taxId: '987654321',
//     },
//     subtotal: 899,
//     tax: 0,
//     total: 899,
//     amountDue: 899,
//   },
//   {
//     id: 100002,
//     teamId: 3,
//     status: true,
//     issuedTimestamp: 1630406400000,
//     dueTimestamp: 1630406400000,
//     planId: TPlanType.PROFESSIONAL,
//     planStartTimestamp: 1630406400000,
//     planEndTimestamp: 1630406400000,
//     planQuantity: 1,
//     planUnitPrice: 1000,
//     planAmount: 1000,
//     payer: {
//       name: 'John Doe',
//       address: '1234 Main St',
//       phone: '123-456-7890',
//       taxId: '123456789',
//     },
//     payee: {
//       name: 'Jane Doe',
//       address: '5678 Elm St',
//       phone: '098-765-4321',
//       taxId: '987654321',
//     },
//     subtotal: 899,
//     tax: 0,
//     total: 899,
//     amountDue: 899,
//   },
//   {
//     id: 100003,
//     teamId: 3,
//     status: true,
//     issuedTimestamp: 1630406400000,
//     dueTimestamp: 1630406400000,
//     planId: TPlanType.PROFESSIONAL,
//     planStartTimestamp: 1630406400000,
//     planEndTimestamp: 1630406400000,
//     planQuantity: 1,
//     planUnitPrice: 1000,
//     planAmount: 1000,
//     payer: {
//       name: 'John Doe',
//       address: '1234 Main St',
//       phone: '123-456-7890',
//       taxId: '123456789',
//     },
//     payee: {
//       name: 'Jane Doe',
//       address: '5678 Elm St',
//       phone: '098-765-4321',
//       taxId: '987654321',
//     },
//     subtotal: 899,
//     tax: 0,
//     total: 899,
//     amountDue: 899,
//   },
//   {
//     id: 100004,
//     teamId: 3,
//     status: true,
//     issuedTimestamp: 1630406400000,
//     dueTimestamp: 1630406400000,
//     planId: TPlanType.PROFESSIONAL,
//     planStartTimestamp: 1630406400000,
//     planEndTimestamp: 1630406400000,
//     planQuantity: 1,
//     planUnitPrice: 1000,
//     planAmount: 1000,
//     payer: {
//       name: 'John Doe',
//       address: '1234 Main St',
//       phone: '123-456-7890',
//       taxId: '123456789',
//     },
//     payee: {
//       name: 'Jane Doe',
//       address: '5678 Elm St',
//       phone: '098-765-4321',
//       taxId: '987654321',
//     },
//     subtotal: 899,
//     tax: 0,
//     total: 899,
//     amountDue: 899,
//   },
//   {
//     id: 100005,
//     teamId: 3,
//     status: true,
//     issuedTimestamp: 1630406400000,
//     dueTimestamp: 1630406400000,
//     planId: TPlanType.PROFESSIONAL,
//     planStartTimestamp: 1630406400000,
//     planEndTimestamp: 1630406400000,
//     planQuantity: 1,
//     planUnitPrice: 1000,
//     planAmount: 1000,
//     payer: {
//       name: 'John Doe',
//       address: '1234 Main St',
//       phone: '123-456-7890',
//       taxId: '123456789',
//     },
//     payee: {
//       name: 'Jane Doe',
//       address: '5678 Elm St',
//       phone: '098-765-4321',
//       taxId: '987654321',
//     },
//     subtotal: 899,
//     tax: 0,
//     total: 899,
//     amountDue: 899,
//   },
// ];

interface BillingPageBodyProps {
  team: IUserOwnedTeam;
  getTeamData: () => Promise<void>;
}

const BillingPageBody = ({ team, getTeamData }: BillingPageBodyProps) => {
  const { t } = useTranslation([
    'subscriptions',
    'filter_section_type',
    'date_picker',
    'common',
    'search',
  ]);

  const [invoiceList, setInvoiceList] = useState<ITeamInvoice[]>([]); // Info: (20250116 - Anna) state 來儲存發票列表
  const ALL_PLANS = 'All';
  const [planType, setPlanType] = useState<string | undefined>(ALL_PLANS);
  const statuses = [
    { value: 'All', label: 'All Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
  ];

  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_PLANS);
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });
  const [searchQuery, setSearchQuery] = useState<string>(''); // Info: (20241106 - Anna) 定義搜尋關鍵字狀態

  // Info: (20250116 - Liz) 開啟或關閉自動續約的 Modal 狀態
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  // Info: (20250116 - Anna) 初始化 APIHandler
  const { trigger: getInvoiceList } = APIHandler<IPaginatedData<ITeamInvoice[]>>(
    APIName.LIST_TEAM_INVOICE
  );

  // Info: (20250116 - Anna) fetchInvoiceData 函數
  const fetchInvoiceData = async () => {
    try {
      // Deprecated: (20250120 - Anna)
      // eslint-disable-next-line no-console
      console.log('Fetching invoices with planType:', planType);

      const query = {
        page: 1,
        pageSize: 10,
        plan: planType === ALL_PLANS ? undefined : planType, // Info: (20250116 - Anna) 將 'All' 轉換為 undefined
        status: selectedStatus === 'paid' ? true : selectedStatus === 'failed' ? false : undefined,
        startDate: selectedDateRange.startTimeStamp || undefined, // Info: (20250116 - Anna) 如果 startTimeStamp 為 0，則設為 undefined
        endDate: selectedDateRange.endTimeStamp || undefined, // Info: (20250116 - Anna) 如果 endTimeStamp 為 0，則設為 undefined
        searchQuery: searchQuery || undefined, // Info: (20250116 - Anna) 如果 searchQuery 是空字串，則設為 undefined
      };

      // Deprecated: (20250120 - Anna)
      // eslint-disable-next-line no-console
      console.log('Sending query to API:', query);

      const response = await getInvoiceList({
        params: {
          teamId: team.id,
        },
        query,
      });

      if (response.success && response.data) {
        const newInvoices = response.data.data ?? [];
        setInvoiceList(newInvoices);
        // Deprecated: (20250120 - Anna)
        // eslint-disable-next-line no-console
        console.log('成功取得發票列表:', newInvoices);
      } else {
        // Deprecated: (20250120 - Anna)
        // eslint-disable-next-line no-console
        console.error('取得發票列表失敗:', response.error || `API 錯誤碼: ${response.code}`);
      }
    } catch (error) {
      // Deprecated: (20250120 - Anna)
      // eslint-disable-next-line no-console
      console.error('發票 API 呼叫發生錯誤:', error);
    }
  };

  // Info: (20250116 - Anna) 使用 useEffect 呼叫 fetchInvoiceData
  useEffect(() => {
    if (!team) return;
    fetchInvoiceData();
  }, []);

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

      {/* // Info: (20250117 - Anna) FilterSection */}
      <section className="flex gap-4">
        {/* Info: (20250116 - Anna) Plan 篩選框 */}
        {Object.values(TPlanType).length > 0 && (
          <SelectFilter
            label="Plan"
            options={[
              ALL_PLANS, // 包含 "All" 選項
              ...Object.values(TPlanType), // 將 TPlanType 的值展開
            ]}
            selectedValue={planType}
            onChange={setPlanType}
            containerClassName="flex-1"
          />
        )}
        {/* Info: (20250116 - Anna) 狀態篩選 */}
        {statuses.length > 0 && (
          <SelectFilter
            label="Status"
            options={statuses.map((Status) => Status.value)} // 只傳 value 陣列
            selectedValue={selectedStatus}
            onChange={setSelectedStatus}
            containerClassName="flex-1"
          />
        )}
        {/* Info: (20250116 - Anna) 時間區間篩選 */}
        <div className="flex min-w-250px flex-1 flex-col">
          <label htmlFor="date-picker" className="mb-2 text-sm font-medium text-neutral-300">
            {t('common:COMMON.PERIOD')}
          </label>
          <DatePicker
            period={selectedDateRange}
            setFilteredPeriod={setSelectedDateRange}
            type={DatePickerType.TEXT_PERIOD}
            btnClassName="h-44px"
          />
        </div>
        <div className="flex place-items-end">
          <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>
      </section>

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
