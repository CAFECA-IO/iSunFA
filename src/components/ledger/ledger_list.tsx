import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import LedgerItem, { ILedgerBeta } from '@/components/ledger/ledger_item';
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

interface LedgerListProps {
  // selectedDateRange: IDatePeriod | null; // Info: (20241104 - Anna) 接收來自上層的日期範圍
  ledgerData: ILedgerPayload | null; // 🌟 接收 API 數據
  totalDebitAmount: number; // 🌟 顯示總借方金額
  totalCreditAmount: number; // 🌟 顯示總貸方金額
}

const LedgerList: React.FunctionComponent<LedgerListProps> = ({
  ledgerData,
  totalDebitAmount,
  totalCreditAmount,
}) => {
  const { t } = useTranslation('common');
  const formatNumber = (number: number) => new Intl.NumberFormat().format(number);
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [voucherList] = useState<ILedgerBeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);
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

  // Info: (20241101 - Anna) 根據狀態來渲染不同的內容
  if (!ledgerData) {
    // eslint-disable-next-line no-console
    console.log('Ledger data is null or undefined');
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
  if (!ledgerData.items || !ledgerData.items.data || ledgerData.items.data.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  }

  //  Info: (20241101 - Anna)  顯示數據
  const displayedVoucherList = ledgerData
    ? ledgerData.items.data.map((voucher) => {
        // 將 creditAmount 和 debitAmount 和 balance轉為數組
        const modifiedVoucher = {
          ...voucher,
          creditAmount: Array.isArray(voucher.creditAmount)
            ? voucher.creditAmount
            : [voucher.creditAmount],
          debitAmount: Array.isArray(voucher.debitAmount)
            ? voucher.debitAmount
            : [voucher.debitAmount],
          balance: Array.isArray(voucher.balance) ? voucher.balance : [voucher.balance],
        };
        return <LedgerItem key={voucher.id} voucher={modifiedVoucher} />;
      })
    : null;

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
            {voucherList.some((voucher) => voucher.debitAmount.some((d) => d !== 0)) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedDebit}
              </div>
            )}
            {voucherList.some((voucher) => voucher.creditAmount.some((c) => c !== 0)) && (
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
