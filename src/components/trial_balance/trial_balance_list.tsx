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
import Toggle from '@/components/toggle/toggle';

const TrialBalanceList = () => {
  const { t } = useTranslation('common');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [subAccountsToggle, setSubAccountsToggle] = useState<boolean>(false);
  // Info: (20241028 - Anna) 處理 toggle 開關
  const subAccountsToggleHandler: () => void = () => {
    setSubAccountsToggle((prevState) => !prevState);
  };

  const [voucherList] = useState<TrialBalanceItem[]>(TrialBalanceData.items.data);
  const [currentPage, setCurrentPage] = useState(1);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  const totalPage = 10;

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
    <div className="flex items-center justify-between px-px max-md:flex-wrap">
      {/* Info: (20241028 - Anna) 新增 Display Sub-Accounts Toggle 開關 */}
      <div className="flex items-center gap-4">
        <Toggle
          id="subAccounts-toggle"
          initialToggleState={subAccountsToggle}
          getToggledState={subAccountsToggleHandler}
          toggleStateFromParent={subAccountsToggle}
        />
        <span className="text-neutral-600">{t('common:COMMON.DISPLAY_SUB_ACCOUNTS')}</span>
      </div>
      {/* Info: (20241028 - Anna) Display Sub-Accounts 結束  */}
      <div className="ml-auto flex items-center gap-24px">
        <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled={false} />
        <PrintButton onClick={() => {}} disabled={false} />
      </div>
    </div>
  );

  const displayedVoucherList = voucherList.map((voucher) => (
    // Info: (20241029 - Anna)  Passing subAccountsToggle to each TrialBalanceItemRow
    <TrialBalanceItemRow key={voucher.id} voucher={voucher} totalExpanded={subAccountsToggle} />
  ));

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="flex flex-col">
      {displayedSelectArea}
      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group border-b-0.5px bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`table-cell border-b-0.5px border-stroke-neutral-quaternary text-center align-middle`}
            >
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div
              className={`table-cell w-70px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('common:COMMON.CODE')}
            </div>
            <div
              className={`table-cell w-350px border-b-0.5px border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 text-center align-middle`}
            >
              {t('common:COMMON.BEGINNING')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-stroke-neutral-quaternary bg-support-olive-100 text-center align-middle`}
            >
              {t('common:COMMON.BEGINNING')}
              {displayedCredit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 text-center align-middle`}
            >
              {t('common:COMMON.MIDTERM')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-stroke-neutral-quaternary bg-support-baby-100 text-center align-middle`}
            >
              {t('common:COMMON.MIDTERM')}
              {displayedCredit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 text-center align-middle`}
            >
              {t('common:COMMON.ENDING')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-stroke-neutral-quaternary bg-support-pink-100 text-center align-middle`}
            >
              {t('common:COMMON.ENDING')}
              {displayedCredit}
            </div>
          </div>
        </div>

        <div className="table-row-group text-sm">{displayedVoucherList}</div>
      </div>
      <div className="h-px w-full bg-neutral-100"></div>
      {/* Info: (20241018 - Anna) Total開始 */}
      <div className="mb-10 mt-4 table w-full overflow-hidden rounded-b-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`col-span-3 table-cell h-full w-472px border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('report_401:TAX_REPORT.TOTAL')}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.beginningDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.beginningCreditAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.midtermDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.midtermCreditAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.endingDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.endingCreditAmount)}
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20241018 - Anna) Total結束 */}
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
