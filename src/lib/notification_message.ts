import {
  ANALYSIS_LINK_PATH_BY_CATEGORY,
  NOTIFICATION_LINK_PATH,
  NOTIFICATION_TYPE,
  NotificationType,
} from "@/constants/notification";
import type { INotificationItem } from "@/interfaces/notification";

/**
 * Info: (20260826 - Julian) 「這一則通知要顯示什麼字」——純函式（review：前端細節）。
 *
 * ## 為什麼要從元件裡搬出來
 *
 * 這段 switch 原本住在 `notification_row.tsx` 裡並且**閉包了 `t`**，
 * 於是它 export 不出去，也就一條都測不到（repo 沒有 jsdom，元件本身測不了）。
 * 而它是計畫書 D11 的落點：未知型別必須回 `null` 而不是掉進
 * 「你的分析已完成」那一支 —— 那個 fallback 會把任何新增的型別渲染成
 * 一句錯的話，而新增型別的人不會發現。
 *
 * 把 `t` 變成參數之後，這裡就是一組純輸入輸出，可以逐型別窮舉。
 */

/**
 * Info: (20260826 - Julian) 只要「用鍵取字、可帶插值」，不綁 i18n 的實作。
 * 收窄成這個形狀而不是接受整個 context：測試不必為了驗一句文案去架 provider。
 */
export type TranslateFn = (
  key: string,
  options?: Record<string, string | number>,
) => string;

/**
 * Info: (20260826 - Julian) 型別守衛，取代 `item.type as NotificationType`。
 *
 * `type` 是從 API 回來的字串 —— 資料庫裡存的是什麼就是什麼，硬轉等於
 * 宣稱一件我們無法保證的事（coding_guidelines §2.1）。
 *
 * 先前它「剛好安全」，靠的是 `messageOf` 的 `default: return null` 早退擋在
 * 前面 —— 而那是相隔四十行的耦合：有人把早退拿掉、或在早退之前多讀一次
 * 查表，就會拿到 `undefined` 並在 render 階段炸掉。
 */
export function isNotificationType(type: string): type is NotificationType {
  return (Object.values(NOTIFICATION_TYPE) as string[]).includes(type);
}

/**
 * Info: (20260825 - Julian) 報告類別的名稱，取不到就回空字串。
 *
 * 直接複用分析頁那份字典（`analysis.categories.*`），不另外存一份標題進
 * `payload`：同一個類別在兩個地方各有一份名字，改一邊就會不一致，
 * 而通知那份沒有人會去看。
 *
 * `t()` 找不到鍵時回傳鍵本身，所以要給 `defaultValue` 才分得出
 * 「沒有這個類別」與「這個類別叫做 `analysis.categories.xxx`」。
 *
 * Info: (20260828 - Julian) 那個缺口曾經真的存在：常數是 `JOURNAL_CORRECTION`，
 * 而字典鍵是 `journal_upload`（沒有任何消費者的死鍵），於是日記帳修正的通知
 * 退回不帶標題的通用句。字典鍵已改名對齊常數，`defaultValue` 這條路仍然保留 ——
 * 它守的是**下一個**新增類別卻忘了補字典的人。
 */
export function analysisTitleOf(
  payload: Record<string, unknown>,
  t: TranslateFn,
): string {
  const type = payload.analysisType;
  if (typeof type !== "string" || type === "") return "";
  return t(`analysis.categories.${type.toLowerCase()}`, { defaultValue: "" });
}

/**
 * Info: (20260825 - Julian) 每一種通知的文案（計畫書 D11）。
 *
 * 未知型別回 `null` 而不是落到「分析已完成」那一支 —— 呼叫端據此
 * 整列不渲染。這比顯示一句錯的話好：使用者看不到的東西不會誤導他，
 * 而看得到的錯話會。
 */
