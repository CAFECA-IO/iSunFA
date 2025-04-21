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
    targetRef: taxRatioMenuRef,
    componentVisible: isTaxRatioMenuOpen,
    setComponentVisible: setIsTaxRatioMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    componentVisible: isTaxRatioSubMenuOpen,
    setComponentVisible: setIsTaxRatioSubMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const closeAllMenus = () => {
    setIsTaxRatioMenuOpen(false);
    setIsTaxRatioSubMenuOpen(false);
  };

  const handleMainMenuClick = () => {
    setIsTaxRatioMenuOpen(!isTaxRatioMenuOpen);
    if (!isTaxRatioMenuOpen) {
      setIsTaxRatioSubMenuOpen(false);
    }
  };

  const handleOptionClick = (option: DeductionTypeOptions, event?: React.MouseEvent) => {
    event?.stopPropagation();
    selectDeductionTypeHandler(option);
    if (option === DeductionTypeOptions.DEDUCTIBLE_FIXED_ASSETS) {
      setIsTaxRatioSubMenuOpen(!isTaxRatioSubMenuOpen);
    } else {
      setSelectedDeductionType(option);
      closeAllMenus();
    }
  };

  return (
    <div
      id="tax-rate-menu"
      ref={taxRatioMenuRef}
      onClick={handleMainMenuClick}
      className={`group relative z-100 flex h-46px w-full cursor-pointer ${
        isTaxRatioMenuOpen
          ? 'border-input-stroke-selected text-dropdown-stroke-input-hover'
          : 'border-input-stroke-input text-input-text-input-filled'
      } items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
    >
      <p className="min-w-110px text-input-text-input-filled">
        {t(`certificate:EDIT.${selectedDeductionType}`)}
      </p>
      <div className="flex h-20px w-20px items-center justify-center">
        <FaChevronDown className={isTaxRatioMenuOpen ? 'rotate-180' : 'rotate-0'} />
      </div>

      {/* Info: (20250103 - Tzuhan) 主選單 */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${
          isTaxRatioMenuOpen
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
