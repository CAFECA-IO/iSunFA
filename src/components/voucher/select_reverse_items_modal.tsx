import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { checkboxStyle, default30DayPeriodInSec } from '@/constants/display';
import { numberWithCommas } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { IReverseItemModal } from '@/interfaces/reverse';
import { IReverseItemUI, dummyReverseData } from '@/interfaces/line_item';
import { useAccountingCtx } from '@/contexts/accounting_context';

interface ISelectReverseItemsModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  modalData: IReverseItemModal;
}

interface IReverseItemProps {
  reverseData: IReverseItemUI;
  selectHandler: (id: number) => void;
  amountChangeHandler: (id: number, value: number) => void;
}

const ReverseItem: React.FC<IReverseItemProps> = ({
  reverseData,
  selectHandler,
  amountChangeHandler,
}) => {
  const { t } = useTranslation('common');
  const { id, voucherNo, account, description, amount, isSelected, reverseAmount } = reverseData;

  const accountCode = account?.code ?? '';
  const accountName = account?.name ?? '';

  const checkboxChangeHandler = () => selectHandler(id);
  const reverseAmountChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241105 - Julian) 金額只能輸入數字
    const num = parseInt(e.target.value, 10);
    const numValue = Number.isNaN(num) ? 0 : num;
    // Info: (20241105 - Julian) 金額範圍限制 0 ~ amount
    const valueInRange = numValue < 0 ? 0 : numValue > amount ? amount : numValue;
    amountChangeHandler(id, valueInRange);
  };

  return (
    <>
      {/* Info: (20241104 - Julian) Checkbox */}
      <div className="col-start-1 col-end-2">
        <input
          type="checkbox"
          className={checkboxStyle}
          checked={isSelected}
          onChange={checkboxChangeHandler}
        />
      </div>
      {/* Info: (20241104 - Julian) Voucher No */}
      <div className="col-start-2 col-end-4">{voucherNo}</div>
      {/* Info: (20241104 - Julian) Accounting */}
      <div className="col-start-4 col-end-7 truncate">
        {accountCode} - <span className="text-text-neutral-tertiary">{accountName}</span>
      </div>
      {/* Info: (20241104 - Julian) Particulars */}
      <div className="col-start-7 col-end-9">{description}</div>
      {/* Info: (20241104 - Julian) Amount */}
      <div className="col-start-9 col-end-11">
        {numberWithCommas(amount)}
        <span className="text-text-neutral-tertiary"> {t('common:COMMON.TWD')}</span>
      </div>
      {/* Info: (20241104 - Julian) Reverse Amount */}
      <div className="col-start-11 col-end-15 text-right">
        <div
          className={`flex items-center divide-x rounded-sm border ${
            isSelected
              ? 'divide-input-stroke-input border-input-stroke-input bg-input-surface-input-background text-input-text-input-filled'
              : 'divide-input-stroke-disable border-input-stroke-disable bg-input-surface-input-disable text-input-text-disable'
          } transition-all duration-150 ease-in-out`}
        >
          <input
            type="string"
            className="w-0 flex-1 bg-transparent px-12px py-10px text-right outline-none"
            value={reverseAmount}
            placeholder="0"
            onChange={reverseAmountChangeHandler}
            disabled={!isSelected}
          />
          <div className="flex items-center gap-8px px-12px py-10px">
            <Image
              src="/flags/tw.svg"
              width={16}
              height={16}
              alt="tw_icon"
              className="rounded-full"
            />
            <p className="text-input-text-input-placeholder">{t('common:COMMON.TWD')}</p>
          </div>
        </div>
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
  const { addReverseListHandler } = useAccountingCtx();

  // Info: (20241104 - Julian) 取得會計科目以呼叫 API
  const { lineItemId } = modalData;

  const rawReverseData = dummyReverseData; // ToDo: (20241105 - Julian) Call API to get reverse data

  const defaultUIReverseList: IReverseItemUI[] = rawReverseData.map((reverse) => {
    return {
      ...reverse,
      reverseAmount: 0,
      isSelected: false,
    };
  });

  const [uiReverseItemList, setUiReverseItemList] =
    useState<IReverseItemUI[]>(defaultUIReverseList);
  // Info: (20241104 - Julian) Filter
  const [filteredPeriod, setFilteredPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  // Info: (20241104 - Julian) Select All
  const [isSelectedAll, setIsSelectedAll] = useState<boolean>(false);
  const [selectCount, setSelectCount] = useState<number>(0);

  // Info: (20241104 - Julian) reverse item 數量
  const totalItems = uiReverseItemList.length;

  const selectedReverseItems = uiReverseItemList.filter((reverse) => reverse.isSelected);

  // Info: (20241104 - Julian) reverse item 總金額
  const totalReverseAmount = selectedReverseItems.reduce((acc, reverse) => {
    return acc + reverse.reverseAmount;
  }, 0);

  // Info: (20241105 - Julian) 如果沒有選取任何 reverse item 或是有選取但金額為 0，則無法確認
  const confirmDisabled =
    totalReverseAmount === 0 || selectedReverseItems.some((reverse) => reverse.reverseAmount === 0);

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
    addReverseListHandler(lineItemId, selectedReverseItems);
    modalVisibilityHandler();
  };

  // Info: (20241104 - Julian) 監聽 reverse item 選取狀態
  useEffect(() => {
    const selectedCount = uiReverseItemList.filter((reverse) => reverse.isSelected).length;
    setSelectCount(selectedCount);
    setIsSelectedAll(selectedCount === totalItems);
  }, [uiReverseItemList]);

  useEffect(() => {
    if (!isModalVisible) {
      // Info: (20241104 - Julian) 關閉 Modal 時，清空所有選取 & 金額歸零
      setUiReverseItemList((prev) => {
        return prev.map((reverse) => {
          return {
            ...reverse,
            isSelected: false,
            reverseAmount: 0,
          };
        });
      });
    }
  }, [isModalVisible]);

  const reverseList = uiReverseItemList.map((reverse) => {
    // Info: (20241104 - Julian) 單選
    const selectCountHandler = (id: number) => {
      setUiReverseItemList((prev) => {
        return prev.map((voucher) => {
          if (voucher.id === id) {
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
    const amountChangeHandler = (id: number, value: number) => {
      setUiReverseItemList((prev) => {
        return prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              reverseAmount: value,
            };
          }
          return item;
        });
      });
    };

    return (
      <ReverseItem
        key={reverse.id}
        reverseData={reverse}
        selectHandler={selectCountHandler}
        amountChangeHandler={amountChangeHandler}
      />
    );
  });

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex w-90vw flex-col items-center gap-16px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 px-20px py-16px shadow-lg md:w-750px">
        {/* Info: (20241104 - Julian) Close button */}
        <button type="button" onClick={modalVisibilityHandler} className="absolute right-4 top-4">
          <RxCross2 size={24} className="text-icon-surface-single-color-primary" />
        </button>

        {/* Info: (20241104 - Julian) Modal title */}
        <h2 className="text-xl font-bold text-card-text-primary">Select Reverse Items</h2>

        {/* Info: (20241104 - Julian) Modal body */}
        <div className="flex w-full flex-col items-center gap-16px px-20px">
          {/* Info: (20241104 - Julian) Filter */}
          <div className="flex w-full items-end gap-8px">
            {/* Info: (20241104 - Julian) Period */}
            <div className="flex w-1/2 flex-col items-start gap-8px">
              <p className="font-semibold text-input-text-primary">Period</p>
              <DatePicker
                type={DatePickerType.TEXT_PERIOD}
                period={filteredPeriod}
                setFilteredPeriod={setFilteredPeriod}
              />
            </div>
            {/* Info: (20241104 - Julian) Search bar */}
            <div className="flex w-1/2 items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-icon-surface-single-color-primary">
              <input
                type="string"
                className="flex-1 bg-transparent outline-none placeholder:text-input-text-input-placeholder"
                placeholder={t('common:COMMON.SEARCH')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <FiSearch size={20} />
            </div>
          </div>

          {/* Info: (20241104 - Julian) Table */}
          <div className="flex w-full flex-col overflow-hidden rounded-md border border-stroke-neutral-quaternary">
            {/* Info: (20241104 - Julian) summary */}
            <div className="flex items-center justify-between bg-surface-neutral-main-background px-16px py-8px font-medium">
              {/* Info: (20241104 - Julian) Select */}
              <p className="text-text-neutral-secondary">
                (Select {selectCount}/{totalItems})
              </p>
              {/* Info: (20241104 - Julian) Total reverse amount */}
              <p className="text-text-neutral-secondary">
                Total reverse amount:{' '}
                <span className="text-text-neutral-primary">
                  {numberWithCommas(totalReverseAmount)}
                </span>{' '}
                NTD
              </p>
            </div>
            <div className="flex flex-col items-center px-16px py-8px text-sm">
              {/* Info: (20241104 - Julian) Table header */}
              <div className="grid w-full grid-cols-14 gap-8px border-b border-divider-stroke-lv-4 pb-4px text-text-neutral-tertiary">
                {/* Info: (20241104 - Julian) Checkbox */}
                <div className="col-start-1 col-end-2">
                  <input
                    type="checkbox"
                    className={checkboxStyle}
                    checked={isSelectedAll}
                    onChange={checkAllHandler}
                  />
                </div>
                {/* Info: (20241104 - Julian) Voucher No */}
                <div className="col-start-2 col-end-4">Voucher No</div>
                {/* Info: (20241104 - Julian) Accounting */}
                <div className="col-start-4 col-end-7">Accounting</div>
                {/* Info: (20241104 - Julian) Particulars */}
                <div className="col-start-7 col-end-9">Particulars</div>
                {/* Info: (20241104 - Julian) Amount */}
                <div className="col-start-9 col-end-11">Amount</div>
                {/* Info: (20241104 - Julian) Reverse Amount */}
                <div className="col-start-11 col-end-15 text-right">Reverse Amount</div>
              </div>

              {/* Info: (20241104 - Julian) Table body */}
              <div className="grid max-h-450px w-full grid-cols-14 items-center gap-x-8px gap-y-4px overflow-y-auto py-4px text-text-neutral-primary">
                {reverseList}
              </div>
            </div>
          </div>

          {/* Info: (20241104 - Julian) Confirm Button */}
          <div className="ml-auto flex items-center gap-12px">
            <Button
              type="button"
              variant="tertiaryOutline"
              className="px-16px py-8px"
              onClick={modalVisibilityHandler}
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              className="px-16px py-8px"
              disabled={confirmDisabled}
              onClick={confirmHandler}
            >
              {t('common:COMMON.CONFIRM')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default SelectReverseItemsModal;
