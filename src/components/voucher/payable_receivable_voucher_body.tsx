import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import PayableReceivableVoucherList from '@/components/voucher/payable_receivable_voucher_list';
import Tabs from '@/components/tabs/tabs';
import Pagination from '@/components/pagination/pagination';
import FilterSection from '@/components/filter_section/filter_section';
import { SortOrder, SortBy } from '@/constants/sort';
import { IPaginatedData } from '@/interfaces/pagination';
import { IVoucherBeta } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { VoucherListTabV2 } from '@/constants/voucher';

const PayableReceivableVoucherPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();

  const [activeTab, setActiveTab] = useState(VoucherListTabV2.RECEIVING);
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
  const [otherSorts, setOtherSorts] = useState<{ sort: SortBy; sortOrder: SortOrder }[]>([]);
  const [voucherList, setVoucherList] = useState<IVoucherBeta[]>([]);

  useEffect(() => {
    // Info: (20241230 - Julian) 如果有其他排序，則清除日期排序
    const newDateSort =
      !payReceiveSort && !payReceiveAlreadyHappenedSort && !remainSort && dateSort
        ? dateSort
        : null;
    setDateSort(newDateSort);

    // Info: (20241230 - Julian) 如果有日期排序，則清除其他排序
    const newPayReceiveSort =
      !dateSort && payReceiveSort
        ? [{ sort: SortBy.PAY_RECEIVE_TOTAL, sortOrder: payReceiveSort }]
        : [];
    const newPayReceiveAlreadyHappenedSort =
      !dateSort && payReceiveAlreadyHappenedSort
        ? [{ sort: SortBy.PAY_RECEIVE_ALREADY_HAPPENED, sortOrder: payReceiveAlreadyHappenedSort }]
        : [];
    const newRemainSort =
      !dateSort && remainSort ? [{ sort: SortBy.PAY_RECEIVE_REMAIN, sortOrder: remainSort }] : [];
    setOtherSorts([...newPayReceiveSort, ...newPayReceiveAlreadyHappenedSort, ...newRemainSort]);
  }, [payReceiveSort, payReceiveAlreadyHappenedSort, remainSort, dateSort]);

  const voucherTabs = [VoucherListTabV2.RECEIVING, VoucherListTabV2.PAYMENT].map((value) =>
    t(`journal:VOUCHER.${value.toUpperCase()}_TAB`)
  );

  const params = { companyId: selectedCompany?.id };

  const handleApiResponse = (
    data: IPaginatedData<{
      unRead: {
        receivingVoucher: number;
        paymentVoucher: number;
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

  const tabsClick = (tab: string) => setActiveTab(tab as VoucherListTabV2);

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
    <div className="relative flex flex-col items-center gap-40px p-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={voucherTabs}
          tabsString={voucherTabs}
          activeTab={activeTab}
          onTabClick={tabsClick}
          counts={[unRead.receivingVoucher, unRead.paymentVoucher]}
        />
        {/* Info: (20241122 - Julian) Filter Section */}
        <FilterSection<{
          unRead: {
            receivingVoucher: number;
            paymentVoucher: number;
          };
          vouchers: IVoucherBeta[];
        }>
          params={params}
          apiName={APIName.VOUCHER_LIST_V2}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          tab={VoucherListTabV2.RECEIVING}
          dateSort={dateSort}
          otherSorts={otherSorts}
        />
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
