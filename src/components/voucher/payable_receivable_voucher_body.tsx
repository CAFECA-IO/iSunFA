import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import PayableReceivableVoucherList from '@/components/voucher/payable_receivable_voucher_list';
import Tabs from '@/components/tabs/tabs';
import Pagination from '@/components/pagination/pagination';
import FilterSection from '@/components/filter_section/filter_section';
import { SortOrder, SortBy } from '@/constants/sort';
import { IPaginatedData } from '@/interfaces/pagination';
import { IVoucherBeta, IVoucherListSummary } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { PayableReceivableTabs } from '@/constants/voucher';
import { TransactionStatus } from '@/constants/account';
import { ISortOption } from '@/interfaces/sort';
import Toggle from '@/components/toggle/toggle';
import { ToastType } from '@/interfaces/toastify';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { VscSettings } from 'react-icons/vsc';

const PayableReceivableVoucherPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();

  // Info: (20250529 - Julian) for mobile: Filter Side Menu
  const {
    targetRef: sideMenuRef,
    componentVisible: isShowSideMenu,
    setComponentVisible: setIsShowSideMenu,
  } = useOuterClick<HTMLDivElement>(false);

  const [activeTab, setActiveTab] = useState(PayableReceivableTabs.PAYMENT);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [incomplete, setIncomplete] = useState<{
    receivingVoucher: number;
    paymentVoucher: number;
  }>({ receivingVoucher: 0, paymentVoucher: 0 });
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  // Info: (20241122 - Julian) 應收/應付總金額
  const [payReceiveSort, setPayReceiveSort] = useState<null | SortOrder>(null);
  // Info: (20241122 - Julian) 已收/已付金額
  const [payReceiveAlreadyHappenedSort, setPayReceiveAlreadyHappenedSort] =
    useState<null | SortOrder>(null);
  // Info: (20241122 - Julian) 未收/未付金額
  const [remainSort, setRemainSort] = useState<null | SortOrder>(null);
  // const [otherSorts, setOtherSorts] = useState<{ sort: SortBy; sortOrder: SortOrder }[]>([]);
  const [voucherList, setVoucherList] = useState<IVoucherBeta[]>([]);
  const [selectedSort, setSelectedSort] = useState<ISortOption | undefined>();
  // Info: (20250109 - Julian) 是否顯示沖銷傳票
  const [isHideReversals, setIsHideReversals] = useState(true);

  useEffect(() => {
    let sort: ISortOption | undefined;
    // Info: (20241230 - Julian) 如果有其他排序，則清除日期排序
    const newDateSort =
      !payReceiveSort && !payReceiveAlreadyHappenedSort && !remainSort && dateSort
        ? dateSort
        : null;
    setDateSort(newDateSort);
    if (newDateSort) {
      sort = { sortBy: SortBy.DATE, sortOrder: newDateSort };
    } else {
      // Info: (20241230 - Julian) 如果有日期排序，則清除其他排序
      if (payReceiveSort) {
        sort = { sortBy: SortBy.PAY_RECEIVE_TOTAL, sortOrder: payReceiveSort };
      }
      if (payReceiveAlreadyHappenedSort) {
        sort = {
          sortBy: SortBy.PAY_RECEIVE_ALREADY_HAPPENED,
          sortOrder: payReceiveAlreadyHappenedSort,
        };
      }
      if (remainSort) {
        sort = { sortBy: SortBy.PAY_RECEIVE_REMAIN, sortOrder: remainSort };
      }
    }
    setSelectedSort(sort);
  }, [payReceiveSort, payReceiveAlreadyHappenedSort, remainSort, dateSort]);

  const voucherTabs = Object.values(PayableReceivableTabs).map((value) =>
    t(`journal:VOUCHER.${value.toUpperCase()}_TAB`)
  );

  const params = { accountBookId: connectedAccountBook?.id };

  const handleApiResponse = useCallback(
    (data: IPaginatedData<IVoucherBeta[]>) => {
      try {
        const note = JSON.parse(data.note ?? '{}') as IVoucherListSummary;
        setPage(data.page);
        setIncomplete(note.incomplete);
        setTotalPages(Math.max(1, Math.ceil(data.data.length / DEFAULT_PAGE_LIMIT))); // Info: (20250124 - Anna) 改為不是全部傳票的總頁數，而是應收/應付傳票的總頁數
        setTotalCount(data.data.length); // Info: (20250124 - Anna) 改為不是全部傳票的總筆數，而是應收/應付傳票的總筆數
        setVoucherList(data.data);
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

  const tabsClick = (tab: string) => setActiveTab(tab as PayableReceivableTabs);
  const hideReversalsToggleHandler = () => setIsHideReversals((prev) => !prev);
  const toggleSideMenu = () => setIsShowSideMenu((prev) => !prev);

  const transactionStatusList = ['All', ...Object.values(TransactionStatus)];

  return (
    <div ref={sideMenuRef} className="relative flex flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-lv-6 tablet:gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={Object.values(PayableReceivableTabs)}
          tabsString={voucherTabs}
          activeTab={activeTab}
          onTabClick={tabsClick}
          counts={[incomplete.receivingVoucher, incomplete.paymentVoucher]}
        />
        <div className="flex flex-col gap-18px">
          {/* Info: (20241122 - Julian) Filter Section */}
          <FilterSection<IVoucherBeta[]>
            params={params}
            apiName={APIName.VOUCHER_LIST_V2}
            onApiResponse={handleApiResponse}
            page={page}
            pageSize={DEFAULT_PAGE_LIMIT}
            tab={activeTab}
            types={transactionStatusList}
            sort={selectedSort}
            hideReversedRelated={isHideReversals}
            hideReversalsToggleHandler={hideReversalsToggleHandler}
            isShowSideMenu={isShowSideMenu}
            toggleSideMenu={toggleSideMenu}
            labelClassName="text-input-text-primary"
          />
          {/* Info: (20250521 - Julian) Filter button */}
          <button
            type="button"
            onClick={toggleSideMenu}
            className="block w-fit p-10px text-button-text-secondary tablet:hidden"
          >
            <VscSettings size={24} />
          </button>
        </div>
        {/* Info: (20250109 - Julian) hidden delete voucher & reversals toggle */}
        <div className="hidden tablet:block">
          <Toggle
            id="hide-reversals-toggle"
            initialToggleState={isHideReversals}
            getToggledState={hideReversalsToggleHandler}
            toggleStateFromParent={isHideReversals}
            lockedToOpen={false}
            label={t('journal:VOUCHER.HIDE_VOUCHER_TOGGLE')}
            labelClassName="text-switch-text-primary hover:cursor-pointer"
          />
        </div>
        {/* Info: (20240924 - Julian) List */}
        <PayableReceivableVoucherList
          voucherList={voucherList}
          activeTab={activeTab}
          dateSort={dateSort}
          payReceiveSort={payReceiveSort}
          payReceiveAlreadyHappenedSort={payReceiveAlreadyHappenedSort}
          remainSort={remainSort}
          setDateSort={setDateSort}
          setPayReceiveSort={setPayReceiveSort}
          setPayReceiveAlreadyHappenedSort={setPayReceiveAlreadyHappenedSort}
          setRemainSort={setRemainSort}
        />
        {/* Info: (20241122 - Julian) Pagination */}
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

export default PayableReceivableVoucherPageBody;
