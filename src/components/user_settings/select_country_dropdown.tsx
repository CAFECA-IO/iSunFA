import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { CountriesMap, LocaleKey } from '@/constants/normal_setting';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface SelectCountryDropdownProps {
  country: LocaleKey | null;
  setCountry: React.Dispatch<React.SetStateAction<LocaleKey | null>>;
}

const SelectCountryDropdown: React.FC<SelectCountryDropdownProps> = ({ country, setCountry }) => {
  const { t } = useTranslation(['setting', 'common']);
  const selectedCountry = country ? CountriesMap[country] : null;

  const {
    targetRef: countryMenuRef,
    componentVisible: isCountryMenuOpen,
    setComponentVisible: setIsCountryMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const countryMenuClickHandler = () => {
    setIsCountryMenuOpen(!isCountryMenuOpen);
  };

  const countryMenuOptionClickHandler = (id: LocaleKey) => {
    setCountry(id);
    setIsCountryMenuOpen(false);
  };

  const displayedCountryMenu = (
    <div ref={countryMenuRef} className="relative flex w-full">
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
          isCountryMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={countryMenuClickHandler}
      >
        <Image
          width={20}
          height={20}
          src={selectedCountry?.icon ?? '/icons/en.svg'}
          alt="country icon"
        />
        <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-input-text-primary">
          {selectedCountry?.name || t('setting:NORMAL.SELECT_COUNTRY')}
        </div>
        <div className="my-auto flex flex-col justify-center">
          <div className="flex items-center justify-center">
            <Image src="/elements/arrow_down.svg" alt="arrow_down" width={20} height={20} />
          </div>
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
  );

  return (
    <div className="flex flex-col space-y-3 max-md:max-w-full">
      <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
        {t('setting:NORMAL.SELECT_COUNTRY')}
      </div>
      {displayedCountryMenu}
    </div>
  );
};

export default SelectCountryDropdown;
