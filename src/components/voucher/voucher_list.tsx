import React, { useState } from 'react';
import { BsFillTriangleFill } from 'react-icons/bs';
import { MdOutlineFileDownload } from 'react-icons/md';
import { FaRegTrashAlt } from 'react-icons/fa';
import { Button } from '@/components/button/button';
import VoucherItem from '@/components/voucher/voucher_item';
import Pagination from '@/components/pagination/pagination';
import { checkboxStyle } from '@/constants/display';

enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// Info: (20240920 - Julian) 排序按鈕
const SortingButton = ({
  string,
  sortOrder,
  setSortOrder,
}: {
  string: string;
  sortOrder: null | SortOrder;
  setSortOrder: (sortOrder: null | SortOrder) => void;
}) => {
  // Info: (20240920 - Julian) 初始無排序 -> 點擊後變成 ASC -> 再點擊變成 DESC -> 再點擊變回無排序
  const clickHandler = () => {
    switch (sortOrder) {
      case null:
        setSortOrder(SortOrder.ASC);
        break;
      case SortOrder.ASC:
        setSortOrder(SortOrder.DESC);
        break;
      case SortOrder.DESC:
        setSortOrder(null);
        break;
      default:
        setSortOrder(null);
        break;
    }
  };

  return (
    <button
      id={`sorting-button-${string}`}
      type="button"
      onClick={clickHandler}
      className="flex w-full items-center justify-center gap-4px"
    >
      {/* Info: (20240920 - Julian) 如果有選擇排序，則文字變成橙色 */}
      <p className={sortOrder === null ? '' : 'text-text-brand-primary-lv1'}>{string}</p>
      <div className="flex flex-col gap-px">
        {/* Info: (20240920 - Julian) 向上箭頭：如果為升冪排序，則變成橙色 */}
        <BsFillTriangleFill
          size={8}
          className={
            sortOrder === SortOrder.ASC
              ? 'text-text-brand-primary-lv1'
              : 'text-surface-neutral-mute'
          }
        />
        {/* Info: (20240920 - Julian) 向下箭頭：如果為降冪排序，則變成橙色 */}
        <BsFillTriangleFill
          size={8}
          className={`rotate-180 ${sortOrder === SortOrder.DESC ? 'text-text-brand-primary-lv1' : 'text-surface-neutral-mute'}`}
        />
      </div>
    </button>
  );
};

const VoucherList = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // ToDo: (20240920 - Julian) dummy data
  const totalPage = 10;

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary';

  const selectToggleHandler = () => setIsSelecting((prev) => !prev);

  // Info: (20240920 - Julian) 日期排序按鈕
  const displayedIssuedDate = SortingButton({
    string: 'Issued Date',
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240920 - Julian) credit 排序按鈕
  const displayedCredit = SortingButton({
    string: 'Credit',
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  // Info: (20240920 - Julian) debit 排序按鈕
  const displayedDebit = SortingButton({
    string: 'Debit',
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px">
      {/* Info: (20240920 - Julian) Export Voucher button */}
      <Button type="button" variant="tertiaryOutline">
        <MdOutlineFileDownload />
        <p>Export Voucher</p>
      </Button>
      {/* Info: (20240920 - Julian) Delete button */}
      <div className={isSelecting ? 'block' : 'hidden'}>
        <Button type="button" variant="tertiary" className="h-44px w-44px p-0">
          <FaRegTrashAlt />
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Select All & Cancel button */}
      <button
        type="button"
        className={`${isSelecting ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        Select All
      </button>
      {/* Info: (20240920 - Julian) Cancel selecting button */}
      <button
        type="button"
        onClick={selectToggleHandler}
        className={`${isSelecting ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        Cancel
      </button>
      {/* Info: (20240920 - Julian) Select toggle button */}
      <button
        type="button"
        onClick={selectToggleHandler}
        className={`${isSelecting ? 'hidden' : 'block'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        Select
      </button>
    </div>
  );

  const displayedVoucherList = Array.from({ length: 10 }, (_, i) => i + 1).map((i) => {
    return <VoucherItem key={i} />;
  });

  return (
    <div className="flex flex-col gap-40px">
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}

      {/* Info: (20240920 - Julian) Table */}
      <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group h-60px border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              <input type="checkbox" className={checkboxStyle} />
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedIssuedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Voucher No.</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Note</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Accounting</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedCredit}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDebit}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>Counterparty</div>
            <div className={`${tableCellStyles}`}>Issuer</div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedVoucherList}</div>

        {/* Info: (20240920 - Julian) ---------------- Table Footer(排版用) ---------------- */}
        <div className="table-footer-group h-40px"></div>
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

export default VoucherList;
