import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { EventType } from '@/constants/account';
import Tabs from '@/components/tabs/tabs';
import { APIName } from '@/constants/api_connection';
import { IVoucherBeta, IVoucherListSummary, IVoucherUI } from '@/interfaces/voucher';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useModalContext } from '@/contexts/modal_context';
import { DEFAULT_PAGE_LIMIT, FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortBy, SortOrder } from '@/constants/sort';
import { ISUNFA_ROUTE } from '@/constants/url';
import { VoucherTabs } from '@/constants/voucher';
import { ToastType } from '@/interfaces/toastify';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISortOption } from '@/interfaces/sort';

const VoucherListPageBody: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();
  const { flagOfRefreshVoucherList } = useAccountingCtx();

  // Info: (20250522 - Julian) for mobile: Filter Side Menu
  const {
    targetRef: sideMenuRef,
    componentVisible: isShowSideMenu,
    setComponentVisible: setIsShowSideMenu,
  } = useOuterClick<HTMLDivElement>(false);

  const [activeTab, setActiveTab] = useState<VoucherTabs>(VoucherTabs.UPLOADED);
  // Info: (20250324 - Anna) 預設是從 URL 中取得的 page，若無則為 1
  const queryPage = typeof router.query.page === 'string' ? Number(router.query.page) : 1;
  const [page, setPage] = useState(queryPage);

  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [incomplete, setIncomplete] = useState<{
    uploadedVoucher: number;
    upcomingEvents: number;
  }>({
    uploadedVoucher: 0,
    upcomingEvents: 0,
  });
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);
  // Info: (20250107 - Julian) 是否顯示沖銷傳票
  // ToDo: (20250107 - Julian) API query
  const [isHideReversals, setIsHideReversals] = useState(true);
  const [selectedSort, setSelectedSort] = useState<ISortOption | undefined>();
  const [voucherList, setVoucherList] = useState<IVoucherUI[]>([]);

  // Info: (20250324 - Anna) 流程2:為了將篩選條件傳遞給 VoucherItem，非用於給 FilterSection 打 API
  const [selectedStartDate, setSelectedStartDate] = useState<number>();
  const [selectedEndDate, setSelectedEndDate] = useState<number>();
  const [selectedType, setSelectedType] = useState<string>();
  const [keyword, setKeyword] = useState<string>();

  // Info: (20250324 - Anna) 流程4:從 router.query 中擷取篩選條件
  const queryStartDate =
    typeof router.query.startDate === 'string' ? Number(router.query.startDate) : undefined;
  const queryEndDate =
    typeof router.query.endDate === 'string' ? Number(router.query.endDate) : undefined;
  const queryType = typeof router.query.type === 'string' ? router.query.type : undefined;
  const queryKeyword = typeof router.query.keyword === 'string' ? router.query.keyword : undefined;

  // Info: (20250324 - Anna) 流程5:初始時嘗試從 URL 中獲取篩選條件
  useEffect(() => {
    if (!router.isReady) return;
    const {
      startDate = '',
      endDate = '',
      type = '',
      keyword: urlKeyword = '',
      page: urlPage = 1,
    } = router.query;

    if (startDate && endDate) {
      setSelectedStartDate(Number(startDate));
      setSelectedEndDate(Number(endDate));
    }

    if (type) {
      setSelectedType(String(type));
    }

    if (urlKeyword) {
      setKeyword(String(urlKeyword));
    }

    if (urlPage) {
      setPage(Number(urlPage));
    }
  }, [router.isReady]);

  useEffect(() => {
    let sort: ISortOption | undefined;
    // Info: (20241230 - Julian) 如果有借貸排序，則清除日期排序
    const newDateSort = !creditSort && !debitSort && dateSort ? dateSort : null;
    setDateSort(newDateSort);
    if (newDateSort) {
      sort = { sortBy: SortBy.DATE, sortOrder: newDateSort };
    } else {
      // Info: (20241230 - Julian) 如果有日期排序，則清除借貸排序
      if (creditSort) {
        sort = { sortBy: SortBy.CREDIT, sortOrder: creditSort };
      }
      if (debitSort) {
        sort = { sortBy: SortBy.DEBIT, sortOrder: debitSort };
      }
    }
    setSelectedSort(sort);
  }, [creditSort, debitSort, dateSort]);

  const voucherTabs = Object.values(VoucherTabs).map((value) =>
    t(`journal:VOUCHER.${value.toUpperCase()}_TAB`)
  );

  const voucherTypeList = [
    'All',
    ...Object.keys(EventType)
      .map((key) => key.toLowerCase())
      .filter((key) => key !== EventType.OPENING), // Info: (20250124 - Julian) 不顯示開帳
  ];

  const params = { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID };

  const handleApiResponse = useCallback(
    (data: IPaginatedData<IVoucherBeta[]>) => {
      try {
        const note = JSON.parse(data.note ?? '{}') as IVoucherListSummary;
        setPage(data.page);
        setIncomplete(note.incomplete);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);

        const voucherListUI: IVoucherUI[] = data.data.map((voucher) => {
          return { ...voucher, isSelected: false };
        });

        setVoucherList(voucherListUI);
      } catch (error) {
        toastHandler({
          id: 'voucher-list-error',
          type: ToastType.ERROR,
          content: 'Get voucher list failed',
          closeable: true,
        });
      }
    },
    [activeTab]
  );

  const tabClick = (tab: string) => setActiveTab(tab as VoucherTabs);
  const hideReversalsToggleHandler = () => setIsHideReversals((prev) => !prev);
  const toggleSideMenu = () => setIsShowSideMenu((prev) => !prev);

  return (
    <div ref={sideMenuRef} className="relative flex flex-col items-center gap-lv-6 tablet:gap-40px">
      {/* Info: (20250521 - Julian) Page Title for mobile */}
      <div className="block w-full text-left text-base font-semibold text-text-neutral-secondary tablet:hidden">
        {t('journal:VOUCHER.VOUCHER_LIST_PAGE_TITLE')}
      </div>
      {/* Info: (20240920 - Julian) Add New Voucher button */}
      <div className="w-full tablet:ml-auto tablet:w-fit">
        <Link href={ISUNFA_ROUTE.ADD_NEW_VOUCHER}>
          <Button type="button" className="w-full">
            <LuPlus />
            <p>{t('journal:VOUCHER.ADD_NEW_VOUCHER')}</p>
          </Button>
        </Link>
      </div>
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-18px tablet:gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={Object.values(VoucherTabs)}
          tabsString={voucherTabs}
          activeTab={activeTab}
          onTabClick={tabClick}
          counts={[incomplete.uploadedVoucher, incomplete.upcomingEvents]}
        />
        {/* Info: (20241022 - Julian) Filter Section */}
        <FilterSection<IVoucherBeta[]>
          params={params}
          apiName={APIName.VOUCHER_LIST_V2}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          tab={activeTab} // Info: (20241104 - Murky) @Julian, 後端用 VoucherListTabV2 這個 enum 來過濾, 在 src/constants/voucher.ts
          types={voucherTypeList} // Info: (20241104 - Murky) @Julian, 後端用 EventType 這個 enum 來過濾, 在 src/constants/account.ts
          sort={selectedSort}
          hideReversedRelated={isHideReversals} // Info: (20250210 - Julian) 隱藏沖銷分錄
          hideReversalsToggleHandler={hideReversalsToggleHandler}
          flagOfRefresh={flagOfRefreshVoucherList}
          // Info: (20250324 - Anna) 流程1:篩選條件（類型、日期、關鍵字）改變時，可透過此 prop 回傳給 voucher_list_page_body
          onFilterChange={({ startDate, endDate, type, keyword: passKeyword }) => {
            setSelectedStartDate(startDate);
            setSelectedEndDate(endDate);
            setSelectedType(type);
            setKeyword(passKeyword);
          }}
          // Info: (20250324 - Anna) 流程6:傳初始值
          initialStartDate={queryStartDate}
          initialEndDate={queryEndDate}
          initialType={queryType}
          initialKeyword={queryKeyword}
          initialPage={queryPage}
          isShowSideMenu={isShowSideMenu}
          toggleSideMenu={toggleSideMenu}
          labelClassName="text-input-text-primary"
        />
        {/* Info: (20240920 - Julian) Voucher List */}
        <VoucherList
          voucherList={voucherList}
          dateSort={dateSort}
          creditSort={creditSort}
          debitSort={debitSort}
          setDateSort={setDateSort}
          setCreditSort={setCreditSort}
          setDebitSort={setDebitSort}
          isHideReversals={isHideReversals}
          hideReversalsToggleHandler={hideReversalsToggleHandler}
          // Info: (20250324 - Anna) 流程3:傳遞篩選條件
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
          selectedType={selectedType}
          keyword={keyword}
          currentPage={page}
          toggleSideMenu={toggleSideMenu} // Info: (20250522 - Julian) 手機版 filter 的開關
        />
        {/* Info: (20240920 - Julian) Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          setCurrentPage={setPage}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
};

export default VoucherListPageBody;
