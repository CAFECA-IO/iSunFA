'use client';

import BrandLogo from '@/components/header/brand_logo';
import HeaderNav from '@/components/header/header_nav';
import LanguageSelector from '@/components/header/language_selector';
import ThemeToggle from '@/components/header/theme_toggle';
import UserActions from '@/components/header/user_actions';

export default function UserHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface-raised/90 backdrop-blur-xl shadow-sm ring-1 ring-border-default">
      <nav className="flex items-center justify-between p-3 lg:px-8" aria-label="Global">
        <BrandLogo />
        <div className="flex gap-x-6 lg:gap-x-8 items-center">
          <HeaderNav />
          {/* Info: (20260825 - Julian) xl 以下這兩個收進漢堡選單（見 header_nav.tsx） */}
          <div className="hidden items-center gap-x-6 lg:gap-x-8 xl:flex">
            <ThemeToggle />
            <LanguageSelector />
          </div>
          <UserActions />
        </div>
      </nav>
    </header>
  );
}
