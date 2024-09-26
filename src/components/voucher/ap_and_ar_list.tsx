import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import SortingButton from '@/components/voucher/sorting_button';
import APandARItem from '@/components/voucher/ap_and_ar_item';
import Pagination from '@/components/pagination/pagination';
import { SortOrder } from '@/constants/sort';

enum ListType {
  RECEIVABLE = 'Receivable',
  PAYABLE = 'Payable',
}

const APandARList = () => {
  const { t } = useTranslation('common');

  // ToDo: (20240924 - Julian) tabs 切換
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [listType, setListType] = useState<ListType>(ListType.RECEIVABLE);
  const [currentPage, setCurrentPage] = useState(1);
  // Info: (20240924 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  // Info: (20240924 - Julian) Receivable / Payable Amount 排序狀態
  const [receivableAmountSort, setReceivableAmountSort] = useState<null | SortOrder>(null);
  // Info: (20240924 - Julian) Received / Paid Amount 排序狀態
  const [receivedAmountSort, setReceivedAmountSort] = useState<null | SortOrder>(null);
  const [remainAmountSort, setRemainAmountSort] = useState<null | SortOrder>(null);

  // ToDo: (20240924 - Julian) dummy data
  const totalPage = 10;

  // Info: (20240924 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary border-b';

  // Info: (20240924 - Julian) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240924 - Julian) Receivable / Payable Amount 排序按鈕
  const displayedReceivableAmount = SortingButton({
    string:
      listType === ListType.RECEIVABLE
        ? t('journal:VOUCHER.RECEIVABLE_AMOUNT')
        : t('journal:VOUCHER.PAYABLE_AMOUNT'),
    sortOrder: receivableAmountSort,
    setSortOrder: setReceivableAmountSort,
  });

  // Info: (20240924 - Julian) Received / Paid Amount 排序按鈕
  const displayedReceivedAmount = SortingButton({
    string:
      listType === ListType.RECEIVABLE
        ? t('journal:VOUCHER.RECEIVED_AMOUNT')
        : t('journal:VOUCHER.PAID_AMOUNT'),
    sortOrder: receivedAmountSort,
    setSortOrder: setReceivedAmountSort,
  });

  // Info: (20240924 - Julian) Remain Amount 排序按鈕
  const displayedRemainAmount = SortingButton({
    string: t('journal:VOUCHER.REMAIN_AMOUNT'),
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
        <div className="table-header-group h-60px bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.COUNTRYPARTY')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.ISSUER')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {displayedReceivableAmount}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {displayedReceivedAmount}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedRemainAmount}</div>
            <div className={`${tableCellStyles} border-b border-stroke-neutral-quaternary`}>
              {t('journal:VOUCHER.REVERSE')}
            </div>
          </div>
        </div>

        {/* Info: (20240924 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedAPandARList}</div>

        {/* Info: (20240924 - Julian) ---------------- Table Footer(排版用) ---------------- */}
        <div className="table-footer-group h-10px"></div>
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
