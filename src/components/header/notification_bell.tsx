"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Mail,
  Wallet,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import { useNotificationSummary } from "@/hooks/use_notification_summary";
import {
  NOTIFICATION_LINK_PATH,
  NOTIFICATION_SUMMARY_TOAST_MS,
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_STYLE,
  NotificationType,
} from "@/constants/notification";

/**
 * Info: (20260821 - Luphia) 小鈴鐺（ADR 021 補充）。
 *
 * 三個行為，各有一個刻意的邊界：
 *
 * 1. **登入摘要**：登入後抓一次摘要，數字非零就在鈴鐺旁彈一句
 *    「N 則待辦事項、M 個工作完成通知」，幾秒後自動收合。
 *    以 sessionStorage 記「這次登入說過了」——摘要是登入問候，不是騷擾。
 * 2. **輪詢**：每 60 秒抓一次摘要，**計數增加**才搖動＋音效。
 *    比較的是總數而不是「有沒有未讀」：使用者沒收掉的舊通知不該每分鐘
 *    搖一次鈴。
 * 3. **音效**：瀏覽器在使用者第一次互動前禁止出聲（autoplay policy）。
 *    首次互動前發現的新通知只搖不響——這是平台限制，繞過它的手段
 *    （隱藏 iframe 之類）都比「少響一聲」糟。
 *
 * Info: (20260825 - Julian) 輪詢、節流、跨分頁協調與 WebAudio 已抽到
 * `use_notification_summary` 與 `notification_sound`（計畫書 D6–D8）。
 *
 * 抽出去的理由不只是整潔：`testEnvironment` 是 `node`、repo 沒有 jsdom，
 * 留在元件裡的邏輯**一行都測不到** —— 唯一的測試是對原始碼做字串比對，
 * 而那擋不住「把 playChime 搬出 if」這種變異。這裡只剩渲染與接線。
 */

interface IItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  // Info: (20260825 - Julian) 未讀是 null；畫面用它決定要不要點紅點
  readAt: number | null;
}

interface IList {
  todos: IItem[];
  completed: IItem[];
  /**
   * Info: (20260825 - Julian) 完成節被截斷了嗎（計畫書 D4）。
   * 截斷了不說，畫面就會把 20 則讀成全部 —— 而徽章那時說的是 25。
   */
  hasMoreCompleted: boolean;
}

// Info: (20260825 - Julian) icon 的查表：樣式決定在常數層，元件只負責畫
const ICON_BY_KEY = {
  mail: Mail,
  wallet: Wallet,
  check: CheckCircle2,
  alert: AlertTriangle,
} as const;

