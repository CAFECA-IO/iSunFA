import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import LedgerItem, { ILedgerBeta } from '@/components/ledger/ledger_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import { VoucherType } from '@/constants/account';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { ILedgerPayload } from '@/interfaces/ledger';

// Info: (20241101 - Anna) 將 dummyVoucherList 註解掉，改為使用 API 回傳的資料
// const dummyVoucherList: ILedgerBeta[] = [
//   {
//     id: 1,
//     date: 1632511200,
//     voucherNo: '20240920-0001',
//     voucherType: VoucherType.RECEIVE,
//     note: 'Printer-0001',
//     accounting: [{ code: '1141', name: 'Accounts receivable' }],
//     credit: [100200],
//     debit: [0],
//     balance: [100200],
//   },
//   {
//     id: 2,
//     date: 1662511200,
//     voucherNo: '20240922-0002',
//     voucherType: VoucherType.EXPENSE,
//     note: 'Printer-0002',
//     accounting: [{ code: '1141', name: 'Accounts receivable' }],
//     credit: [0],
//     debit: [10200],
//     balance: [100200],
//   },
//   {
//     id: 3,
//     date: 1672592800,
//     voucherNo: '20240925-0001',
//     voucherType: VoucherType.RECEIVE,
//     note: 'Scanner-0001',
//     accounting: [{ code: '1141', name: 'Accounts receivable' }],
//     credit: [0],
//     debit: [200],
//     balance: [100200],
//   },
//   {
//     id: 4,
//     date: 1702511200,
//     voucherNo: '20240922-0002',
//     voucherType: VoucherType.TRANSFER,
//     note: 'Mouse-0001',
//     accounting: [{ code: '1141', name: 'Accounts receivable' }],
//     credit: [300],
//     debit: [0],
//     balance: [100200],
//   },
//   {
//     id: 5,
//     date: 1702511200,
//     voucherNo: '20240922-0002',
//     voucherType: VoucherType.TRANSFER,
//     note: 'Mouse-0001',
//     accounting: [{ code: '1141', name: 'Accounts receivable' }],
//     credit: [300],
//     debit: [0],
//     balance: [100200],
//   },
//   {
//     id: 6,
//     date: 1702511200,
//     voucherNo: '20240922-0002',
//     voucherType: VoucherType.TRANSFER,
//     note: 'Mouse-0001',
//     accounting: [{ code: '1141', name: 'Accounts receivable' }],
//     credit: [300],
//     debit: [0],
//     balance: [100200],
//   },
// ];

const LedgerList = () => {
  const { t } = useTranslation('common');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [totalDebitAmount, setTotalDebitAmount] = useState<number>(0); // Info: (20241101 - Anna) 初始值設為 0
  const [totalCreditAmount, setTotalCreditAmount] = useState<number>(0); // Info: (20241101 - Anna) 初始值設為 0

  const { selectedCompany, isAuthLoading } = useUserCtx(); // (20241101 - Anna) 從 useUserCtx 取得 companyId

  // ToDo: (20240927 - Julian) data filter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // Info: (20241101 - Anna) 初始化帳本資料的狀態管理
  // const [voucherList, setVoucherList] = useState<ILedgerBeta[]>(dummyVoucherList);
  const [voucherList, setVoucherList] = useState<ILedgerBeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // (20241101 - Anna) 動態 totalPages 狀態
  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'text-center align-middle';
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
    string: t('journal:JOURNAL.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  // Info: (20240920 - Julian) debit 排序按鈕
  const displayedDebit = SortingButton({
    string: t('journal:JOURNAL.DEBIT'),
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

  // Info: (20241101 - Anna) 使用 useCallback 包裝 API 請求函式
  const fetchLedgerData = useCallback(async () => {
    if (isAuthLoading || !selectedCompany?.id) return;

    const response = await fetch(
      `/api/v2/company/${selectedCompany.id}/ledger?page=${currentPage}`
    );
    if (response.ok) {
      const data: ILedgerPayload = await response.json();
      const transformedData: ILedgerBeta[] = data.items.data.map((item) => ({
        id: item.id,
        date: item.voucherDate,
        voucherNo: item.voucherNumber,
        voucherType: VoucherType.RECEIVE, // Todo: (20241101 - Anna) 假設有一種默認類型，待後端補充欄位後可改為動態值
        note: item.particulars,
        accounting: [{ code: item.no, name: item.accountingTitle }],
        credit: [item.creditAmount],
        debit: [item.debitAmount],
        balance: [item.balance],
      }));
      setVoucherList(transformedData); // Info: (20241101 - Anna) 更新為符合 ILedgerBeta 的轉換後數據
      setTotalPages(data.items.totalPages);
      setTotalDebitAmount(data.total.totalDebitAmount);
      setTotalCreditAmount(data.total.totalCreditAmount);
    } else {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch ledger data.');
    }
  }, [isAuthLoading, selectedCompany?.id, currentPage]);

  // Info: (20241101 - Anna) 使用 useEffect 依賴 currentPage 和 selectedCompany 變化時觸發 API 請求**
  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  const displayedVoucherList = voucherList.map((voucher) => {
    return <LedgerItem key={voucher.id} voucher={voucher} />;
  });

  return (
    <div className="flex flex-col">
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}

      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div className={`table-cell ${tableCellStyles} border-b border-r`}>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {displayedDate}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('common:COMMON.CODE')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.NOTE')}
            </div>
            {voucherList.some((voucher) => voucher.debit.some((d) => d !== 0)) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedDebit}
              </div>
            )}
            {voucherList.some((voucher) => voucher.credit.some((c) => c !== 0)) && (
              <div className={`table-cell ${tableCellStyles} ${sideBorderStyles}`}>
                {displayedCredit}
              </div>
            )}
            <div
              className={`table-cell ${tableCellStyles} ${sideBorderStyles.replace('border-r', '')}`}
            >
              {t('journal:VOUCHER.BALANCE')}
            </div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedVoucherList}</div>
      </div>

      <div className="h-px w-full bg-neutral-100"></div>

      {/* Info: (20241009 - Anna) 加總數字的表格 */}
      <div className="mb-10 mt-4 grid h-70px grid-cols-9 overflow-hidden rounded-b-lg border-b border-t-0 bg-surface-neutral-surface-lv2 text-sm text-text-neutral-tertiary">
        {/* Info: (20241009 - Anna) 表格內容 */}
        <div className="col-span-1"></div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base">
          Total Debit amount
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base text-neutral-600">
          {totalDebitAmount}
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base">
          Total Credit amount
        </div>
        <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle text-base text-neutral-600">
          {totalCreditAmount}
        </div>
      </div>

      {/* Info: (20240920 - Julian) Pagination */}
      <div className="mx-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default LedgerList;
