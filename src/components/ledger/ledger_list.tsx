import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import LedgerItem, { ILedgerBeta } from '@/components/ledger/ledger_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { ILedgerPayload } from '@/interfaces/ledger';
import Image from 'next/image';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { IDatePeriod } from '@/interfaces/date_period';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

interface LedgerListProps {
  selectedDateRange: IDatePeriod | null;
  selectedReportType: 'General' | 'Detailed' | 'General & Detailed'; // Info: (20241117 - Anna) 接收父層的搜尋條件
  selectedStartAccountNo: string; // Info: (20241117 - Anna) 接收父層的搜尋條件
  selectedEndAccountNo: string; // Info: (20241117 - Anna) 接收父層的搜尋條件
}

const LedgerList: React.FunctionComponent<LedgerListProps> = ({
  selectedDateRange,
  selectedReportType,
  selectedStartAccountNo,
  selectedEndAccountNo,
}) => {
  const { t } = useTranslation('common');
  const formatNumber = (number: number) => new Intl.NumberFormat().format(number);
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [totalDebitAmount, setTotalDebitAmount] = useState<number>(0);
  const [totalCreditAmount, setTotalCreditAmount] = useState<number>(0);
  const { selectedCompany, isAuthLoading } = useUserCtx();

  const [voucherList, setVoucherList] = useState<ILedgerBeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);

  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  const tableCellStyles = 'text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';

  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  const displayedCredit = SortingButton({
    string: t('journal:JOURNAL.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  const displayedDebit = SortingButton({
    string: t('journal:JOURNAL.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px">
      <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled={false} />
      <PrintButton onClick={() => {}} disabled={false} />
    </div>
  );

  const fetchLedgerData = useCallback(async () => {
    if (
      isAuthLoading ||
      !selectedCompany?.id ||
      !selectedDateRange ||
      selectedDateRange.endTimeStamp === 0
    ) {
      return;
    }

    if (
      prevSelectedDateRange.current &&
      prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
      prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp
    ) {
      return;
    }

    setIsLoading(true);

  try {
    const { data } = await APIHandler<ILedgerPayload>(APIName.LEDGER_LIST, {
      params: { companyId: selectedCompany.id },
      query: {
        startDate: selectedDateRange.startTimeStamp,
        endDate: selectedDateRange.endTimeStamp,
        startAccountNo: selectedStartAccountNo,
        endAccountNo: selectedEndAccountNo,
        labelType: selectedReportType,
        page: currentPage,
        pageSize: 10,
      },
    }).trigger();

    if (!data) {
      throw new Error('No data returned from the API');
    }
    const transformedData: ILedgerBeta[] = data.items.data.map((item) => ({
      id: item.id,
      voucherDate: item.voucherDate,
      voucherNumber: item.voucherNumber,
      voucherType: item.voucherType,
      particulars: item.particulars,
      no: item.no,
      accountingTitle: item.accountingTitle,
      creditAmount: item.creditAmount,
      debitAmount: item.debitAmount,
      balance: item.balance,
    }));

    setVoucherList(transformedData);
    setTotalPages(data.items.totalPages);
    setTotalDebitAmount(data.total.totalDebitAmount);
    setTotalCreditAmount(data.total.totalCreditAmount);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching ledger data:', error);
    setVoucherList([]);
    setTotalDebitAmount(0);
    setTotalCreditAmount(0);
  } finally {
    setIsLoading(false);
    prevSelectedDateRange.current = selectedDateRange;
  }
  }, [isAuthLoading, selectedCompany?.id, selectedDateRange, currentPage, selectedReportType]);

  useEffect(() => {
    if (!selectedDateRange) return;
    fetchLedgerData();
  }, [fetchLedgerData, selectedDateRange]);

  if (!voucherList.length && !isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('report_401:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('report_401:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  }

  const displayedVoucherList = voucherList.map((voucher) => {
    return <LedgerItem key={voucher.id} ledger={voucher} />;
  });

  return (
    <div className="flex flex-col">
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}

      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`table-cell border-stroke-neutral-quaternary ${tableCellStyles} border-b`}
            >
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {displayedDate}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('common:COMMON.CODE')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.NOTE')}
            </div>
            {voucherList.some((voucher) => voucher.debitAmount !== 0) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedDebit}
              </div>
            )}
            {voucherList.some((voucher) => voucher.creditAmount !== 0) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedCredit}
              </div>
            )}
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles.replace('border-r', '')}`}
            >
              {t('journal:VOUCHER.BALANCE')}
            </div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedVoucherList}</div>
      </div>

      <div className="h-px w-full bg-neutral-100"></div>

      {/* Info: (20241009 - Anna) 加總數字的表格 */}
      <div className="mb-10 mt-4 grid h-70px grid-cols-9 overflow-hidden rounded-b-lg border-b border-t-0 bg-surface-neutral-surface-lv2 text-sm text-text-neutral-tertiary">
        {/* Info: (20241009 - Anna) 表格內容 */}
        <div className="col-span-1"></div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base">
          {t('journal:LEDGER.TOTAL_DEBIT_AMOUNT')}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base text-neutral-600">
          {formatNumber(totalDebitAmount)}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base">
          {t('journal:LEDGER.TOTAL_CREDIT_AMOUNT')}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base text-neutral-600">
          {formatNumber(totalCreditAmount)}
        </div>
      </div>

      {/* Info: (20240920 - Julian) Pagination */}
      <div className="mx-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default LedgerList;
