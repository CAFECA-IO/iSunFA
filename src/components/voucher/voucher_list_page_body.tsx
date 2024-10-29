import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { EventType } from '@/constants/account';
import Tabs from '@/components/tabs/tabs';
import { APIName } from '@/constants/api_connection';
import { IVoucherBeta } from '@/interfaces/voucher';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_PAGE_LIMIT, FREE_COMPANY_ID } from '@/constants/config';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortBy, SortOrder } from '@/constants/sort';

enum VoucherTabs {
  UPLOADED = 'UPLOADED_VOUCHER',
  UPCOMING = 'UPCOMING_EVENTS',
}

const VoucherListPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();

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
  const [otherSorts, setOtherSorts] = useState<{ sort: SortBy; sortOrder: SortOrder }[]>([]);

  useEffect(() => {
    setOtherSorts([
      ...(creditSort ? [{ sort: SortBy.CREDIT, sortOrder: creditSort }] : []),
      ...(debitSort ? [{ sort: SortBy.DEBIT, sortOrder: debitSort }] : []),
    ]);
  }, [creditSort, debitSort]);

  const voucherTabs = Object.values(VoucherTabs).map((value) => t(`journal:VOUCHER.${value}_TAB`));
  const voucherTypeList = Object.keys(EventType).map((key) => key.toLowerCase());

  const params = { companyId: selectedCompany?.id ?? FREE_COMPANY_ID };
  const tabQuery = activeTab === VoucherTabs.UPLOADED ? 'uploaded' : 'upcoming';

  const [voucherList, setVoucherList] = useState<IVoucherBeta[]>([]);
  const handleApiResponse = (
    data: IPaginatedData<{
      unRead: {
        uploadedVoucher: number;
        upcomingEvents: number;
      };
      vouchers: IVoucherBeta[];
    }>
  ) => {
    setPage(data.page);
    setUnRead(data.data.unRead);
    setTotalPages(data.totalPages);
    setTotalCount(data.totalCount);
    setVoucherList(data.data.vouchers);
  };

  const tabClick = (tab: string) => setActiveTab(tab as VoucherTabs);

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
        <Button type="button">
          <LuPlus />
          <p>{t('journal:VOUCHER.ADD_NEW_VOUCHER')}</p>
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={voucherTabs}
          tabsString={voucherTabs}
          activeTab={activeTab}
          onTabClick={tabClick}
          counts={[unRead.uploadedVoucher, unRead.upcomingEvents]}
        />
        {/* ToDo: (20241022 - Julian) Filter Section */}
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
          tab={tabQuery}
          types={voucherTypeList}
          dateSort={dateSort}
          otherSorts={otherSorts}
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
