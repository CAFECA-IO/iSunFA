"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { interceptableHrefOf } from "@/lib/utils/unsaved_navigation";

/**
 * Info: (20260914 - Julian) 有未儲存的變更時，離開前先問一聲。
 *
 * 兩條離開的路各自要不同的東西，所以是兩個 effect：
 *
 * 1. **重新整理／關分頁／打網址列** —— 只有瀏覽器自己的對話框攔得住，
 *    而唯一叫得出它的是 `beforeunload`（文案由瀏覽器決定，我們改不了）。
 * 2. **站內連結** —— 那不是 unload，`beforeunload` 完全不會觸發。
 *    攔的是點擊，然後自己畫一個對話框。
 *
 * **上一頁／下一頁攔不住**，理由寫在 `unsaved_navigation.ts` 的檔頭。
 *
 * ## 只在「有未儲存的變更」時掛，乾淨了就卸下
 *
 * 常駐的話，在這一頁的**任何**離開都會被問一次 —— 那種提示很快就會被無視，
 * 等於把保護自己弄壞（同 `use_carbon_chat.ts` 與 `team/allocation_modal.tsx`
 * 的處置，那兩處都是踩過之後才改成這樣的）。
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();

  /**
   * Info: (20260914 - Julian) 被攔下來、還沒決定要不要去的那個網址。
   *
   * 存網址而不是布林：按下「離開」之後要 `router.push` 它。
   * 只記「有人想離開」的話，使用者得自己再點一次那個連結 ——
   * 而他剛剛才被一個對話框打斷，那一次點擊在哪裡他未必記得。
   */
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return undefined;

    // Info: (20260914 - Julian) `preventDefault()` 與 `returnValue` 都設，跨瀏覽器
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;

    const intercept = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (anchor === null) return;

      const href = interceptableHrefOf({
        // Info: (20260914 - Julian) 取屬性原字串，不是 `anchor.href`（那個已經被瀏覽器解析過）
        href: anchor.getAttribute("href"),
        target: anchor.getAttribute("target"),
        hasDownload: anchor.hasAttribute("download"),
        /**
         * Info: (20260914 - Julian) 這些點擊不會離開現在這一頁。
         *
         * ⌘／Ctrl 點是開新分頁、Shift 點是開新視窗、中鍵也是新分頁 ——
         * 攔下來只會讓使用者按了沒反應，還多跳一個對話框問他要不要離開
         * （而他本來就沒有要離開）。
         */
        isModifiedClick:
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey,
        isDefaultPrevented: event.defaultPrevented,
        currentUrl: window.location.href,
      });
      if (href === null) return;

      /**
       * Info: (20260914 - Julian) 捕獲階段攔截，而且必須 `preventDefault()`。
       *
       * `next/link` 的點擊處理掛在 `<a>` 上、跑在冒泡階段，而它進入導航前
       * 會先看 `e.defaultPrevented` —— 所以在 document 的捕獲階段擋下來，
       * 它就不會導航。改成冒泡階段的話，Link 已經先跑完了。
       */
      event.preventDefault();
      setPendingHref(href);
    };

    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [isDirty]);

  /**
   * Info: (20260914 - Julian) 「離開」：關掉對話框並走原本要走的那條路。
   *
   * 這一條路走的是 `router.push`，不是再點一次連結 ——
   * 所以不會再被上面的攔截器攔一次（那會是一個關不掉的對話框）。
   */
  const leave = useCallback(() => {
    // Info: (20260914 - Julian) 不把 `router.push` 塞進 setState 的更新函式：那支在 StrictMode 會被呼叫兩次
    if (pendingHref !== null) router.push(pendingHref);
    setPendingHref(null);
  }, [pendingHref, router]);

  // Info: (20260914 - Julian) 「留在此頁」：什麼都不做，只把對話框收起來
  const stay = useCallback(() => setPendingHref(null), []);

  return { pendingHref, leave, stay };
}
