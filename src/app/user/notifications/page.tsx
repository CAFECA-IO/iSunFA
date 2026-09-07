"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import Pagination from "@/components/common/pagination";
import NotificationRow from "@/components/notification/notification_row";
import { canMarkReadByClick } from "@/lib/notification_read";
/**
 * Info: (20260826 - Julian) 端點回的形狀只有一份（review B6）。
 * 這裡原本自己再宣告 `INotificationList` / `INotificationHistoryPage` 各一份，欄位對得上是
 * 巧合而不是保證 —— 端點改了不會有任何東西紅。
 */
import type {
  INotificationHistoryPage,
  INotificationItem,
  INotificationList,
} from "@/interfaces/notification";

/**
 * Info: (20260826 - Julian) `/user/notifications`：通知的完整清單。
 *
 * 存在的理由是鈴鐺面板只帶得回最近 `NOTIFICATION_HISTORY_LIMIT` 則
 *（20260826 起是 10，曾為 20 → 30 —— 所以這裡不寫死數字），
 * 而它先前的處理方式是在底部寫一句
 * 「還有更多未讀通知」——一句沒有出口的話，而且在面板改成保留已讀之後
 * 連內容都不對了（旗標的意思是「歷史超過上限」，不是「未讀更多」）。
 *
 * 兩區的資料來源不同，這與鈴鐺一致：
 *
 * - **待辦區**向 `/notifications` 要。待辦型的邀請是**活算的**（向邀請表現查），
 *   天然有限，沒有分頁的必要，而且判斷「哪些邀請算數」只該有一個地方。
 * - **歷史區**向 `/notifications/history` 要，帶頁碼。
 *
 * 兩者不合成一支端點：鈴鐺每 60 秒打前者，而分頁要多付一次 `count()`。
 */

