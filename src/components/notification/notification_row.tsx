"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Mail, Wallet } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { formatDate } from "@/lib/utils/date";
import { canMarkReadByClick } from "@/lib/notification_read";
import {
  NOTIFICATION_LINK_PATH,
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_STYLE,
  NotificationType,
} from "@/constants/notification";

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

export interface INotificationRowItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  // Info: (20260825 - Julian) 未讀是 null；畫面用它決定要不要點紅點
  readAt: number | null;
}

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
  const titleOf = (): string => {
    const type = item.payload.analysisType;
    if (typeof type !== "string" || type === "") return "";
    return t(`analysis.categories.${type.toLowerCase()}`, {
      defaultValue: "",
    });
  };

  /**
   * Info: (20260825 - Julian) 每一種通知的文案（計畫書 D11）。
   *
   * 未知型別回 `null` 而不是落到「分析已完成」那一支 —— 原本的 fallback
   * 會把任何新增的型別渲染成一句錯的話，而新增型別的人不會發現。
   */
  const messageOf = (): string | null => {
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
        const title = titleOf();
        return title
          ? t("notification.analysis_completed_named", { title })
          : t("notification.analysis_completed");
      }
      case NOTIFICATION_TYPE.ANALYSIS_FAILED: {
        const title = titleOf();
        return title
          ? t("notification.analysis_failed_named", { title })
          : t("notification.analysis_failed");
      }
      default:
        return null;
    }
  };

  const message = messageOf();
  if (message === null) return null;

  /**
   * Info: (20260825 - Julian) 樣式與去處都查表（`src/constants/notification.ts`），
   * 元件不做決定 —— 比照 `movement_alert_badge.tsx` 的既有規則。
   *
   * 沒有去處的型別（目前是錢包升級：全站還沒有升級頁面）渲染成不可點的
   * `<div>`，而不是一個點了沒反應的連結。
   */
  const style = NOTIFICATION_TYPE_STYLE[item.type as NotificationType];
  const Icon = style ? ICON_BY_KEY[style.icon] : Bell;
  const href = NOTIFICATION_LINK_PATH[item.type as NotificationType] ?? null;
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
