import React, { useState, useRef } from 'react';
import { useTranslation } from 'next-i18next';
// import LedgerItem, { ILedgerBeta } from '@/components/ledger/ledger_item';
import LedgerItem from '@/components/ledger/ledger_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { ILedgerPayload } from '@/interfaces/ledger';
import Image from 'next/image';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useReactToPrint } from 'react-to-print';

interface LedgerListProps {
  ledgerData: ILedgerPayload | null; // Info: (20241118 - Anna) 接收 API 數據
  loading: boolean; // Info: (20241118 - Anna) 接收父组件傳遞的loading狀態
}

const LedgerList: React.FunctionComponent<LedgerListProps> = ({ ledgerData, loading }) => {
  const { t } = useTranslation(['journal', 'date_picker', 'reports']);
  const printRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用列印內容

  const formatNumber = (number: number) => new Intl.NumberFormat().format(number);

  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  // const [ledgerList] = useState<ILedgerBeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);

  // Info: (20241118 - Anna) 確保 ledgerItemsData 是一個有效的陣列
  const ledgerItemsData = Array.isArray(ledgerData?.items?.data) ? ledgerData.items.data : [];

  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';

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

  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20241203 - Anna) 指定需要打印的內容 Ref
    documentTitle: `分類帳`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
  });

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px print:hidden">
      {/* Info: (20241004 - Anna) Export button */}
      <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled />
      {/* Info: (20241004 - Anna) PrintButton */}
      <PrintButton onClick={handlePrint} disabled={false} />
    </div>
  );

  // Info: (20241101 - Anna) 根據狀態來渲染不同的內容
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  } else if (!loading && (!ledgerItemsData || ledgerItemsData.length === 0)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  }

  // Info: (20241118 - Anna) 渲染有效的憑證數據列表
  const displayedLedgerList = ledgerItemsData.map((ledger) => {
    const { id = '', creditAmount = 0, debitAmount = 0, balance = 0 } = ledger || {};
    return (
      <LedgerItem
        key={id}
        ledger={{ ...ledger, creditAmount, debitAmount, balance }} // Info: (20241118 - Anna) 確保每個欄位有預設值
      />
    );
  });

  return (
    <div className="flex flex-col" ref={printRef}>
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}

      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2 print:bg-neutral-50">
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`table-cell border-stroke-neutral-quaternary ${tableCellStyles} border-b`}
            >
              <div className="flex items-center justify-center print:hidden">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} whitespace-nowrap print:bg-neutral-50`}
            >
              {displayedDate}
            </div>
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} whitespace-nowrap print:bg-neutral-50`}
            >
              {t('reports:REPORTS.CODE')}
            </div>
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
            >
              {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
            </div>
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
            >
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} whitespace-nowrap print:bg-neutral-50`}
            >
              {t('journal:VOUCHER.NOTE')}
            </div>
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
            >
              {displayedDebit}
            </div>

            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
            >
              {displayedCredit}
            </div>

            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles.replace('border-r', '')} print:bg-neutral-50`}
            >
              {t('journal:VOUCHER.BALANCE')}
            </div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedLedgerList}</div>
      </div>

      <div className="h-px w-full bg-neutral-100"></div>

      {/* Info: (20241009 - Anna) 加總數字的表格 */}
      <div className="mb-10 mt-4 grid h-70px grid-cols-9 overflow-hidden rounded-b-lg border-b border-t-0 bg-surface-neutral-surface-lv2 text-sm text-text-neutral-tertiary print:bg-neutral-50">
        {/* Info: (20241009 - Anna) 表格內容 */}
        <div className="col-span-1"></div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base">
          {t('journal:LEDGER.TOTAL_DEBIT_AMOUNT')}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base text-neutral-600">
          {formatNumber(ledgerData?.total?.totalDebitAmount || 0)}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base">
          {t('journal:LEDGER.TOTAL_CREDIT_AMOUNT')}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base text-neutral-600">
          {formatNumber(ledgerData?.total?.totalCreditAmount || 0)}
        </div>
      </div>

      {/* Info: (20240920 - Julian) Pagination */}
      <div className="mx-auto print:hidden">
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
