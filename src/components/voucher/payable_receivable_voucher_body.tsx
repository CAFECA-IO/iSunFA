import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
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
// import Toggle from '@/components/toggle/toggle';

const PayableReceivableVoucherPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedAccountBook } = useUserCtx();

  const [activeTab, setActiveTab] = useState(PayableReceivableTabs.PAYMENT);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unRead, setUnRead] = useState<{
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
  const [selectedSort, setSelectedSort] = useState<
    | {
        by: SortBy;
        order: SortOrder;
      }
    | undefined
  >();
  // Info: (20250109 - Julian) 是否顯示沖銷傳票
  // ToDo: (20250109 - Julian) API query
  // const [isHideReversals, setIsHideReversals] = useState(true);

  useEffect(() => {
    let sort: { by: SortBy; order: SortOrder } | undefined;
    // Info: (20241230 - Julian) 如果有其他排序，則清除日期排序
    const newDateSort =
      !payReceiveSort && !payReceiveAlreadyHappenedSort && !remainSort && dateSort
        ? dateSort
        : null;
    setDateSort(newDateSort);
    if (newDateSort) {
      sort = { by: SortBy.DATE, order: newDateSort };
    } else {
      // Info: (20241230 - Julian) 如果有日期排序，則清除其他排序
      if (payReceiveSort) {
        sort = { by: SortBy.PAY_RECEIVE_TOTAL, order: payReceiveSort };
      }
      if (payReceiveAlreadyHappenedSort) {
        sort = { by: SortBy.PAY_RECEIVE_ALREADY_HAPPENED, order: payReceiveAlreadyHappenedSort };
      }
      if (remainSort) {
        sort = { by: SortBy.PAY_RECEIVE_REMAIN, order: remainSort };
      }
    }
    setSelectedSort(sort);
  }, [payReceiveSort, payReceiveAlreadyHappenedSort, remainSort, dateSort]);

  const voucherTabs = Object.values(PayableReceivableTabs).map((value) =>
    t(`journal:VOUCHER.${value.toUpperCase()}_TAB`)
  );

  const params = { companyId: selectedAccountBook?.id };

  const handleApiResponse = (data: IPaginatedData<IVoucherBeta[]>) => {
    const note = JSON.parse(data.note ?? '{}') as IVoucherListSummary;
    setPage(data.page);
    setUnRead(note.unRead);
    setTotalPages(Math.max(1, Math.ceil(data.data.length / DEFAULT_PAGE_LIMIT))); // Info: (20250124 - Anna) 改為不是全部傳票的總頁數，而是應收/應付傳票的總頁數
    setTotalCount(data.data.length); // Info: (20250124 - Anna) 改為不是全部傳票的總筆數，而是應收/應付傳票的總筆數
    setVoucherList(data.data);
  };

  const tabsClick = (tab: string) => setActiveTab(tab as PayableReceivableTabs);
  // const hideReversalsToggleHandler = () => setIsHideReversals((prev) => !prev);

  const displayVoucherList =
    voucherList && voucherList.length > 0 ? (
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
    ) : (
      <div className="flex items-center justify-center rounded-lg bg-surface-neutral-surface-lv2 p-20px text-text-neutral-tertiary">
        <p>{t('journal:VOUCHER.NO_VOUCHER')}</p>
      </div>
    );

  return (
    <div className="relative flex flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={Object.values(PayableReceivableTabs)}
          tabsString={voucherTabs}
          activeTab={activeTab}
          onTabClick={tabsClick}
          counts={[unRead.receivingVoucher, unRead.paymentVoucher]}
        />
        {/* Info: (20241122 - Julian) Filter Section */}
        <FilterSection<IVoucherBeta[]>
          params={params}
          apiName={APIName.VOUCHER_LIST_V2}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          tab={activeTab}
          /* Deprecated: (20250107 - tzuhan) 一次只能有一個排序條件
          dateSort={dateSort}
          otherSorts={otherSorts}
          */
          sort={selectedSort}
        />
        {/* Info: (20250109 - Julian) hidden delete voucher & reversals toggle */}
        {/* <div className="flex items-center gap-16px">
          <Toggle
            id="hide-reversals-toggle"
            initialToggleState={isHideReversals}
            getToggledState={hideReversalsToggleHandler}
            toggleStateFromParent={isHideReversals}
            lockedToOpen={false}
          />
          <div
            onClick={hideReversalsToggleHandler}
            className="text-switch-text-primary hover:cursor-pointer"
          >
            {t('journal:VOUCHER.HIDE_VOUCHER_TOGGLE')}
          </div>
        </div> */}
        {/* Info: (20240924 - Julian) List */}
        {displayVoucherList}
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
