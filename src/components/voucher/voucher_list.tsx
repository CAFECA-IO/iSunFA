import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { MdOutlineFileDownload } from 'react-icons/md';
import { FaRegTrashAlt } from 'react-icons/fa';
import { Button } from '@/components/button/button';
import VoucherItem from '@/components/voucher/voucher_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import { IVoucherBeta, dummyVoucherList } from '@/interfaces/voucher';

const VoucherList = () => {
  const { t } = useTranslation('common');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  // ToDo: (20240927 - Julian) data filter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [voucherList, setVoucherList] = useState<IVoucherBeta[]>(dummyVoucherList);
  const [isCheckBoxOpen, setIsCheckBoxOpen] = useState(false);
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
  const checkStyle = `${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center align-middle border-r border-stroke-neutral-quaternary`;

  const selectToggleHandler = () => setIsCheckBoxOpen((prev) => !prev);

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
      {/* Info: (20240920 - Julian) Export Voucher button */}
      <Button type="button" variant="tertiaryOutline" onClick={exportVoucherModalVisibilityHandler}>
        <MdOutlineFileDownload />
        <p>{t('journal:VOUCHER.EXPORT_VOUCHER')}</p>
      </Button>
      {/* Info: (20240920 - Julian) Delete button */}
      <div className={isCheckBoxOpen ? 'block' : 'hidden'}>
        <Button type="button" variant="tertiary" className="h-44px w-44px p-0">
          <FaRegTrashAlt />
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Select All & Cancel button */}
      <button
        type="button"
        className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        {t('common:COMMON.SELECT_ALL')}
      </button>
      {/* Info: (20240920 - Julian) Cancel selecting button */}
      <button
        type="button"
        onClick={selectToggleHandler}
        className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        {t('common:COMMON.CANCEL')}
      </button>
      {/* Info: (20240920 - Julian) Select toggle button */}
      <button
        type="button"
        onClick={selectToggleHandler}
        className={`${isCheckBoxOpen ? 'hidden' : 'block'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        {t('common:COMMON.SELECT')}
      </button>
    </div>
  );

  const displayedVoucherList = voucherList.map((voucher) => {
    return <VoucherItem key={voucher.id} voucher={voucher} isCheckBoxOpen={isCheckBoxOpen} />;
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
            <div className={`${checkStyle} border-b border-stroke-neutral-quaternary`}>
              <input type="checkbox" className={checkboxStyle} />
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.NOTE')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.ACCOUNTING')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedCredit}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDebit}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.COUNTRYPARTY')}
            </div>
            <div className={`${tableCellStyles} border-b border-stroke-neutral-quaternary`}>
              {t('journal:VOUCHER.ISSUER')}
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

export default VoucherList;
