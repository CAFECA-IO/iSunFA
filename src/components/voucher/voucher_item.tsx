import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import { checkboxStyle } from '@/constants/display';
import { VoucherType } from '@/constants/account';
import { IVoucherUI } from '@/interfaces/voucher';

interface IVoucherItemProps {
  voucher: IVoucherUI;
  selectHandler: (id: number) => void;
  isCheckBoxOpen: boolean; // Info: (20241022 - Julian) checkbox 是否顯示
}

const VoucherItem: React.FC<IVoucherItemProps> = ({ voucher, selectHandler, isCheckBoxOpen }) => {
  const {
    voucherDate,
    voucherNo,
    voucherType,
    note,
    counterParty,
    issuer,
    unRead,
    lineItemsInfo,
    isSelected,
  } = voucher;

  // Info: (20240920 - Julian) 借貸總和
  const total = lineItemsInfo.sum.amount ?? 0;

  // Info: (20241022 - Julian) checkbox click handler
  const checkboxHandler = () => selectHandler(voucher.id);

  const displayedDate = (
    <div className="relative top-10px flex justify-center">
      <CalendarIcon timestamp={voucherDate} unRead={unRead} />
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

  // Info: (20241220 - Julian) 借方排在前面，貸方排在後面
  const lineItems = lineItemsInfo.lineItems.sort((a, b) => {
    if (a.debit && !b.debit) return -1; // Info: (20241220 - Julian) 若 a 為借方，b 為貸方，把 a 排在前面
    if (!a.debit && b.debit) return 1; // Info: (20241220 - Julian) 若 a 為貸方，b 為借方，把 b 排在前面
    return 0; // Info: (20241220 - Julian) 若 a 與 b 同為借方或同為貸方，保持原本順序
  });

  //  Info: (20241220 - Julian) 會計科目
  const accounting = lineItems.map((item) => item.account);

  // Info: (20241220 - Julian) 借貸金額
  const credit = lineItems.map((item) => (item.debit ? 0 : item.amount));
  const debit = lineItems.map((item) => (item.debit ? item.amount : 0));

  const displayedAccounting = (
    <div className="flex flex-col items-center gap-4px py-12px font-semibold text-text-neutral-tertiary">
      {accounting.map((account) => (
        <p key={account?.code}>
          {account?.code} - {account?.name}
        </p>
      ))}
    </div>
  );

  const displayedDebit = (
    <>
      <div className="flex flex-col text-right">
        {debit.map((de) => (
          <p
            key={de}
            className={de === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {numberWithCommas(de)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
    </>
  );

  const displayedCredit = (
    <>
      <div className="flex flex-col text-right">
        {credit.map((cre) => (
          <p
            key={cre}
            className={cre === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {numberWithCommas(cre)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
      {/* Info: (20240920 - Julian) Total */}
      <p className="text-right text-text-neutral-primary">{numberWithCommas(total)}</p>
    </>
  );

  const displayedCounterparty = (
    <div className="relative top-20px flex flex-col items-center gap-4px">
      <p className="text-text-neutral-tertiary">{counterParty.companyId}</p>
      <p className="text-text-neutral-primary">{counterParty.name}</p>
    </div>
  );

  const displayedIssuer = (
    <div className="relative top-20px flex items-center justify-center gap-4px text-text-neutral-primary">
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      <p>{issuer.name}</p>
    </div>
  );

  return (
    <Link
      href={`/users/accounting/${voucher.id}`}
      className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240920 - Julian) Select */}
      <div className={`${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center`}>
        <div className="relative top-20px px-8px">
          <input
            type="checkbox"
            className={checkboxStyle}
            checked={isSelected}
            onClick={(e) => e.stopPropagation()} // Info: (20241220 - Julian) 防止點擊 checkbox 時觸發 Link
            onChange={checkboxHandler}
          />
        </div>
      </div>
      {/* Info: (20240920 - Julian) Issued Date */}
      <div className="table-cell text-center">{displayedDate}</div>
      {/* Info: (20240920 - Julian) Voucher No */}
      <div className="table-cell text-center">{displayedVoucherNo}</div>
      {/* Info: (20240920 - Julian) Note */}
      <div className="table-cell text-center">{displayedNote}</div>
      {/* Info: (20240920 - Julian) Accounting */}
      <div className="table-cell">{displayedAccounting}</div>
      {/* Info: (20240920 - Julian) Debit */}
      <div className="table-cell">{displayedDebit}</div>
      {/* Info: (20240920 - Julian) Credit */}
      <div className="table-cell">{displayedCredit}</div>
      {/* Info: (20240920 - Julian) Counterparty */}
      <div className="table-cell">{displayedCounterparty}</div>
      {/* Info: (20240920 - Julian) Issuer */}
      <div className="table-cell">{displayedIssuer}</div>
    </Link>
  );
};

export default VoucherItem;
