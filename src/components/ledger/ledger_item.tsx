import React from 'react';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import { EventType, VoucherType } from '@/constants/account';
import Link from 'next/link';

// Info: (20241004 - Anna) temp interface
export interface ILedgerBeta {
  id: number;
  voucherDate: number;
  voucherNumber: string;
  voucherType: VoucherType | EventType;
  particulars: string;
  no: string;
  accountingTitle: string;
  creditAmount: string;
  debitAmount: string;
  balance: string;
  voucherId: number;
}

interface ILedgerItemProps {
  ledger: ILedgerBeta; // Info: (20241118 - Anna) 傳入單個 ledger 作為 prop
  selectedDateRange: { startTimeStamp: number; endTimeStamp: number };
  selectedStartAccountNo: string;
  selectedEndAccountNo: string;
  selectedReportType: string;
}

const LedgerItem = React.memo(function LedgerItem({
  ledger,
  selectedDateRange,
  selectedStartAccountNo,
  selectedEndAccountNo,
  selectedReportType,
}: ILedgerItemProps) {
  const { voucherDate, voucherNumber, voucherType, particulars, voucherId } = ledger;

  const displayedDate = (
    <div className="flex h-full items-center justify-center py-4">
      <CalendarIcon timestamp={voucherDate} incomplete={false} />
    </div>
  );

  const linkHref = {
    pathname: `/users/accounting/${voucherId}?voucherNo=${voucherNumber}`, // Info: (20250226 - Anna) 傳票詳細頁面路徑
    query: {
      from: 'ledger', // Info: (20241225 - Anna) from=ledger 為了返回時能回到分類帳頁面
      startDate: selectedDateRange.startTimeStamp,
      endDate: selectedDateRange.endTimeStamp,
      startAccountNo: selectedStartAccountNo,
      endAccountNo: selectedEndAccountNo,
      labelType: selectedReportType,
      voucherNo: voucherNumber,
    },
  };

  const displayedVoucherNo =
    voucherType === VoucherType.RECEIVE ? (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px print:origin-left print:scale-75">
        {/* Info: (20250521 - Anna) icon (md以下) */}
        <FaDownload size={10} className="text-surface-state-error-dark md:hidden" />
        <p className="text-text-state-error-solid">{voucherNumber}</p>
      </div>
    ) : voucherType === VoucherType.EXPENSE ? (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px print:origin-left print:scale-75">
        {/* Info: (20250521 - Anna) icon (md以下) */}
        <FaUpload size={10} className="text-surface-state-success-dark md:hidden" />
        <p className="text-text-state-success-solid">{voucherNumber}</p>
      </div>
    ) : (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px print:origin-left print:scale-75">
        {/* Info: (20250521 - Anna) icon (md以下) */}
        <FiRepeat size={10} className="text-navy-blue-400 md:hidden" />
        <p className="text-badge-text-secondary-solid">{voucherNumber}</p>
      </div>
    );

  const displayedNote = (
    <p className="flex h-full items-center justify-start px-1 font-normal text-text-neutral-tertiary">
      {particulars === '' ? '-' : particulars}
    </p>
  );

  const displayedAccountingCode = (
    <p className="font-medium text-text-neutral-primary">{ledger.no}</p>
  );

  const displayedAccountingName = (
    <p className="w-full truncate font-medium text-text-neutral-primary">
      {ledger.accountingTitle}
    </p>
  );

  // Info: (20241118 - Anna) 使用傳入的 creditAmount、debitAmount、balance，而非 ledgerItemsData 的遍歷
  const displayedCredit = (
    <p className="font-semibold text-text-neutral-primary">{ledger.creditAmount}</p>
  );

  const displayedDebit = (
    <p className="font-semibold text-text-neutral-primary">{ledger.debitAmount}</p>
  );

  const displayedBalance = (
    <p className="font-semibold text-text-neutral-primary">{ledger.balance}</p>
  );

  return (
    <Link
      href={linkHref}
      className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10 print:text-xs"
      // Info: (20241206 - Anna) 避免行內換頁
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Info: (20240920 - Julian) Issued Date */}
      <div className="table-cell text-center">{displayedDate}</div>
      {/* Info: (20241004 - Anna) Accounting */}
      <div className="table-cell text-center align-middle">{displayedAccountingCode}</div>
      <div className="table-cell text-center align-middle print:hidden">
        {displayedAccountingName}
      </div>
      {/* Info: (20240920 - Julian) Voucher No */}
      <div className="table-cell p-8px text-center align-middle print:p-0">
        {displayedVoucherNo}
      </div>
      {/* Info: (20240920 - Julian) Note */}
      <div className="table-cell p-8px text-left align-middle print:p-2px">{displayedNote}</div>
      {/* Info: (202401101 - Anna) Debit */}
      <div className="table-cell p-8px text-right align-middle">{displayedDebit}</div>
      {/* Info: (202401101 - Anna) Credit */}
      <div className="table-cell p-8px text-right align-middle">{displayedCredit}</div>
      {/* Info: (20241004 - Anna) Balance */}
      <div className="table-cell p-8px text-right align-middle">{displayedBalance}</div>
    </Link>
  );
});

export default LedgerItem;
