import useOuterClick from '@/lib/hooks/use_outer_click';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
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
  TAXABLE_5: 0.05,
  NONE: 0,
  THROUGH_CUSTOMS: 0,
  NOT_THROUGH_CUSTOMS: 0,
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

  const handleOptionClick = (option: TaxOptions) => {
    if (option === TaxOptions.ZERO_TAX_RATE) {
      setIsTaxRatioSubMenuOpen(!isTaxRatioSubMenuOpen);
    } else {
      closeAllMenus();
      setSelectedTax(option);
      selectTaxHandler(taxRates[option]);
    }
  };

  const handleZeroTaxRateOptionClick = (option: ZeroTaxRateOptions) => {
    closeAllMenus();
    setSelectedTax(option);
    selectTaxHandler(taxRates[option]);
  };

  return (
    <div
      id="tax-rate-menu"
      ref={taxRatioMenuRef}
      onClick={() => setIsTaxRatioMenuOpen(!isTaxRatioMenuOpen)}
      className={`group relative flex h-46px w-full cursor-pointer md:w-220px ${
        isTaxRatioMenuOpen
          ? 'border-input-stroke-selected text-dropdown-stroke-input-hover'
          : 'border-input-stroke-input text-input-text-input-filled'
      } items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
    >
      <p className="text-input-text-input-filled">{t(`certificate:EDIT.${selectedTax}`)}</p>
      <div className="flex h-20px w-20px items-center justify-center">
        <FaChevronDown className={isTaxRatioMenuOpen ? 'rotate-180' : 'rotate-0'} />
      </div>

      {/* 主選單 */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${
          isTaxRatioMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu'
            : 'grid-rows-0 border-transparent'
        } overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start gap-2 bg-dropdown-surface-menu-background-primary p-8px">
          {Object.values(TaxOptions).map((value) => (
            <li
              key={value}
              className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
              onClick={() => handleOptionClick(value)}
            >
              {t(`certificate:"EDIT".${value}`)}
            </li>
          ))}

          {/* 次級選單 */}
          {isTaxRatioSubMenuOpen && (
            <div
              ref={taxRatioSubMenuRef}
              className="border-dropdown-stroke-menu/10 absolute left-full top-0 grid w-full grid-cols-1 overflow-hidden rounded-sm border border-l-1px bg-dropdown-surface-menu-background-secondary shadow-dropmenu"
            >
              <ul className="z-10 flex w-full flex-col items-start gap-2 bg-dropdown-surface-menu-background-primary p-8px">
                {Object.values(ZeroTaxRateOptions).map((value) => (
                  <li
                    key={value}
                    className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
                    onClick={() => handleZeroTaxRateOptionClick(value)}
                  >
                    {t(`certificate:EDIT.${value}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TaxMenu;
