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
  ledgerData: ILedgerPayload | null; // 接收 API 數據
  loading: boolean; // 接收父组件傳遞的loading狀態
}

const LedgerList: React.FunctionComponent<LedgerListProps> = ({ ledgerData, loading }) => {
  const { t } = useTranslation('common');
  const formatNumber = (number: number) => new Intl.NumberFormat().format(number);

  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [ledgerList] = useState<ILedgerBeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);

  // 提取 ledgerData.items.data，並設置默認值為空數組，避免 undefined 或 null 引發錯誤
  const ledgerItemsData = ledgerData?.items?.data ?? [];

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

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px">
      {/* Info: (20241004 - Anna) Export button */}
      <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled={false} />
      {/* Info: (20241004 - Anna) PrintButton */}
      <PrintButton onClick={() => {}} disabled={false} />
    </div>
  );

  // Info: (20241101 - Anna) 根據狀態來渲染不同的內容
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  } else if (!loading && ledgerData?.items.data.length === 0) {
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

  // 渲染有效的憑證數據列表
  const displayedLedgerList = ledgerItemsData.map((ledger) => {
    return <LedgerItem key={ledger.id} ledger={ledger} />;
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
            {ledgerList.some((ledger) => ledger.debitAmount !== 0) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedDebit}
              </div>
            )}
            {ledgerList.some((ledger) => ledger.creditAmount !== 0) && (
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
        <div className="table-row-group">{displayedLedgerList}</div>
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
