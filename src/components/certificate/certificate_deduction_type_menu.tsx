import useOuterClick from '@/lib/hooks/use_outer_click';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';

enum DeductionTypeOptions {
  DEDUCTIBLE_PURCHASE_AND_EXPENSE = 'DEDUCTIBLE_PURCHASE_AND_EXPENSE',
  DEDUCTIBLE_FIXED_ASSETS = 'DEDUCTIBLE_FIXED_ASSETS',
  NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE = 'NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE',
  NON_DEDUCTIBLE_FIXED_ASSETS = 'NON_DEDUCTIBLE_FIXED_ASSETS',
}

interface IDeductionTypeMenuProps {
  selectDeductionTypeHandler: (value: string) => void;
}

const DeductionTypeMenu: React.FC<IDeductionTypeMenuProps> = ({
  selectDeductionTypeHandler,
}: IDeductionTypeMenuProps) => {
  const { t } = useTranslation(['certificate', 'common']);
  const [selectedDeductionType, setSelectedDeductionType] = useState<DeductionTypeOptions>(
    DeductionTypeOptions.DEDUCTIBLE_PURCHASE_AND_EXPENSE
  );

  const {
    targetRef: deductionTypeMenuRef,
    componentVisible: isDeductionTypeMenuOpen,
    setComponentVisible: setIsDeductionTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const closeAllMenus = () => {
    setIsDeductionTypeMenuOpen(false);
  };

  const handleDeductionTypeMenuClick = () => {
    setIsDeductionTypeMenuOpen(!isDeductionTypeMenuOpen);
  };

  const handleOptionClick = (option: DeductionTypeOptions, event?: React.MouseEvent) => {
    event?.stopPropagation(); // Info: (20250422 - Anna) 停止事件冒泡，避免點選選項後選單意外關閉或傳遞到其他層
    selectDeductionTypeHandler(option); // Info: (20250422 - Anna) 把選到的項目回傳給父層
    setSelectedDeductionType(option); // Info: (20250422 - Anna) 更新本地 state，讓目前選到的項目顯示
    closeAllMenus();
  };

  return (
    <div
      id="deduction-type-menu"
      ref={deductionTypeMenuRef}
      onClick={handleDeductionTypeMenuClick}
      className={`group relative z-100 flex h-46px w-full cursor-pointer ${
        isDeductionTypeMenuOpen
          ? 'border-input-stroke-selected text-dropdown-stroke-input-hover'
          : 'border-input-stroke-input text-input-text-input-filled'
      } items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
    >
      <p className="min-w-110px text-input-text-input-filled">
        {t(`certificate:EDIT.${selectedDeductionType}`)}
      </p>
      <div className="flex h-20px w-20px items-center justify-center">
        <FaChevronDown className={isDeductionTypeMenuOpen ? 'rotate-180' : 'rotate-0'} />
      </div>

      {/* Info: (20250103 - Anna) 主選單 */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${
          isDeductionTypeMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu'
            : 'grid-rows-0 border-transparent'
        } overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start gap-2 bg-dropdown-surface-menu-background-primary">
          {Object.values(DeductionTypeOptions).map((value) => (
            <li
              key={value}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
              onClick={(e) => handleOptionClick(value, e)}
            >
              <span>{t(`certificate:EDIT.${value}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DeductionTypeMenu;