export function notificationMessageOf(
  item: Pick<INotificationItem, "type" | "payload">,
  t: TranslateFn,
): string | null {
  if (!isNotificationType(item.type)) return null;

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
     * 使用者分不出哪則對應哪份報告。
     */
    case NOTIFICATION_TYPE.ANALYSIS_COMPLETED: {
      const title = analysisTitleOf(item.payload, t);
      return title
        ? t("notification.analysis_completed_named", { title })
        : t("notification.analysis_completed");
    }
    case NOTIFICATION_TYPE.ANALYSIS_FAILED: {
      const title = analysisTitleOf(item.payload, t);
      return title
        ? t("notification.analysis_failed_named", { title })
        : t("notification.analysis_failed");
    }
    default:
      return null;
  }
}

/**
 * Info: (20260827 - Julian) 把路徑樣板裡的 `:token` 用 payload 代入（D43）。
 *
 * **任何一個 token 代不進去，整條回 `null`**，不是回半條路徑。
 * `/user/account_book/undefined/journal` 會載入一個空頁，而那正是 D43
 * 要修掉的症狀 —— 修法自己再製造一次同樣的東西就沒有意義了。
 *
 * 逐段處理而不是整串 replace：整串 replace 遇到取不到的 token 會靜靜留下
 * 字面的 `:accountBookId`，而那是一條會 404 的合法路徑 —— 又一個
 * 「看起來有反應」的錯誤去處。
 */
function resolvePathTokens(
  template: string,
  payload: Record<string, unknown>,
): string | null {
  const resolved: string[] = [];

  for (const segment of template.split("/")) {
    if (!segment.startsWith(":")) {
      resolved.push(segment);
      continue;
    }
    const value = payload[segment.slice(1)];
    if (typeof value !== "string" || value === "") return null;
    resolved.push(encodeURIComponent(value));
  }

  return resolved.join("/");
}

/**
 * Info: (20260827 - Julian) 「這一則通知點下去要去哪裡」——純函式（D43）。
 *
 * 這段原本是 `notification_row.tsx` 裡的一行 `NOTIFICATION_LINK_PATH[known]`，
 * 而那一行就是缺陷本身：去處以型別為鍵，但它實際取決於類別。
 * 搬進來的理由與 `notificationMessageOf`（D37）同一條 ——
 * 它是 `(type, payload) → string | null` 的純函式，只有在這裡才逐類別窮舉得了。
 *
 * ## 三層退回，順序有意義
 *
 * 1. 不是分析類的型別 → 型別層那一格（邀請、錢包升級沒有類別可言）
 * 2. 是分析類 → 查類別表
 * 3. 類別不在表裡（含 `analysisType` 缺漏、未知字串）→ **退回**型別層
 *
 * 第 3 條是刻意的：其餘 11 種類別的正確去處**就是** `/analysis?tab=history`。
 * 而「表裡有這個類別、但組不出路徑」與「表裡沒有這個類別」是兩件事 ——
 * 前者回 `null`（我們知道它該去別的地方，只是還去不了），
 * 後者回 fallback（那一頁對它是對的）。混成一種的話，
 * 加類別的人會以為漏登記等於不可點。
 */
export function notificationHrefOf(
  item: Pick<INotificationItem, "type" | "payload">,
): string | null {
  if (!isNotificationType(item.type)) return null;

  const fallback = NOTIFICATION_LINK_PATH[item.type] ?? null;

  const isCompleted = item.type === NOTIFICATION_TYPE.ANALYSIS_COMPLETED;
  const isFailed = item.type === NOTIFICATION_TYPE.ANALYSIS_FAILED;
  if (!isCompleted && !isFailed) return fallback;

  const category = item.payload.analysisType;
  if (typeof category !== "string" || category === "") return fallback;

  const entry = ANALYSIS_LINK_PATH_BY_CATEGORY[category.toUpperCase()];
  if (!entry) return fallback;

  const template = isCompleted ? entry.completed : entry.failed;
  if (template === null) return null;

  return resolvePathTokens(template, item.payload);
}
