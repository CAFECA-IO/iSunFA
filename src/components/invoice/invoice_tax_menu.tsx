import useOuterClick from '@/lib/hooks/use_outer_click';
import { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { TaxType } from '@/constants/invoice_rc2';

enum TaxOptions {
  TAXABLE_5 = 'TAXABLE_5',
  TAX_FREE = 'TAX_FREE',
}

const taxRates: Record<TaxOptions, number | undefined> = {
  TAXABLE_5: 5,
  TAX_FREE: undefined,
};

interface ITaxMenuProps {
  selectTaxHandler: (params: { taxRate: number | null; taxType: TaxType }) => void;
  initialTaxType?: TaxType;
}

const TaxMenu: React.FC<ITaxMenuProps> = ({ selectTaxHandler, initialTaxType }: ITaxMenuProps) => {
  const { t } = useTranslation(['certificate', 'common']);
  const initialTax =
    initialTaxType === TaxType.TAXABLE ? TaxOptions.TAXABLE_5 : TaxOptions.TAX_FREE;

  const [selectedTax, setSelectedTax] = useState<TaxOptions>(initialTax);

  const {
    targetRef: taxRatioMenuRef,
    componentVisible: isTaxRatioMenuOpen,
    setComponentVisible: setIsTaxRatioMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const { setComponentVisible: setIsTaxRatioSubMenuOpen } = useOuterClick<HTMLDivElement>(false);

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
    selectTaxHandler({
      taxRate: taxRates[option] ?? null,
      taxType: option === TaxOptions.TAXABLE_5 ? TaxType.TAXABLE : TaxType.TAX_FREE,
    });
    setSelectedTax(option);
    closeAllMenus();
  };

  useEffect(() => {
    if (initialTaxType === TaxType.TAXABLE) {
      setSelectedTax(TaxOptions.TAXABLE_5);
    } else if (initialTaxType === TaxType.TAX_FREE) {
      setSelectedTax(TaxOptions.TAX_FREE);
    }
  }, [initialTaxType]);

  return (
    <div
      id="tax-rate-menu"
      ref={taxRatioMenuRef}
      onClick={handleMainMenuClick}
      className={`group relative z-10 flex h-46px cursor-pointer ${
        isTaxRatioMenuOpen
          ? 'border-input-stroke-selected text-dropdown-stroke-input-hover'
          : 'border-input-stroke-input text-input-text-input-filled'
      } w-full items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
    >
      <div className="flex w-full min-w-110px justify-between text-input-text-input-filled">
        <p>{t(`certificate:EDIT.${selectedTax}`)}</p>
        <p className="pr-2 text-neutral-300">
          {selectedTax === TaxOptions.TAXABLE_5 && <span>5%</span>}
        </p>
      </div>
      <div className="flex h-20px w-20px items-center justify-center">
        <FaChevronDown className={isTaxRatioMenuOpen ? 'rotate-180' : 'rotate-0'} />
      </div>

      {/* Info: (20250103 - Anna) 主選單 */}
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
              <p className="flex w-full justify-between">
                <span>{t(`certificate:EDIT.${value}`)}</span>
                <span className="pr-2 text-neutral-300">
                  {value === TaxOptions.TAXABLE_5 && <span>5%</span>}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TaxMenu;
