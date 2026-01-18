'use client';

import { useState, Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth_context';
import { useTranslation } from '@/i18n/i18n_context';
import AuthModal from '@/components/auth/auth_modal';

export default function UserActions() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all hover:scale-105 active:scale-95"
        >
          {t('header.login')}
        </button>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-x-2 rounded-full bg-white pl-1 pr-3 py-1 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 hover:ring-orange-300 transition-all focus:outline-none">
        <span className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 ring-1 ring-inset ring-orange-100">
          <User className="h-5 w-5" />
        </span>
        <span className="sm:inline">{user.name}</span>
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
        <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-900 font-medium truncate">{user.name || 'User'}</p>
            {/* Info: (20260104) Removed address, added Plan and Credits */}
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t('header.plan')}:</span>
                <span className="font-medium text-orange-600">{t(`pricing.plans.${user.plan || 'personal'}.name`)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t('header.credits')}:</span>
                <span className="font-medium text-gray-900">{user.credits?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={logout}
                className={`
                  ${focus ? 'bg-orange-50' : ''}
                  group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer
                `}
              >
                <LogOut className="h-4 w-4" />
                {t('header.logout')}
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
