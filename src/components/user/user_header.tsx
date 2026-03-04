'use client';

import BrandLogo from '@/components/header/brand_logo';
import HeaderNav from '@/components/header/header_nav';
import LanguageSelector from '@/components/header/language_selector';
import UserActions from '@/components/header/user_actions';

export default function UserHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-sm ring-1 ring-gray-900/5">
      <nav className="flex items-center justify-between p-3 lg:px-8" aria-label="Global">
        <BrandLogo />
        <div className="flex gap-x-6 lg:gap-x-8 items-center">
          <HeaderNav />
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>
    </header>
  );
}
