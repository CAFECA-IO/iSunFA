import React from 'react';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { numberWithCommas } from '@/lib/utils/common';
import VoucherLineItem from '@/components/voucher/voucher_line_item';
import { Button } from '@/components/button/button';
import { ILineItemBeta, initialVoucherLine } from '@/interfaces/line_item';
import { IAccount } from '@/interfaces/accounting_account';

interface IVoucherLineBlockProps {
  totalDebit: number;
  totalCredit: number;
  lineItems: ILineItemBeta[];
  setLineItems: React.Dispatch<React.SetStateAction<ILineItemBeta[]>>;
  flagOfClear: boolean;
  flagOfSubmit: boolean;
  isAccountingNull: boolean;
  haveZeroLine: boolean;
  isVoucherLineEmpty: boolean;
}

const VoucherLineBlock: React.FC<IVoucherLineBlockProps> = ({
  totalDebit,
  totalCredit,
  lineItems,
  setLineItems,
  flagOfClear,
  flagOfSubmit,
  isAccountingNull,
  haveZeroLine,
  isVoucherLineEmpty,
}) => {
  const { t } = useTranslation('common');

  // Info: (20241004 - Julian) 如果借貸金額相等且不為 0，顯示綠色，否則顯示紅色
  const totalStyle =
    totalCredit === totalDebit && totalCredit !== 0
      ? 'text-text-state-success-invert'
      : 'text-text-state-error-invert';

  const addNewVoucherLine = () => {
    // Info: (20241001 - Julian) 取得最後一筆的 ID + 1，如果沒有資料就設定為 0
    const newVoucherId = lineItems.length > 0 ? lineItems[lineItems.length - 1].id + 1 : 0;
    setLineItems([...lineItems, { ...initialVoucherLine, id: newVoucherId }]);
  };

  const voucherLines =
    lineItems && lineItems.length > 0 ? (
      lineItems.map((lineItem) => {
        // Info: (20241001 - Julian) 複製傳票列
        const duplicateLineItem = { ...lineItem };

        // Info: (20241001 - Julian) 刪除傳票列
        const deleteVoucherLine = () => {
          setLineItems(lineItems.filter((item) => item.id !== lineItem.id));
        };

        // Info: (20241001 - Julian) 設定 Account title
        const accountTitleHandler = (account: IAccount | null) => {
          duplicateLineItem.account = account;
          setLineItems(
            lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
          );
        };

        // Info: (20241001 - Julian) 設定 Particulars
        const particularsChangeHandler = (particulars: string) => {
          duplicateLineItem.description = particulars;
          setLineItems(
            lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
          );
        };

        // Info: (20241001 - Julian) 設定 Debit
        const debitChangeHandler = (debit: number) => {
          duplicateLineItem.debit = true;
          duplicateLineItem.amount = debit;
          setLineItems(
            lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
          );
        };

        // Info: (20241001 - Julian) 設定 Credit
        const creditChangeHandler = (credit: number) => {
          duplicateLineItem.debit = false;
          duplicateLineItem.amount = credit;
          setLineItems(
            lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
          );
        };
        return (
          <VoucherLineItem
            key={lineItem.id}
            deleteHandler={deleteVoucherLine}
            accountTitleHandler={accountTitleHandler}
            particularsChangeHandler={particularsChangeHandler}
            debitChangeHandler={debitChangeHandler}
            creditChangeHandler={creditChangeHandler}
            flagOfClear={flagOfClear}
            flagOfSubmit={flagOfSubmit}
            accountIsNull={isAccountingNull}
            amountIsZero={haveZeroLine}
            amountNotEqual={totalCredit !== totalDebit}
          />
        );
      })
    ) : (
      <div className="col-start-1 col-end-14 flex w-full flex-col items-center rounded-sm bg-input-surface-input-background py-10px text-xs">
        <p className="text-text-neutral-tertiary">{t('common:COMMON.EMPTY')}</p>
        <p
          className={`${
            isVoucherLineEmpty ? 'text-text-state-error' : 'text-text-neutral-primary'
          }`}
        >
          {t('journal:VOUCHER_LINE_BLOCK.EMPTY_HINT')}
        </p>
      </div>
    );

  return (
    <div id="voucher-line-block" className="col-span-2">
      {/* Info: (20240927 - Julian) Table */}
      <div className="grid w-full grid-cols-13 gap-24px rounded-md bg-surface-brand-secondary-moderate px-24px py-12px">
        {/* Info: (20240927 - Julian) Table Header */}
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.PARTICULARS')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.DEBIT')}
        </div>
        <div className="col-span-3 col-end-14 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.CREDIT')}
        </div>

        {/* Info: (20240927 - Julian) Table Body */}
        {voucherLines}

        {/* Info: (20240927 - Julian) Total calculation */}
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-7 col-end-10 text-right">
          <p className={totalStyle}>{numberWithCommas(totalDebit)}</p>
        </div>
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-11 col-end-13 text-right">
          <p className={totalStyle}>{numberWithCommas(totalCredit)}</p>
        </div>

        {/* Info: (20240927 - Julian) Add button */}
        <div className="col-start-1 col-end-14 text-center">
          <Button type="button" className="h-44px w-44px p-0" onClick={addNewVoucherLine}>
            <FaPlus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoucherLineBlock;
