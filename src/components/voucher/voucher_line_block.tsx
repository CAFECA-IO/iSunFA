import React, { useEffect } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import { FiEdit, FiBookOpen } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { numberWithCommas } from '@/lib/utils/common';
import VoucherLineItem from '@/components/voucher/voucher_line_item';
import { Button } from '@/components/button/button';
import { ILineItemBeta, initialVoucherLine } from '@/interfaces/line_item';
import { useGlobalCtx } from '@/contexts/global_context';
import { IAccount } from '@/interfaces/accounting_account';
import { inputStyle } from '@/constants/display';
import { LuTrash2 } from 'react-icons/lu';
import { useAccountingCtx } from '@/contexts/accounting_context';

interface IVoucherLineBlockProps {
  totalDebit: number;
  totalCredit: number;
  lineItems: ILineItemBeta[];
  setLineItems: React.Dispatch<React.SetStateAction<ILineItemBeta[]>>;
  setIsReverseRequired: React.Dispatch<React.SetStateAction<boolean>>; // Info: (20241104 - Julian) 判斷是否需要反轉分錄

  flagOfClear: boolean; // Info: (20241104 - Julian) 是否按下清除按鈕
  flagOfSubmit: boolean; // Info: (20241104 - Julian) 是否按下送出按鈕
  isAccountingNull: boolean; // Info: (20241104 - Julian) 是否有空的會計科目
  haveZeroLine: boolean; // Info: (20241104 - Julian) 是否有金額為 0 的傳票列
  isVoucherLineEmpty: boolean; // Info: (20241104 - Julian) 是否傳票列為空
}

interface IVoucherLinePreviewProps {
  totalDebit: number;
  totalCredit: number;
  lineItems: ILineItemBeta[];
}

