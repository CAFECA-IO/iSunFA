/**
 * Info: (20260914 - Julian) 「這個點擊是不是一次該攔下來的站內導航」。
 *
 * 有未儲存的變更時要在離開前問一聲，而「離開」有三條路，能攔的只有兩條：
 *
 * | 離開的方式 | 攔得住嗎 | 靠什麼 |
 * | --- | --- | --- |
 * | 重新整理、關分頁、打網址列 | 可以（瀏覽器自己的對話框） | `beforeunload` |
 * | 站內連結（`next/link`、導覽列、側欄） | 可以（自己的對話框） | 這一支 |
 * | **上一頁／下一頁** | **攔不住** | 見下方 |
 *
 * ## 為什麼上一頁攔不住
 *
 * App Router 沒有 `router.events`，也沒有官方的 `useBlocker`；`popstate`
 * 是**導航已經發生之後**才觸發的，那時候要退回去只能再 `pushState` 一次，
 * 而那會在使用者的歷史紀錄裡留下一筆假的項目 —— 按兩次上一頁才回得去。
 * 把破綻留著並說清楚，比裝一個會弄壞上一頁的東西好。
 *
 * ## 為什麼是攔點擊，而不是包住每一個連結
 *
 * 離開這一頁的連結不只導覽列那四個：`UserHeader`、側欄、麵包屑、
 * 吐司裡的連結都算。逐一包起來的話，日後任何一個新連結都是一個
 * 沉默的破口 —— 而破口的症狀是「那一條路沒有問就走了」，沒有人會回報。
 */

export interface INavigationClick {
  /** Info: (20260914 - Julian) `<a>` 的 `href` 原字串，可能是相對路徑 */
  href: string | null;
  target: string | null;
  hasDownload: boolean;
  /**
   * Info: (20260914 - Julian) 中鍵、右鍵，或按著 ⌘／Ctrl／Shift／Alt 的左鍵。
   *
   * 這些點擊**不會離開現在這一頁**（開新分頁、開新視窗、存檔），
   * 攔下來只會讓使用者按了沒反應，還多跳一個問他要不要離開的對話框。
   */
  isModifiedClick: boolean;
  /** Info: (20260914 - Julian) 已經被別人擋掉的點擊不要再處理一次 */
  isDefaultPrevented: boolean;
  /** Info: (20260914 - Julian) `window.location.href`，用來解析相對路徑與比對同頁 */
  currentUrl: string;
}

/**
 * Info: (20260914 - Julian) 回傳「該攔下來、而且要去的那個網址」，不攔就回 `null`。
 *
 * 回網址而不是布林：呼叫端按下「離開」之後要 `router.push` 它，
 * 而再解析一次相對路徑就是同一段邏輯寫兩遍。
 *
 * **這一支不管有沒有未儲存的變更** —— 那是呼叫端的事。
 * 混進來的話，這裡就要同時回答「這是不是站內導航」與「現在該不該擋」，
 * 而測試只能一次問一個問題。
 */
export const interceptableHrefOf = (click: INavigationClick): string | null => {
  const { href, target, hasDownload, isModifiedClick, isDefaultPrevented } =
    click;

  if (href === null || href.trim() === "") return null;
  if (isDefaultPrevented || isModifiedClick || hasDownload) return null;
  // Info: (20260914 - Julian) `_blank` 等於開新分頁，這一頁留在原地
  if (target !== null && target !== "" && target !== "_self") return null;

  let url: URL;
  let current: URL;
  try {
    url = new URL(href, click.currentUrl);
    current = new URL(click.currentUrl);
  } catch {
    // Info: (20260914 - Julian) 解析不了就不是我們認得的導航，交還給瀏覽器
    return null;
  }

  /**
   * Info: (20260914 - Julian) 只攔 http(s)。
   *
   * `mailto:`、`tel:`、`javascript:`、`blob:` 都不會離開這一頁
   * （或根本不是導航），攔下來是把功能弄壞。
   */
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // Info: (20260914 - Julian) 外站交給 `beforeunload`，它問得比我們早也比我們可靠
  if (url.origin !== current.origin) return null;

  /**
   * Info: (20260914 - Julian) 同一頁就不算離開。
   *
   * 這一條同時涵蓋純錨點（`#section`）：它的 pathname 與 search 與現在相同，
   * 而跳到頁內某一段不會讓表單裡的東西消失。
   */
  if (url.pathname === current.pathname && url.search === current.search) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
