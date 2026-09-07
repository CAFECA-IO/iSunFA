/**
 * Info: (20260826 - Julian) 小鈴鐺／通知頁的 **API payload 形狀**（review B6）。
 *
 * ## 為什麼搬到 `interfaces/`
 *
 * `INotificationSummary` 原本在 `services/notification.service.ts` 與
 * `hooks/use_notification_summary.ts` **各宣告一份**，而前端再用
 * `request<...>` 的泛型硬轉。兩份宣告之間沒有任何東西比對過 —— 於是把
 * summary route 改成 `jsonOk({ todoCount, completedCount })` 之後：
 * `tsc` 綠、`npm test` 綠、`test:e2e` 綠，而 `arrivalKeyOf` 拿到的
 * `latestUnreadAt` 變成 `undefined`，抵達識別值退回舊的「數量組合」——
 * **計畫書 D17 一字不差地回來，而且照它自己的說法「沒有任何觀測量」。**
 *
 * 型別是這條路徑上唯一有機會自動發現那件事的東西，所以它只能有一份。
 * 放在 `interfaces/` 而不是讓 hook 去 import service：前者沒有任何 runtime
 * 依賴，後者會讓一個 client component 的 import 圖連到 Prisma。
 *
 * ## 這裡只放「線上傳的東西」
 *
 * 服務內部的參數型別（`ISeatChargeParams` 之類）留在各自的服務裡。
 * 這個檔案的每一個欄位都是**端點回傳的 JSON**，因此改它就是改對外契約。
 */

export interface INotificationSummary {
  todoCount: number;
  completedCount: number;
  /**
   * Info: (20260825 - Julian) 最新一則未讀通知的建立時間（epoch ms），沒有就是 null。
   *
   * 存在的唯一理由是提示音的跨分頁去重（計畫書 D17）。那個機制需要一個
   * 「這是哪一次抵達」的識別值，而它必須同時滿足兩件事：
   *
   * 1. **每個分頁算出來要一樣** —— 否則三個分頁各認為自己是第一個，各響一聲
   * 2. **不同的抵達要不一樣** —— 否則同一個識別值被記住之後就再也不響
   *
   * 原本用的是 `todoCount:completedCount`，它滿足第 1 點但不滿足第 2 點：
   * 「讀完 → 來一則 → 讀完 → 再來一則」兩次都是同一組數字，第二則搖但不響。
   *
   * 用伺服器的 `createdAt` 而不是前端的 `Date.now()`：前者對所有分頁是同一個值，
   * 後者每個分頁都不同 —— 這與 `dedupeKey` 拒絕 timestamp 是同一條理由
   * （ADR 010 §1），差別在於這裡要的正是「來源端的時間」。
   */
  latestUnreadAt: number | null;
}

export interface INotificationItem {
  // Info: (20260821 - Luphia) derived 待辦沒有通知列，以來源 id 合成（見 listNotifications）
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  /**
   * Info: (20260825 - Julian) 已讀時間（epoch ms），未讀是 null。
   *
   * 畫面用它決定要不要顯示未讀紅點。回傳時間而不是布林：
   * 「什麼時候讀的」之後可能要顯示，而從時間退化成布林不用改資料，
   * 反過來要。
   */
  readAt: number | null;
}

export interface INotificationList {
  todos: INotificationItem[];
  completed: INotificationItem[];
  /**
   * Info: (20260825 - Julian) 完成節被截斷了嗎。
   * 靜默截斷會被讀成「這就是全部」——徽章說 25 而清單只有 20 的時候，
   * 使用者沒有任何方式知道少了 5 則。
   */
  hasMoreCompleted: boolean;
  /**
   * Info: (20260901 - Julian) 待辦節被截斷了嗎（review：D4）。
   *
   * 與 `hasMoreCompleted` 同一條理由，只是先前漏了這一半：可接續任務那支
   * 查詢帶 `JOB_RESUMABLE_NOTICE_LIMIT`，而徽章數的是全部
   *（`summarizeResumable`）。兩者分岔時畫面要說得出來，否則第 6 份
   * 可以繼續的匯入起就是靜默消失 —— 使用者只能逐一打開聊天室才找得到。
   */
  hasMoreTodos: boolean;
}

/**
 * Info: (20260826 - Julian) `/user/notifications` 一頁的歷史。
 *
 * 欄位名沿用本專案既有的分頁端點（`audit_log` 等）：`items` / `totalItems`
 * / `totalPages` / `currentPage`。自創一套名字的成本不在這支端點，
 * 在於前端的分頁元件要為它多一種形狀。
 */
export interface INotificationHistoryPage {
  items: INotificationItem[];
  totalItems: number;
  totalPages: number;
  /**
   * Info: (20260826 - Julian) **實際回的是哪一頁**，不是呼叫端要求的那一頁。
   *
   * 超出範圍時會被夾回最後一頁（見 `listNotificationHistory`），
   * 而畫面要能反映那件事 —— 否則使用者看到的是「第 99 頁」與一片空白。
   */
  currentPage: number;
}
