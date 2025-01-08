import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { EventType } from '@/constants/account';
import Tabs from '@/components/tabs/tabs';
import { APIName } from '@/constants/api_connection';
import { IVoucherBeta, IVoucherUI } from '@/interfaces/voucher';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { DEFAULT_PAGE_LIMIT, FREE_COMPANY_ID } from '@/constants/config';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortBy, SortOrder } from '@/constants/sort';
import { ISUNFA_ROUTE } from '@/constants/url';
import { VoucherTabs } from '@/constants/voucher';
import { ToastType } from '@/interfaces/toastify';

const VoucherListPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [activeTab, setActiveTab] = useState<VoucherTabs>(VoucherTabs.UPLOADED);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unRead, setUnRead] = useState<{
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
  const [selectedSort, setSelectedSort] = useState<
    | {
        by: SortBy;
        order: SortOrder;
      }
    | undefined
  >();
  const [voucherList, setVoucherList] = useState<IVoucherUI[]>([]);

  useEffect(() => {
    let sort: { by: SortBy; order: SortOrder } | undefined;
    // Info: (20241230 - Julian) 如果有借貸排序，則清除日期排序
    const newDateSort = !creditSort && !debitSort && dateSort ? dateSort : null;
    setDateSort(newDateSort);
    if (newDateSort) {
      sort = { by: SortBy.DATE, order: newDateSort };
    } else {
      // Info: (20241230 - Julian) 如果有日期排序，則清除借貸排序
      if (creditSort) {
        sort = { by: SortBy.CREDIT, order: creditSort };
      }
      if (debitSort) {
        sort = { by: SortBy.DEBIT, order: debitSort };
      }
    }
    setSelectedSort(sort);
  }, [creditSort, debitSort, dateSort]);

  const voucherTabs = Object.values(VoucherTabs).map((value) =>
    t(`journal:VOUCHER.${value.toUpperCase()}_TAB`)
  );
  const voucherTypeList = ['All', ...Object.keys(EventType).map((key) => key.toLowerCase())];

  const params = { companyId: selectedCompany?.id ?? FREE_COMPANY_ID };

  const handleApiResponse = useCallback(
    (
      data: IPaginatedData<{
        unRead: {
          uploadedVoucher: number;
          upcomingEvents: number;
        };
        vouchers: IVoucherBeta[];
      }>
    ) => {
      try {
        setPage(data.page);
        setUnRead(data.data.unRead);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);

        const voucherListUI: IVoucherUI[] = data.data.vouchers.map((voucher) => {
          return {
            ...voucher,
            isSelected: false,
          };
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

  const displayVoucherList =
    voucherList && voucherList.length > 0 ? (
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
      />
    ) : (
      <div className="flex items-center justify-center rounded-lg bg-surface-neutral-surface-lv2 p-20px text-text-neutral-tertiary">
        <p>{t('journal:VOUCHER.NO_VOUCHER')}</p>
      </div>
    );

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
      {/* Info: (20240920 - Julian) Add New Voucher button */}
      <div className="ml-auto">
        <Link href={ISUNFA_ROUTE.ADD_NEW_VOUCHER}>
          <Button type="button">
            <LuPlus />
            <p>{t('journal:VOUCHER.ADD_NEW_VOUCHER')}</p>
          </Button>
        </Link>
      </div>
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={Object.values(VoucherTabs)}
          tabsString={voucherTabs}
          activeTab={activeTab}
          onTabClick={tabClick}
          counts={[unRead.uploadedVoucher, unRead.upcomingEvents]}
        />
        {/* Info: (20241022 - Julian) Filter Section */}
        <FilterSection<{
          unRead: {
            uploadedVoucher: number;
            upcomingEvents: number;
          };
          vouchers: IVoucherBeta[];
        }>
          params={params}
          apiName={APIName.VOUCHER_LIST_V2}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          tab={activeTab} // Info: (20241104 - Murky) @Julian, 後端用 VoucherListTabV2 這個 enum 來過濾, 在 src/constants/voucher.ts
          types={voucherTypeList} // Info: (20241104 - Murky) @Julian, 後端用 EventType 這個 enum 來過濾, 在 src/constants/account.ts
          /* Deprecated: (20250107 - tzuhan) 一次只能有一個排序條件
          dateSort={dateSort}
          otherSorts={otherSorts} // Info: (20241104 - Murky) 可以用哪些sort 請參考 VoucherListAllSortOptions, 在 src/lib/utils/zod_schema/voucher.ts
          */
          sort={selectedSort}
        />
        {/* Info: (20240920 - Julian) Voucher List */}
        {displayVoucherList}
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
