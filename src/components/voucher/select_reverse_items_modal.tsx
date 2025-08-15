import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import FilterSection from '@/components/filter_section/filter_section';
import { checkboxStyle } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { numberWithCommas } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { IReverseItemModal } from '@/interfaces/reverse';
import { IReverseItem, IReverseItemUI } from '@/interfaces/line_item';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { useCurrencyCtx } from '@/contexts/currency_context';

interface ISelectReverseItemsModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  modalData: IReverseItemModal;
}

interface IReverseItemProps {
  reverseData: IReverseItemUI;
  // Info: (20250213 - Anna) 使用 `voucherId + lineItemIndex` 避免影響相同 `voucherId` 的其他行
  selectHandler: (id: number, itemIndex: number) => void;
  amountChangeHandler: (id: number, itemIndex: number, value: number) => void;
  currency: string;
}

const ReverseItem: React.FC<IReverseItemProps> = ({
  reverseData,
  selectHandler,
  amountChangeHandler,
  currency,
}) => {
  const { t } = useTranslation('common');

  const {
    voucherId,
    voucherNo,
    account,
    description,
    amount,
    isSelected,
    reverseAmount,
    lineItemIndex,
  } = reverseData;

  const accountCode = account?.code ?? '';
  const accountName = account?.name ?? '';

  // Info: (20250213 - Anna) 使用 `voucherId + lineItemIndex` 避免影響相同 `voucherId` 的其他行
  const checkboxChangeHandler = () => selectHandler(voucherId, lineItemIndex);

  const reverseAmountChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20250528 - Julian) 先移除千分位符號，再轉換為數字
    const withoutCommas = e.target.value.replace(/,/g, '');
    const num = parseFloat(withoutCommas);
    const numValue = Number.isNaN(num) ? 0 : num;

    // Info: (20241105 - Julian) 金額範圍限制 0 ~ amount
    const amountNum = parseFloat(amount);
    const valueInRange = numValue < 0 ? 0 : numValue > amountNum ? amountNum : numValue;

    // Info: (20250213 - Anna) 使用 `voucherId + lineItemIndex` 避免影響相同 `voucherId` 的其他行
    amountChangeHandler(voucherId, lineItemIndex, valueInRange);
  };

  const reverseAmountInput = (
    <div
      className={`ml-auto flex w-180px items-center divide-x rounded-sm border ${
        isSelected
          ? 'divide-input-stroke-input border-input-stroke-input bg-input-surface-input-background text-input-text-input-filled'
          : 'divide-input-stroke-disable border-input-stroke-disable bg-input-surface-input-disable text-input-text-disable'
      } transition-all duration-150 ease-in-out`}
    >
      <input
        id="input-reverse-amount"
        name="input-reverse-amount"
        type="text"
        value={numberWithCommas(reverseAmount)}
        onChange={reverseAmountChangeHandler}
        className="w-0 flex-1 bg-transparent px-12px py-10px text-right outline-none"
      />
      <div className="flex items-center gap-8px px-12px py-10px">
        <Image
          src={`/currencies/${currency.toLowerCase()}.svg`}
          width={16}
          height={16}
          alt="tw_icon"
          className="aspect-square rounded-full object-cover"
        />
        <p className="text-input-text-input-placeholder">{currency}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Info: (20250528 - Julian) ============== Desktop Layout ============== */}
      {/* Info: (20241104 - Julian) Checkbox */}
      <div className="col-start-1 col-end-2 hidden tablet:block">
        <input
          type="checkbox"
          className={checkboxStyle}
          checked={isSelected}
          onChange={checkboxChangeHandler}
        />
      </div>
      {/* Info: (20241104 - Julian) Voucher No */}
      <div className="col-start-2 col-end-4 hidden tablet:block">{voucherNo}</div>
      {/* Info: (20241104 - Julian) Accounting */}
      <div className="col-start-4 col-end-7 hidden truncate tablet:block">
        {accountCode} - <span className="text-text-neutral-tertiary">{accountName}</span>
      </div>
      {/* Info: (20241104 - Julian) Particulars */}
      <div className="col-start-7 col-end-9 hidden tablet:block">{description}</div>
      {/* Info: (20241104 - Julian) Amount */}
      <div className="col-start-9 col-end-11 hidden tablet:block">
        {numberWithCommas(amount)}
        <span className="text-text-neutral-tertiary"> {t('journal:JOURNAL.TWD')}</span>
      </div>
      {/* Info: (20241104 - Julian) Reverse Amount */}
      <div className="col-start-11 col-end-15 hidden text-right tablet:block">
        {reverseAmountInput}
      </div>

      {/* Info: (20250528 - Julian) ============== Mobile Layout ============== */}
      <div className="flex justify-center gap-lv-4 border-b border-divider-stroke-lv-4 py-lv-2 tablet:hidden">
        {/* Info: (20250528 - Julian) Checkbox */}
        <input
          id={`${lineItemIndex}-checkbox-mobile`}
          type="checkbox"
          className={`${checkboxStyle} mt-1`}
          checked={isSelected}
          onChange={checkboxChangeHandler}
        />
        <label
          htmlFor={`${lineItemIndex}-checkbox-mobile`}
          className="flex flex-col gap-lv-3 text-sm font-medium text-text-neutral-primary"
        >
          {/* Info: (20250528 - Julian) Voucher No */}
          <p>{voucherNo}</p>
          {/* Info: (20250528 - Julian) Accounting */}
          <p>
            {account?.code} - <span className="text-text-neutral-tertiary">{account?.name}</span>
          </p>
          {/* Info: (20250528 - Julian) Particulars */}
          {description !== '' && <p>{description}</p>}
          {/* Info: (20250528 - Julian) Amount */}
          <p>
            {numberWithCommas(amount)}
            <span className="text-text-neutral-tertiary"> {t('journal:JOURNAL.TWD')}</span>
          </p>
          {/* Info: (20250528 - Julian) Reverse Amount */}
          {reverseAmountInput}
        </label>
      </div>
    </>
  );
};

