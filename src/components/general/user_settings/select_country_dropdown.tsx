import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa6';
import { CountriesMap, LocaleKey } from '@/constants/normal_setting';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface SelectCountryDropdownProps {
  countryCode: LocaleKey | undefined;
  onSelect: (countryCode: LocaleKey) => void;
}

const SelectCountryDropdown = ({ countryCode, onSelect }: SelectCountryDropdownProps) => {
  const { t } = useTranslation(['settings', 'common']);
  const selectedCountry = countryCode ? CountriesMap[countryCode] : undefined;

  const {
    targetRef: countryMenuRef,
    componentVisible: isCountryMenuOpen,
    setComponentVisible: setIsCountryMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const countryMenuClickHandler = () => {
    setIsCountryMenuOpen(!isCountryMenuOpen);
  };

  const countryMenuOptionClickHandler = (id: LocaleKey) => {
    onSelect(id);
    setIsCountryMenuOpen(false);
  };

  return (
    <div className="flex flex-col gap-8px max-md:max-w-full">
      <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
        {t('settings:NORMAL.SELECT_COUNTRY')}
      </div>

      <div ref={countryMenuRef} className="relative flex w-full">
        <button
          type="button"
          className={`flex w-full items-center justify-between gap-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
            isCountryMenuOpen ? 'border-input-stroke-selected' : 'border-input-stroke-input'
          }`}
          onClick={countryMenuClickHandler}
        >
          <Image
            width={20}
            height={20}
            src={selectedCountry?.icon ?? '/icons/null.svg'}
            alt="country icon"
          />
          <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-input-text-primary">
            {selectedCountry?.name || t('settings:NORMAL.SELECT_COUNTRY')}
          </div>
          <div
            className={`flex items-center justify-center text-icon-surface-single-color-primary ${isCountryMenuOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <FaChevronDown size={12} />
          </div>
        </button>

        <div
          className={`absolute left-0 top-50px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
            isCountryMenuOpen
              ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
              : 'grid-rows-0 border-transparent'
          }`}
        >
          <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
            {Object.entries(CountriesMap).map(([id, { name, icon }]) => (
              <li
                key={id}
                onClick={() => countryMenuOptionClickHandler(id as LocaleKey)}
                className="mt-1 flex w-full cursor-pointer items-center space-x-5 px-3 py-2.5 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
              >
                <Image src={icon} alt={name} width={20} height={20} />
                <p className="text-base font-medium leading-5 tracking-normal">{name}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SelectCountryDropdown;
