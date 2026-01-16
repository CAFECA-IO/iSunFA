'use client';

import Link from 'next/link';
import { useTranslation } from '@/i18n/i18n_context';
import BrandLogo from '@/components/landing_page/header/brand_logo';
import LanguageSelector from '@/components/landing_page/header/language_selector';
import UserActions from '@/components/landing_page/header/user_actions';

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-sm ring-1 ring-gray-900/5">
      <nav className="flex items-center justify-between p-3 lg:px-8" aria-label="Global">
        <BrandLogo />
        <div className="flex gap-x-8 items-center">
          <Link href="/pricing" className="text-sm font-semibold leading-6 text-gray-900 hover:text-orange-600 transition-colors hidden md:block">
            {t('header.pricing')}
          </Link>
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>
    </header>
  );
}
