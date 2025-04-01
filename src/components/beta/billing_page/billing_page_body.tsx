import { useState, useEffect, useCallback } from 'react';
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
import SelectFilter from '@/components/filter_section/select_filter';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import SearchInput from '@/components/filter_section/search_input';
import { SortOrder } from '@/constants/sort';

interface BillingPageBodyProps {
  team: IUserOwnedTeam;
  getOwnedTeam: () => Promise<void>;
}

const BillingPageBody = ({ team, getOwnedTeam }: BillingPageBodyProps) => {
  const { t } = useTranslation([
    'subscriptions',
    'filter_section_type',
    'date_picker',
    'common',
    'search',
  ]);

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

  // Info: (20250116 - Liz) 開啟或關閉自動續約的 Modal 狀態
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

  // Info: (20250116 - Anna) 初始化 APIHandler
  const { trigger: getInvoiceList } = APIHandler<IPaginatedData<ITeamInvoice[]>>(
    APIName.LIST_TEAM_INVOICE
  );

  // Info: (20250120 - Anna) 排序函數
  const sortInvoices = useCallback(
    (invoices: ITeamInvoice[]) => {
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
    },
    [amountSort, billingDateSort, invoiceIDSort]
  );

  // Info: (20250122 - Liz) 打 API 取得發票清單
  useEffect(() => {
    if (!team) return;

    const fetchInvoiceData = async () => {
      try {
        // Info: (20250121 - Liz) 組裝查詢參數
        const query = {
          page: 1,
          pageSize: 10,
          plan: planType === ALL_PLANS ? undefined : planType, // Info: (20250116 - Anna) 將 'All' 轉換為 undefined
          status:
            selectedStatus === 'paid' ? true : selectedStatus === 'failed' ? false : undefined,
          startDate: selectedDateRange.startTimeStamp || undefined, // Info: (20250116 - Anna) 如果 startTimeStamp 為 0，則設為 undefined
          endDate: selectedDateRange.endTimeStamp || undefined, // Info: (20250116 - Anna) 如果 endTimeStamp 為 0，則設為 undefined
          searchQuery: searchQuery || undefined, // Info: (20250116 - Anna) 如果 searchQuery 是空字串，則設為 undefined
        };

        // Info: (20250121 - Liz) 打 API 取得發票清單(根據查詢參數)
        const response = await getInvoiceList({
          params: {
            teamId: team.id,
          },
          query,
        });

        if (response.success && response.data) {
          const newInvoices = response.data.data ?? [];
          // Info: (20250121 - Liz) 排序資料 (初次資料獲取後立即排序)
          const sortedInvoices = sortInvoices(newInvoices);
          setInvoiceList(sortedInvoices);
        } else {
          // Deprecated: (20250120 - Anna)
          // eslint-disable-next-line no-console
          console.error('取得發票清單失敗:', response.error || `API 錯誤碼: ${response.code}`);
        }
      } catch (error) {
        // Deprecated: (20250120 - Anna)
        // eslint-disable-next-line no-console
        console.error('發票 API 呼叫發生錯誤:', error);
      }
    };

    fetchInvoiceData();
  }, [
    planType,
    searchQuery,
    selectedDateRange.endTimeStamp,
    selectedDateRange.startTimeStamp,
    selectedStatus,
    sortInvoices,
    team,
  ]);

  // Info: (20250121 - Liz) 排序資料 (當排序狀態改變時)
  useEffect(() => {
    setInvoiceList((prevInvoices) => sortInvoices(prevInvoices));
  }, [sortInvoices]);

  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  // Info: (20250120 - Liz) 開啟自動續約、關閉自動續約 API
  const { trigger: updateSubscriptionAPI } = APIHandler<IUserOwnedTeam>(
    APIName.UPDATE_SUBSCRIPTION
  );

  // Info: (20250120 - Liz) 打 API 開啟自動續約
  const turnOnAutoRenewal = async () => {
    if (!teamForAutoRenewalOn) return;
    const planId = teamForAutoRenewalOn.plan;
    const teamId = teamForAutoRenewalOn.id;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: true },
    });
    // Info: (20250120 - Liz) 打完開啟自動續約的 API 成功後，關閉 Modal，並且重新打 API 取得最新的 userOwnedTeam
    if (success) {
      closeAutoRenewalModal();
      getOwnedTeam();
    }
  };

  // Info: (20250120 - Liz) 打 API 關閉自動續約
  const turnOffAutoRenewal = async () => {
    if (!teamForAutoRenewalOff) return;
    const planId = teamForAutoRenewalOff.plan;
    const teamId = teamForAutoRenewalOff.id;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: false },
    });
    // Info: (20250120 - Liz) 打完關閉自動續約的 API 成功後，關閉 Modal，並且重新打 API 取得最新的 userOwnedTeam
    if (success) {
      closeAutoRenewalModal();
      getOwnedTeam();
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

        <CreditCardInfo team={team} />
      </section>

      {/* // Info: (20250117 - Anna) FilterSection */}
      <section className="flex items-end gap-4">
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
            width="w-150px"
          />
        )}
        {/* Info: (20250116 - Anna) 狀態篩選 */}
        {statuses.length > 0 && (
          <SelectFilter
            label="Status"
            options={statuses.map((Status) => Status.value)} // Info: (20250116 - Anna) 只傳 value 陣列
            selectedValue={selectedStatus}
            onChange={setSelectedStatus}
            width="w-180px"
          />
        )}
        {/* Info: (20250116 - Anna) 時間區間篩選 */}
        <div className="flex min-w-240px flex-1 flex-col">
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
        <div className="flex flex-auto place-items-end">
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
