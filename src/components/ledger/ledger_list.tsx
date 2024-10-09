import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import LedgerItem, { ILedgerBeta } from '@/components/ledger/ledger_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import { VoucherType } from '@/constants/account';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';

const dummyVoucherList: ILedgerBeta[] = [
  {
    id: 1,
    date: 1632511200,
    voucherNo: '20240920-0001',
    voucherType: VoucherType.RECEIVE,
    note: 'Printer-0001',
    accounting: [{ code: '1141', name: 'Accounts receivable' }],
    credit: [100200],
    debit: [0],
    balance: [100200],
  },
  {
    id: 2,
    date: 1662511200,
    voucherNo: '20240922-0002',
    voucherType: VoucherType.EXPENSE,
    note: 'Printer-0002',
    accounting: [{ code: '1141', name: 'Accounts receivable' }],
    credit: [0],
    debit: [10200],
    balance: [100200],
  },
  {
    id: 3,
    date: 1672592800,
    voucherNo: '20240925-0001',
    voucherType: VoucherType.RECEIVE,
    note: 'Scanner-0001',
    accounting: [{ code: '1141', name: 'Accounts receivable' }],
    credit: [0],
    debit: [200],
    balance: [100200],
  },
  {
    id: 4,
    date: 1702511200,
    voucherNo: '20240922-0002',
    voucherType: VoucherType.TRANSFER,
    note: 'Mouse-0001',
    accounting: [{ code: '1141', name: 'Accounts receivable' }],
    credit: [300],
    debit: [0],
    balance: [100200],
  },
  {
    id: 5,
    date: 1702511200,
    voucherNo: '20240922-0002',
    voucherType: VoucherType.TRANSFER,
    note: 'Mouse-0001',
    accounting: [{ code: '1141', name: 'Accounts receivable' }],
    credit: [300],
    debit: [0],
    balance: [100200],
  },
  {
    id: 6,
    date: 1702511200,
    voucherNo: '20240922-0002',
    voucherType: VoucherType.TRANSFER,
    note: 'Mouse-0001',
    accounting: [{ code: '1141', name: 'Accounts receivable' }],
    credit: [300],
    debit: [0],
    balance: [100200],
  },
];

const LedgerList = () => {
  const { t } = useTranslation('common');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  // ToDo: (20240927 - Julian) data filter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [voucherList, setVoucherList] = useState<ILedgerBeta[]>(dummyVoucherList);
  const [currentPage, setCurrentPage] = useState(1);
  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // ToDo: (20240920 - Julian) dummy data
  const totalPage = 10;

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';
  //   const checkStyle = `'table-cell' text-center align-middle border-r border-stroke-neutral-quaternary`;

  // Info: (20240920 - Julian) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240920 - Julian) credit 排序按鈕
  const displayedCredit = SortingButton({
    string: t('journal:VOUCHER.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  // Info: (20240920 - Julian) debit 排序按鈕
  const displayedDebit = SortingButton({
    string: t('journal:VOUCHER.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px">
      {/* Info: (20241004 - Anna) Export Voucher button */}
      <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled={false} />
      {/* Info: (20241004 - Anna) PrintButton */}
      <PrintButton onClick={() => {}} disabled={false} />
    </div>
  );

  const displayedVoucherList = voucherList.map((voucher) => {
    return <LedgerItem key={voucher.id} voucher={voucher} />;
  });

  return (
    <div className="flex flex-col gap-40px">
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}

      {/* Info: (20240920 - Julian) Table */}
      <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group h-60px border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${tableCellStyles} border-b border-r`}>
              <div className="flex items-center justify-center">
                {/* <div className="ml-4 text-center align-middle"> */}
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('common:COMMON.CODE')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.ACCOUNTING')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.NOTE')}
            </div>
            {/* Info: (20241004 - Anna) Only show if debit is not zero */}
            {voucherList.some((voucher) => voucher.debit.some((d) => d !== 0)) && (
              <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDebit}</div>
            )}
            {/* Info: (20241004 - Anna) Only show if credit is not zero */}
            {voucherList.some((voucher) => voucher.credit.some((c) => c !== 0)) && (
              <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedCredit}</div>
            )}
            <div className={`${tableCellStyles} ${sideBorderStyles.replace('border-r', '')}`}>
              {t('journal:VOUCHER.BALANCE')}
            </div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedVoucherList}</div>
      </div>

      {/* Info: (20240920 - Julian) Pagination */}
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

export default LedgerList;
