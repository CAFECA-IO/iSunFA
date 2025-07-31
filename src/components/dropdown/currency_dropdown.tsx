import React from 'react';
import Image from 'next/image';
import { CurrencyType, OEN_CURRENCY } from '@/constants/currency';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface ICurrencyDropdownProps {
  currentCurrency: CurrencyType | undefined;
  setCurrentCurrency: (currency: CurrencyType) => void;
}

const CurrencyDropdown: React.FC<ICurrencyDropdownProps> = ({
  currentCurrency,
  setCurrentCurrency,
}) => {
  const isSelected = currentCurrency !== undefined;
  const currencyList = Object.values(OEN_CURRENCY);

  const {
    targetRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleCurrencyMenu = () => setIsOpen((prev) => !prev);

  const imgSrc = `/currencies/${(currentCurrency || '').toLowerCase()}.svg`;

  const dropMenu = currencyList.map((curr) => {
    const countryClickHandler = () => setCurrentCurrency(curr);
    return (
      <div
        key={curr}
        onClick={countryClickHandler}
        className="flex items-center gap-12px px-12px py-8px text-dropdown-text-primary hover:cursor-pointer hover:bg-dropdown-surface-item-hover"
      >
        <Image
          src={`/currencies/${curr.toLowerCase()}.svg`}
          width={16}
          height={16}
          alt="currency_icon"
          className="aspect-square rounded-full object-cover"
        />
        <p>{curr.toLocaleUpperCase()}</p>
      </div>
    );
  });

  const btnContent = isSelected ? (
    <>
      <Image
        width={16}
        height={16}
        alt="currency_icon"
        src={imgSrc}
        className="aspect-square rounded-full object-cover"
      />
      <div className="flex-1 text-input-text-input-filled">
        {(currentCurrency || '').toLocaleUpperCase()}
      </div>
    </>
  ) : (
    <div className="flex-1 text-input-text-input-placeholder">請選擇幣別</div>
  );

  return (
    <div
      ref={targetRef}
      className="relative flex w-full items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background font-medium"
    >
      <div
        onClick={toggleCurrencyMenu}
        className="flex flex-1 items-center gap-24px px-12px py-10px hover:cursor-pointer"
      >
        {btnContent}
        <div
          className={`text-icon-surface-single-color-primary ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <FaChevronDown />
        </div>

        {/* Info: (20250625 - Julian) Dropdown menu */}
        <div
          className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${
            isOpen
              ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
              : 'grid-rows-0 border-transparent'
          } overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <div className="flex flex-col rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px">
            {dropMenu}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyDropdown;
