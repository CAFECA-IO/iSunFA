import React, { useState } from 'react';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import { checkboxStyle } from '@/constants/display';
import { VoucherType } from '@/constants/account';

// Info: (20241004 - Anna) temp interface
export interface ILedgerBeta {
  id: number;
  date: number;
  voucherNo: string;
  voucherType: VoucherType;
  note: string;
  accounting: {
    code: string;
    name: string;
  }[];
  credit: number[];
  debit: number[];
  balance: number[];
}

interface ILedgerItemProps {
  voucher: ILedgerBeta;
}

const LedgerItem = React.memo(({ voucher }: ILedgerItemProps) => {
  const { date, voucherNo, voucherType, note, accounting, credit, debit } = voucher;

  const [isChecked, setIsChecked] = useState(false);

  // Info: (20240920 - Julian) 借貸總和
  const total = credit.reduce((acc, cur) => acc + cur, 0);

  const displayedCheckbox = (
    <div className="relative top-20px px-8px">
      <input
        type="checkbox"
        className={checkboxStyle}
        checked={isChecked}
        onChange={() => setIsChecked(!isChecked)}
      />
    </div>
  );

  const displayedDate = (
    <div className="relative top-10px">
      <CalendarIcon timestamp={date} />
    </div>
  );

  const displayedVoucherNo =
    voucherType === VoucherType.RECEIVE ? (
      <div className="relative top-20px mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <FaDownload size={14} className="text-surface-state-error-dark" />
        <p className="text-sm text-text-state-error-solid">{voucherNo}</p>
      </div>
    ) : voucherType === VoucherType.EXPENSE ? (
      <div className="relative top-20px mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
        <FaUpload size={14} className="text-surface-state-success-dark" />
        <p className="text-sm text-text-state-success-solid">{voucherNo}</p>
      </div>
    ) : (
      <div className="relative top-20px mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
        <FiRepeat size={14} className="text-surface-brand-secondary" />
        <p className="text-sm text-badge-text-secondary-solid">{voucherNo}</p>
      </div>
    );

  const displayedNote = <p className="relative top-20px">{note}</p>;

  const displayedAccountingCode = (
    <div className="flex flex-col items-center gap-4px py-12px align-middle font-semibold text-text-neutral-tertiary">
      {accounting.map((account) => (
        <div key={account.code}>
          <p>{account.code}</p>
        </div>
      ))}
    </div>
  );
  const displayedAccountingName = (
    <div className="flex flex-col items-center gap-4px py-12px align-middle font-semibold text-text-neutral-tertiary">
      {accounting.map((account) => (
        <div key={account.code}>
          <p>{account.name}</p>
        </div>
      ))}
    </div>
  );

  const displayedCredit = (
    <div className="flex flex-col">
      {/* Info: (20240920 - Julian) credit */}
      {credit.map((cre) => (
        <p key={cre} className="text-text-neutral-primary">
          {numberWithCommas(cre)}
        </p>
      ))}
      {/* Info: (20240920 - Julian) debit */}
      {debit.map((d) => (
        <p key={d} className="text-text-neutral-tertiary">
          0
        </p>
      ))}
    </div>
  );

  const displayedDebit = (
    <>
      <div className="flex flex-col">
        {/* Info: (20240920 - Julian) credit */}
        {credit.map((c) => (
          <p key={c} className="text-text-neutral-tertiary">
            0
          </p>
        ))}
        {/* Info: (20240920 - Julian) debit */}
        {debit.map((de) => (
          <p key={de} className="text-text-neutral-primary">
            {numberWithCommas(de)}
          </p>
        ))}
      </div>
      {/* Info: (20240920 - Julian) Total */}
      <p className="text-text-neutral-primary">{numberWithCommas(total)}</p>
    </>
  );

  const displayedBalance = (
    <div className="flex flex-col">
      {voucher.balance.map((bal) => (
        <p key={`${bal}-${voucher.voucherNo}`} className="align-middle text-text-neutral-primary">
          {numberWithCommas(bal)}
        </p>
      ))}
    </div>
  );

  return (
    <div className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10">
      {/* Info: (20240920 - Julian) Select */}
      <div className={`table-cell text-center`}>{displayedCheckbox}</div>
      {/* Info: (20240920 - Julian) Issued Date */}
      <div className="table-cell text-center">{displayedDate}</div>
      {/* Info: (20241004 - Anna) Accounting */}
      <div className="table-cell text-center">{displayedAccountingCode}</div>
      <div className="table-cell text-center">{displayedAccountingName}</div>
      {/* Info: (20240920 - Julian) Voucher No */}
      <div className="table-cell text-center">{displayedVoucherNo}</div>
      {/* Info: (20240920 - Julian) Note */}
      <div className="table-cell text-center">{displayedNote}</div>
      {/* Info: (20240920 - Julian) Credit */}
      <div className="table-cell py-8px text-right">{displayedCredit}</div>
      {/* Info: (20240920 - Julian) Debit */}
      <div className="table-cell py-8px text-right">{displayedDebit}</div>
      {/* Info: (20241004 - Anna) Balance */}
      <div className="table-cell py-8px text-right">{displayedBalance}</div>
    </div>
  );
});

export default LedgerItem;
