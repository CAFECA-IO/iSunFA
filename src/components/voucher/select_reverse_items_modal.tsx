import React, { useState } from 'react';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { checkboxStyle, default30DayPeriodInSec } from '@/constants/display';
import { numberWithCommas } from '@/lib/utils/common';

const ReverseItem: React.FC = () => {
  const voucherNo = '240201-001';
  const accounting = '1141 - Accounts Receivable';
  const particulars = 'Buy a printer';
  const amount = 26000;

  const accountCode = accounting.split(' - ')[0];
  const accountName = accounting.split(' - ')[1];

  return (
    <>
      {/* Info: (20241104 - Julian) Checkbox */}
      <div className="col-start-1 col-end-2">
        <input type="checkbox" className={checkboxStyle} />
      </div>
      {/* Info: (20241104 - Julian) Voucher No */}
      <div className="col-start-2 col-end-4">{voucherNo}</div>
      {/* Info: (20241104 - Julian) Accounting */}
      <div className="col-start-4 col-end-7 truncate">
        {accountCode} - <span className="text-text-neutral-tertiary">{accountName}</span>
      </div>
      {/* Info: (20241104 - Julian) Particulars */}
      <div className="col-start-7 col-end-9">{particulars}</div>
      {/* Info: (20241104 - Julian) Amount */}
      <div className="col-start-9 col-end-11">
        {numberWithCommas(amount)}
        <span className="text-text-neutral-tertiary"> TWD</span>
      </div>
      {/* Info: (20241104 - Julian) Reverse Amount */}
      <div className="col-start-11 col-end-14 text-right">
        <div className="flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="string"
            className="w-0 flex-1 bg-transparent px-12px py-10px text-right text-input-text-input-filled outline-none"
            placeholder="0"
          />
          <div className="flex items-center gap-8px px-12px py-10px">
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
    </>
  );
};

const SelectReverseItemsModal: React.FC = () => {
  const totalItems = 109;

  const [filteredPeriod, setFilteredPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const selectCount = 0;
  // const [selectCount, setSelectCount] = useState<number>(0);

  const modalVisibilityHandler = () => {};

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex w-90vw flex-col items-center gap-16px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 px-20px py-16px shadow-lg lg:w-700px">
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
                placeholder="Search"
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
                Total reverse amount: <span className="text-text-neutral-primary">30,000</span> NTD
              </p>
            </div>
            <div className="flex flex-col items-center px-16px py-8px text-sm">
              {/* Info: (20241104 - Julian) Table header */}
              <div className="grid w-full grid-cols-13 gap-8px border-b border-divider-stroke-lv-4 pb-4px text-text-neutral-tertiary">
                {/* Info: (20241104 - Julian) Checkbox */}
                <div className="col-start-1 col-end-2">
                  <input type="checkbox" className={checkboxStyle} />
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
                <div className="col-start-11 col-end-14 text-right">Reverse Amount</div>
              </div>

              {/* Info: (20241104 - Julian) Table body */}
              <div className="grid max-h-450px w-full grid-cols-13 items-center gap-x-8px gap-y-4px overflow-y-auto py-4px text-text-neutral-primary">
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
                <ReverseItem />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectReverseItemsModal;
