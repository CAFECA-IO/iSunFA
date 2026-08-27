"use client";

import BrandLogo from "@/components/header/brand_logo";
import HeaderNav from "@/components/header/header_nav";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";
import UserActions from "@/components/header/user_actions";

export default function Header() {
  return (
    <header className="bg-surface-raised/90 ring-border-default sticky top-0 z-50 w-full shadow-sm ring-1 backdrop-blur-xl">
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <BrandLogo />
        {/**
         * Info: (20260827 - Luphia) 手機版的間距要小一點，否則右側這一排
         *（選單、主題、語言、登入）擠不進手機的寬度，而擠壓的代價會落在
         * 最後那個能被壓縮的元素上——先前是登入按鈕被壓成一個圓。
         *
         * 數字是量出來的，不是猜的：320px 下可用寬度 296px，而品牌（90px）加上
         * 右側四個控件（196px）已經是 286px——四個間距只剩 10px 可用。
         * `gap-x-6`（24px × 4）差 90px，`gap-x-3` 仍差 14px。
         * 另外 8px 由登入按鈕的手機內距吸收（見 `common/login_button.tsx`）。
         */}
        <div className="flex items-center gap-x-1.5 sm:gap-x-6 lg:gap-x-8">
          <HeaderNav />
          <ThemeToggle />
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>
    </header>
  );
}
