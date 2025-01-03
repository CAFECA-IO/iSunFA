import React from 'react';
import { useTranslation } from 'next-i18next';
import SortingButton from '@/components/voucher/sorting_button';
import PayableReceivableVoucherItem from '@/components/voucher/payable_receivable_voucher_item';
import { SortOrder } from '@/constants/sort';
import { IVoucherBeta } from '@/interfaces/voucher';
import { PayableReceivableTabs } from '@/constants/voucher';

interface IPayableReceivableVoucherListProps {
  voucherList: IVoucherBeta[];
  activeTab: PayableReceivableTabs;
  dateSort: SortOrder | null;
  payReceiveSort: SortOrder | null;
  payReceiveAlreadyHappenedSort: SortOrder | null;
  remainSort: SortOrder | null;
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setPayReceiveSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setPayReceiveAlreadyHappenedSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setRemainSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
}

const PayableReceivableVoucherList: React.FC<IPayableReceivableVoucherListProps> = ({
  voucherList,
  activeTab,
  dateSort,
  payReceiveSort,
  payReceiveAlreadyHappenedSort,
  remainSort,
  setDateSort,
  setPayReceiveSort,
  setPayReceiveAlreadyHappenedSort,
  setRemainSort,
}) => {
  const { t } = useTranslation('common');

  // Info: (20240924 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary border-b';

  // Info: (20240924 - Julian) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
    handleReset: () => {
      setPayReceiveSort(null);
      setPayReceiveAlreadyHappenedSort(null);
      setRemainSort(null);
    },
  });

  // Info: (20240924 - Julian) Receivable / Payable Amount 排序按鈕
  const displayedReceivableAmount = SortingButton({
    string:
      activeTab === PayableReceivableTabs.RECEIVING
        ? t('journal:VOUCHER.RECEIVABLE_AMOUNT')
        : t('journal:VOUCHER.PAYABLE_AMOUNT'),
    sortOrder: payReceiveSort,
    setSortOrder: setPayReceiveSort,
    handleReset: () => {
      setDateSort(null);
      setPayReceiveAlreadyHappenedSort(null);
      setRemainSort(null);
    },
  });

  // Info: (20240924 - Julian) Received / Paid Amount 排序按鈕
  const displayedReceivedAmount = SortingButton({
    string:
      activeTab === PayableReceivableTabs.RECEIVING
        ? t('journal:VOUCHER.RECEIVED_AMOUNT')
        : t('journal:VOUCHER.PAID_AMOUNT'),
    sortOrder: payReceiveAlreadyHappenedSort,
    setSortOrder: setPayReceiveAlreadyHappenedSort,
    handleReset: () => {
      setDateSort(null);
      setPayReceiveSort(null);
      setRemainSort(null);
    },
  });

  // Info: (20240924 - Julian) Remain Amount 排序按鈕
  const displayedRemainAmount = SortingButton({
    string: t('journal:VOUCHER.REMAIN_AMOUNT'),
    sortOrder: remainSort,
    setSortOrder: setRemainSort,
    handleReset: () => {
      setDateSort(null);
      setPayReceiveSort(null);
      setPayReceiveAlreadyHappenedSort(null);
    },
  });

  const displayedList = voucherList.map((voucher) => (
    <PayableReceivableVoucherItem key={voucher.id} activeTab={activeTab} voucherData={voucher} />
  ));

  return (
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
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedReceivedAmount}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedRemainAmount}</div>
          <div className={`${tableCellStyles} border-b border-stroke-neutral-quaternary`}>
            {t('journal:VOUCHER.REVERSE')}
          </div>
        </div>
      </div>

      {/* Info: (20240924 - Julian) ---------------- Table Body ---------------- */}
      <div className="table-row-group">{displayedList}</div>
    </div>
  );
};

export default PayableReceivableVoucherList;
