import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiBookOpen } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import VoucherLineItem from '@/components/voucher/voucher_line_item';
import { Button } from '@/components/button/button';
import {
  ILineItemBeta,
  ILineItemUI,
  //  IReverseItemUI,
  initialVoucherLine,
} from '@/interfaces/line_item';
// import { IAccount } from '@/interfaces/accounting_account';
import { inputStyle } from '@/constants/display';
import { LuTrash2 } from 'react-icons/lu';
import { AccountCodesOfAPandAR, AccountCodesOfAsset } from '@/constants/asset';
import { useHotkeys } from 'react-hotkeys-hook';

interface IVoucherLineBlockProps {
  lineItems: ILineItemUI[];
  setLineItems: React.Dispatch<React.SetStateAction<ILineItemUI[]>>;

  flagOfClear: boolean; // Info: (20241104 - Julian) 判斷是否按下清除按鈕
  flagOfSubmit: boolean; // Info: (20241104 - Julian) 判斷是否按下送出按鈕

  isShowReverseHint: boolean; // Info: (20250304 - Julian) 是否顯示反轉提示

  setIsTotalZero: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷總借貸金額是否為 0
  setIsTotalNotEqual: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷總借貸金額是否不相等
  setHaveZeroLine: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷是否有金額為 0 的傳票列
  setIsAccountingNull: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷是否有空的會計科目
  setIsVoucherLineEmpty: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷是否傳票列為空
  setIsCounterpartyRequired: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷是否需要交易對象
  setIsAssetRequired: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷是否需要資產
}

interface IVoucherLinePreviewProps {
  totalDebit: number;
  totalCredit: number;
  lineItems: ILineItemBeta[];
}

const VoucherLineBlock: React.FC<IVoucherLineBlockProps> = ({
  lineItems,
  setLineItems,

  flagOfClear,
  flagOfSubmit,

  isShowReverseHint,

  setIsTotalZero,
  setIsTotalNotEqual,
  setHaveZeroLine,
  setIsAccountingNull,
  setIsVoucherLineEmpty,
  setIsCounterpartyRequired,
  setIsAssetRequired,
}) => {
  const { t } = useTranslation('common');

  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);

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

  // Info: (20241125 - Julian) Ctrl + Enter 新增傳票列
  const handleCtrlEnter = (event: KeyboardEvent) => {
    event.preventDefault();
    addNewVoucherLine();
  };

  useHotkeys('ctrl+enter', handleCtrlEnter);

  // Info: (20241004 - Julian) 傳票列條件
  useEffect(() => {
    // Info: (20250818 - Shirley) 計算總借貸金額 - 使用 DecimalOperations 保持精確度
    const debitAmounts = lineItems
      .filter((item) => item.debit === true)
      .map((item) => item.amount);
    const debitTotal = DecimalOperations.sum(debitAmounts);

    const creditAmounts = lineItems
      .filter((item) => item.debit === false)
      .map((item) => item.amount);
    const creditTotal = DecimalOperations.sum(creditAmounts);

    // Info: (20241004 - Julian) 檢查是否有未填的數字的傳票列
    const zeroLine = lineItems.some((item) => DecimalOperations.isZero(item.amount) || item.debit === null);
    // Info: (20241004 - Julian) 檢查是否有未選擇的會計科目
    const accountingNull = lineItems.some((item) => item.account === null);

    // Info: (20241009 - Julian) 會計科目有應收付帳款時，顯示 Counterparty
    const isAPorAR = lineItems.some((item) => {
      return AccountCodesOfAPandAR.includes(item.account?.code || '');
    });

    // Info: (20241009 - Julian) 會計科目有資產時，顯示 Asset
    const isAsset = lineItems.some((item) => {
      return AccountCodesOfAsset.includes(item.account?.code || '');
    });

    // Info: (20250818 - Shirley) 保存字串格式的總計以保持精確度
    setTotalDebit(parseFloat(debitTotal));
    setTotalCredit(parseFloat(creditTotal));

    // Info: (20250818 - Shirley) 使用 DecimalOperations 進行精確比較
    setIsTotalZero(DecimalOperations.isZero(debitTotal) && DecimalOperations.isZero(creditTotal));
    setIsTotalNotEqual(!DecimalOperations.isEqual(debitTotal, creditTotal));
    setHaveZeroLine(zeroLine);
    setIsAccountingNull(accountingNull);
    setIsVoucherLineEmpty(lineItems.length === 0);
    setIsCounterpartyRequired(isAPorAR);
    setIsAssetRequired(isAsset);
  }, [lineItems]);

  const voucherLines =
    lineItems && lineItems.length > 0 ? (
      lineItems.map((lineItem) => (
        <VoucherLineItem
          key={`${lineItem.id}-voucher-line`}
          id={lineItem.id}
          data={lineItem}
          setLineItems={setLineItems}
          flagOfClear={flagOfClear}
          flagOfSubmit={flagOfSubmit}
          accountIsNull={lineItem.account === null}
          amountIsZero={DecimalOperations.isZero(lineItem.amount)}
          amountNotEqual={totalCredit !== totalDebit}
          isShowReverseHint={isShowReverseHint}
        />
      ))
    ) : (
      <div className="col-start-1 col-end-14 flex w-full flex-col items-center rounded-sm bg-input-surface-input-background py-10px text-xs">
        <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_LINE_BLOCK.EMPTY')}</p>
        <p className={'text-text-state-error'}>{t('journal:VOUCHER_LINE_BLOCK.EMPTY_HINT')}</p>
      </div>
    );

  return (
    <div className="flex w-max flex-col items-center gap-y-24px rounded-md bg-surface-brand-secondary-moderate px-lv-5 py-lv-3 text-sm tablet:w-auto tablet:text-base">
      <div className="grid w-full grid-cols-13 gap-x-lv-5">
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
        <div className="col-span-3 col-start-10 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.CREDIT')}
        </div>

        {/* Info: (20240927 - Julian) Table Body */}
        {voucherLines}

        {/* Info: (20240927 - Julian) Total calculation */}
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-7 col-end-10 text-right">
          <p className={totalStyle}>{DecimalOperations.format(totalDebit)}</p>
        </div>
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-11 col-end-13 text-right">
          <p className={totalStyle}>{DecimalOperations.format(totalCredit)}</p>
        </div>
      </div>

      {/* Info: (20240927 - Julian) Add button */}
      <Button
        id="add-line-item-button"
        type="button"
        size={'defaultSquare'}
        onClick={addNewVoucherLine}
      >
        <FaPlus size={20} />
      </Button>
    </div>
  );
};

