"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Mail, Wallet } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { formatDate } from "@/lib/utils/date";
import { canMarkReadByClick } from "@/lib/notification_read";
import type { INotificationItem } from "@/interfaces/notification";
import {
  isNotificationType,
  notificationHrefOf,
  notificationMessageOf,
} from "@/lib/notification_message";
import { NOTIFICATION_TYPE_STYLE } from "@/constants/notification";

/**
 * Info: (20260826 - Julian) 一則通知怎麼畫，**只有這一個地方說得算**。
 *
 * 這些決定原本全在 `notification_bell.tsx` 裡：哪一種型別配哪句文案、
 * 帶不帶報告名稱、圖示與顏色查哪張表、有沒有去處、未讀怎麼標。
 * `/user/notifications` 頁面要畫的是同一種東西，複製一份的話兩邊會分岔——
 * 而分岔的形狀是「面板上寫著報告名稱，頁面上寫著一句通用的話」，
 * 沒有任何測試會紅，也沒有人會回頭同步。
 *
 * 兩個消費者的差別只有兩個，都做成 props：要不要顯示時間、點擊後做什麼。
 */

// Info: (20260825 - Julian) icon 的查表：樣式決定在常數層，元件只負責畫
const ICON_BY_KEY = {
  mail: Mail,
  wallet: Wallet,
  check: CheckCircle2,
  alert: AlertTriangle,
} as const;

/**
 * Info: (20260826 - Julian) 列的形狀就是端點回的形狀（review B6）。
 *
 * 原本這裡另外宣告一份四欄位的 interface，結構上與 `INotificationItem`
 * 一模一樣 —— 而「結構上一樣」是 TypeScript 不會提醒你的那種重複：
 * 端點加一個欄位、這裡沒加，畫面就永遠讀不到它，而沒有任何東西會紅。
 */
export type INotificationRowItem = INotificationItem;

interface INotificationRowProps {
  item: INotificationRowItem;
  /**
   * Info: (20260826 - Julian) 點下去要做什麼由呼叫端決定。
   *
   * 兩個消費者要更新的狀態不同（面板改自己那份清單與徽章，頁面改自己那一頁），
   * 而「哪一則被點了」是這個元件唯一知道的事。它不自己打 API：
   * 樂觀更新的順序與徽章的基準線都在呼叫端（見鈴鐺的 `markOneRead`）。
   */
  onRead: (item: INotificationRowItem) => void;
  /**
   * Info: (20260826 - Julian) 顯示時間戳。
   *
   * 下拉面板不顯示（十來列裡每列多一行字，而面板要的是掃一眼）；
   * 完整清單頁顯示——「那份報告是哪天跑完的」正是翻歷史的主要理由。
   */
  showTimestamp?: boolean;
}

export default function NotificationRow({
  item,
  onRead,
  showTimestamp = false,
}: INotificationRowProps) {
  const { t } = useTranslation();

  /**
   * Info: (20260826 - Julian) 文案交給純函式（review：前端細節）。
   *
   * 它原本是這個元件裡一段閉包了 `t` 的 switch —— export 不出去，
   * 也就一條都測不到。搬到 `lib/notification_message.ts` 之後，
   * 「哪一種型別顯示哪句話」變成可以逐型別窮舉的東西。
   */
  const message = notificationMessageOf(item, t);
  if (message === null) return null;

  /**
   * Info: (20260825 - Julian) 樣式與去處都查表（`src/constants/notification.ts`），
   * 元件不做決定 —— 比照 `movement_alert_badge.tsx` 的既有規則。
   *
   * 沒有去處的型別（目前是錢包升級：全站還沒有升級頁面）渲染成不可點的
   * `<div>`，而不是一個點了沒反應的連結。
   */
  /**
   * Info: (20260826 - Julian) 以型別守衛收窄，不用 `as NotificationType`（review）。
   *
   * `item.type` 是 API 回來的字串。硬轉在這裡「剛好安全」，靠的是上面那行
   * `message === null` 早退 —— 而那是相隔數行的耦合：有人在早退之前多讀
   * 一次查表，就會拿到 `undefined` 並在 render 階段炸掉。
   *
   * 收窄之後 `style` 與 `href` 的型別是真的，不是宣稱的。
   */
  const known = isNotificationType(item.type) ? item.type : null;
  const style = known ? NOTIFICATION_TYPE_STYLE[known] : undefined;
  const Icon = style ? ICON_BY_KEY[style.icon] : Bell;
  /**
   * Info: (20260827 - Julian) 去處改由純函式決定（D43）。
   *
   * 這裡原本是 `NOTIFICATION_LINK_PATH[known]` —— 以**型別**為鍵，
   * 而分析通知的去處實際取決於**類別**。四種不在 `CATEGORIES` 裡的類別
   * 因此被送到一個結構上放不下那筆紀錄的頁面。
   * 元件仍然不做決定，只是查表的位置從常數層換成一支能逐類別窮舉的純函式。
   */
  const href = notificationHrefOf(item);
  const isUnread = item.readAt === null;

  /**
   * Info: (20260826 - Julian) 「點了算不算已讀」由這裡決定，不由呼叫端（review B3）。
   *
   * 兩個消費者原本各自把整份清單交給同一支 `markOneRead`，而那支擋不住
   * 活算的待辦（`readAt` 恆為 null）—— 於是點一下邀請會扣錯徽章的桶、
   * 造出一次幽靈搖動、並對一個合成 id 打 API。**兩邊犯的是同一個錯**，
   * 那正是這個判斷不該留在呼叫端的理由：這裡已經在決定「這一型有沒有去處」，
   * 「這一型點了算不算已讀」是同一類決定。
   */
  const readOnClick = canMarkReadByClick(item.type);

  const body = (
    <>
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${style?.className ?? "text-text-muted"}`}
      />
      <span className="flex-1">
        {message}
        {showTimestamp && (
          <span className="text-text-muted mt-0.5 block text-xs">
            {formatDate(item.createdAt, "yyyy/MM/dd HH:mm")}
          </span>
        )}
      </span>
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
      href={href}
      /**
       * Info: (20260826 - Julian) 待辦型仍然可點（要導去處理它），只是不標已讀。
       * 待辦的消失由「事情真的做完了」驅動 —— 邀請被接受／拒絕、
       * 錢包探針轉 true，而不是由「使用者看過了」驅動（計畫書 D1）。
       */
      onClick={readOnClick ? () => onRead(item) : undefined}
      className={`hover:bg-surface-hover ${shared}`}
    >
      {body}
    </Link>
  ) : (
    <div className={shared}>{body}</div>
  );
}
