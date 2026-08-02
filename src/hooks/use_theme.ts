"use client";

/**
 * Info: (20260802 - Luphia) 主題狀態。取代先前的 next-themes 包裝層。
 *
 * 換掉的理由不是那個套件不好，而是它解決的問題已經不存在了：它的核心價值
 * 是注入一段在 hydration 前執行的同步 script 來消除 FOUC，而那是
 * localStorage 只有瀏覽器讀得到所導致的。改存 cookie 之後伺服器讀得到偏好，
 * SSR 當下就寫出正確的 class，那段 script 與隨之而來的 hydration 抑制
 * 一起變成多餘。
 *
 * 「跟隨系統」不由 JS 承接，而是 globals.css 的 `prefers-color-scheme`。
 * 本 hook 讀取系統偏好只為了讓開關的把手停在正確的一側 ——
 * 畫面顏色在 JS 執行之前就已經是對的了。
 */

import { useCallback, useEffect, useState } from "react";
import {
  THEME_ROOT_CLASS_BY_CHOICE,
  THEME_TRANSITION_SUPPRESS_CLASS,
  ThemeChoice,
  ThemeModeEnum,
} from "@/constants/theme";
import {
  buildThemeCookie,
  parseThemeCookie,
  readThemeCookie,
} from "@/lib/utils/theme_cookie";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export interface IUseTheme {
  /**
   * Info: (20260802 - Luphia) 實際生效的外觀。掛載完成前為 undefined ——
   * 伺服器不知道系統偏好，先渲染成任何一側都會在 hydration 後跳一下。
   */
  resolved: ThemeChoice | undefined;
  /** Info: (20260802 - Luphia) 目前是否處於「沒設定過，跟隨系統」 */
  isFollowingSystem: boolean;
  /** Info: (20260802 - Luphia) 切到另一側，並記住這個選擇 */
  toggle: () => void;
}

export function useTheme(): IUseTheme {
  const [mode, setMode] = useState<ThemeModeEnum | undefined>(undefined);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    setMode(parseThemeCookie(readThemeCookie(document.cookie)));

    const media = window.matchMedia(DARK_MEDIA_QUERY);
    setSystemPrefersDark(media.matches);

    /**
     * Info: (20260802 - Luphia) 系統在日落自動切換時，畫面會由 CSS 媒體查詢
     * 自己跟上，但開關的把手不會 —— 它讀的是這裡的 state。
     * 沒有這個監聽，使用者會看到深色介面配著停在「淺色」的開關。
     */
    const onChange = (event: MediaQueryListEvent) =>
      setSystemPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: ThemeChoice | undefined =
    mode === undefined
      ? undefined
      : mode === ThemeModeEnum.SYSTEM
        ? systemPrefersDark
          ? ThemeModeEnum.DARK
          : ThemeModeEnum.LIGHT
        : mode;

  const toggle = useCallback(() => {
    if (resolved === undefined) return;
    const next: ThemeChoice =
      resolved === ThemeModeEnum.DARK
        ? ThemeModeEnum.LIGHT
        : ThemeModeEnum.DARK;

    const root = document.documentElement;

    /**
     * Info: (20260802 - Luphia) 切換當下停用 transition，下一幀才恢復。
     * 不停用的話，帶 `transition-colors` 的元件會各自以自己的時長變色，
     * 整頁呈現一片雜亂的漸層而非乾淨的切換。
     *
     * 恢復用兩層 requestAnimationFrame：一層只保證「樣式已套用」，
     * 尚未保證瀏覽器已經據此繪製過一幀，太早移除仍會讓 transition 抓到舊值。
     */
    root.classList.add(THEME_TRANSITION_SUPPRESS_CLASS);

    root.classList.remove(
      THEME_ROOT_CLASS_BY_CHOICE[ThemeModeEnum.LIGHT],
      THEME_ROOT_CLASS_BY_CHOICE[ThemeModeEnum.DARK],
    );
    root.classList.add(THEME_ROOT_CLASS_BY_CHOICE[next]);
    document.cookie = buildThemeCookie(
      next,
      window.location.protocol === "https:",
    );
    setMode(next);

    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        root.classList.remove(THEME_TRANSITION_SUPPRESS_CLASS),
      ),
    );
  }, [resolved]);

  return {
    resolved,
    isFollowingSystem: mode === ThemeModeEnum.SYSTEM,
    toggle,
  };
}
