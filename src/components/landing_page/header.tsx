'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import AuthModal from '@/components/auth/auth_modal';
import { useTranslation, Language } from '@/i18n/i18n_context';
import { useAuth } from '@/contexts/auth_context';
import { Globe, Check, ChevronDown, User, LogOut } from 'lucide-react';

export default function Header() {
  const { t, language, setLanguage } = useTranslation();
  const { user, logout } = useAuth();
  /*
   * Info: (20251231 - Tzuhan)
   * Replacing direct login with Auth Modal
   */
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const languages = [
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'Language';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <nav className="flex items-center justify-between p-3 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 transition-opacity hover:opacity-80">
            <span className="sr-only">iSunFA</span>
            <Image
              className="h-8 w-auto"
              src="/isunfa_logo_color.svg"
              alt="iSunFA Logo"
              width={100}
              height={32}
              priority
            />
          </Link>
        </div>
        <div className="flex gap-x-8 items-center">

          <Link href="/pricing" className="text-sm font-semibold leading-6 text-gray-900 hover:text-orange-600 transition-colors hidden md:block">
            {t('header.pricing')}
          </Link>

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
                        onClick={() => setLanguage(lang.code as Language)}
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

          {user ? (
            <Menu as="div" className="relative">
              <MenuButton className="flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900 hover:text-orange-600 transition-colors focus:outline-none">
                <span className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <User className="h-5 w-5" />
                </span>
                <span className="hidden sm:inline">{user.name || user.address.slice(0, 6)}</span>
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
                <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm text-gray-900 font-medium truncate">{user.name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.address}</p>
                  </div>
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        onClick={logout}
                        className={`
                          ${focus ? 'bg-orange-50' : ''}
                          group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700
                        `}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              </Transition>
            </Menu>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all hover:scale-105 active:scale-95"
            >
              {t('header.login')}
            </button>
          )}
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
}
