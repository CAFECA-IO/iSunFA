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
import { FREE_COMPANY_ID } from '@/constants/config';

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

  const { voucherId, voucherNo, account, description, amount, isSelected, reverseAmount } =
    reverseData;

  const accountCode = account?.code ?? '';
  const accountName = account?.name ?? '';

  const checkboxChangeHandler = () => selectHandler(voucherId);
  const reverseAmountChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241105 - Julian) 金額只能輸入數字
    const num = parseInt(e.target.value, 10);
    const numValue = Number.isNaN(num) ? 0 : num;
    // Info: (20241105 - Julian) 金額範圍限制 0 ~ amount
    const valueInRange = numValue < 0 ? 0 : numValue > amount ? amount : numValue;
    amountChangeHandler(voucherId, valueInRange);
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
  const { selectedCompany } = useUserCtx();

  const params = {
    companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
    accountId: modalData.account?.code,
  };

  // Info: (20241104 - Julian) 取得會計科目以呼叫 API
  const { lineItemIndex } = modalData;

  const rawReverseData: IReverseItemUI[] = []; // ToDo: (20241105 - Julian) Call API to get reverse data

  const defaultUIReverseList: IReverseItemUI[] = rawReverseData.map((reverse) => {
    return {
      ...reverse,
      lineItemIndex: modalData.lineItemIndex,
      reverseAmount: 0,
      isSelected: false,
    };
  });

  const [uiReverseItemList, setUiReverseItemList] =
    useState<IReverseItemUI[]>(defaultUIReverseList);
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
    addReverseListHandler(lineItemIndex, selectedReverseItems);
    modalVisibilityHandler();
  };

  const handleApiResponse = (resData: IPaginatedData<IReverseItem[]>) => {
    const reverseItemList: IReverseItemUI[] = resData.data.map((reverse) => {
      return {
        ...reverse,
        lineItemIndex: 0,
        reverseAmount: 0,
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
            reverseAmount: 0,
          };
        });
      });
    }
  }, [isModalVisible]);

  const reverseList =
    uiReverseItemList.length > 0 ? (
      uiReverseItemList.map((reverse) => {
        // Info: (20241104 - Julian) 單選
        const selectCountHandler = (id: number) => {
          setUiReverseItemList((prev) => {
            return prev.map((voucher) => {
              if (voucher.voucherId === id) {
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
              if (item.voucherId === id) {
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
            key={reverse.voucherId}
            reverseData={reverse}
            selectHandler={selectCountHandler}
            amountChangeHandler={amountChangeHandler}
          />
        );
      })
    ) : (
      <div className="col-start-1 col-end-15 text-center text-lg">No Reverse Item Found</div>
    );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex h-500px w-90vw flex-col items-center gap-16px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 px-20px py-16px shadow-lg md:w-750px">
        {/* Info: (20241104 - Julian) Close button */}
        <button type="button" onClick={modalVisibilityHandler} className="absolute right-4 top-4">
          <RxCross2 size={24} className="text-icon-surface-single-color-primary" />
        </button>

        {/* Info: (20241104 - Julian) Modal title */}
        <h2 className="text-xl font-bold text-card-text-primary">
          {t('journal:REVERSE_MODAL.MODAL_TITLE')}
        </h2>

        {/* Info: (20241104 - Julian) Modal body */}
        <div className="flex w-full flex-1 flex-col items-center gap-16px px-20px">
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
          <div className="flex w-full flex-1 flex-col overflow-hidden rounded-md border border-stroke-neutral-quaternary">
            {/* Info: (20241104 - Julian) summary */}
            <div className="flex items-center justify-between bg-surface-neutral-main-background px-16px py-8px font-medium">
              {/* Info: (20241104 - Julian) Select */}
              <p className="text-text-neutral-secondary">
                ({t('journal:REVERSE_MODAL.SELECT')} {selectCount}/{totalItems})
              </p>
              {/* Info: (20241104 - Julian) Total reverse amount */}
              <p className="text-text-neutral-secondary">
                {t('journal:REVERSE_MODAL.TOTAL_REVERSE_AMOUNT')}:{' '}
                <span className="text-text-neutral-primary">
                  {numberWithCommas(totalReverseAmount)}
                </span>{' '}
                {t('common:COMMON.TWD')}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center px-16px py-8px text-sm">
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
              <div className="grid w-full grid-cols-14 items-center gap-x-8px gap-y-4px overflow-y-auto py-4px text-text-neutral-primary">
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
