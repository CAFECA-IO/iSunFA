import useOuterClick from '@/lib/hooks/use_outer_click';
import { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { TaxType } from '@/constants/invoice_rc2';

enum TaxOptions {
  TAXABLE_5 = 'TAXABLE_5',
  ZERO_TAX_RATE = 'ZERO_TAX_RATE',
  TAX_FREE = 'TAX_FREE',
}

enum TaxFreeOptions {
  NONE = 'NONE',
  THROUGH_CUSTOMS = 'THROUGH_CUSTOMS',
  NOT_THROUGH_CUSTOMS = 'NOT_THROUGH_CUSTOMS',
}

const taxRates: Record<TaxOptions, number | undefined> = {
  TAXABLE_5: 5,
  ZERO_TAX_RATE: 0,
  TAX_FREE: undefined,
};

interface ITaxMenuProps {
  selectTaxHandler: (params: { taxRate: number | null; taxType: TaxType }) => void;
  initialTaxType?: TaxType;
  initialTaxRate?: number | null;
}

const TaxMenu: React.FC<ITaxMenuProps> = ({
  selectTaxHandler,
  initialTaxType,
  initialTaxRate,
}: ITaxMenuProps) => {
  const { t } = useTranslation(['certificate', 'common']);
  const initialTax =
    initialTaxType === TaxType.TAX_FREE
      ? TaxOptions.TAX_FREE
      : initialTaxRate === 5
        ? TaxOptions.TAXABLE_5
        : TaxOptions.ZERO_TAX_RATE;

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
      taxType: option === TaxOptions.TAX_FREE ? TaxType.TAX_FREE : TaxType.TAXABLE,
    });
    setSelectedTax(option);
    closeAllMenus();
  };

  useEffect(() => {
    if (initialTaxType === TaxType.TAXABLE) {
      if (initialTaxRate === 5) {
        setSelectedTax(TaxOptions.TAXABLE_5);
      } else if (initialTaxRate === 0) {
        setSelectedTax(TaxOptions.ZERO_TAX_RATE);
      }
    } else {
      setSelectedTax(TaxOptions.TAX_FREE);
    }
  }, [initialTaxRate, initialTaxType]);

  const taxZeroOption = Object.values(TaxFreeOptions).map((subValue) => (
    <div
      key={subValue}
      onClick={(e) => handleOptionClick(TaxOptions.ZERO_TAX_RATE, e)}
      className="cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
    >
      <p>{t(`certificate:EDIT.${subValue}`)}</p>
    </div>
  ));

  const dropdownOption = Object.values(TaxOptions).map((value) => {
    // Info: (20250829 - Julian) 零稅率選項
    if (value === TaxOptions.ZERO_TAX_RATE) {
      return (
        <li key={value} className="flex w-full flex-col px-3 py-2 text-dropdown-text-primary">
          <p className="flex w-full items-center justify-between">
            <span>{t(`certificate:EDIT.${value}`)}</span>
            <span className="pr-2 text-neutral-300">
              {value === TaxOptions.ZERO_TAX_RATE && <span>0%</span>}
            </span>
          </p>

          {/* Info: (20250829 - Julian) 次選單 */}
          <div className="flex flex-col pl-2">{taxZeroOption}</div>
        </li>
      );
    }

    return (
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
    );
  });

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
          {selectedTax === TaxOptions.ZERO_TAX_RATE && <span>0%</span>}
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
        <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary">
          {dropdownOption}
        </ul>
      </div>
    </div>
  );
};

export default TaxMenu;
