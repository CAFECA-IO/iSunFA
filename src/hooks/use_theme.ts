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

import { useCallback, useEffect, useRef, useState } from "react";
import {
  THEME_ROOT_CLASS_BY_CHOICE,
  THEME_SYNC_CHANNEL_NAME,
  THEME_TRANSITION_SUPPRESS_CLASS,
  ThemeChoice,
  ThemeModeEnum,
} from "@/constants/theme";
import {
  buildThemeCookie,
  parseThemeCookie,
  readThemeCookie,
  toThemeChoice,
} from "@/lib/utils/theme_cookie";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Info: (20260802 - Luphia) 把選擇套到 <html>。
 *
 * 抽成函式是因為有兩個呼叫端：本分頁的切換，以及另一個分頁廣播過來的變更。
 * 兩者都必須做完全相同的事，各寫一份遲早會分歧。
 *
 * 不在此設 `color-scheme` —— 那個屬性已由 globals.css 依 class 決定，
 * 在 JS 再設一次會製造第二個真相來源，而且系統偏好那一態沒有 class 可依附。
 */
function applyThemeChoice(choice: ThemeChoice): void {
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
  root.classList.add(THEME_ROOT_CLASS_BY_CHOICE[choice]);

  window.requestAnimationFrame(() =>
    window.requestAnimationFrame(() =>
      root.classList.remove(THEME_TRANSITION_SUPPRESS_CLASS),
    ),
  );
}

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
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setMode(parseThemeCookie(readThemeCookie(document.cookie)));

    const media = window.matchMedia(DARK_MEDIA_QUERY);
    setSystemPrefersDark(media.matches);

    /**
     * Info: (20260802 - Luphia) 系統在日落自動切換時，畫面會由 CSS 媒體查詢
     * 自己跟上，但開關的把手不會 —— 它讀的是這裡的 state。
     * 沒有這個監聽，使用者會看到深色介面配著停在「淺色」的開關。
     */
    const onMediaChange = (event: MediaQueryListEvent) =>
      setSystemPrefersDark(event.matches);
    media.addEventListener("change", onMediaChange);

    /**
     * Info: (20260802 - Luphia) 跨分頁同步。cookie 本身是分頁共享的，
     * 所以收到廣播時**不需要再寫一次** —— 另一個分頁寫的那份已經生效，
     * 這裡缺的只是 DOM class 與本地 state。
     *
     * 廣播內容雖然同源，仍然當成外部輸入驗證：收到不認得的值就忽略，
     * 而不是拿去 classList.add()。
     */
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(THEME_SYNC_CHANNEL_NAME);
    channelRef.current = channel;
    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const choice = toThemeChoice(event.data);
        if (choice === undefined) return;
        applyThemeChoice(choice);
        setMode(choice);
      };
    }

    return () => {
      media.removeEventListener("change", onMediaChange);
      channel?.close();
      channelRef.current = null;
    };
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

    applyThemeChoice(next);
    document.cookie = buildThemeCookie(
      next,
      window.location.protocol === "https:",
    );
    setMode(next);
    channelRef.current?.postMessage(next);
  }, [resolved]);

  return {
    resolved,
    isFollowingSystem: mode === ThemeModeEnum.SYSTEM,
    toggle,
  };
}