export const VoucherLinePreview: React.FC<IVoucherLinePreviewProps> = ({
  totalCredit,
  totalDebit,
  lineItems,
}) => {
  const { t } = useTranslation('common');

  // Info: (20241018 - Julian) 如果借貸金額相等且不為 0，顯示綠色，否則顯示紅色
  const totalStyle =
    totalCredit === totalDebit && totalCredit !== 0
      ? 'text-text-state-success-invert'
      : 'text-text-state-error-invert';

  const voucherLines =
    lineItems && lineItems.length > 0 ? (
      lineItems.map((lineItem) => {
        const { id, account, description, debit, amount } = lineItem;
        return (
          <>
            {/* Info: (20241018 - Julian) Accounting */}
            <div
              key={`voucher-preview-${id}-account`}
              className={`${inputStyle.PREVIEW} col-span-3 flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px`}
            >
              <p>
                {account?.code} - {account?.name}
              </p>
              <div className="h-20px w-20px">
                <FiBookOpen size={20} />
              </div>
            </div>

            {/* Info: (20241018 - Julian) Particulars */}
            <div
              className={`${inputStyle.PREVIEW} col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px`}
            >
              {description}
            </div>

            {/* Info: (20241018 - Julian) Debit */}
            <div
              className={`${inputStyle.PREVIEW} col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px`}
            >
              {debit ? DecimalOperations.format(amount) : ''}
            </div>

            {/* Info: (20241018 - Julian) Credit */}
            <div
              className={`${inputStyle.PREVIEW} col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px`}
            >
              {!debit ? DecimalOperations.format(amount) : ''}
            </div>

            {/* Info: (20240927 - Julian) Delete button */}
            <div className="text-center text-stroke-neutral-invert">
              <div className="p-12px">
                <LuTrash2 size={22} />
              </div>
            </div>
          </>
        );
      })
    ) : (
      <div className="col-start-1 col-end-14 flex w-full flex-col items-center rounded-sm bg-input-surface-input-background py-10px text-xs">
        <p className="text-text-neutral-tertiary">{t('journal:VOUCHER_LINE_BLOCK.EMPTY')}</p>
        <p className="text-text-neutral-primary">{t('journal:VOUCHER_LINE_BLOCK.EMPTY_HINT')}</p>
      </div>
    );

  return (
    <div id="voucher-line-preview" className="col-span-2">
      {/* Info: (20241018 - Julian) Table */}
      <div className="grid w-full grid-cols-13 gap-24px rounded-md bg-surface-brand-secondary-moderate px-24px py-12px">
        {/* Info: (20241018 - Julian) Table Header */}
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.PARTICULARS')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.DEBIT')}
        </div>
        <div className="col-span-3 col-start-10 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.CREDIT')}
        </div>

        {/* Info: (20241018 - Julian) Table Body */}
        {voucherLines}

        {/* Info: (20241018 - Julian) Total calculation */}
        {/* Info: (20241018 - Julian) Total Debit */}
        <div className="col-start-7 col-end-10 text-right">
          <p className={totalStyle}>{DecimalOperations.format(totalDebit)}</p>
        </div>
        {/* Info: (20241018 - Julian) Total Debit */}
        <div className="col-start-11 col-end-13 text-right">
          <p className={totalStyle}>{DecimalOperations.format(totalCredit)}</p>
        </div>

        {/* Info: (20241018 - Julian) Add button */}
        <div className="col-start-1 col-end-14 text-center">
          <Button type="button" size={'defaultSquare'}>
            <FaPlus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoucherLineBlock;
