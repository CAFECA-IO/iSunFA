import React, { useState } from 'react';
import SortingButton from '@/components/voucher/sorting_button';
import APandARItem from '@/components/voucher/ap_and_ar_item';
import Pagination from '@/components/pagination/pagination';
import { SortOrder } from '@/constants/sort';

enum ListType {
  RECEIVABLE = 'Receivable',
  PAYABLE = 'Payable',
}

const APandARList = () => {
  // ToDo: (20240924 - Julian) tabs 切換
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [listType, setListType] = useState<ListType>(ListType.RECEIVABLE);
  const [currentPage, setCurrentPage] = useState(1);
  // Info: (20240924 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [receivableAmountSort, setReceivableAmountSort] = useState<null | SortOrder>(null);
  const [receivedAmountSort, setReceivedAmountSort] = useState<null | SortOrder>(null);
  const [remainAmountSort, setRemainAmountSort] = useState<null | SortOrder>(null);

  // ToDo: (20240924 - Julian) dummy data
  const totalPage = 10;

  // Info: (20240924 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary';

  // Info: (20240924 - Julian) 日期排序按鈕
  const displayedIssuedDate = SortingButton({
    string: 'Issued Date',
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240924 - Julian) Receivable Amount 排序按鈕
  const displayedReceivableAmount = SortingButton({
    string: 'Receivable Amount',
    sortOrder: receivableAmountSort,
    setSortOrder: setReceivableAmountSort,
  });

  // Info: (20240924 - Julian) Received Amount 排序按鈕
  const displayedReceivedAmount = SortingButton({
    string: 'Received Amount',
    sortOrder: receivedAmountSort,
    setSortOrder: setReceivedAmountSort,
  });

  // Info: (20240924 - Julian) Remain Amount 排序按鈕
  const displayedRemainAmount = SortingButton({
    string: 'Remain Amount',
    sortOrder: remainAmountSort,
    setSortOrder: setRemainAmountSort,
  });

  const displayedAPandARList = Array.from({ length: 10 }, (_, i) => i + 1).map((i) => {
    return <APandARItem key={i} />;
  });

  return (
    <div className="flex flex-col gap-40px">
      {/* Info: (20240924 - Julian) Table */}
      <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240924 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group h-60px border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedIssuedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Voucher No.</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Counterparty</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Issuer</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {displayedReceivableAmount}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {displayedReceivedAmount}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedRemainAmount}</div>
            <div className={`${tableCellStyles}`}>Reverse</div>
          </div>
        </div>

        {/* Info: (20240924 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedAPandARList}</div>

        {/* Info: (20240924 - Julian) ---------------- Table Footer(排版用) ---------------- */}
        <div className="table-footer-group h-40px"></div>
      </div>

      {/* Info: (20240924 - Julian) Pagination */}
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

export default APandARList;
