import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IUserOwnedTeam, ITeamInvoice, TPlanType } from '@/interfaces/subscription';
import CreditCardInfo from '@/components/beta/billing_page/credit_card_info';
import InvoiceList from '@/components/beta/billing_page/invoice_list';
import OwnedTeam from '@/components/beta/subscriptions_page/owned_team';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import Pagination from '@/components/pagination/pagination';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import SelectFilter from '@/components/filter_section/select_filter';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import SearchInput from '@/components/filter_section/search_input';
import { SortOrder } from '@/constants/sort';
import { VscSettings } from 'react-icons/vsc';
import { RxCross2 } from 'react-icons/rx';
import loggerFront from '@/lib/utils/logger_front';

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

  const {
    targetRef,
    componentVisible: isShowSideMenu,
    setComponentVisible: setIsShowSideMenu,
  } = useOuterClick<HTMLDivElement>(false);

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

  // Info: (20250612 - Julian) 方案類型選項：排除 trial & beginner
  const planTypeOptions = Object.values(TPlanType).filter(
    (plan) => plan !== TPlanType.TRIAL && plan !== TPlanType.BEGINNER
  );

  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  // Info: (20250612 - Julian) 頁數
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  // Info: (20241106 - Anna) 搜尋關鍵字
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Info: (20250120 - Anna) 排序
  const [invoiceIDSort, setInvoiceIDSort] = useState<null | SortOrder>(null);
  const [billingDateSort, setBillingDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);
  // const [selectedSort, setSelectedSort] = useState<ISortOption | undefined>();

  // Info: (20250116 - Liz) 開啟或關閉自動續約的 Modal 狀態
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  const toggleSideMenu = () => setIsShowSideMenu((prev) => !prev);

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
        // Info: (20250121 - Liz) 打 API 取得發票清單(根據查詢參數)
        const response = await getInvoiceList({
          params: {
            teamId: team.id,
          },
          query: {
            // Info: (20250121 - Liz) 組裝查詢參數
            page: currentPage,
            pageSize: 10,
            plan: planType === ALL_PLANS ? undefined : planType, // Info: (20250116 - Anna) 將 'All' 轉換為 undefined
            status:
              selectedStatus === 'paid' ? true : selectedStatus === 'failed' ? false : undefined,
            startDate: selectedDateRange.startTimeStamp || undefined, // Info: (20250116 - Anna) 如果 startTimeStamp 為 0，則設為 undefined
            endDate: selectedDateRange.endTimeStamp || undefined, // Info: (20250116 - Anna) 如果 endTimeStamp 為 0，則設為 undefined
            searchQuery: searchQuery || undefined, // Info: (20250116 - Anna) 如果 searchQuery 是空字串，則設為 undefined
          },
        });

        if (response.success && response.data) {
          const newInvoices = response.data.data ?? [];

          // Info: (20250612 - Julian) 取得總頁數
          setTotalPage(response.data.totalPages || 1);

          // Info: (20250121 - Liz) 排序資料 (初次資料獲取後立即排序)
          const sortedInvoices = sortInvoices(newInvoices);
          setInvoiceList(sortedInvoices);
        }
      } catch (error) {
        loggerFront.error('發票 API 呼叫發生錯誤:', error);
      }
    };

    fetchInvoiceData();
  }, [
    currentPage,
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

  const planFilter = planTypeOptions.length > 0 && (
    <SelectFilter
      label="Plan"
      options={[
        ALL_PLANS, // Info: (20250116 - Anna) 包含 "All" 選項
        ...planTypeOptions, // Info: (20250116 - Anna) 將 TPlanType 的值展開
      ]}
      selectedValue={planType}
      onChange={setPlanType}
      width="tablet:w-150px"
    />
  );

  const statusFilter = statuses.length > 0 && (
    <SelectFilter
      label="Status"
      options={statuses.map((Status) => Status.value)} // Info: (20250116 - Anna) 只傳 value 陣列
      selectedValue={selectedStatus}
      onChange={setSelectedStatus}
      width="tablet:w-180px"
    />
  );

  const periodFilter = (
    <div className="flex min-w-240px flex-1 flex-col">
      <DatePicker
        period={selectedDateRange}
        setFilteredPeriod={setSelectedDateRange}
        type={DatePickerType.TEXT_PERIOD}
        btnClassName="h-44px"
        label="Period"
      />
    </div>
  );

  const searchInput = (
    <div className="flex flex-auto place-items-end">
      <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />
    </div>
  );

  return (
    <main ref={targetRef} className="flex min-h-full flex-col gap-40px">
      <section className="flex flex-col gap-12px">
        <OwnedTeam
          team={team}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
        />

        <CreditCardInfo team={team} />
      </section>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/dollar.svg" width={16} height={16} alt="company_icon" />
          <p>{t('subscriptions:SUBSCRIPTIONS_PAGE.MY_SUBSCRIPTIONS')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>

      <div className="ml-auto">
        <button
          type="button"
          onClick={toggleSideMenu}
          className="block w-fit p-10px text-button-text-secondary tablet:hidden"
        >
          <VscSettings size={24} />
        </button>
      </div>

      {/* // Info: (20250117 - Anna) FilterSection */}
      <section className="hidden items-end gap-4 tablet:flex">
        {/* Info: (20250116 - Anna) Plan（方案）篩選框 */}
        {planFilter}
        {/* Info: (20250116 - Anna) 狀態篩選 */}
        {statusFilter}
        {/* Info: (20250116 - Anna) 時間區間篩選 */}
        {periodFilter}
        {/* Info: (20250612 - Julian) 搜尋輸入框 */}
        {searchInput}
      </section>

      <div className="overflow-x-auto tablet:w-full tablet:overflow-x-hidden">
        <InvoiceList
          invoiceList={invoiceList}
          billingDateSort={billingDateSort}
          setBillingDateSort={updateBillingDateSort}
          invoiceIDSort={invoiceIDSort}
          setInvoiceIDSort={updateInvoiceIDSort}
          amountSort={amountSort}
          setAmountSort={updateAmountSort}
        />
      </div>

      {/* Info: (20240925 - Julian) Pagination */}
      <div className="mx-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

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

      {/* Info: (20250612 - Julian) 側邊選單 */}
      <div
        className={`fixed inset-0 z-120 flex items-center justify-center bg-black/50 transition-all duration-300 ease-in-out tablet:hidden ${isShowSideMenu ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        {/* Info: (20250612 - Julian) 選單 */}
        <div
          className={`fixed right-0 top-0 z-130 flex h-screen w-90vw flex-col gap-lv-5 bg-white px-16px py-24px transition-all duration-300 ease-in-out ${isShowSideMenu ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Info: (20250612 - Julian) Header */}
          <div className="relative flex w-full flex-col items-center">
            <button type="button" className="absolute left-0 p-10px" onClick={toggleSideMenu}>
              <RxCross2 size={16} />
            </button>
            <p className="text-center text-base font-semibold text-text-neutral-secondary">
              {t('common:COMMON.FILTER')}
            </p>
          </div>
          {/* Info: (20250612 - Julian) 分隔線 */}
          <hr className="border-divider-stroke-lv-4" />
          {/* Info: (20250612 - Julian) 選單內容 */}
          <div className="flex flex-col items-stretch gap-lv-4">
            {/* Info: (20250612 - Julian) Plan（方案）篩選框 */}
            {planFilter}
            {/* Info: (20250612 - Julian) 狀態篩選 */}
            {statusFilter}
            {/* Info: (20250612 - Julian) 時間區間篩選 */}
            {periodFilter}
            {/* Info: (20250612 - Julian) 搜尋輸入框 */}
            {searchInput}
          </div>
        </div>
      </div>
    </main>
  );
};

export default BillingPageBody;
