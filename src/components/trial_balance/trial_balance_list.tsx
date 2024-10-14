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
    string: t('journal:VOUCHER.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  const displayedDebit = SortingButton({
    string: t('journal:VOUCHER.DEBIT'),
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

  return (
    <div className="flex flex-col">
      {displayedSelectArea}

      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div className={`table-cell ${tableCellStyles} border-b border-r`}>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('common:COMMON.CODE')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.ACCOUNTING')}
            </div>

            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              Beginning {displayedDebit}
            </div>

            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              Beginning {displayedCredit}
            </div>

            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              Midterm {displayedDebit}
            </div>

            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              Midterm {displayedCredit}
            </div>

            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              Ending {displayedDebit}
            </div>

            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              Ending {displayedCredit}
            </div>
          </div>
        </div>

        <div className="table-row-group">{displayedVoucherList}</div>
      </div>

      <div className="h-px w-full bg-neutral-100"></div>

      <div className="mb-10 mt-4 grid h-70px grid-cols-9 overflow-hidden rounded-b-lg border-b border-t-0 bg-surface-neutral-surface-lv2 text-sm text-text-neutral-tertiary">
        <div className="col-span-3 flex items-center justify-center py-8px text-left align-middle text-base">
          Total
        </div>
        <div className="col-span-2 flex items-center justify-center py-8px text-left align-middle text-base text-neutral-600">
          1,800,000
        </div>
        <div className="col-span-2 flex items-center justify-center py-8px text-left align-middle text-base text-neutral-600">
          1,120,000
        </div>
        <div className="col-span-2 flex items-center justify-center py-8px text-left align-middle text-base text-neutral-600">
          1,800,000
        </div>
      </div>

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
