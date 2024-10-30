import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';
import { checkboxStyle } from '@/constants/display';
import type { TrialBalanceItem } from '@/interfaces/trial_balance';
import CollapseButton from '@/components/button/collapse_button';

interface ITrialBalanceItemProps {
  voucher: TrialBalanceItem;
  totalExpanded: boolean; // Info: (20241029 - Anna) Receive expanded state from parent
}

const TrialBalanceItemRow = React.memo(({ voucher, totalExpanded }: ITrialBalanceItemProps) => {
  const [isChecked, setIsChecked] = useState(false);
  // Info: (20241025 - Anna) 新增狀態來追蹤按鈕展開狀態
  const [localIsExpanded, setLocalIsExpanded] = useState(totalExpanded); // Info: (20241029 - Anna) 使用解構的 totalExpanded 作為初始值

  // Info: (20241029 - Anna) Update local isExpanded when parent state changes
  useEffect(() => {
    setLocalIsExpanded(totalExpanded);
  }, [totalExpanded]);

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
    <div className="flex h-full items-center justify-center font-normal text-neutral-600">
      <div className="flex items-center justify-between">
        <p className="m-0 flex items-center">{voucher.no}</p>
        {/* Info: (20241025 - Anna) 在 voucher.no 右側加入 CollapseButton */}
        <CollapseButton
          onClick={() => setLocalIsExpanded(!localIsExpanded)} // Info: (20241029 - Anna) 使用 localIsExpanded
          isCollapsed={!localIsExpanded}
        />
      </div>
    </div>
  );
  const displayedAccountingName = (
    <div className="flex h-full items-center justify-center font-normal text-neutral-600">
      <div>
        <p className="m-0 flex items-center">{voucher.accountingTitle}</p>
      </div>
    </div>
  );

  const displayedBeginningDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-neutral-600">
        {numberWithCommas(voucher.beginningDebitAmount)}
      </p>
    </div>
  );

  const displayedBeginningCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-neutral-600">{numberWithCommas(voucher.beginningCreditAmount)}</p>
    </div>
  );
  const displayedMidtermDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-neutral-600">
        {numberWithCommas(voucher.midtermDebitAmount)}
      </p>
    </div>
  );

  const displayedMidtermCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-neutral-600">{numberWithCommas(voucher.midtermCreditAmount)}</p>
    </div>
  );
  const displayedEndingDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-neutral-600">
        {numberWithCommas(voucher.endingDebitAmount)}
      </p>
    </div>
  );

  const displayedEndingCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-neutral-600">{numberWithCommas(voucher.endingCreditAmount)}</p>
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
      {localIsExpanded && (
        <div className="table-row h-20px font-normal">
          <div className="table-cell w-32px text-center">{displayedCheckbox}</div>
          <div className="table-cell w-50px text-center align-middle">
            <span className="ml-6 text-neutral-400">114101</span>
          </div>
          <div className="table-cell w-370px text-center align-middle">
            <div className="flex h-full items-center justify-center font-normal text-neutral-600">
              <span className="ml-12 flex items-center text-neutral-400">應收帳款-A</span>
            </div>
          </div>
          <div className="table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600">
            {numberWithCommas(5000)}
          </div>
          <div className="table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600">
            {numberWithCommas(1000)}
          </div>
          <div className="table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600">
            {numberWithCommas(2000)}
          </div>
          <div className="table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600">
            {numberWithCommas(1500)}
          </div>
          <div className="table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600">
            {numberWithCommas(3000)}
          </div>
          <div className="table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600">
            {numberWithCommas(2500)}
          </div>
        </div>
      )}
    </>
  );
});

export default TrialBalanceItemRow;
