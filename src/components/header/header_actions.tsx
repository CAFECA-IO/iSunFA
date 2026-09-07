"use client";

import HeaderNav from "@/components/header/header_nav";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";
import UserActions from "@/components/header/user_actions";

/**
 * Info: (20260901 - Luphia) header 右側那一排控件，**三個 header 共用同一份**
 *（review #6731 三輪高-1）。
 *
 * `landing_page/header.tsx`、`salary_calculator/calculator_header.tsx`、
 * `user/user_header.tsx` 先前各自手寫這一段，控件一字不差，只有間距分岔
 *（合併 develop 當下仍是 `gap-x-6` / `gap-x-4` 兩種）。三處手寫就是三次
 * 分岔的機會；收斂成一個元件之後，量一次就對三個現場都成立。
 * 分岔的實害發生過：`shrink-0` 加進 `UserActions` 時三個 header 同時吃到，
 * 但只有 landing 那一個量過——`/salary_calculator` 在 320px 直接把登入按鈕
 * 切掉右半邊（詳見 git history 與 PR #6731）。
 *
 * ---
 *
 * Info: (20260901 - Luphia) **320px 的版面前提在合併 #6701 之後整個換掉了**。
 *
 * 這個 PR 原本的解法是三處讓步（`gap-x-1.5`、logo `h-7`、登入鈕 `px-4`），
 * 因為四個控件要全部留在列上，餘裕只有 2px。#6701（通知鈴鐺）帶進了另一個
 * 產品決定：**xl 以下把 ThemeToggle 與 LanguageSelector 收進漢堡選單**
 *（見 header_nav.tsx，正是當初 review 建議過、當時被「四個都留在列上」
 * 否決的那條路）。上游決定取代舊決定，`gap-x-1.5` 的理由隨之消滅，
 * 間距回到 develop 的 `gap-x-6 lg:gap-x-8`。
 *
 * 新前提下 320px 的實測（`scripts/measure_header_layout.mjs`，數字見
 * `header_layout_320.test.ts`）：
 *
 * - 手機（<xl）可見控件只剩**漢堡選單 + UserActions**（未登入＝登入鈕；
 *   登入＝鈴鐺+膠囊，帳本連結 `hidden md:flex` 不在場）。
 * - 未登入：296 可用 − 品牌 98 − 選單 36 − 登入鈕 ~60 − 間距 24 ≈ **78px 餘裕**
 *  （舊版面是 2px）。`hidden` 的收合層不佔 flex gap。
 * - 對照組（強制把收合層顯示出來，即四控件全上列＋24px 間距）＝ 338 → 溢出
 *   ——**收合層是 320px 擠得下的承重牆**，量測測試以此為反例守著。
 *
 * 保留的讓步：logo `h-7 sm:h-8` 與登入鈕 `px-4 sm:px-5`。兩者已不是擠得下的
 * 必要條件，留著的理由是純益（小螢幕上比例較合、長標籤使用端內距較省），
 * 且已通過五輪 review、由測試釘住——不為了回到 develop 原樣而再churn一次。
 */
export default function HeaderActions() {
  return (
    <div className="flex items-center gap-x-6 lg:gap-x-8">
      <HeaderNav />
      {/* Info: (20260825 - Julian) xl 以下這兩個收進漢堡選單（見 header_nav.tsx） */}
      <div className="hidden items-center gap-x-6 lg:gap-x-8 xl:flex">
        <ThemeToggle />
        <LanguageSelector />
      </div>
      <UserActions />
    </div>
  );
}