export default function NotificationsPage() {
  const { t } = useTranslation();

  const [todos, setTodos] = useState<INotificationItem[]>([]);
  // Info: (20260901 - Julian) 待辦節被截斷了嗎（review：D4，理由同鈴鐺面板）
  const [hasMoreTodos, setHasMoreTodos] = useState(false);
  const [history, setHistory] = useState<INotificationHistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  /**
   * Info: (20260826 - Julian) 兩區各有自己的「讀不到」狀態（review R-2）。
   *
   * 鈴鐺這一輪把四態分開了，這一頁沒有 —— 兩區的 catch 都寫成空資料，
   * 而畫面對空資料的呈現是「還沒有任何通知」與「整個待辦區不存在」。
   * 於是一次網路錯誤變成兩句關於使用者資料的斷言，其中一句會讓人
   * 不知道自己有一封待接受的邀請。
   *
   * 分開兩個狀態而不是共用一個：兩支請求會各自失敗，
   * 一支掛掉不該讓另一支已經拿到的內容也被說成「讀不到」。
   */
  const [todosFailed, setTodosFailed] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);

  /**
   * Info: (20260826 - Julian) 待辦只抓一次（進頁時），歷史每次換頁抓。
   *
   * 待辦不隨頁碼變動，掛在 `page` 上的話每翻一頁就會多一次
   * 「查邀請」的往返——而那一支要查身分、查已驗證信箱、再查邀請表。
   */
  const loadTodos = useCallback(async () => {
    try {
      const response = await request<{ payload: INotificationList | null }>(
        "/api/v1/user/notifications",
      );
      setTodos(response.payload?.todos ?? []);
      setHasMoreTodos(response.payload?.hasMoreTodos ?? false);
      setTodosFailed(false);
    } catch {
      /**
       * Info: (20260826 - Julian) 不要寫成空陣列：待辦區在 `todos.length === 0`
       * 時整塊不渲染，寫空等於「你沒有待辦事項」——而真相是「這次沒問到」。
       * 保留上一次的內容，另外掛一個旗標讓畫面說得出來。
       */
      setTodosFailed(true);
    }
  }, []);

  const loadHistory = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const response = await request<{
        payload: INotificationHistoryPage | null;
      }>(`/api/v1/user/notifications/history?page=${targetPage}`);
      setHistory(
        response.payload ?? {
          items: [],
          totalItems: 0,
          totalPages: 1,
          currentPage: 1,
        },
      );
      /**
       * Info: (20260826 - Julian) 頁碼以**伺服器回的**為準，不是以要求的為準。
       *
       * 超出範圍時服務端會夾回最後一頁（見 `listNotificationHistory`）。
       * 這裡不同步的話，畫面會停在一個它其實沒有顯示的頁碼上，
       * 而「上一頁」按鈕算出來的目標也跟著錯。
       */
      if (response.payload) setPage(response.payload.currentPage);
      setHistoryFailed(false);
    } catch {
      // Info: (20260826 - Julian) 同上：空的歷史頁會被畫成「還沒有任何通知」
      setHistoryFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    void loadHistory(page);
    // Info: (20260826 - Julian) 只跟著 page 走；loadHistory 本身是穩定的
  }, [page, loadHistory]);

  /**
   * Info: (20260826 - Julian) 點擊 → 那一則變已讀（與鈴鐺同一支端點）。
   *
   * **header 的徽章不會立刻少一**：鈴鐺自己那份摘要在另一個元件的 hook 裡，
   * 從這裡改不到。它每 60 秒輪詢一次，所以最遲一分鐘內會對上。
   *
   * 不為此加一層跨元件的狀態同步：那要一個 provider、一份共享狀態，
   * 而它要修正的是一個至多 60 秒、方向永遠是「徽章偏多」的偏差。
   * 徽章偏多不會讓人漏掉東西——反過來才會。
   */
  const markOneRead = useCallback((item: INotificationItem) => {
    /**
     * Info: (20260826 - Julian) 守門下沉到這裡（review R-3）。
     *
     * 今天走不到這一行的唯一理由是 `NotificationRow` 不把待辦型的 onClick
     * 接上 onRead —— 也就是說，這支的正確性依賴另一個檔案的渲染細節。
     * 那不是一道守門，是一個巧合：加一個新的呼叫端、或把那個三元運算子
     * 改一次，缺陷就回來了（扣錯徽章的桶、白搖一次鈴、對合成 id 打 API）。
     *
     * `readAt !== null` 擋不住待辦：活算的邀請 `readAt` 恆為 null。
     * 兩道都留著，因為它們擋的是兩件事。
     */
    if (!canMarkReadByClick(item.type)) return;
    if (item.readAt !== null) return;

    setHistory((previous) =>
      previous
        ? {
            ...previous,
            items: previous.items.map((entry) =>
              entry.id === item.id ? { ...entry, readAt: Date.now() } : entry,
            ),
          }
        : previous,
    );

    request(`/api/v1/user/notifications/${item.id}/read`, {
      method: HTTP_METHOD.POST,
    }).catch(() => {
      // Info: (20260826 - Julian) 已讀失敗不值得錯誤畫面；重整就會拿到伺服器的真相
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-text-primary text-xl font-semibold">
        {t("notification.page_title")}
      </h1>

      {/**
       * Info: (20260826 - Julian) 讀不到時這一區要**出現**，並說明原因。
       * 沒有待辦是「不必顯示」，讀不到是「有東西沒讀到」——後者必須看得見。
       */}
      {(todos.length > 0 || todosFailed) && (
        <section className="border-border-default rounded-lg border bg-white">
          <h2 className="text-text-muted border-border-default border-b px-3 py-2 text-xs font-semibold">
            {t("notification.todos_title")}
          </h2>
          <div className="flex flex-col gap-1 p-1">
            {todos.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onRead={markOneRead}
                showTimestamp
              />
            ))}
            {/*
              Info: (20260902 - Julian) 不帶數字，理由同鈴鐺面板（review #6742）。

              Info: (20260902 - Julian) 說明後面接一個出口（review R3 的 A2）。
              這一頁的歷史區有分頁，待辦區沒有 —— 待辦是活算的、來源有三支，
              分頁要另一套契約。所以出口給的是盤查對話清單，那份清單本身
              就是完整的可接續匯入清單。
            */}
            {hasMoreTodos && (
              <p className="text-text-muted px-3 pt-2 text-center text-xs">
                {t("notification.todos_capped")}{" "}
                <Link
                  href="/user/carbon_chatbot"
                  className="text-brand underline underline-offset-2"
                >
                  {t("notification.todos_capped_action")}
                </Link>
              </p>
            )}
            {todosFailed && (
              <p className="text-text-muted px-3 py-4 text-center text-sm">
                {t("notification.load_failed")}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="border-border-default rounded-lg border bg-white">
        <h2 className="text-text-muted border-border-default flex items-center justify-between border-b px-3 py-2 text-xs font-semibold">
          <span>{t("notification.history_title")}</span>
          {history && history.totalItems > 0 && (
            <span>
              {t("notification.total_items", { count: history.totalItems })}
            </span>
          )}
        </h2>

        {loading ? (
          <div className="text-text-muted flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="sr-only">{t("common.loading")}</span>
          </div>
        ) : historyFailed && !history ? (
          /**
           * Info: (20260826 - Julian) 沒有任何舊內容可顯示時才整區換成錯誤訊息；
           * 有舊內容的話寧可讓人看見上一次的清單，下面那條提示會說它是舊的。
           */
          <p className="text-text-muted px-3 py-10 text-center text-sm">
            {t("notification.load_failed")}
          </p>
        ) : !history || history.items.length === 0 ? (
          <p className="text-text-muted px-3 py-10 text-center text-sm">
            {t("notification.history_empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-1 p-1">
            {history.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onRead={markOneRead}
                showTimestamp
              />
            ))}
          </div>
        )}

        {/**
         * Info: (20260826 - Julian) 有舊內容、但這一次沒讀到新的。
         * 靜靜顯示過期資料與靜靜顯示「沒有通知」是同一種病。
         */}
        {historyFailed && history && !loading && (
          <p className="text-text-muted px-3 pb-2 text-center text-xs">
            {t("notification.load_failed")}
          </p>
        )}
      </section>

      {/**
       * Info: (20260826 - Julian) `Pagination` 在 `totalPages <= 1` 時自己回 null，
       * 所以這裡不必再判一次——判了反而是第二個判斷點。
       */}
      {history && (
        <Pagination
          currentPage={history.currentPage}
          totalPages={history.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
