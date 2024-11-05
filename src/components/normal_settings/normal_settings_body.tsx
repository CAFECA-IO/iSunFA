import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import Toggle from '@/components/toggle/toggle';
import { useUserCtx } from '@/contexts/user_context';
import { Button } from '@/components/button/button';
import { DEFAULT_AVATAR_URL } from '@/constants/display';
import { FiEdit3, FiLink, FiMail, FiSend } from 'react-icons/fi';
import { TbUserCircle } from 'react-icons/tb';
import useOuterClick from '@/lib/hooks/use_outer_click';
import {
  CountriesMap,
  LanguagesMap,
  LocaleKey,
  PhoneCountryCodeMap,
} from '@/constants/normal_setting';

interface NormalSettingsBodyProps {}

const NormalSettingsBody: React.FC<NormalSettingsBodyProps> = () => {
  const { t } = useTranslation(['setting', 'common']);
  const { userAuth } = useUserCtx();
  const username = userAuth?.name ?? 'Joyce';
  const email = userAuth?.email ?? 'Test01@gmail.com';
  const loginDevice = 'Macos Chrome';
  const loginIP = '211.22.118.145';
  const imageId = userAuth?.imageId ?? DEFAULT_AVATAR_URL;

  const [enableSystemNotifications, setEnableSystemNotifications] = React.useState(false);
  const [enableUpdatesNotifications, setEnableUpdatesNotifications] = React.useState(false);
  const [enableEmailNotifications, setEnableEmailNotifications] = React.useState(false);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [country, setCountry] = React.useState<LocaleKey | null>(null);
  const [language, setLanguage] = React.useState<LocaleKey>(LocaleKey.en);
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<LocaleKey>(LocaleKey.en);
  const [phone, setPhone] = React.useState('');

  const selectedLanguage = LanguagesMap[language];

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const languageMenuOptionClickHandler = (id: LocaleKey) => {
    setLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  const displayedLanguageMenu = (
    <div ref={languageMenuRef} className="relative flex w-full">
      <button
        type="button"
        className={`flex w-full items-center justify-between space-x-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
          isLanguageMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={languageMenuClickHandler}
      >
        <Image
          width={20}
          height={20}
          src={selectedLanguage?.icon ?? '/icons/en.svg'}
          alt="language icon"
        />
        <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-input-text-primary">
          {selectedLanguage?.name}
        </div>
        <div className="my-auto flex flex-col justify-center">
          <div className="flex items-center justify-center">
            <Image src="/elements/arrow_down.svg" alt="arrow_down" width={20} height={20} />
          </div>
        </div>
      </button>
      {/* Info: (20240425 - Shirley) Language Menu */}
      <div
        className={`absolute left-0 top-50px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isLanguageMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          {Object.entries(LanguagesMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => languageMenuOptionClickHandler(id as LocaleKey)}
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
        className={`flex w-full items-center justify-between space-x-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
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
      {/* Info: (20240425 - Shirley) Country Menu */}
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

  const selectedPhoneCountryCode = PhoneCountryCodeMap[phoneCountryCode];

  const {
    targetRef: phoneCountryCodeMenuRef,
    componentVisible: isPhoneCountryCodeMenuOpen,
    setComponentVisible: setIsPhoneCountryCodeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const phoneCountryCodeMenuClickHandler = () => {
    setIsPhoneCountryCodeMenuOpen(!isPhoneCountryCodeMenuOpen);
  };

  const phoneCountryCodeMenuOptionClickHandler = (id: LocaleKey) => {
    setPhoneCountryCode(id);
    setIsPhoneCountryCodeMenuOpen(false);
  };

  const displayedPhoneCountryCodeMenu = (
    <div ref={phoneCountryCodeMenuRef} className="relative flex w-full">
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-5 py-3 max-md:max-w-full ${
          isPhoneCountryCodeMenuOpen
            ? 'border-input-stroke-selected'
            : 'border-dropdown-stroke-menu'
        }`}
        onClick={phoneCountryCodeMenuClickHandler}
      >
        <Image
          width={20}
          height={20}
          src={selectedPhoneCountryCode?.icon ?? '/icons/en.svg'}
          alt="phoneCountryCode icon"
          className="mr-2"
        />

        <Image
          src="/elements/arrow_down.svg"
          alt="arrow_down"
          width={20}
          height={20}
          className="mr-5"
        />

        <input
          id="note-input"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('setting:NORMAL.ENTER_NUMBER')}
          className="block flex-1 outline-none placeholder:text-input-text-input-placeholder"
        />
      </button>
      {/* Info: (20240425 - Shirley) PhoneCountryCode Menu */}
      <div
        className={`absolute left-0 top-50px z-20 grid grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isPhoneCountryCodeMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex flex-col items-start bg-input-surface-input-background p-2">
          {Object.entries(PhoneCountryCodeMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => phoneCountryCodeMenuOptionClickHandler(id as LocaleKey)}
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-lv-7 p-lv-4">
      {/* User Header */}
      {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
      <div className="bg-brand-gradient flex items-center gap-lv-7 rounded-md p-4 shadow-normal_setting_brand">
        <Image
          alt="avatar"
          src={imageId}
          width={80}
          height={80}
          className="group-hover:brightness-50"
        />
        <div>
          <div className="mb-lv-4 flex items-center gap-3 text-sm text-gray-700">
            <TbUserCircle size={16} />
            <div className="flex items-center gap-1">
              <span className="text-text-neutral-mute">{t('setting:NORMAL.USER_NAME')}:</span>
              <span className="text-base font-semibold text-text-neutral-primary">{username}</span>
            </div>
            <FiEdit3 size={16} />
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <FiMail size={16} />
            <div className="flex items-center gap-1">
              <span className="text-text-neutral-mute">{t('setting:NORMAL.LINKED_EMAIL')}:</span>
              <span className="text-base font-semibold text-text-neutral-primary">{email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <FiLink size={16} />
          <div className="flex flex-col items-start gap-1">
            <span className="text-text-neutral-mute">{t('setting:NORMAL.LOGIN_DEVICE_N_IP')}:</span>
            <span className="text-base text-text-neutral-link">
              {loginDevice} / {loginIP}
            </span>
          </div>
        </div>
      </div>

      {/* User Info Form */}
      <form className="flex flex-col gap-lv-7">
        <div className="grid grid-cols-2 gap-lv-7">
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('setting:NORMAL.FIRST_NAME')}
            </p>
            <input
              id="note-input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('setting:NORMAL.FIRST_NAME')}
              className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
            />
          </div>
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('setting:NORMAL.LAST_NAME')}
            </p>
            <input
              id="note-input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('setting:NORMAL.LAST_NAME')}
              className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-lv-7">
          <div className="flex flex-col space-y-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('setting:NORMAL.SELECT_COUNTRY')}
            </div>
            {displayedCountryMenu}
          </div>

          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('setting:NORMAL.PHONE_NUMBER')}
            </p>
            <div className="group flex items-center max-md:max-w-full">
              {displayedPhoneCountryCodeMenu}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-lv-7">
          <div className="flex flex-col space-y-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('setting:NORMAL.SELECT_LANGUAGE')}
            </div>
            {displayedLanguageMenu}
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="secondaryBorderless">
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button type="submit" variant="default">
            {t('common:COMMON.SAVE')}
          </Button>
        </div>
      </form>

      {/* Notice Settings */}
      <div>
        <div id="notice-setting-section" className="mb-lv-7 flex items-center gap-4">
          <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/ringing_bell.svg" width={16} height={16} alt="notice_icon" />
            <p>{t('setting:NORMAL.NOTICE_SETTING')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-4" />
        </div>
        <div className="mb-lv-5 flex items-center space-x-2">
          <p className="flex gap-2">
            <Image src="/icons/codepen.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:NORMAL.SYSTEM_NOTIFICATION')}</span>
          </p>
          <Toggle
            id="tax-toggle"
            initialToggleState={enableSystemNotifications}
            getToggledState={() => setEnableSystemNotifications((prev) => !prev)}
            toggleStateFromParent={enableSystemNotifications}
          />
        </div>
        <div className="mb-lv-5 flex items-center space-x-2">
          <p className="flex gap-2">
            <Image src="/icons/bag.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:NORMAL.UPDATES_N_SUBSCRIPTION_NOTIFICATION')}</span>
          </p>
          <Toggle
            id="tax-toggle"
            initialToggleState={enableUpdatesNotifications}
            getToggledState={() => setEnableUpdatesNotifications((prev) => !prev)}
            toggleStateFromParent={enableUpdatesNotifications}
          />
        </div>
        <div className="flex items-center space-x-2">
          <p className="flex items-center gap-2">
            <FiSend size={16} className="text-icon-surface-single-color-primary" />
            <span>{t('setting:NORMAL.EMAIL_NOTIFICATION')}</span>
          </p>
          <Toggle
            id="tax-toggle"
            initialToggleState={enableEmailNotifications}
            getToggledState={() => setEnableEmailNotifications((prev) => !prev)}
            toggleStateFromParent={enableEmailNotifications}
          />
        </div>
      </div>

      {/* Company Settings */}
      <div className="flex flex-col">
        <div id="company-setting-section" className="mb-lv-7 flex items-center gap-4">
          <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image
              src="/icons/asset_management_icon.svg"
              width={16}
              height={16}
              alt="company_icon"
            />
            <p>{t('setting:NORMAL.COMPANY_SETTING')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-4" />
        </div>
        <Button
          id="setting-add-company"
          type="button"
          variant="linkBorderless"
          className="mb-lv-7 justify-start p-0"
        >
          <p className="flex gap-2">
            <Image src="/icons/plus.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:NORMAL.ADD_A_COMPANY')}</span>
          </p>
        </Button>
        <Button
          id="setting-add-company"
          type="button"
          variant="linkBorderless"
          className="justify-start p-0"
        >
          <p className="flex gap-2">
            <Image src="/icons/notification-text.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:NORMAL.VIEW_ALL_COMPANIES')}</span>
          </p>
        </Button>
      </div>

      {/* Account Settings */}
      <div className="flex flex-col">
        <div id="notice-setting-section" className="mb-lv-7 flex items-center gap-4">
          <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/attribution.svg" width={16} height={16} alt="notice_icon" />
            <p>{t('setting:NORMAL.ACCOUNT_SETTING')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-4" />
        </div>
        <Button
          id="setting-subscribe"
          type="button"
          variant="linkBorderless"
          className="mb-lv-7 justify-start p-0"
        >
          <p className="flex gap-2">
            <Image
              src="/icons/currency-dollar-circle.svg"
              width={16}
              height={16}
              alt="notice_icon"
            />
            <span>{t('setting:NORMAL.SUBSCRIPTION_MANAGEMENT')}</span>
          </p>
        </Button>
        <Button
          id="setting-remove"
          type="button"
          variant="errorBorderless"
          className="justify-start p-0"
        >
          <p className="flex gap-2">
            <Image src="/icons/user-x-02.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:NORMAL.REMOVE_THIS_ACCOUNT')}</span>
          </p>
        </Button>
      </div>
    </div>
  );
};
export default NormalSettingsBody;