const VoucherLineBlock: React.FC<IVoucherLineBlockProps> = ({
  totalDebit,
  totalCredit,
  lineItems,
  setLineItems,
  setIsReverseRequired,

  flagOfClear,
  flagOfSubmit,
  isAccountingNull,
  haveZeroLine,
  isVoucherLineEmpty,
}) => {
  const { t } = useTranslation('common');
  const { selectReverseItemsModalVisibilityHandler, selectReverseDataHandler } = useGlobalCtx();
  const { reverseList } = useAccountingCtx();

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

  useEffect(() => {
    // Info: (20241104 - Julian) 會計科目有應付帳款且借方有值 || 會計科目有應收帳款且貸方有值，顯示 Reverse
    const isReverse = lineItems.some(
      (item) =>
        (item.account?.code === '2171' && item.debit === true && item.amount > 0) || // Info: (20241009 - Julian) 應付帳款
        (item.account?.code === '1172' && item.debit === false && item.amount > 0) // Info: (20241009 - Julian) 應收帳款
    );
    setIsReverseRequired(isReverse);
  }, [lineItems]);

  const voucherLines =
    lineItems && lineItems.length > 0 ? (
      lineItems.map((lineItem) => {
        // Info: (20241001 - Julian) 複製傳票列
        const duplicateLineItem = { ...lineItem };

        const isShowReverse =
          (lineItem.account?.code === '2171' && lineItem.debit === true && lineItem.amount > 0) || // Info: (20241001 - Julian) 應付帳款
          (lineItem.account?.code === '1172' && lineItem.debit === false && lineItem.amount > 0); // Info: (20241001 - Julian) 應收帳款

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
          if (debit === 0) {
            // Info: (20241001 - Julian) 如果金額為 0，則不設定借貸
            duplicateLineItem.debit = null;
            duplicateLineItem.amount = 0;
            setLineItems(
              lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
            );
          } else {
            duplicateLineItem.debit = true;
            duplicateLineItem.amount = debit;
            setLineItems(
              lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
            );
          }
        };

        // Info: (20241001 - Julian) 設定 Credit
        const creditChangeHandler = (credit: number) => {
          if (credit === 0) {
            // Info: (20241001 - Julian) 如果金額為 0，則不設定借貸
            duplicateLineItem.debit = null;
            duplicateLineItem.amount = 0;
            setLineItems(
              lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
            );
          } else {
            duplicateLineItem.debit = false;
            duplicateLineItem.amount = credit;
            setLineItems(
              lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
            );
          }
        };

        // Info: (20241105 - Julian) 新增反轉分錄
        const addReverseHandler = () => {
          const modalData = {
            account: lineItem.account, // Info: (20241105 - Julian) 會計科目編號
            lineItemId: lineItem.id, // Info: (20241105 - Julian) LineItem ID
          };

          selectReverseDataHandler(modalData);
          selectReverseItemsModalVisibilityHandler();
        };

        return (
          <>
            <VoucherLineItem
              key={`${lineItem.id}-voucher-line`}
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

            {/* Info: (20241104 - Julian) 反轉分錄列表 */}
            {reverseList[lineItem.id] && reverseList[lineItem.id].length > 0
              ? reverseList[lineItem.id].map((item) => (
                  <div className="col-start-1 col-end-13 flex items-center justify-between gap-4px font-medium text-text-neutral-invert">
                    <button
                      type="button"
                      className="p-10px text-button-text-primary hover:text-button-text-primary-hover"
                    >
                      <FaMinus />
                    </button>
                    <div className="flex flex-1 items-center gap-20px">
                      <div>{item.voucherNo}</div>
                      <div>
                        {item.account?.code} - {item.account?.name}
                      </div>
                      <div>{item.description}</div>
                    </div>
                    <div className="flex items-center gap-4px">
                      <div>Reverse: {item.reverseAmount}</div>
                      <button
                        type="button"
                        className="p-10px text-button-text-primary hover:text-button-text-primary-hover"
                        onClick={addReverseHandler}
                      >
                        <FiEdit />
                      </button>
                    </div>
                  </div>
                ))
              : null}

            {/* Info: (20241104 - Julian) 如果需要反轉分錄，則顯示新增按鈕 */}
            {isShowReverse ? (
              <div className="col-start-1 col-end-13">
                <button
                  type="button"
                  className="flex items-center gap-4px text-text-neutral-invert"
                  onClick={addReverseHandler}
                >
                  <FaPlus />
                  <p>Reverse item</p>
                </button>
              </div>
            ) : null}
          </>
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
      <div className="flex flex-col items-center gap-y-24px rounded-md bg-surface-brand-secondary-moderate px-24px py-12px">
        {/* Info: (20240927 - Julian) Table Header */}
        <div className="grid w-full grid-cols-13 gap-x-24px">
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
        </div>

        {/* Info: (20240927 - Julian) Table Body */}
        <div className="grid w-full grid-cols-13 gap-x-24px gap-y-10px">
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
        </div>

        {/* Info: (20240927 - Julian) Add button */}
        <Button type="button" className="h-44px w-44px p-0" onClick={addNewVoucherLine}>
          <FaPlus size={20} />
        </Button>
      </div>
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
              {debit ? numberWithCommas(amount) : ''}
            </div>

            {/* Info: (20241018 - Julian) Credit */}
            <div
              className={`${inputStyle.PREVIEW} col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px`}
            >
              {!debit ? numberWithCommas(amount) : ''}
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
        <p className="text-text-neutral-tertiary">{t('common:COMMON.EMPTY')}</p>
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
        <div className="col-span-3 col-end-14 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER_LINE_BLOCK.CREDIT')}
        </div>

        {/* Info: (20241018 - Julian) Table Body */}
        {voucherLines}

        {/* Info: (20241018 - Julian) Total calculation */}
        {/* Info: (20241018 - Julian) Total Debit */}
        <div className="col-start-7 col-end-10 text-right">
          <p className={totalStyle}>{numberWithCommas(totalDebit)}</p>
        </div>
        {/* Info: (20241018 - Julian) Total Debit */}
        <div className="col-start-11 col-end-13 text-right">
          <p className={totalStyle}>{numberWithCommas(totalCredit)}</p>
        </div>

        {/* Info: (20241018 - Julian) Add button */}
        <div className="col-start-1 col-end-14 text-center">
          <Button type="button" className="h-44px w-44px p-0">
            <FaPlus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoucherLineBlock;
