import React, { useState, useEffect } from 'react';
import type { TrialBalanceItem } from '@/interfaces/trial_balance';
import CollapseButton from '@/components/button/collapse_button';

interface ITrialBalanceItemProps {
  account: TrialBalanceItem;
  totalExpanded: boolean; // Info: (20241029 - Anna) Receive expanded state from parent
}

const TrialBalanceItemRow = React.memo(function TrialBalanceItemRow({
  account,
  totalExpanded,
}: ITrialBalanceItemProps) {
  // Info: (20241025 - Anna) 新增狀態來追蹤按鈕展開狀態
  const [localIsExpanded, setLocalIsExpanded] = useState(totalExpanded); // Info: (20241029 - Anna) 使用解構的 totalExpanded 作為初始值

  // Info: (20241029 - Anna) Update local isExpanded when parent state changes
  useEffect(() => {
    setLocalIsExpanded(totalExpanded);
  }, [totalExpanded]);

  const displayedAccountingCode = (
    <div className="ml-2 flex items-center justify-start font-medium text-text-neutral-primary">
      <div className="flex items-center justify-between">
        <p className="flex items-center">{account.no}</p>
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
    <div className="flex items-center justify-center p-8px font-medium text-text-neutral-primary print:justify-start">
      {account.accountingTitle}
    </div>
  );

  const displayedBeginningDebitAmount = (
    <div className="flex items-center justify-end">{account.beginningDebitAmount}</div>
  );

  const displayedBeginningCreditAmount = (
    <div className="flex items-center justify-end">{account.beginningCreditAmount}</div>
  );
  const displayedMidtermDebitAmount = (
    <div className="flex items-center justify-end">{account.midtermDebitAmount}</div>
  );

  const displayedMidtermCreditAmount = (
    <div className="flex items-center justify-end">{account.midtermCreditAmount}</div>
  );

  const displayedEndingDebitAmount = (
    <div className="flex items-center justify-end">{account.endingDebitAmount}</div>
  );

  const displayedEndingCreditAmount = (
    <div className="flex items-center justify-end">{account.endingCreditAmount}</div>
  );

  return (
    <>
      <div className="table-row font-medium print:text-xxs">
        {/* Info: (20241004 - Anna) Accounting */}
        {/* Info: (20250116 - Anna) print:max-w-55px */}
        <div className="table-cell h-60px bg-surface-neutral-surface-lv1 text-center align-middle print:max-w-55px print:bg-neutral-50">
          {displayedAccountingCode}
        </div>
        {/* Info: (20250116 - Anna) Accounting Name */}
        {/* Info: (20250116 - Anna) print:max-w-150px */}
        <div className="table-cell bg-surface-neutral-surface-lv1 text-center align-middle print:max-w-150px print:bg-neutral-50">
          {displayedAccountingName}
        </div>
        {/* Info: (20241009 - Anna) Beginning Debit */}
        {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
        <div
          className={`table-cell border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
        >
          {displayedBeginningDebitAmount}
        </div>
        {/* Info: (20241009 - Anna) Beginning Credit */}
        {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
        <div
          className={`table-cell border-l border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
        >
          {displayedBeginningCreditAmount}
        </div>
        {/* Info: (20241009 - Anna) Midterm Debit */}
        {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
        <div
          className={`table-cell border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
        >
          {displayedMidtermDebitAmount}
        </div>
        {/* Info: (20241009 - Anna) Midterm Credit */}
        {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
        <div
          className={`table-cell border-l border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
        >
          {displayedMidtermCreditAmount}
        </div>
        {/* Info: (20241009 - Anna) Ending Debit */}
        {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
        <div
          className={`table-cell border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
        >
          {displayedEndingDebitAmount}
        </div>
        {/* Info: (20241009 - Anna) Ending Credit */}
        {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
        <div
          className={`table-cell border-l border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
        >
          {displayedEndingCreditAmount}
        </div>
      </div>
      {/* Info: (20241025 - Anna) 如果展開，新增子科目表格 */}
      {localIsExpanded &&
        account.subAccounts.map((subAccount) => (
          <div
            key={subAccount.id}
            className="table-row font-medium text-text-neutral-primary print:text-xxs"
          >
            {/* Info: (20241025 - Anna) print:max-w-55px */}
            <div className="table-cell text-center align-middle print:max-w-55px print:bg-neutral-50">
              <span className="ml-6 print:ml-3">{subAccount.no}</span>
            </div>
            {/* Info: (20241025 - Anna) print:max-w-150px */}
            <div className="table-cell text-center align-middle print:max-w-150px print:bg-neutral-50 print:text-start">
              <div className="flex items-center justify-center font-medium print:justify-start">
                <span className="ml-12 flex items-center print:ml-6">
                  {subAccount.accountingTitle}
                </span>
              </div>
            </div>
            {/* Info: (20241025 - Anna) print:max-w-65px print:px-1 */}
            <div className="table-cell border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold print:max-w-65px print:px-1">
              {subAccount.beginningDebitAmount}
            </div>
            {/* Info: (20241025 - Anna) print:max-w-65px print:px-1 */}
            <div className="table-cell border-l border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold print:max-w-65px print:px-1">
              {subAccount.beginningCreditAmount}
            </div>
            {/* Info: (20241025 - Anna) print:max-w-65px print:px-1 */}
            <div className="table-cell border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold print:max-w-65px print:px-1">
              {subAccount.midtermDebitAmount}
            </div>
            {/* Info: (20241025 - Anna) print:max-w-65px print:px-1 */}
            <div className="table-cell border-l border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold print:max-w-65px print:px-1">
              {subAccount.midtermCreditAmount}
            </div>
            {/* Info: (20241025 - Anna) print:max-w-65px print:px-1 */}
            <div className="table-cell border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold print:max-w-65px print:px-1">
              {subAccount.endingDebitAmount}
            </div>
            {/* Info: (20241025 - Anna) print:max-w-65px print:px-1 */}
            <div className="table-cell border-l border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold print:max-w-65px print:px-1">
              {subAccount.endingCreditAmount}
            </div>
          </div>
        ))}
    </>
  );
});

export default TrialBalanceItemRow;
