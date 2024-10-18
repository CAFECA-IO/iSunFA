import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import TrialBalanceItemRow from '@/components/trial_balance/trial_balance_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { MOCK_RESPONSE as TrialBalanceData, TrialBalanceItem } from '@/interfaces/trial_balance';

const TrialBalanceList = () => {
  const { t } = useTranslation('common');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [voucherList] = useState<TrialBalanceItem[]>(TrialBalanceData.items.data);
  const [currentPage, setCurrentPage] = useState(1);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  const totalPage = 10;

  const tableCellStyles = 'text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';

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

  const displayedVoucherList = voucherList.map((voucher) => (
    <TrialBalanceItemRow key={voucher.id} voucher={voucher} />
  ));

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="flex flex-col">
      {displayedSelectArea}
      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`table-cell ${tableCellStyles} border-b border-r border-stroke-neutral-quaternary`}
            >
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div className={`table-cell w-50px ${tableCellStyles} ${sideBorderStyles}`}>
              {t('common:COMMON.CODE')}
            </div>
            <div className={`table-cell w-370px ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
            </div>

            <div
              className={`table-cell w-77px bg-support-olive-100 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {t('common:COMMON.BEGINNING')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px bg-support-olive-100 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {t('common:COMMON.BEGINNING')}
              {displayedCredit}
            </div>

            <div
              className={`table-cell w-77px bg-support-baby-100 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {t('common:COMMON.MIDTERM')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px bg-support-baby-100 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {t('common:COMMON.MIDTERM')}
              {displayedCredit}
            </div>

            <div
              className={`table-cell w-77px bg-support-pink-100 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {t('common:COMMON.ENDING')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px bg-support-pink-100 ${tableCellStyles} ${sideBorderStyles.replace('border-r', '')}`}
            >
              {t('common:COMMON.ENDING')}
              {displayedCredit}
            </div>
          </div>
        </div>

        <div className="table-row-group text-sm">{displayedVoucherList}</div>
      </div>
      <div className="h-px w-full bg-neutral-100"></div>
      {/* Anna複製主表格 */}
      <div className="mb-10 mt-4 table w-full overflow-hidden rounded-b-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`col-span-3 table-cell h-full w-452px ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')}`}
            >
              {t('report_401:TAX_REPORT.TOTAL')}
            </div>

            <div
              className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {formatNumber(TrialBalanceData.total.beginningDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {formatNumber(TrialBalanceData.total.beginningCreditAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {formatNumber(TrialBalanceData.total.midtermDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {formatNumber(TrialBalanceData.total.midtermCreditAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles}`}
            >
              {formatNumber(TrialBalanceData.total.endingDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-r', '')}`}
            >
              {formatNumber(TrialBalanceData.total.endingCreditAmount)}
            </div>
          </div>
        </div>
      </div>
      {/* Anna複製主表格結束 */}
      <div className="mx-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default TrialBalanceList;
