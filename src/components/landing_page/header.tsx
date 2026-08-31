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
         * 數字是量出來的，不是猜的。320px 下的實測（dev server + 視窗模擬）：
         *
         * | 項目 | 修正前 | 修正後 |
         * |---|---|---|
         * | 可用寬度（320 − 內距 24） | 296 | 296 |
         * | 品牌區（`h-8`→`h-7`，見 `header/brand_logo.tsx`） | 104 | 88 |
         * | 四個控件（選單／主題／語言／登入） | 188 | 188 |
         * | 三個間距（`gap-x-6`→`gap-x-1.5`） | 72 | 18 |
         * | **合計需要** | **364** | **294** |
         *
         * 三處各讓一步才擠得進去，而少任何一處都還是會溢出：光是把間距收到
         * `gap-x-3` 仍差 14px，而那 14px 會變成整頁的水平捲動。
         *
         * **`gap-x-1.5`（6px）是產品決定的，不是算式的副產品**（20260831，
         * review #6726 的設計問題）。當時列出的三條路是「縮圖、拿掉一個控件、
         * 或讓整頁水平捲動」，而「把語言或主題收進選單」那條被明確評估過並
         * **否決**——四個控件都留在列上。
         *
         * 已知的代價：320px 是最窄的情境，6px 間距下誤觸的後果是切換語言或主題
         *（兩者都可逆、沒有破壞性）。不違反 WCAG 2.5.8——那條管的是目標尺寸
         * 24×24 而不是間距，而這四個控件本身都達標。
         *
         * 要改這個數字之前請先看上面那張表：它與品牌區的 `h-7`、登入按鈕的
         * `px-4` 是**同一個算式的三項**，動一項就要重新量另外兩項。
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
