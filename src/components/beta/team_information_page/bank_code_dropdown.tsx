import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { PiBankBold } from 'react-icons/pi';

interface Bank {
  code: string;
  name: string;
}

interface BankCodeDropdownProps {
  options: Bank[]; // Info: (20250310 - Anna) 接收 `code` + `name`
  selectedValue: string | undefined; // Info: (20240920 - tzuhan) 當前選中的值
  onChange: (value: string) => void; // Info: (20240920 - tzuhan) 當選項改變時觸發的函數
  containerClassName?: string; // Info: (20241015 - Anna) 父容器的 className
  className?: string; // Info: (20241015 - Anna) 因為ledger頁面需要改樣式，因此增加className屬性
  width?: string; // Info: (20250121 - Liz) 設定寬度
}

// Info: (20241015 - Anna) 預設 className 為空
const BankCodeDropdown: React.FC<BankCodeDropdownProps> = ({
  options,
  selectedValue,
  onChange,
  containerClassName = '',
  className = '',
  width = '',
}) => {
  const { t } = useTranslation(['team']);
  const {
    targetRef: menuRef,
    componentVisible: menuVisibility,
    setComponentVisible: setMenuVisibility,
  } = useOuterClick<HTMLDivElement>(false);

  const [inputValue, setInputValue] = useState(selectedValue || ''); // Info: (20250310 - Anna) 允許手動輸入

  const toggleMenuHandler = () => {
    setMenuVisibility((prev) => !prev);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Info: (20250310 - Anna) 只允許數字
    setInputValue(value);
    onChange(value);
  };

  const handleOptionSelect = (code: string) => {
    setInputValue(code);
    onChange(code); // Info: (20250310 - Anna) 確保父組件獲取變更
  };

  return (
    // Info: (20241015 - Anna) 在這裡使用containerClassName屬性
    <div className={`flex flex-col gap-8px ${width || 'w-full lg:w-200px'} ${containerClassName}`}>
      {/* Info: (20241015 - Anna) 在這裡使用className屬性 */}
      <div
        ref={menuRef}
        className={`relative flex h-44px w-150px items-center justify-between rounded-l-sm border-b border-l border-t border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer ${className}`}
        onClick={toggleMenuHandler}
      >
        <p className="relative flex-1 truncate text-input-text-input-placeholder">
          <PiBankBold className="absolute top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={t('team:TEAM_INFO_PAGE.BANK_CODE')}
            className="w-full bg-transparent pl-10 text-input-text-primary outline-none"
          />
        </p>
        <div className="flex h-20px w-20px items-center justify-center">
          <FaChevronDown className={menuVisibility ? 'rotate-180' : 'rotate-0'} />
        </div>
        <div
          className={`absolute left-0 top-12 z-10 grid w-full rounded-sm border border-input-stroke-input ${
            menuVisibility
              ? 'grid-rows-1 border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu'
              : 'grid-rows-0 border-transparent'
          } overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <ul
            className={`z-20 flex max-h-200px w-full flex-col items-start overflow-y-auto p-2 tablet:max-h-400px`}
          >
            {options.map((bank) => (
              <li
                key={bank.code}
                onClick={() => handleOptionSelect(bank.code)}
                className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
              >
                ({bank.code}) &nbsp;{bank.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BankCodeDropdown;
