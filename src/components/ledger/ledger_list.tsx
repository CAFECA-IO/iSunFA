import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import LedgerItem, { ILedgerBeta } from '@/components/ledger/ledger_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
// import { VoucherType } from '@/constants/account';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { ILedgerPayload, MOCK_RESPONSE as LEDGER_DATA_RESPONSE } from '@/interfaces/ledger';
import Image from 'next/image';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { IDatePeriod } from '@/interfaces/date_period';

interface LedgerListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241104 - Anna) 接收來自上層的日期範圍
}

const LedgerList: React.FunctionComponent<LedgerListProps> = ({ selectedDateRange }) => {
  const { t } = useTranslation('common');
  const formatNumber = (number: number) => new Intl.NumberFormat().format(number);
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [totalDebitAmount, setTotalDebitAmount] = useState<number>(0); // Info: (20241101 - Anna) 初始值設為 0
  const [totalCreditAmount, setTotalCreditAmount] = useState<number>(0); // Info: (20241101 - Anna) 初始值設為 0

  const { selectedCompany, isAuthLoading } = useUserCtx(); // (20241101 - Anna) 從 useUserCtx 取得 companyId

  const [voucherList, setVoucherList] = useState<ILedgerBeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // (20241101 - Anna) 動態 totalPages 狀態
  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';
  //   const checkStyle = `'table-cell' text-center align-middle border-r border-stroke-neutral-quaternary`;

  // Info: (20240920 - Julian) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240920 - Julian) credit 排序按鈕
  const displayedCredit = SortingButton({
    string: t('journal:JOURNAL.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  // Info: (20240920 - Julian) debit 排序按鈕
  const displayedDebit = SortingButton({
    string: t('journal:JOURNAL.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px">
      {/* Info: (20241004 - Anna) Export Voucher button */}
      <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled={false} />
      {/* Info: (20241004 - Anna) PrintButton */}
      <PrintButton onClick={() => {}} disabled={false} />
    </div>
  );

  /* Info: (20241104 - Anna) 新增狀態和參考變量以追蹤首次加載和日期範圍 */
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);

  /* Info: (20241104 - Anna) 包裝API請求函式的useCallback，並添加日期檢查 */
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
      prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
      hasFetchedOnce
    ) {
      return;
    }

    setIsLoading(true);

    // Todo: (20241101 - Anna) 暫時使用 MOCK_RESPONSE，模擬 API 回傳的數據
    const data: ILedgerPayload = LEDGER_DATA_RESPONSE;

    const transformedData: ILedgerBeta[] = data.items.data.map((item) => ({
      id: item.id,
      date: item.voucherDate,
      voucherNo: item.voucherNumber,
      voucherType: item.voucherType,
      note: item.particulars,
      accounting: [{ code: item.no, name: item.accountingTitle }],
      credit: [item.creditAmount],
      debit: [item.debitAmount],
      balance: [item.balance],
    }));

    setVoucherList(transformedData);
    setTotalPages(data.items.totalPages);
    setTotalDebitAmount(data.total.totalDebitAmount);
    setTotalCreditAmount(data.total.totalCreditAmount);

    setHasFetchedOnce(true); /* Info: (20241104 - Anna) 設置為已加載 */
    setIsLoading(false); /* Info: (20241104 - Anna) 停止加載狀態 */
    prevSelectedDateRange.current = selectedDateRange; /* Info: (20241104 - Anna) 更新日期範圍 */
  }, [isAuthLoading, selectedCompany?.id, selectedDateRange, hasFetchedOnce]);

  /* Info: (20241104 - Anna) 當選擇日期範圍更改時觸發數據加載 */
  useEffect(() => {
    if (!selectedDateRange) return;
    fetchLedgerData();
  }, [fetchLedgerData, selectedDateRange]);

  // Info: (20241101 - Anna) 根據狀態來渲染不同的內容
  if (!hasFetchedOnce && !isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('report_401:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('report_401:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  } else if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  }

  //  Info: (20241101 - Anna)  顯示數據
  const displayedVoucherList = voucherList.map((voucher) => {
    return <LedgerItem key={voucher.id} voucher={voucher} />;
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
            {voucherList.some((voucher) => voucher.debit.some((d) => d !== 0)) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedDebit}
              </div>
            )}
            {voucherList.some((voucher) => voucher.credit.some((c) => c !== 0)) && (
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
