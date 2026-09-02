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
    /**
     * Info: (20260828 - Julian) 「可以繼續了」——**不是**「已為你繼續」。
     *
     * 伺服器做不到替他繼續：智能溫盤的匯入內容是端到端加密的，逐章迴圈跑在
     * 瀏覽器裡（`use_carbon_chat.ts` 的 `runResumableJob`），伺服器沒有金鑰。
     * 所以文案要明說「回去按一下」，否則使用者會以為它自己會跑完。
     *
     * 帶進度是為了讓他判斷值不值得現在回去：剩兩章與剩三十章是不同的決定。
     */
    case NOTIFICATION_TYPE.JOB_RESUMABLE: {
      const completed = Number(item.payload.completedSteps ?? 0);
      const total = Number(item.payload.totalSteps ?? 0);

      /**
       * Info: (20260828 - Julian) 兩句而不是一句帶 `{{completed}}/{{total}}`
       *（計劃 §3）。原本的文案把分數塞進引號裡，畫面上長這樣：
       *
       * > 點數已補回，「0/14」的匯入可以繼續了
       *
       * 那對引號本來是留給名稱的位置，塞進一個分數就變成「有個東西叫 0/14」。
       * 而 `0/14` 這一格更麻煩：一步都還沒跑，「繼續」會讓人以為做過一半。
       *
       * 改成剩餘章數：「還有 14 章」是一個**決定**（現在值不值得回去），
       * 「0/14」只是一個狀態。
       */
      const remaining = total - completed;

      /**
       * Info: (20260828 - Julian) 算不出「還有幾章」時退回另一句，而不是說「還有 0 章」。
       *
       * `remaining <= 0` 在正常情況下不會發生（沒有剩就不會是 `RESUMABLE`），
       * 但 payload 來自資料庫，欄位不保證在。「還有 0 章沒有匯入，可以接著做了」
       * 是一句自相矛盾的話 —— 兩句裡挑一句對的，比算出一個荒謬的數字好。
       */
      /**
       * Info: (20260828 - Julian) **尚未做**：帶上那份報告的名字。
       *
       * 現在說的是「還有 11 章」，而不是「『某某報告』還有 11 章」。
       * 深連結（`NOTIFICATION_LINK_PATH`）已經回答了「是哪一份」——
       * 落地就在那個會話裡，所以名字目前只是錦上添花；它真正有價值的情境
       * 是「同時有兩份暫停的匯入」，而那還沒發生。
       *
       * 要做的時候：`ResumableJob` 加一個 nullable 的 `resource_label`
       *（不要叫 `file_name`，下一種 `JOB_TYPE` 的標籤未必是檔案），
       * 由 `saveImportJobBookmark` 帶上來、`listNotifications` 放進 payload。
       * 取捨見 `resumable_job_resume_landing_and_copy.md` §8。
       */
      if (completed <= 0 || remaining <= 0) {
        return t("notification.job_resumable_fresh");
      }

      return t("notification.job_resumable", { remaining });
    }
    default:
      return null;
  }
}

// Info: (20260828 - Julian) `:token`；不含 `://` 那種冒號（其後不是英數）
const TOKEN_PATTERN = /:([A-Za-z0-9_]+)/g;

/**
 * Info: (20260827 - Julian) 把路徑樣板裡的 `:token` 用 payload 代入（D43）。
 *
 * **任何一個 token 代不進去，整條回 `null`**，不是回半條路徑。
 * `/user/account_book/undefined/journal` 會載入一個空頁，而那正是 D43
 * 要修掉的症狀 —— 修法自己再製造一次同樣的東西就沒有意義了。
 *
 * 用 `replace` 而不是自己拼字串，但**取不到就記下來、最後整條丟掉**：
 * 放任 `replace` 留下字面的 `:accountBookId` 會得到一條會 404 的合法路徑，
 * 又一個「看起來有反應」的錯誤去處。
 *
 * Info: (20260828 - Julian) 從「逐段」改成「逐 token」（`resumable_job_resume_landing_and_copy.md` §2.1）。
 *
 * 原本是 `split("/")` 之後看 `segment.startsWith(":")`，也就是**整段就是
 * 一個 token** 才算數。那對 `/user/account_book/:accountBookId/journal` 夠用，
 * 但深連結要代的是 query 裡的值（`?session=:sessionId`）—— 那個 token 住在
 * 一段的中間，舊寫法會靜靜地跳過它。
 *
 * 不變式沒有變，只是判斷的粒度變小了：任何一個 token 代不出來，整條回 `null`。
 */
function resolvePathTokens(
  template: string,
  payload: Record<string, unknown>,
): string | null {
  let missing = false;

  const resolved = template.replace(
    TOKEN_PATTERN,
    (unusedMatch, name: string) => {
      const value = payload[name];
      if (typeof value !== "string" || value === "") {
        missing = true;
        return "";
      }
      return encodeURIComponent(value);
    },
  );

  return missing ? null : resolved;
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

  /**
   * Info: (20260828 - Julian) 型別層的樣板**也要**代入 token（`resumable_job_resume_landing_and_copy.md` §2.1）。
   *
   * 這裡原本直接回常數字串。當時型別層沒有任何樣板帶 token，所以它是對的 ——
   * 但那是巧合而不是規則：`JOB_RESUMABLE` 要深連結到單一會話，它就需要。
   * 少了這一步，`:sessionId` 會原封不動出現在 `href` 裡，
   * 而 `/user/carbon_chatbot?session=:sessionId` 是一條合法但錯的路徑，
   * 正是 D43 的症狀。
   */
  const fallbackTemplate = NOTIFICATION_LINK_PATH[item.type] ?? null;
  const fallback =
    fallbackTemplate === null
      ? null
      : resolvePathTokens(fallbackTemplate, item.payload);

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
