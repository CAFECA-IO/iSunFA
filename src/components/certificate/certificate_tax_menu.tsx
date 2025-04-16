import useOuterClick from '@/lib/hooks/use_outer_click';
import { useState } from 'react';
import { FaChevronDown, FaAngleRight } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';

enum TaxOptions {
  TAXABLE_5 = 'TAXABLE_5',
  ZERO_TAX_RATE = 'ZERO_TAX_RATE',
  TAX_FREE = 'TAX_FREE',
}

enum ZeroTaxRateOptions {
  NONE = 'NONE',
  THROUGH_CUSTOMS = 'THROUGH_CUSTOMS',
  NOT_THROUGH_CUSTOMS = 'NOT_THROUGH_CUSTOMS',
}

const taxRates = {
  TAXABLE_5: 5,
  ZERO_TAX_RATE: 0,
  TAX_FREE: null,
};

interface ITaxMenuProps {
  selectTaxHandler: (value: number | null) => void;
}

const TaxMenu: React.FC<ITaxMenuProps> = ({ selectTaxHandler }: ITaxMenuProps) => {
  const { t } = useTranslation(['certificate', 'common']);
  const [selectedTax, setSelectedTax] = useState<TaxOptions | ZeroTaxRateOptions>(
    TaxOptions.TAXABLE_5
  );

  const {
    targetRef: taxRatioMenuRef,
    componentVisible: isTaxRatioMenuOpen,
    setComponentVisible: setIsTaxRatioMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: taxRatioSubMenuRef,
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

  const handleOptionClick = (option: TaxOptions, event?: React.MouseEvent) => {
    event?.stopPropagation();
    selectTaxHandler(taxRates[option]);
    if (option === TaxOptions.ZERO_TAX_RATE) {
      setIsTaxRatioSubMenuOpen(!isTaxRatioSubMenuOpen);
    } else {
      setSelectedTax(option);
      closeAllMenus();
    }
  };

  const handleZeroTaxRateOptionClick = (option: ZeroTaxRateOptions, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedTax(option);
    closeAllMenus();
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
        {t(`certificate:EDIT.${selectedTax}`)}
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
          {Object.values(TaxOptions).map((value) => (
            <li
              key={value}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
              onClick={(e) => handleOptionClick(value, e)}
            >
              <span>{t(`certificate:EDIT.${value}`)}</span>
              <span>{value === TaxOptions.ZERO_TAX_RATE && <FaAngleRight />}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Info: (20250103 - Tzuhan) 次級選單 */}
      {isTaxRatioSubMenuOpen && (
        <div
          ref={taxRatioSubMenuRef}
          className="border-dropdown-stroke-menu/10 absolute left-full top-50px grid w-full translate-x-2 grid-cols-1 overflow-hidden rounded-sm border border-l-1px bg-dropdown-surface-menu-background-secondary shadow-dropmenu"
        >
          <ul className="z-10 flex w-full flex-col items-start gap-2 bg-dropdown-surface-menu-background-primary">
            {Object.values(ZeroTaxRateOptions).map((value) => (
              <li
                key={value}
                className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
                onClick={(e) => handleZeroTaxRateOptionClick(value, e)}
              >
                {t(`certificate:EDIT.${value}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaxMenu;
