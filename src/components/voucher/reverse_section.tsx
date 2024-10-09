import React, { useState } from 'react';
import Image from 'next/image';
import { BsChevronDown } from 'react-icons/bs';
import { FiTrash2 } from 'react-icons/fi';
import { LuPlus } from 'react-icons/lu';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { inputStyle } from '@/constants/display';
import { IVoucherBeta, dummyVoucherList } from '@/interfaces/voucher';
import { numberWithCommas } from '@/lib/utils/common';
import { Button } from '@/components/button/button';

interface IReverseSectionProps {
  // ToDo: (20241009 - Julian) 未選擇
  isShowReverseVoucherHint?: boolean;
}

const ReverseLine: React.FC<IReverseSectionProps> = ({ isShowReverseVoucherHint = false }) => {
  const [selectedVoucher, setSelectedVoucher] = useState<IVoucherBeta | null>(null);
  const [reverseAmountInput, setReverseAmountInput] = useState<string>('');
  // ToDo: (20241009 - Julian) Send reverse amount to backend
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reverseAmount, setReverseAmount] = useState<number>(0);

  // Info: (20241009 - Julian) 選單顯示狀態
  const {
    targetRef: voucherMenuRef,
    componentVisible: isVoucherMenuVisible,
    setComponentVisible: setVoucherMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleVoucherEditing = () => {
    setVoucherMenuVisible(!isVoucherMenuVisible);
  };

  const changeReverseAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241009 - Julian) 限制只能輸入數字，並去掉開頭 0
    const value = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    // Info: (20241009 - Julian) 加入千分位逗號
    setReverseAmountInput(numberWithCommas(value));
    // Info: (20241009 - Julian) 設定 reverseAmount
    setReverseAmount(Number(e.target.value));
  };

  const displayedReverseVoucher = selectedVoucher ? (
    <div className="flex w-full items-center">
      <div className="w-1/3 font-medium text-dropdown-text-primary">
        {selectedVoucher.voucherNo}
      </div>
      <div className="w-1/3 text-dropdown-text-secondary">{selectedVoucher.counterparty.name}</div>
      <div className="w-1/3 font-medium text-text-neutral-primary">
        {/* ToDo: (20241009 - Julian) 須確認這欄的內容 */}
        {numberWithCommas(selectedVoucher.debit.reduce((acc, cur) => acc + cur, 0))}{' '}
        <span className="text-dropdown-text-secondary">TWD</span>
      </div>
    </div>
  ) : (
    <p
      className={`truncate text-input-text-input-placeholder ${isShowReverseVoucherHint ? inputStyle.ERROR : inputStyle.NORMAL}`}
    >
      Please select...
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
        };

        return (
          <div
            key={voucher.voucherNo}
            onClick={clickHandler}
            className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <div className="w-1/3 font-medium text-dropdown-text-primary">{voucher.voucherNo}</div>
            <div className="w-1/3 text-dropdown-text-secondary">{voucher.counterparty.name}</div>
            <div className="w-1/3 font-medium text-text-neutral-primary">
              {/* ToDo: (20241009 - Julian) 須確認這欄的內容 */}
              {numberWithCommas(voucher.debit.reduce((acc, cur) => acc + cur, 0))}{' '}
              <span className="text-dropdown-text-secondary">TWD</span>
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="flex items-end gap-24px">
      {/* Info: (20241009 - Julian) reverse voucher */}
      <div className="flex flex-1 flex-col gap-8px">
        <p className="font-bold text-input-text-primary">
          Reverse Voucher
          <span className="text-text-state-error">*</span>
        </p>
        <div
          onClick={toggleVoucherEditing}
          className={`relative flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isVoucherMenuVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}`}
        >
          {displayedReverseVoucher}
          <div className="h-20px w-20px">
            <BsChevronDown size={20} />
          </div>
          {voucherDropdownMenu}
        </div>
      </div>
      {/* Info: (20241009 - Julian) reverse amount */}
      <div className="flex flex-col gap-8px">
        <p className="font-bold text-input-text-primary">
          Reverse Amount
          <span className="text-text-state-error">*</span>
        </p>
        <div className="flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            id="reverse-amount"
            type="text"
            value={reverseAmountInput}
            onChange={changeReverseAmount}
            className="bg-transparent px-12px py-10px text-right outline-none"
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
      </div>
      {/* Info: (20241009 - Julian) delete button */}
      <Button type="button" variant="tertiaryBorderless">
        <FiTrash2 size={22} />
      </Button>
    </div>
  );
};

const ReverseSection: React.FC = () => {
  const [reverseLineItems, setReverseLineItems] = useState<number[]>([1]);

  // ToDo: (20241009 - Julian) Implement addReverseLineItem
  const addReverseLineItem = () => {
    setReverseLineItems([...reverseLineItems, reverseLineItems.length + 1]);
  };

  // ToDo: (20241009 - Julian) 🔧施工中
  // eslint-disable-next-line react/no-array-index-key
  const displayedReverseLineItems = reverseLineItems.map((_, index) => <ReverseLine key={index} />);

  return (
    <>
      {/* Info: (20241009 - Julian) Reverse Divider */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/bell.svg" width={16} height={16} alt="bell_icon" />
          <p>Reverse</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>

      <div className="mt-12px flex flex-col gap-12px">
        {/* Info: (20241009 - Julian) reverse voucher list */}
        <div className="flex flex-col">{displayedReverseLineItems}</div>
        <button
          type="button"
          className="ml-auto flex items-center text-sm font-semibold text-link-text-primary"
          onClick={addReverseLineItem}
        >
          <LuPlus />
          <p>Add more reverse voucher</p>
        </button>
      </div>
    </>
  );
};

export default ReverseSection;
