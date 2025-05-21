import React from 'react';
import { RxCross2 } from 'react-icons/rx';

interface IFilterSideMenuProps {
  isModalVisible: boolean;
  modalVisibleHandler: () => void;
}

const FilterSideMenu: React.FC<IFilterSideMenuProps> = ({
  isModalVisible,
  modalVisibleHandler,
}) => {
  return (
    <>
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
      </div>
    </>
  );
};

export default FilterSideMenu;
