"use client";

import BrandLogo from "@/components/header/brand_logo";
import HeaderNav from "@/components/header/header_nav";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";
import UserActions from "@/components/header/user_actions";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/**
       * Info: (20260826 - Julian) 毛玻璃移到**子層**，`<header>` 自己不帶 backdrop-filter。
       *
       * `backdrop-filter` 與 `transform` 一樣會讓元素成為子孫 `position: fixed`
       * 的**包含塊** —— 於是小鈴鐺面板的 `fixed inset-0 h-dvh` 不是相對視窗，
       * 而是相對這個 64px 高的 header 定位。實測（20260826）：面板 top 落在
       * 7742px、底部連結跟著跑到面板頂端下方，手機版因此既捲不到底、
       * 也點不到「查看全部通知」。
       *
       * 把 bg / blur / shadow / ring 放進一個 `absolute inset-0 -z-10` 的兄弟層，
       * 視覺完全相同，而 header 不再是包含塊。這比在面板那端補位移可靠 ——
       * 位移要猜 header 有多高、banner 在不在，而這個做法把前提直接拿掉。
       */}
      <div className="bg-surface-raised/90 ring-border-default absolute inset-0 -z-10 shadow-sm ring-1 backdrop-blur-xl" />
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <BrandLogo />
        <div className="flex items-center gap-x-6 lg:gap-x-8">
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
