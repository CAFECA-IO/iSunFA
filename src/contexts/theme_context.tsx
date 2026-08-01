"use client";

/**
 * Info: (20260801 - Luphia) 主題狀態。薄薄包一層 next-themes 而非自行實作,
 * 是因為這個功能的難點不在「存一個字串」,而在兩件容易做錯的事:
 *
 * 1. **FOUC** —— 主題存在 localStorage,而 localStorage 只有瀏覽器讀得到。
 *    伺服器算不出該渲染哪一版,若等 React 掛載後才套用,使用者會先看到一閃的淺色畫面。
 *    next-themes 在 <head> 注入一段在 hydration 之前執行的同步 script 來避免,
 *    這段 script 的時序很難自己寫對。
 * 2. **SSR 不一致** —— 伺服器與瀏覽器算出的 class 不同會觸發 hydration mismatch。
 *    <html> 上的 suppressHydrationWarning(見 layout.tsx)即為此而設。
 *
 * 集中在此而非直接於 layout 使用,是為了讓「三態」的定義只有一處:
 * 元件一律引用 ThemeModeEnum,不各自寫 "dark" 字串(§3 拒絕魔法字串)。
 */

import { ReactNode } from "react";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ThemeModeEnum } from "@/constants/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      /**
       * Info: (20260801 - Luphia) 以 class 而非 data 屬性:globals.css 的 @custom-variant
       * 與 Tailwind 的 dark: 變體都以 .dark 為準,兩處必須一致。
       */
      attribute="class"
      /** Info: (20260801 - Luphia) 預設跟隨作業系統,使用者明確選過之後才改以其選擇為準 */
      defaultTheme={ThemeModeEnum.SYSTEM}
      enableSystem
      /**
       * Info: (20260801 - Luphia) 切換當下停用 transition。
       * 不停用的話,所有帶 transition-colors 的元件會各自以自己的時長變色,
       * 畫面呈現出一片雜亂的漸層而非乾淨的整頁切換。
       */
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
