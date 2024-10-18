import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { LuPlus } from 'react-icons/lu';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { numberWithCommas } from '@/lib/utils/common';
import { inputStyle } from '@/constants/display';
import { IVoucherBeta, dummyVoucherList } from '@/interfaces/voucher';
import { IReverse, defaultReverse } from '@/interfaces/reverse';
import { Button } from '@/components/button/button';

interface IReverseLineProps {
  deleteHandler: () => void;
  voucherChangeHandler: (voucher: IVoucherBeta) => void;
  amountChangeHandler: (amount: number) => void;
  flagOfClear: boolean;
  flagOfSubmit: boolean;
}

interface IReverseSectionProps {
  reverses: IReverse[];
  setReverses: React.Dispatch<React.SetStateAction<IReverse[]>>;
  flagOfClear: boolean;
  flagOfSubmit: boolean;
}

const ReverseLine: React.FC<IReverseLineProps> = ({
  deleteHandler,
  voucherChangeHandler,
  amountChangeHandler,
  flagOfClear,
  flagOfSubmit,
}) => {
  const { t } = useTranslation('common');

  const [selectedVoucher, setSelectedVoucher] = useState<IVoucherBeta | null>(null);
  const [reverseAmountInput, setReverseAmountInput] = useState<string>('');

  const [voucherStyle, setVoucherStyle] = useState<string>(inputStyle.NORMAL);
  const [amountStyle, setAmountStyle] = useState<string>(inputStyle.NORMAL);

  // Info: (20241009 - Julian) 選單顯示狀態
  const {
    targetRef: voucherMenuRef,
    componentVisible: isVoucherMenuVisible,
    setComponentVisible: setVoucherMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  useEffect(() => {
    // Info: (20241011 - Julian) Reset All State
    setSelectedVoucher(null);
    setReverseAmountInput('');
  }, [flagOfClear]);

  useEffect(() => {
    // Info: (20241011 - Julian) 檢查是否選擇傳票
    setVoucherStyle(selectedVoucher ? inputStyle.NORMAL : inputStyle.ERROR);
    // Info: (20241011 - Julian) 檢查是否輸入金額
    setAmountStyle(reverseAmountInput ? inputStyle.NORMAL : inputStyle.ERROR);
  }, [flagOfSubmit]);

  useEffect(() => {
    // Info: (20241011 - Julian) 選擇傳票時，樣式改回 NORMAL
    setVoucherStyle(inputStyle.NORMAL);
  }, [selectedVoucher]);

  useEffect(() => {
    // Info: (20241007 - Julian) 修改金額時，樣式改回 NORMAL
    setAmountStyle(inputStyle.NORMAL);
  }, [reverseAmountInput]);

  const toggleVoucherEditing = () => {
    setVoucherMenuVisible(!isVoucherMenuVisible);
  };

  const changeReverseAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241009 - Julian) 限制只能輸入數字，並去掉開頭 0
    const value = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    // Info: (20241009 - Julian) 加入千分位逗號
    setReverseAmountInput(numberWithCommas(value));
    // Info: (20241009 - Julian) 設定 reverseAmount
    amountChangeHandler(Number(e.target.value));
  };

  const displayedReverseVoucher = selectedVoucher ? (
    <div className="flex w-full items-center">
      <div className="flex flex-1 items-center gap-24px">
        <div className="font-medium text-dropdown-text-primary">{selectedVoucher.voucherNo}</div>
        <div className="text-xs text-dropdown-text-secondary">
          {selectedVoucher.counterParty.name}
        </div>
      </div>
      <div className="font-medium text-text-neutral-primary">
        {/* ToDo: (20241009 - Julian) 須確認這欄的內容 */}
        {numberWithCommas(selectedVoucher?.lineItemsInfo.sum.amount ?? 0)}{' '}
        <span className="text-dropdown-text-secondary">TWD</span>
      </div>
    </div>
  ) : (
    <p className="truncate text-input-text-input-placeholder">
      {t('journal:REVERSE_SECTION.REVERSE_VOUCHER_PLACEHOLDER')}
    </p>
  );

  const voucherDropdownMenu = isVoucherMenuVisible ? (
    <div
      ref={voucherMenuRef}
      className="absolute left-0 top-12 z-20 flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
    >
      {dummyVoucherList.map((voucher) => {
        const clickHandler = () => {
          setSelectedVoucher(voucher);
          setVoucherMenuVisible(false);
          voucherChangeHandler(voucher);
        };

        return (
          <div
            key={voucher.voucherNo}
            onClick={clickHandler}
            className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <div className="w-1/3 font-medium text-dropdown-text-primary">{voucher.voucherNo}</div>
            <div className="w-1/3 text-dropdown-text-secondary">{voucher.counterParty.name}</div>
            <div className="w-1/3 font-medium text-text-neutral-primary">
              {/* ToDo: (20241009 - Julian) 須確認這欄的內容 */}
              {numberWithCommas(voucher.lineItemsInfo.sum.amount ?? 0)}{' '}
              <span className="text-dropdown-text-secondary">TWD</span>
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      {/* Info: (20241009 - Julian) reverse voucher */}
      <div
        onClick={toggleVoucherEditing}
        className={`relative col-span-7 flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isVoucherMenuVisible ? 'border-input-stroke-selected' : voucherStyle}`}
      >
        {displayedReverseVoucher}
        <div className="h-20px w-20px">
          <FaChevronDown size={20} />
        </div>
        {voucherDropdownMenu}
      </div>
      {/* Info: (20241009 - Julian) reverse amount */}
      <div
        className={`col-span-2 flex items-center divide-x rounded-sm border bg-input-surface-input-background ${amountStyle}`}
      >
        <input
          id="reverse-amount"
          type="text"
          value={reverseAmountInput}
          onChange={changeReverseAmount}
          className="w-0 flex-1 bg-transparent px-12px py-10px text-right outline-none"
          placeholder="0"
        />
        <div className="flex items-center gap-8px px-12px py-10px text-input-text-input-placeholder">
          <Image
            src="/flags/tw.svg"
            width={16}
            height={16}
            alt="tw_icon"
            className="rounded-full"
          />
          <p>TWD</p>
        </div>
      </div>
      {/* Info: (20241009 - Julian) delete button */}
      <Button type="button" variant="tertiaryBorderless" className="p-0" onClick={deleteHandler}>
        <FiTrash2 size={22} />
      </Button>
    </>
  );
};

const ReverseSection: React.FC<IReverseSectionProps> = ({
  reverses,
  setReverses,
  flagOfClear,
  flagOfSubmit,
}) => {
  const { t } = useTranslation('common');

  const addReverseLineItem = () => {
    // Info: (20241011 - Julian) 取得最後一筆的 ID + 1
    const lastItem = reverses[reverses.length - 1];
    const newId = lastItem ? lastItem.id + 1 : 0;

    const newLine = { ...defaultReverse, id: newId };

    setReverses([...reverses, newLine]);
  };

  const displayedReverseLineItems =
    reverses && reverses.length > 0 ? (
      reverses.map((reverse) => {
        // Info: (20241011 - Julian) 複製傳票列
        const duplicateLineItem = { ...reverse };

        // Info: (20241011 - Julian) 刪除
        const deleteReverseLineItem = () => {
          const newLineItems = reverses.filter((item) => item.id !== reverse.id);
          setReverses(newLineItems);
        };

        // Info: (20241011 - Julian)
        const voucherChangeHandler = (voucher: IVoucherBeta) => {
          // Info: (20241011 - Julian) 設定 reverse voucher
          duplicateLineItem.voucher = voucher;
          setReverses(reverses.map((item) => (item.id === reverse.id ? duplicateLineItem : item)));
        };
        const amountChangeHandler = (amount: number) => {
          // Info: (20241011 - Julian) 設定 reverse amount
          duplicateLineItem.amount = amount;
          setReverses(reverses.map((item) => (item.id === reverse.id ? duplicateLineItem : item)));
        };

        return (
          <ReverseLine
            key={reverse.id}
            deleteHandler={deleteReverseLineItem}
            voucherChangeHandler={voucherChangeHandler}
            amountChangeHandler={amountChangeHandler}
            flagOfClear={flagOfClear}
            flagOfSubmit={flagOfSubmit}
          />
        );
      })
    ) : (
      <div className="col-span-10 flex flex-col items-center text-xs">
        <p className="text-text-neutral-tertiary">{t('common:COMMON.EMPTY')}</p>
        <p
          className={`${
            reverses.length === 0 ? 'text-text-state-error' : 'text-text-neutral-primary'
          }`}
        >
          {t('journal:REVERSE_SECTION.EMPTY_HINT')}
        </p>
      </div>
    );

  return (
    <>
      {/* Info: (20241009 - Julian) Reverse Divider */}
      <div id="reverse-section" className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/bell.svg" width={16} height={16} alt="bell_icon" />
          <p>{t('journal:REVERSE_SECTION.TITLE')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>

      <div className="mt-12px flex flex-col gap-12px">
        {/* Info: (20241009 - Julian) reverse voucher header */}
        <div className="grid grid-cols-10 gap-24px">
          <p className="col-span-7 font-bold text-input-text-primary">
            {t('journal:REVERSE_SECTION.REVERSE_VOUCHER')}
            <span className="text-text-state-error">*</span>
          </p>
          <p className="col-span-3 font-bold text-input-text-primary">
            {t('journal:REVERSE_SECTION.REVERSE_AMOUNT')}
            <span className="text-text-state-error">*</span>
          </p>
        </div>
        {/* Info: (20241009 - Julian) reverse voucher list */}
        <div className="grid grid-cols-10 gap-x-24px gap-y-14px">{displayedReverseLineItems}</div>
        <button
          type="button"
          className="ml-auto flex items-center text-sm font-semibold text-link-text-primary"
          onClick={addReverseLineItem}
        >
          <LuPlus />
          <p>{t('journal:REVERSE_SECTION.ADD_BTN')}</p>
        </button>
      </div>
    </>
  );
};

export default ReverseSection;