const SUMMARY_SHOWN_KEY = "notification-summary-shown";

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [list, setList] = useState<IList | null>(null);
  const [shaking, setShaking] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /**
   * Info: (20260825 - Julian) 輪詢、節流、跨分頁協調、AudioContext 生命週期
   * 全在這支 hook 裡（計畫書 D6–D8）。元件只讀它的結果。
   */
  const { summary, arrivalTick, resetBaseline, setSummary } =
    useNotificationSummary(Boolean(user));

  /**
   * Info: (20260825 - Julian) 抵達時搖一次。
   *
   * 掛在 `arrivalTick` 上而不是自己比較數字：判斷「算不算新抵達」只有
   * 一個判斷點（`hasNewArrival`），而它在 hook 裡、有測試。
   * `arrivalTick` 從 0 開始，所以首抓不會觸發。
   */
  useEffect(() => {
    if (arrivalTick === 0) return undefined;
    setShaking(true);
    const timer = window.setTimeout(() => setShaking(false), 1000);
    return () => window.clearTimeout(timer);
  }, [arrivalTick]);

  /**
   * Info: (20260821 - Luphia) 登入摘要氣泡：非零且本次登入沒說過就彈一次。
   * Info: (20260825 - Julian) 改讀 hook 的首抓結果，不再自己打一次 API
   *（原本首抓與輪詢各有一支 fetch，登入當下會連打兩次）。
   */
  useEffect(() => {
    if (!user || !summary || showToast) return;
    if (summary.todoCount + summary.completedCount === 0) return;
    try {
      if (sessionStorage.getItem(SUMMARY_SHOWN_KEY)) return;
      sessionStorage.setItem(SUMMARY_SHOWN_KEY, "1");
    } catch {
      // Info: (20260825 - Julian) 隱私模式讀寫 sessionStorage 會拋；氣泡不值得為此中斷
      return;
    }
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), NOTIFICATION_SUMMARY_TOAST_MS);
  }, [user, summary, showToast]);

  /**
   * Info: (20260825 - Julian) 打開鈴鐺只抓清單，**不再標記任何東西為已讀**。
   *
   * 原本是「打開＝看過了」，事件型一次全標已讀。改掉的理由有兩個，
   * 而第二個是新的：
   *
   * 1. 面板現在留著已讀的通知讓人翻歷史。打開就全讀的話，
   *    未讀紅點在使用者看清楚之前就全滅了 —— 那顆點會是一個永遠不出現的提示。
   * 2. 「已讀」現在的意思是「我處理過這一則」，而不是「我瞄過鈴鐺」。
   *    前者是使用者的動作，後者不是。
   */
  const openList = useCallback(async () => {
    try {
      const response = await request<{ payload: IList | null }>(
        "/api/v1/user/notifications",
      );
      setList(
        response.payload ?? {
          todos: [],
          completed: [],
          hasMoreCompleted: false,
        },
      );
    } catch {
      setList({ todos: [], completed: [], hasMoreCompleted: false });
    }
  }, []);

  /**
   * Info: (20260825 - Julian) 點擊某一則 → 只有那一則變已讀、徽章 -1。
   *
   * 三件事的順序是刻意的：先在本地改（紅點與徽章立刻反應），再送請求。
   * 這一則同時是 `<Link>`，點下去會導頁 —— 等請求回來再更新畫面的話，
   * 使用者根本看不到那一步，而 Next 的 client-side 導頁不會中斷 fetch，
   * 所以不需要 `keepalive`。
   *
   * 失敗不回滾：下一次輪詢／重開面板會拿到伺服器的真相，
   * 而為了一顆紅點做補償邏輯，代價比它糾正的錯誤大。
   */
  const markOneRead = useCallback(
    (item: IItem) => {
      if (item.readAt !== null) return;

      setList((previous) =>
        previous
          ? {
              ...previous,
              completed: previous.completed.map((entry) =>
                entry.id === item.id ? { ...entry, readAt: Date.now() } : entry,
              ),
            }
          : previous,
      );

      setSummary((previous) =>
        previous
          ? {
              ...previous,
              completedCount: Math.max(0, previous.completedCount - 1),
            }
          : previous,
      );

      /**
       * Info: (20260825 - Julian) 未讀變少也要降基準（計畫書 D17 的同一條理由）。
       *
       * `hasNewArrival` 比的是總數上升。讀掉一則之後總數變小，
       * 基準不跟著降的話，下一則新通知會讓總數回到舊基準而**不大於**它 ——
       * 鈴鐺不搖也不響，而使用者沒有任何方式發現漏掉了一則。
       */
      const nextTotal =
        (summary?.todoCount ?? 0) +
        Math.max(0, (summary?.completedCount ?? 0) - 1);
      resetBaseline(nextTotal);

      request(`/api/v1/user/notifications/${item.id}/read`, {
        method: HTTP_METHOD.POST,
      }).catch(() => {
        // Info: (20260825 - Julian) 已讀失敗不值得任何錯誤畫面；下一輪輪詢會校正
      });
    },
    [summary?.todoCount, summary?.completedCount, resetBaseline, setSummary],
  );

  if (!user) return null;

  const unreadTotal =
    (summary?.todoCount ?? 0) + (summary?.completedCount ?? 0);

  /**
   * Info: (20260825 - Julian) 每一種通知的文案（計畫書 D11）。
   *
   * 未知型別回 `null` 而不是落到「分析已完成」那一支 —— 原本的 fallback
   * 會把任何新增的型別渲染成一句錯的話，而新增型別的人不會發現。
   */
  /**
   * Info: (20260825 - Julian) 報告類別的中文名，取不到就回空字串。
   *
   * 直接複用分析頁那份字典（`analysis.categories.*`），不另外存一份標題進
   * `payload`：同一個類別在兩個地方各有一份名字，改一邊就會不一致，
   * 而通知那份沒有人會去看。
   *
   * `t()` 找不到鍵時回傳鍵本身，所以要給 `defaultValue` 才分得出
   * 「沒有這個類別」與「這個類別叫做 `analysis.categories.xxx`」——
   * 常數層有 `JOURNAL_CORRECTION` 而字典裡是 `journal_upload`，
   * 這個缺口今天就存在。
   */
  const titleOf = (item: IItem): string => {
    const type = item.payload.analysisType;
    if (typeof type !== "string" || type === "") return "";
    return t(`analysis.categories.${type.toLowerCase()}`, {
      defaultValue: "",
    });
  };

  const messageOf = (item: IItem): string | null => {
    switch (item.type) {
      case NOTIFICATION_TYPE.TEAM_INVITATION:
        return t("notification.team_invitation", {
          inviterName: String(item.payload.inviterName ?? ""),
          teamName: String(item.payload.teamName ?? ""),
        });
      case NOTIFICATION_TYPE.WALLET_UPGRADE:
        return t("notification.wallet_upgrade");
      /**
       * Info: (20260825 - Julian) 帶上報告名稱，取不到才退回原本那句。
       *
       * 同時跑三份分析時，三則「你的分析工作已完成」在畫面上完全一樣，
       * 使用者分不出哪則對應哪份報告 —— 而點進去只會落在同一個歷史清單。
       */
      case NOTIFICATION_TYPE.ANALYSIS_COMPLETED: {
        const title = titleOf(item);
        return title
          ? t("notification.analysis_completed_named", { title })
          : t("notification.analysis_completed");
      }
      case NOTIFICATION_TYPE.ANALYSIS_FAILED: {
        const title = titleOf(item);
        return title
          ? t("notification.analysis_failed_named", { title })
          : t("notification.analysis_failed");
      }
      default:
        return null;
    }
  };

  /**
   * Info: (20260825 - Julian) 樣式與去處都查表（`src/constants/notification.ts`），
   * 元件不做決定 —— 比照 `movement_alert_badge.tsx` 的既有規則。
   *
   * 沒有去處的型別（目前是錢包升級：全站還沒有升級頁面）渲染成不可點的
   * `<div>`，而不是一個點了沒反應的連結。
   */
  const renderItem = (item: IItem) => {
    const message = messageOf(item);
    if (message === null) return null;

    const style = NOTIFICATION_TYPE_STYLE[item.type as NotificationType];
    const Icon = style ? ICON_BY_KEY[style.icon] : Bell;
    const href = NOTIFICATION_LINK_PATH[item.type as NotificationType] ?? null;
    const isUnread = item.readAt === null;
    const body = (
      <>
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${style?.className ?? "text-text-muted"}`}
        />
        <span className="flex-1">{message}</span>
        {/**
         * Info: (20260825 - Julian) 未讀紅點。
         *
         * 已讀的通知留在清單裡當歷史，所以「新的」需要一個看得出來的記號。
         * 這裡不改文字顏色或粗細：那會讓已讀的看起來像被停用，
         * 而它們是完全可用的歷史紀錄。
         *
         * `sr-only` 的文字是給讀屏的 —— 一顆純色的點對它是不存在的，
         * 而「哪幾則是新的」正是這個介面要傳達的資訊。
         */}
        {isUnread && (
          <span className="mt-1.5 flex shrink-0 items-center">
            <span className="bg-danger block size-2 rounded-full" />
            <span className="sr-only">{t("notification.unread")}</span>
          </span>
        )}
      </>
    );
    const shared = "flex items-start gap-2 rounded-md px-3 py-2 text-sm";

    return href ? (
      <Link
        key={item.id}
        href={href}
        onClick={() => markOneRead(item)}
        className={`hover:bg-surface-hover ${shared}`}
      >
        {body}
      </Link>
    ) : (
      <div key={item.id} className={shared}>
        {body}
      </div>
    );
  };

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={t("notification.aria")}
        onClick={openList}
        className="text-text-muted hover:bg-surface-hover hover:text-text-primary relative rounded-full p-2 focus:outline-none"
      >
        <Bell className={`h-5 w-5 ${shaking ? "animate-bell-shake" : ""}`} />
        {/**
         * Info: (20260825 - Julian) 徽章改用語意 token（原本是 `bg-orange-600`
         * 加 `text-white`）。header 的其他子元件一律用 token，深色模式才會對。
         * `tabular-nums` 讓 9 → 10 時數字不跳動（同 `hr_sidebar` 的未讀 pill）。
         */}
        {unreadTotal > 0 && (
          <span className="bg-danger text-text-inverted absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </PopoverButton>

      {/**
       * Info: (20260821 - Luphia) 登入摘要氣泡：只出現一次，數秒後自動收合。
       * 不是 Popover 的一部分——它在使用者尚未點擊時就要出現。
       */}
      {showToast && summary && (
        <div className="border-brand/30 bg-surface-overlay text-text-primary absolute top-full right-0 z-50 mt-2 w-64 rounded-lg border p-3 text-sm shadow-lg">
          {t("notification.summary", {
            todos: summary.todoCount,
            completed: summary.completedCount,
          })}
        </div>
      )}

      {/**
       * Info: (20260825 - Julian) 手機全螢幕、桌機右上錨定（計畫書 §附錄 A）。
       *
       * 需求寫的是「展開側邊欄」，而 `w-80` 的下拉在手機上會擠成一條。
       * 這個形狀直接沿用同一個 header 裡的 `user_actions.tsx`：
       * `static` + `fixed inset-0` 手機全螢幕、`md:` 以上變回錨定下拉，
       * 同一層 z-index。全站一致，而且那份已經處理過手機的關閉按鈕。
       *
       * Info: (20260825 - Julian) 顏色用 `surface-overlay` / `border-default`。
       * 原本寫的是 `bg-surface` 與 `border-border` —— **`@theme` 沒有定義
       * 裸的 `--color-surface` 與 `--color-border`**，那兩個 class 產不出任何
       * 樣式，面板因此透明無邊框，而 `tsc` 與 `lint` 全綠（計畫書 D3）。
       */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel className="bg-surface-overlay border-border-default fixed inset-0 z-100 flex h-dvh w-full flex-col border shadow-lg md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 md:h-auto md:max-h-[70vh] md:w-80 md:rounded-lg">
          {({ close }) => (
            <>
              {/* Info: (20260825 - Julian) 手機全螢幕時要有出口；桌機點外面就關 */}
              <div className="border-border-default flex shrink-0 items-center justify-between border-b px-3 pb-2 md:hidden">
                <p className="text-text-primary text-sm font-semibold">
                  {t("notification.aria")}
                </p>
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() => close()}
                  className="text-text-muted hover:text-text-primary rounded-full p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {!list ||
                (list.todos.length === 0 && list.completed.length === 0) ? (
                  <p className="text-text-muted px-3 py-4 text-center text-sm">
                    {t("notification.empty")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {list.todos.length > 0 && (
                      <>
                        <div className="text-text-muted rounded-t-lg bg-gray-100 px-3 pt-2 pb-1 text-xs font-semibold">
                          {t("notification.todos_title")}
                        </div>
                        {list.todos.map(renderItem)}
                      </>
                    )}
                    {list.completed.length > 0 && (
                      <>
                        <div className="text-text-muted rounded-t-lg bg-gray-100 px-3 pt-2 pb-1 text-xs font-semibold">
                          {t("notification.completed_title")}
                        </div>
                        {list.completed.map(renderItem)}
                        {/**
                         * Info: (20260825 - Julian) 截斷了就要說出來（計畫書 D4）。
                         * 不說的話畫面把 20 則讀成全部，而徽章那時說的是 25。
                         */}
                        {list.hasMoreCompleted && (
                          <p className="text-text-muted px-3 py-2 text-center text-xs">
                            {t("notification.has_more_completed")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
