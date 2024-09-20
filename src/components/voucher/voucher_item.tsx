import Image from 'next/image';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import { checkboxStyle } from '@/constants/display';

enum VoucherType {
  RECEIVED = 'Received',
  PAYMENT = 'Payment',
  TRANSFER = 'Transfer',
}

const VoucherItem = () => {
  // ToDo: (20240920 - Julian) dummy data
  const date: number = new Date().getTime() / 1000;
  const voucherNo: string = '20240920-0001';
  const voucherType: VoucherType = VoucherType.RECEIVED;
  const note: string = 'Printer-0001';
  const accounting: string[] = [
    '1141 Accounts receivable',
    '1141 Accounts receivable',
    '1141 Accounts receivable',
  ];
  const credit: number[] = [100200];
  const debit: number[] = [100000, 200];
  const counterparty = {
    code: '59373022',
    name: 'PX Mart',
  };
  const issuer = {
    avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
    name: 'Julian',
  };

  // Info: (20240920 - Julian) 借貸總和
  const total = credit.reduce((acc, cur) => acc + cur, 0);

  const displayedCheckbox = (
    <div className="relative top-20px px-8px">
      <input type="checkbox" className={checkboxStyle} />
    </div>
  );

  const displayedDate = (
    <div className="relative top-10px">
      <CalendarIcon timestamp={date} />
    </div>
  );

  const displayedVoucherNo =
    voucherType === VoucherType.RECEIVED ? (
      <div className="relative top-20px mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <FaDownload size={14} className="text-surface-state-error-dark" />
        <p className="text-sm text-text-state-error-solid">{voucherNo}</p>
      </div>
    ) : voucherType === VoucherType.PAYMENT ? (
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

  const displayedAccounting = (
    <div className="relative top-20px flex flex-col items-center gap-4px py-12px font-semibold text-text-neutral-tertiary">
      {accounting.map((account) => (
        <p key={account}>{account}</p>
      ))}
    </div>
  );

  const displayedCredit = (
    <>
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
      <hr className="my-10px border-divider-stroke-lv-1" />
    </>
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
      <hr className="my-10px border-divider-stroke-lv-1" />
      {/* Info: (20240920 - Julian) Total */}
      <p className="text-text-neutral-primary">{numberWithCommas(total)}</p>
    </>
  );

  const displayedCounterparty = (
    <div className="relative top-20px flex flex-col items-center gap-4px">
      <p className="text-text-neutral-tertiary">{counterparty.code}</p>
      <p className="text-text-neutral-primary">{counterparty.name}</p>
    </div>
  );

  const displayedIssuer = (
    <div className="relative top-20px flex items-center justify-center gap-4px text-text-neutral-primary">
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      <p>{issuer.name}</p>
    </div>
  );

  return (
    <div className="table-row font-medium">
      {/* Info: (20240920 - Julian) Select */}
      <div className="table-cell text-center">{displayedCheckbox}</div>
      {/* Info: (20240920 - Julian) Issued Date */}
      <div className="table-cell text-center">{displayedDate}</div>
      {/* Info: (20240920 - Julian) Voucher No */}
      <div className="table-cell text-center">{displayedVoucherNo}</div>
      {/* Info: (20240920 - Julian) Note */}
      <div className="table-cell text-center">{displayedNote}</div>
      {/* Info: (20240920 - Julian) Accounting */}
      <div className="table-cell">{displayedAccounting}</div>
      {/* Info: (20240920 - Julian) Credit */}
      <div className="table-cell py-8px text-right">{displayedCredit}</div>
      {/* Info: (20240920 - Julian) Debit */}
      <div className="table-cell py-8px text-right">{displayedDebit}</div>
      {/* Info: (20240920 - Julian) Counterparty */}
      <div className="table-cell">{displayedCounterparty}</div>
      {/* Info: (20240920 - Julian) Issuer */}
      <div className="table-cell">{displayedIssuer}</div>
    </div>
  );
};

export default VoucherItem;
