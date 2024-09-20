import useOuterClick from '@/lib/hooks/use_outer_click';
import React from 'react';
import { FaChevronDown } from 'react-icons/fa6';

interface SelectFilterProps {
  label: string; // Info: (20240920 - tzuhan) 選項標籤
  options: string[]; // Info: (20240920 - tzuhan) 下拉選項
  selectedValue: string | undefined; // Info: (20240920 - tzuhan) 當前選中的值
  onChange: (value: string) => void; // Info: (20240920 - tzuhan) 當選項改變時觸發的函數
}

const SelectFilter: React.FC<SelectFilterProps> = ({ label, options, selectedValue, onChange }) => {
  const {
    targetRef: menuRef,
    componentVisible: menuVisibility,
    setComponentVisible: setMenuVisibility,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleMenuHandler = () => {
    setMenuVisibility(!menuVisibility);
  };

  return (
    <div className="flex w-full flex-col gap-8px lg:w-200px">
      <p className="text-sm font-semibold text-input-text-primary">{label}</p>
      <div
        onClick={toggleMenuHandler}
        className={`relative flex h-44px items-center justify-between rounded-sm border bg-input-surface-input-background ${menuVisibility ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px py-10px hover:cursor-pointer`}
      >
        <p className="text-input-text-input-placeholder">{selectedValue}</p>
        <FaChevronDown />
        <div
          ref={menuRef}
          className={`absolute left-0 top-12 z-10 grid w-full rounded-sm border border-input-stroke-input ${
            menuVisibility
              ? 'grid-rows-1 border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu'
              : 'grid-rows-0 border-transparent'
          } overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <ul className={`flex w-full flex-col items-start p-2`}>
            {options.map((option) => (
              <li
                key={option}
                onClick={() => onChange(option)}
                className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SelectFilter;
