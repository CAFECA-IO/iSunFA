'use client';

import { Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation, Language } from '@/i18n/i18n_context';

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  const languages: { code: Language; label: string }[] = [
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'Language';

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900 hover:text-orange-600 transition-colors focus:outline-none">
        <Globe className="h-5 w-5 text-gray-500" aria-hidden="true" />
        <span className="hidden sm:inline">{currentLangLabel}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {languages.map((lang) => (
            <MenuItem key={lang.code}>
              {({ focus }) => (
                <button
                  onClick={() => setLanguage(lang.code)}
                  className={`
                    ${focus ? 'bg-orange-50' : ''}
                    ${language === lang.code ? 'font-bold text-orange-600' : 'text-gray-700'}
                    group flex w-full items-center justify-between px-4 py-2 text-sm
                  `}
                >
                  <span>{lang.label}</span>
                  {language === lang.code && <Check className="h-4 w-4" />}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
}
