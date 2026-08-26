"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import Pagination from "@/components/common/pagination";
import NotificationRow from "@/components/notification/notification_row";
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
 * 存在的理由是鈴鐺面板只帶得回最近 30 則，而它先前的處理方式是在底部寫一句
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
  const [history, setHistory] = useState<INotificationHistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

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
    } catch {
      // Info: (20260826 - Julian) 待辦讀不到不該讓整頁空白：歷史區仍然有用
      setTodos([]);
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
    } catch {
      setHistory({ items: [], totalItems: 0, totalPages: 1, currentPage: 1 });
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

      {todos.length > 0 && (
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
