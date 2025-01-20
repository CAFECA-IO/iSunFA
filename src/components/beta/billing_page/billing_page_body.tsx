import { useState, useEffect } from 'react';
import { IUserOwnedTeam, ITeamInvoice, TPlanType } from '@/interfaces/subscription';
import CreditCardInfo from '@/components/beta/billing_page/credit_card_info';
import InvoiceList from '@/components/beta/billing_page/invoice_list';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { useRouter } from 'next/router';
import SelectFilter from '@/components/filter_section/select_filter';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import SearchInput from '@/components/filter_section/search_input';
import { SortOrder } from '@/constants/sort';

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
}

const BillingPageBody = ({ team }: BillingPageBodyProps) => {
  const { t } = useTranslation([
    'subscriptions',
    'filter_section_type',
    'date_picker',
    'common',
    'search',
  ]);
  // Info: (20250116 - Anna) teamId
  const router = useRouter();
  const { teamId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';

  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invoiceList, setInvoiceList] = useState<ITeamInvoice[]>([]);

  // Info: (20250116 - Anna) 方案
  const ALL_PLANS = 'All';
  const [planType, setPlanType] = useState<string | undefined>(ALL_PLANS);

  // Info: (20250116 - Anna) 付款狀態
  const statuses = [
    { value: 'All', label: 'All Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
  ];

  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  // Info: (20241106 - Anna) 搜尋關鍵字
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Info: (20250120 - Anna) 排序
  const [invoiceIDSort, setInvoiceIDSort] = useState<null | SortOrder>(null);
  const [billingDateSort, setBillingDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);

  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  // Info: (20250120 - Anna) 排序、Reset all sorting states before applying a new one
  const resetSortOrders = () => {
    setInvoiceIDSort(null);
    setBillingDateSort(null);
    setAmountSort(null);
  };

  const updateBillingDateSort = (sortOrder: SortOrder | null) => {
    resetSortOrders();
    setBillingDateSort(sortOrder);
  };

  const updateInvoiceIDSort = (sortOrder: SortOrder | null) => {
    resetSortOrders();
    setInvoiceIDSort(sortOrder);
  };

  const updateAmountSort = (sortOrder: SortOrder | null) => {
    resetSortOrders();
    setAmountSort(sortOrder);
  };

  // Info: (20250120 - Anna) 排序
  const sortInvoices = (invoices: ITeamInvoice[]) => {
    const sortedInvoices = [...invoices];

    sortedInvoices.sort((a, b) => {
      if (billingDateSort) {
        const dateComparison =
          billingDateSort === SortOrder.ASC
            ? a.issuedTimestamp - b.issuedTimestamp
            : b.issuedTimestamp - a.issuedTimestamp;
        if (dateComparison !== 0) return dateComparison;
      }

      if (invoiceIDSort) {
        const idComparison = invoiceIDSort === SortOrder.ASC ? a.id - b.id : b.id - a.id;
        if (idComparison !== 0) return idComparison;
      }

      if (amountSort) {
        const amountComparison =
          amountSort === SortOrder.ASC ? a.amountDue - b.amountDue : b.amountDue - a.amountDue;
        if (amountComparison !== 0) return amountComparison;
      }

      return 0;
    });

    return sortedInvoices;
  };

  // Info: (20250116 - Anna) 初始化 APIHandler
  const { trigger: getInvoiceList } = APIHandler<IPaginatedData<ITeamInvoice[]>>(
    APIName.LIST_TEAM_INVOICE
  );

  // Info: (20250116 - Anna) fetchInvoiceData 函數
  const fetchInvoiceData = async () => {
    try {
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
      // eslint-disable-next-line no-console
      console.log('Sending query to API:', query);
      const response = await getInvoiceList({
        params: {
          teamId: teamIdString,
        },
        query,
      });

      if (response.success && response.data) {
        const newInvoices = response.data.data ?? [];
        setInvoiceList(newInvoices);
        // eslint-disable-next-line no-console
        console.log('成功取得發票列表:', newInvoices);
      } else {
        // eslint-disable-next-line no-console
        console.error('取得發票列表失敗:', response.error || `API 錯誤碼: ${response.code}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('發票 API 呼叫發生錯誤:', error);
    }
  };

  // Info: (20250116 - Anna) 使用 useEffect 呼叫 fetchInvoiceData
  useEffect(() => {
    if (teamIdString) {
      // eslint-disable-next-line no-console
      console.log('Plan type changed:', planType);
      fetchInvoiceData();
    }
  }, [teamIdString, planType, selectedStatus, selectedDateRange, searchQuery]);

  // Info: (20250120 - Anna) 使用 useEffect，在 invoiceList 或排序條件改變時觸發重新排序
  useEffect(() => {
    // Info: (20250120 - Anna) 確保 invoiceList 是排序後的資料
    const sortedInvoices = sortInvoices(invoiceList);
    setInvoiceList(sortedInvoices);
  }, [billingDateSort, invoiceIDSort, amountSort]);

  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  // ToDo: (20250115 - Liz) 串接 API 來開啟或關閉自動續約
  const turnOnAutoRenewal = () => {
    // ToDo: (20250115 - Liz) 打 API 開啟自動續約
    // ToDo: (20250115 - Liz) 打完開啟自動續約的 API 成功後，要關閉 Modal，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
  };
  const turnOffAutoRenewal = () => {
    // ToDo: (20250115 - Liz) 打 API 關閉自動續約
    // ToDo: (20250115 - Liz) 打完關閉自動續約的 API 成功後，要關閉 Modal，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
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

      {/* (20250117 - Anna) FilterSection */}
      <section className="flex gap-4">
        {/* Info: (20250116 - Anna) Plan（方案）篩選框 */}
        {Object.values(TPlanType).length > 0 && (
          <SelectFilter
            label="Plan"
            options={[
              ALL_PLANS, // Info: (20250116 - Anna) 包含 "All" 選項
              ...Object.values(TPlanType), // Info: (20250116 - Anna) 將 TPlanType 的值展開
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
            options={statuses.map((Status) => Status.value)} // Info: (20250116 - Anna) 只傳 value 陣列
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

      <InvoiceList
        invoiceList={invoiceList}
        billingDateSort={billingDateSort}
        setBillingDateSort={updateBillingDateSort}
        invoiceIDSort={invoiceIDSort}
        setInvoiceIDSort={updateInvoiceIDSort}
        amountSort={amountSort}
        setAmountSort={updateAmountSort}
      />

      {/* // ToDo: (20250113 - Liz) PaymentFailedToast */}
      <section></section>

      {/* // ToDo: (20250113 - Liz) PlanExpiredToast */}
      <section></section>

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
