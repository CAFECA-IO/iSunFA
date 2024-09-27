import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiBookOpen } from 'react-icons/fi';
import { LuTrash2 } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import { numberWithCommas } from '@/lib/utils/common';

const VoucherLineItem = () => {
  // ToDo: (20240927 - Julian) Implement accounting
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [accounting, setAccounting] = useState<string>('');
  const [particulars, setParticulars] = useState<string>('');
  const [debit, setDebit] = useState<number>(0);
  const [credit, setCredit] = useState<number>(0);

  const particularsChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticulars(e.target.value);
  };
  const creditChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredit(Number(e.target.value));
  };
  const debitChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebit(Number(e.target.value));
  };

  return (
    <>
      {/* Info: (20240927 - Julian) Accounting */}
      <div className="col-span-3 flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-input-text-input-filled outline-none">
        <p>Accounting</p>
        <FiBookOpen size={20} />
      </div>
      {/* Info: (20240927 - Julian) Particulars */}
      <input
        value={particulars}
        onChange={particularsChangeHandler}
        className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-input-text-input-filled outline-none"
      />
      {/* Info: (20240927 - Julian) Debit */}
      <input
        value={debit}
        onChange={debitChangeHandler}
        placeholder="0"
        className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-right text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
      />
      {/* Info: (20240927 - Julian) Credit */}
      <input
        value={credit}
        onChange={creditChangeHandler}
        placeholder="0"
        className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-right text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
      />
      {/* Info: (20240927 - Julian) Delete button */}
      <div className="text-center text-stroke-neutral-invert hover:text-button-text-primary-hover">
        <button type="button" className="p-12px">
          <LuTrash2 size={22} />
        </button>
      </div>
    </>
  );
};

const VoucherLineBlock = () => {
  // ToDo: (20240927 - Julian) Implement total calculation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalCredit, setTotalCredit] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalDebit, setTotalDebit] = useState<number>(0);

  const totalStyle =
    totalCredit === totalDebit ? 'text-text-state-success-invert' : 'text-text-state-error-invert';

  const voucherLines = Array.from({ length: 5 }, (_, index) => <VoucherLineItem key={index} />);

  return (
    <div className="col-span-2">
      {/* Info: (20240927 - Julian) Table */}
      <div className="grid w-full grid-cols-13 gap-24px rounded-md bg-surface-brand-secondary-moderate px-24px py-12px">
        {/* Info: (20240927 - Julian) Table Header */}
        <div className="col-span-3 font-semibold text-text-neutral-invert">Accounting</div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">Particulars</div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">Debit</div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">Credit</div>
        <div className=""></div>

        {/* Info: (20240927 - Julian) Table Body */}
        {voucherLines}

        {/* Info: (20240927 - Julian) Total calculation */}
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-7 col-end-10 text-right">
          <p className={totalStyle}>{numberWithCommas(totalCredit)}</p>
        </div>
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-11 col-end-13 text-right">
          <p className={totalStyle}>{numberWithCommas(totalDebit)}</p>
        </div>

        {/* Info: (20240927 - Julian) Add button */}
        <div className="col-start-1 col-end-14 text-center">
          <Button type="button" className="h-44px w-44px p-0">
            <FaPlus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoucherLineBlock;
