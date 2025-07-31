import React from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface SelectFilterProps {
  label: string; // Info: (20240920 - tzuhan) 選項標籤
  options: string[]; // Info: (20240920 - tzuhan) 下拉選項
  selectedValue: string | undefined; // Info: (20240920 - tzuhan) 當前選中的值
  onChange: (value: string) => void; // Info: (20240920 - tzuhan) 當選項改變時觸發的函數
  containerClassName?: string; // Info: (20241015 - Anna) 父容器的 className
  className?: string; // Info: (20241015 - Anna) 因為ledger頁面需要改樣式，因此增加className屬性
  width?: string; // Info: (20250121 - Liz) 設定寬度
  labelClassName?: string; // Info: (20250416 - Anna) label的 className
}

// Info: (20241015 - Anna) 預設 className 為空
const SelectFilter: React.FC<SelectFilterProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  containerClassName = '',
  className = '',
  width = '',
  labelClassName = '',
}) => {
  const { t } = useTranslation(['filter_section_type']);
  const {
    targetRef: menuRef,
    componentVisible: menuVisibility,
    setComponentVisible: setMenuVisibility,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleMenuHandler = () => {
    setMenuVisibility((prev) => !prev);
  };

  return (
    // Info: (20241015 - Anna) 在這裡使用containerClassName屬性
    <div
      className={`flex flex-col gap-8px ${width || 'w-full tablet:w-200px'} ${containerClassName}`}
    >
      <p className={`${labelClassName} text-sm font-semibold`}>
        {t(`filter_section_type:FILTER_SECTION_TYPE.${label.toUpperCase()}`)}
      </p>
      {/* Info: (20241015 - Anna) 在這裡使用className屬性 */}
      <div
        ref={menuRef}
        className={`relative flex h-44px items-center justify-between rounded-sm border bg-input-surface-input-background text-sm ${menuVisibility ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px py-10px hover:cursor-pointer ${className}`}
        onClick={toggleMenuHandler}
      >
        <p className="flex-1 truncate font-medium text-input-text-input-placeholder">
          {selectedValue
            ? t(`filter_section_type:FILTER_SECTION_TYPE.${selectedValue.toUpperCase()}`)
            : selectedValue}
        </p>
        <div className="flex h-20px w-20px items-center justify-center text-icon-surface-single-color-primary">
          <FaChevronDown className={menuVisibility ? 'rotate-180' : 'rotate-0'} />
        </div>
        <div
          className={`absolute left-0 top-12 z-10 grid w-full rounded-sm border border-input-stroke-input ${
            menuVisibility
              ? 'grid-rows-1 border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu'
              : 'grid-rows-0 border-transparent'
          } overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <ul className={`z-20 flex max-h-400px w-full flex-col items-start overflow-y-auto p-2`}>
            {options.map((option) => (
              <li
                key={option}
                onClick={() => onChange(option)}
                className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
              >
                {t(`filter_section_type:FILTER_SECTION_TYPE.${option.toUpperCase()}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SelectFilter;
