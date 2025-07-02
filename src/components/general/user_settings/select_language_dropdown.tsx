import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa6';
import { LanguagesMap, LocaleKey } from '@/constants/normal_setting';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SelectLanguageDropdownProps {
  language: LocaleKey;
  onSelect: (language: LocaleKey) => void;
}

const SelectLanguageDropdown: React.FC<SelectLanguageDropdownProps> = ({ language, onSelect }) => {
  const { t } = useTranslation(['settings', 'common']);
  const selectedLanguage = LanguagesMap[language];
  const { asPath } = useRouter();

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleLanguageMenu = () => setIsLanguageMenuOpen(!isLanguageMenuOpen);

  const handleLanguageChange = (id: LocaleKey) => {
    onSelect(id);
    setIsLanguageMenuOpen(false);
  };

  const renderLanguageOption = (id: string, name: string, icon: string) => (
    <li key={id} className="w-full">
      <Link
        id={`${id.toUpperCase()}ButtonDesktop`}
        scroll={false}
        locale={id}
        href={asPath}
        className="mt-1 flex cursor-pointer items-center space-x-5 px-3 py-2.5 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
        onClick={() => handleLanguageChange(id as LocaleKey)}
      >
        <Image src={icon} alt={name} width={20} height={20} />
        <p className="text-base font-medium leading-5 tracking-normal">{name}</p>
      </Link>
    </li>
  );

  return (
    <div className="col-span-2 flex flex-col gap-8px max-md:max-w-full tablet:col-span-1">
      <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
        {t('settings:NORMAL.SELECT_LANGUAGE')}
      </div>

      <div ref={languageMenuRef} className="relative flex w-full">
        <button
          type="button"
          className={`flex w-full items-center justify-between space-x-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
            isLanguageMenuOpen ? 'border-input-stroke-selected' : 'border-input-stroke-input'
          }`}
          onClick={toggleLanguageMenu}
        >
          <Image
            width={20}
            height={20}
            src={selectedLanguage?.icon ?? '/icons/en.svg'}
            alt="language icon"
            className="rounded-full"
          />
          <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-input-text-primary">
            {selectedLanguage?.name}
          </div>
          <div
            className={`flex items-center justify-center text-icon-surface-single-color-primary ${isLanguageMenuOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <FaChevronDown size={12} />
          </div>
        </button>

        {isLanguageMenuOpen && (
          <div className="absolute left-0 top-12 z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu">
            <ul className="flex flex-col items-start p-2">
              {Object.entries(LanguagesMap).map(([id, { name, icon }]) =>
                renderLanguageOption(id, name, icon)
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectLanguageDropdown;