const SelectReverseItemsModal: React.FC<ISelectReverseItemsModal> = ({
  isModalVisible,
  modalVisibilityHandler,
  modalData,
}) => {
  const { t } = useTranslation(['common', 'journal']);
  const { currency } = useCurrencyCtx();
  const { addReverseListHandler } = useAccountingCtx();
  const { connectedAccountBook } = useUserCtx();

  const params = {
    accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID,
    accountId: modalData.account?.id,
  };

  // Info: (20241104 - Julian) 取得會計科目以呼叫 API
  const { lineItemIndex } = modalData;

  const [uiReverseItemList, setUiReverseItemList] = useState<IReverseItemUI[]>([]);
  // Info: (20241104 - Julian) Select All
  const [isSelectedAll, setIsSelectedAll] = useState<boolean>(false);
  const [selectCount, setSelectCount] = useState<number>(0);

  // Info: (20241104 - Julian) reverse item 數量
  const totalItems = uiReverseItemList.length;

  const selectedReverseItems = uiReverseItemList.filter((reverse) => reverse.isSelected);

  // Info: (20241104 - Julian) reverse item 總金額
  const totalReverseAmount = selectedReverseItems.reduce((acc, reverse) => {
    return acc + parseFloat(reverse.reverseAmount);
  }, 0);

  // Info: (20241105 - Julian) 如果沒有選取任何 reverse item 或是有選取但金額為 0，則無法確認
  const confirmDisabled =
    totalReverseAmount === 0 || selectedReverseItems.some((reverse) => parseFloat(reverse.reverseAmount) === 0);

  // Info: (20241105 - Julian) 全選
  const checkAllHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    // Info: (20241104 - Julian) 切換全選狀態
    setIsSelectedAll(!isSelectedAll);
    // Info: (20241104 - Julian) 切換所有 reverse item 狀態
    setUiReverseItemList((prev) => {
      return prev.map((reverse) => {
        return { ...reverse, isSelected: isChecked };
      });
    });
  };

  const confirmHandler = () => {
    addReverseListHandler(lineItemIndex, selectedReverseItems);
    modalVisibilityHandler();
  };

  const handleApiResponse = (resData: IPaginatedData<IReverseItem[]>) => {
    const reverseItemList: IReverseItemUI[] = resData.data.map((reverse, index) => {
      return {
        ...reverse,
        // Info: (20250213 - Anna) 使用 `index` 作為 `lineItemIndex`，確保每筆資料都有獨立的索引，不會互相影響
        lineItemIndex: index,
        reverseAmount: reverse.amount,
        isSelected: false,
      };
    });

    setUiReverseItemList(reverseItemList);
  };

  // Info: (20241104 - Julian) 監聽 reverse item 選取狀態
  useEffect(() => {
    const selectedCount = uiReverseItemList.filter((reverse) => reverse.isSelected).length;
    setSelectCount(selectedCount);

    const isSelectAll = selectedCount === totalItems && selectedCount > 0;
    setIsSelectedAll(isSelectAll);
  }, [uiReverseItemList]);

  useEffect(() => {
    if (!isModalVisible) {
      // Info: (20241104 - Julian) 關閉 Modal 時，清空所有選取 & 金額歸零
      setUiReverseItemList((prev) => {
        return prev.map((reverse) => {
          return {
            ...reverse,
            isSelected: false,
            reverseAmount: '0',
          };
        });
      });
    }
  }, [isModalVisible]);

  const reverseList =
    uiReverseItemList.length > 0 ? (
      uiReverseItemList.map((reverse) => {
        // Info: (20241104 - Julian) 單選
        // Info: (20250213 - Anna) 使用 `voucherId + lineItemIndex` 避免影響相同 `voucherId` 的其他行
        const selectCountHandler = (id: number, itemIndex: number) => {
          setUiReverseItemList((prev) => {
            return prev.map((voucher) => {
              if (voucher.voucherId === id && voucher.lineItemIndex === itemIndex) {
                return {
                  ...voucher,
                  isSelected: !voucher.isSelected,
                };
              }
              return voucher;
            });
          });
        };

        // Info: (20241104 - Julian) reverse 金額變更
        // Info: (2025-213 - Anna) 使用 `voucherId + lineItemIndex` 避免影響相同 `voucherId` 的其他行
        const amountChangeHandler = (id: number, itemIndex: number, value: number) => {
          setUiReverseItemList((prev) => {
            return prev.map((item) => {
              if (item.voucherId === id && item.lineItemIndex === itemIndex) {
                return {
                  ...item,
                  reverseAmount: value.toString(),
                };
              }
              return item;
            });
          });
        };

        return (
          // Info: (20250213 - Anna) 確保 key 唯一
          <ReverseItem
            key={`${reverse.voucherId}-${reverse.lineItemIndex}`}
            reverseData={reverse}
            selectHandler={selectCountHandler}
            amountChangeHandler={amountChangeHandler}
            currency={currency}
          />
        );
      })
    ) : (
      <div className="col-start-1 col-end-15 text-center text-sm tablet:text-lg">
        {t('journal:REVERSE_MODAL.NOT_FOUND')}
      </div>
    );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative flex h-max w-90vw flex-col items-center rounded-sm bg-surface-neutral-surface-lv2 shadow-lg md:w-750px">
        <div className="flex px-20px py-16px">
          {/* Info: (20241104 - Julian) Close button */}
          <button type="button" onClick={modalVisibilityHandler} className="absolute right-4 top-4">
            <RxCross2 size={24} className="text-icon-surface-single-color-primary" />
          </button>

          {/* Info: (20241104 - Julian) Modal title */}
          <h2 className="text-xl font-bold text-card-text-primary">
            {t('journal:REVERSE_MODAL.MODAL_TITLE')}
          </h2>
        </div>

        {/* Info: (20241104 - Julian) Modal body */}
        <div className="flex w-full flex-1 flex-col items-center gap-16px px-lv-4 py-lv-3 tablet:px-20px">
          {/* Info: (20241104 - Julian) Filter */}
          <FilterSection<IReverseItem[]>
            apiName={APIName.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2}
            page={1}
            pageSize={1000} // Info: (20241104 - Julian) 一次取得所有 reverse item
            params={params}
            className="w-full"
            onApiResponse={handleApiResponse}
          />

          {/* Info: (20241104 - Julian) Table */}
          <div className="flex w-full flex-1 flex-col items-stretch overflow-hidden rounded-md border border-stroke-neutral-quaternary">
            {/* Info: (20241104 - Julian) summary */}
            <div className="flex items-center justify-between bg-surface-neutral-main-background px-16px py-8px text-xs font-medium tablet:text-base">
              {/* Info: (20241104 - Julian) Select */}
              <p className="hidden text-text-neutral-secondary tablet:block">
                ({t('journal:REVERSE_MODAL.SELECT')} {selectCount}/{totalItems})
              </p>
              {/* Info: (20241104 - Julian) Total reverse amount */}
              <p className="ml-auto text-text-neutral-secondary">
                {t('journal:REVERSE_MODAL.TOTAL_REVERSE_AMOUNT')}:{' '}
                <span className="text-text-neutral-primary">
                  {numberWithCommas(totalReverseAmount)}{' '}
                </span>
                {t('common:CURRENCY_ALIAS.TWD')}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center px-16px py-8px text-sm">
              {/* Info: (20241104 - Julian) Table header */}
              <div className="hidden w-full grid-cols-14 gap-8px border-b border-divider-stroke-lv-4 pb-4px text-text-neutral-tertiary tablet:grid">
                {/* Info: (20241104 - Julian) Checkbox */}
                <div className="col-start-1 col-end-2">
                  <input
                    type="checkbox"
                    className={checkboxStyle}
                    checked={isSelectedAll}
                    onChange={checkAllHandler}
                    disabled={totalItems === 0} // Info: (20241212 - Julian) 無 reverse item 時，全選無效
                  />
                </div>
                {/* Info: (20241104 - Julian) Voucher No */}
                <div className="col-start-2 col-end-4">{t('journal:REVERSE_MODAL.VOUCHER_NO')}</div>
                {/* Info: (20241104 - Julian) Accounting */}
                <div className="col-start-4 col-end-7">{t('journal:REVERSE_MODAL.ACCOUNTING')}</div>
                {/* Info: (20241104 - Julian) Particulars */}
                <div className="col-start-7 col-end-9">
                  {t('journal:REVERSE_MODAL.PARTICULARS')}
                </div>
                {/* Info: (20241104 - Julian) Amount */}
                <div className="col-start-9 col-end-11">{t('journal:REVERSE_MODAL.AMOUNT')}</div>
                {/* Info: (20241104 - Julian) Reverse Amount */}
                <div className="col-start-11 col-end-15 text-right">
                  {t('journal:REVERSE_MODAL.REVERSE_AMOUNT')}
                </div>
              </div>

              {/* Info: (20241104 - Julian) Table body */}
              <div className="h-250px w-full overflow-y-auto">
                <div className="grid w-full grid-cols-1 flex-col items-center gap-x-8px gap-y-4px py-4px text-text-neutral-primary tablet:grid-cols-14">
                  {reverseList}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Info: (20241104 - Julian) Confirm Button */}
        <div className="flex w-full items-center gap-12px px-lv-4 py-16px tablet:justify-end">
          <Button
            type="button"
            variant="tertiaryOutline"
            className="w-full px-16px py-8px tablet:w-auto"
            onClick={modalVisibilityHandler}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            className="w-full px-16px py-8px tablet:w-auto"
            disabled={confirmDisabled}
            onClick={confirmHandler}
          >
            {t('common:COMMON.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default SelectReverseItemsModal;
