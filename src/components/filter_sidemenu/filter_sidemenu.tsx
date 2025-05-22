import React from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';

interface IFilterSideMenuProps {
  isModalVisible: boolean;
  modalVisibleHandler: () => void;
}

const FilterSideMenu: React.FC<IFilterSideMenuProps> = ({
  isModalVisible,
  modalVisibleHandler,
}) => {
  const typeDropdownMenu = (
    <div className="flex flex-col items-start gap-8px">
      <p className="text-sm font-semibold text-text-neutral-tertiary">Type</p>
      <div className="flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px">
        <div className="flex-1 text-base font-medium text-input-text-input-filled">All</div>
        <FaChevronDown />
      </div>
    </div>
  );

  const periodPicker = (
    <div className="flex flex-col items-start gap-8px">
      <p className="text-sm font-semibold text-text-neutral-tertiary">Period</p>
      <DatePicker
        type={DatePickerType.TEXT_DATE}
        period={{
          startTimeStamp: 0,
          endTimeStamp: 0,
        }}
        setFilteredPeriod={() => {}}
        btnClassName="h-46px"
        calenderClassName="w-full"
      />
    </div>
  );

  // const planDropdownMenu = (
  //   <div className="flex flex-col items-start gap-8px">
  //     <p className="text-sm font-semibold text-text-neutral-tertiary">Plan</p>
  //     <div className="flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px">
  //       <div className="flex-1 text-base font-medium text-input-text-input-filled">All</div>
  //       <FaChevronDown />
  //     </div>
  //   </div>
  // );

  const searchInput = (
    <div className="flex items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-icon-surface-single-color-primary">
      <input
        type="text"
        className="flex-1 bg-transparent outline-none placeholder:font-medium placeholder:text-input-text-input-placeholder"
        placeholder="Search"
      />
      <FiSearch size={20} />
    </div>
  );

  return (
    <div className="block tablet:hidden">
      {/* Info: (20250521 - Julian) 黑底遮罩 */}
      <div
        onClick={modalVisibleHandler}
        className={`fixed inset-0 z-120 flex items-center justify-center bg-black/50 transition-all duration-300 ease-in-out ${isModalVisible ? 'visible opacity-100' : 'invisible opacity-0'}`}
      ></div>

      {/* Info: (20250521 - Julian) 選單 */}
      <div
        className={`fixed right-0 top-0 z-130 flex h-screen w-90vw flex-col gap-lv-5 bg-white px-16px py-24px transition-all duration-300 ease-in-out ${isModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Info: (20250521 - Julian) Header */}
        <div className="relative flex w-full flex-col items-center">
          <button type="button" className="absolute left-0 p-10px" onClick={modalVisibleHandler}>
            <RxCross2 size={16} />
          </button>
          <p className="text-center text-base font-semibold text-text-neutral-secondary">Filter</p>
        </div>

        {/* Info: (20250521 - Julian) 分隔線 */}
        <hr className="border-divider-stroke-lv-4" />
        {/* Info: (20250521 - Julian) 選單內容 */}
        <div className="flex flex-col items-stretch gap-lv-4">
          {typeDropdownMenu}
          {periodPicker}
          {searchInput}
        </div>
        <div className="flex items-center gap-lv-2 text-xs font-medium">
          <Toggle
            id="hide-reversals-toggle-mobile"
            // initialToggleState={isHideReversals}
            // getToggledState={hideReversalsToggleHandler}
            // toggleStateFromParent={isHideReversals}
            getToggledState={() => {}}
          />
          Hide deleted vouchers and their reversals.
        </div>
      </div>
    </div>
  );
};

export default FilterSideMenu;
