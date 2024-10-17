import React, { useState } from 'react';
import { numberWithCommas } from '@/lib/utils/common';
import { checkboxStyle } from '@/constants/display';
import type { TrialBalanceItem } from '@/interfaces/trial_balance';

interface ITrialBalanceItemProps {
  voucher: TrialBalanceItem;
}
const tableCellStyles = 'text-center align-middle';
const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';

const TrialBalanceItemRow = React.memo(({ voucher }: ITrialBalanceItemProps) => {
  const [isChecked, setIsChecked] = useState(false);

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
      <div>
        <p className="m-0 flex items-center">{voucher.no}</p>
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
      <p className="m-0 flex items-center text-text-neutral-primary">
        {numberWithCommas(voucher.beginningDebitAmount)}
      </p>
    </div>
  );

  const displayedBeginningCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-text-neutral-primary">{numberWithCommas(voucher.beginningCreditAmount)}</p>
    </div>
  );
  const displayedMidtermDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-text-neutral-primary">
        {numberWithCommas(voucher.midtermDebitAmount)}
      </p>
    </div>
  );

  const displayedMidtermCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-text-neutral-primary">{numberWithCommas(voucher.midtermCreditAmount)}</p>
    </div>
  );
  const displayedEndingDebitAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="m-0 flex items-center text-text-neutral-primary">
        {numberWithCommas(voucher.endingDebitAmount)}
      </p>
    </div>
  );

  const displayedEndingCreditAmount = (
    <div className="flex h-full items-center justify-end font-normal text-text-neutral-tertiary">
      <p className="text-text-neutral-primary">{numberWithCommas(voucher.endingCreditAmount)}</p>
    </div>
  );

  return (
    <div className="table-row h-20px font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10">
      {/* Info: (20240920 - Julian) Select */}
      <div className={`table-cell w-32px text-center`}>{displayedCheckbox}</div>
      {/* Info: (20241004 - Anna) Accounting */}
      <div className="table-cell w-50px text-center align-middle">{displayedAccountingCode}</div>
      <div className="table-cell w-370px text-center align-middle">{displayedAccountingName}</div>
      {/* Info: (20241009 - Anna) Beginning Debit */}
      <div
        className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')}`}
      >
        {displayedBeginningDebitAmount}
      </div>
      {/* Info: (20241009 - Anna) Beginning Credit */}
      <div
        className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')}`}
      >
        {displayedBeginningCreditAmount}
      </div>
      {/* Info: (20241009 - Anna) Midterm Debit */}
      <div
        className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')}`}
      >
        {displayedMidtermDebitAmount}
      </div>
      {/* Info: (20241009 - Anna) Midterm Credit */}
      <div
        className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')}`}
      >
        {displayedMidtermCreditAmount}
      </div>
      {/* Info: (20241009 - Anna) Ending Debit */}
      <div
        className={`table-cell h-full w-77px border-r border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')}`}
      >
        {displayedEndingDebitAmount}
      </div>
      {/* Info: (20241009 - Anna) Ending Credit */}
      <div
        className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600 ${tableCellStyles} ${sideBorderStyles.replace('border-b', '')} ${sideBorderStyles.replace('border-r', '')}`}
      >
        {displayedEndingCreditAmount}
      </div>
    </div>
  );
});

export default TrialBalanceItemRow;
