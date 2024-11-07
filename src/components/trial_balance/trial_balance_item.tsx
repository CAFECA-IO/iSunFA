import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';
import { checkboxStyle } from '@/constants/display';
import type { TrialBalanceItem } from '@/interfaces/trial_balance';
import CollapseButton from '@/components/button/collapse_button';

interface ITrialBalanceItemProps {
  account: TrialBalanceItem;
  totalExpanded: boolean; // Info: (20241029 - Anna) Receive expanded state from parent
  // selectedDateRange: IDatePeriod | null; // Info: (20241107 - Anna) 接收日期範圍作為 prop
}

const TrialBalanceItemRow = React.memo(({ account, totalExpanded }: ITrialBalanceItemProps) => {
  const [isChecked, setIsChecked] = useState(false);
  // Info: (20241025 - Anna) 新增狀態來追蹤按鈕展開狀態
  const [localIsExpanded, setLocalIsExpanded] = useState(totalExpanded); // Info: (20241029 - Anna) 使用解構的 totalExpanded 作為初始值
  // const { selectedCompany } = useUserCtx();
  // const companyId = selectedCompany?.id;

  // Info: (20241029 - Anna) Update local isExpanded when parent state changes
  useEffect(() => {
    setLocalIsExpanded(totalExpanded);
  }, [totalExpanded]);

  // Info: (20241107 - Anna) 設定 API 參數與請求方法
  // const fetchTrialBalanceData = useCallback(async () => {
  //   if (!companyId || !selectedDateRange) return;
  //   const response = await APIHandler<TrialBalanceItem[]>(APIName.TRIAL_BALANCE_LIST, {
  //     params: { companyId },
  //     query: {
  //       startDate: selectedDateRange.startTimeStamp,
  //       endDate: selectedDateRange.endTimeStamp,
  //       page: 1,
  //       pageSize: 10,
  //     },
  //   });
  //    if (response.success && response.data) {
  //      // eslint-disable-next-line no-console
  //      console.log(response.data); // For debugging or future use
  //    }
  // }, [companyId, selectedDateRange]);

  // Info: (20241107 - Anna) 當日期範圍變更時，重新請求 API
  // useEffect(() => {
  //   if (selectedDateRange) {
  //     fetchTrialBalanceData();
  //   }
  // }, [fetchTrialBalanceData, selectedDateRange]);

  const displayedCheckbox = (
    <div className="relative px-8px py-6">
      <input
        type="checkbox"
        className={checkboxStyle}
        checked={isChecked}
        onChange={() => setIsChecked(!isChecked)}
      />
    </div>
  );

  const displayedAccountingCode = (
    <div className="ml-2 flex h-full items-center justify-start font-normal text-neutral-600">
      <div className="flex items-center justify-between">
        <p className="m-0 flex items-center">{account.no}</p>
        {/* Info: (20241025 - Anna) 在 account.no 右側加入 CollapseButton */}
        {/* Info: (20241025 - Anna) 只有當 account.subAccounts 有數據時才顯示 CollapseButton */}
        {account.subAccounts.length > 0 && (
          <CollapseButton
            onClick={() => setLocalIsExpanded(!localIsExpanded)} // Info: (20241029 - Anna) 使用 localIsExpanded
            isCollapsed={!localIsExpanded}
          />
        )}
      </div>
    </div>
  );
  const displayedAccountingName = (
    <div className="flex h-full items-center justify-center font-normal text-neutral-600">
      <div>
        <p className="m-0 flex items-center">{account.accountingTitle}</p>
      </div>
    </div>
  );

  const displayedBeginningDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-neutral-600">
        {numberWithCommas(account.beginningDebitAmount)}
      </p>
    </div>
  );

  const displayedBeginningCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-neutral-600">{numberWithCommas(account.beginningCreditAmount)}</p>
    </div>
  );
  const displayedMidtermDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-neutral-600">
        {numberWithCommas(account.midtermDebitAmount)}
      </p>
    </div>
  );

  const displayedMidtermCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-neutral-600">{numberWithCommas(account.midtermCreditAmount)}</p>
    </div>
  );
  const displayedEndingDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-neutral-600">
        {numberWithCommas(account.endingDebitAmount)}
      </p>
    </div>
  );

  const displayedEndingCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-neutral-600">{numberWithCommas(account.endingCreditAmount)}</p>
    </div>
  );

  return (
    <>
      <div className="table-row h-20px font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10">
        {/* Info: (20240920 - Julian) Select */}
        <div className={`table-cell w-32px text-center`}>{displayedCheckbox}</div>
        {/* Info: (20241004 - Anna) Accounting */}
        <div className="table-cell w-50px text-center align-middle">{displayedAccountingCode}</div>
        <div className="table-cell w-370px text-center align-middle">{displayedAccountingName}</div>
        {/* Info: (20241009 - Anna) Beginning Debit */}
        <div
          className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
        >
          {displayedBeginningDebitAmount}
        </div>
        {/* Info: (20241009 - Anna) Beginning Credit */}
        <div
          className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
        >
          {displayedBeginningCreditAmount}
        </div>
        {/* Info: (20241009 - Anna) Midterm Debit */}
        <div
          className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
        >
          {displayedMidtermDebitAmount}
        </div>
        {/* Info: (20241009 - Anna) Midterm Credit */}
        <div
          className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
        >
          {displayedMidtermCreditAmount}
        </div>
        {/* Info: (20241009 - Anna) Ending Debit */}
        <div
          className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
        >
          {displayedEndingDebitAmount}
        </div>
        {/* Info: (20241009 - Anna) Ending Credit */}
        <div
          className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
        >
          {displayedEndingCreditAmount}
        </div>
      </div>
      {/* Info: (20241025 - Anna) 如果展開，新增子科目表格 */}
      {localIsExpanded &&
        account.subAccounts.map((subAccount) => (
          <div key={subAccount.id} className="table-row h-20px font-normal">
            <div className="table-cell w-32px text-center">{displayedCheckbox}</div>
            <div className="table-cell w-50px text-center align-middle">
              <span className="ml-6 text-neutral-400">{subAccount.no}</span>
            </div>
            <div className="table-cell w-370px text-center align-middle">
              <div className="flex h-full items-center justify-center font-normal text-neutral-600">
                <span className="ml-12 flex items-center text-neutral-400">
                  {subAccount.accountingTitle}
                </span>
              </div>
            </div>
            <div className="table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600">
              {numberWithCommas(subAccount.beginningDebitAmount)}
            </div>
            <div className="table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600">
              {numberWithCommas(subAccount.beginningCreditAmount)}
            </div>
            <div className="table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600">
              {numberWithCommas(subAccount.midtermDebitAmount)}
            </div>
            <div className="table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600">
              {numberWithCommas(subAccount.midtermCreditAmount)}
            </div>
            <div className="table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600">
              {numberWithCommas(subAccount.endingDebitAmount)}
            </div>
            <div className="table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600">
              {numberWithCommas(subAccount.endingCreditAmount)}
            </div>
          </div>
        ))}
    </>
  );
});

export default TrialBalanceItemRow;
