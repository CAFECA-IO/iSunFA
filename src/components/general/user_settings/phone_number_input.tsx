import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa6';
import { CountryCodeMap, LocaleKey } from '@/constants/normal_setting';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface PhoneNumberInputProps {
  countryCode: LocaleKey | undefined;
  onSelect: (countryCode: LocaleKey) => void;
  phoneNumber: string | undefined;
  onUpdate: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  countryCode,
  onSelect,
  phoneNumber,
  onUpdate,
}) => {
  const { t } = useTranslation(['settings', 'common']);

  const selectedCountryCode = countryCode ? CountryCodeMap[countryCode] : undefined;

  const {
    targetRef: countryCodeMenuRef,
    componentVisible: isCountryCodeMenuOpen,
    setComponentVisible: setIsCountryCodeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const countryCodeMenuClickHandler = () => {
    setIsCountryCodeMenuOpen(!isCountryCodeMenuOpen);
  };

  const countryCodeMenuOptionClickHandler = (id: LocaleKey) => {
    onSelect(id);
    setIsCountryCodeMenuOpen(false);
  };

  const displayedCountryCodeMenu = (
    <div className="relative flex w-full">
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
          isCountryCodeMenuOpen ? 'border-input-stroke-selected' : 'border-input-stroke-input'
        }`}
      >
        <div
          className="flex items-center"
          ref={countryCodeMenuRef}
          onClick={countryCodeMenuClickHandler}
        >
          <Image
            width={20}
            height={20}
            src={selectedCountryCode?.icon ?? '/icons/null.svg'}
            alt="countryCode icon"
            className="mr-2"
          />
          <div
            className={`mr-5 flex items-center justify-center text-icon-surface-single-color-primary ${isCountryCodeMenuOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <FaChevronDown size={12} />
          </div>
        </div>
        <input
          id="note-input"
          type="text"
          value={phoneNumber}
          onChange={onUpdate}
          placeholder={t('settings:NORMAL.ENTER_NUMBER')}
          className="block flex-1 bg-transparent outline-none placeholder:text-input-text-input-placeholder"
        />
      </button>
      {/* Info: (20240425 - Shirley) CountryCode Menu */}
      <div
        className={`absolute left-0 top-50px z-20 grid grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isCountryCodeMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex flex-col items-start bg-input-surface-input-background p-2">
          {Object.entries(CountryCodeMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => countryCodeMenuOptionClickHandler(id as LocaleKey)}
              className="mt-1 flex cursor-pointer items-center space-x-5 px-3 py-2.5 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
            >
              <Image src={icon} alt={name} width={20} height={20} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8px">
      <p className="text-sm font-semibold text-input-text-primary">
        {t('settings:NORMAL.PHONE_NUMBER')}
      </p>
      <div className="group flex items-center max-md:max-w-full">{displayedCountryCodeMenu}</div>
    </div>
  );
};

export default PhoneNumberInput;
