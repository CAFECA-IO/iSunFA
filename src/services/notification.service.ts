import { Prisma } from "@/generated";
import {
  NOTIFICATION_DEDUPE_PREFIX,
  NOTIFICATION_HISTORY_LIMIT,
  NOTIFICATION_PAGE_SIZE_MAX,
  NOTIFICATION_TODO_LIST_LIMIT,
  NOTIFICATION_TYPE,
  TODO_NOTIFICATION_TYPES,
} from "@/constants/notification";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { notificationRepo } from "@/repositories/notification.repo";
import { resumableJobRepo } from "@/repositories/resumable_job.repo";
import { parseCarbonChatChannel } from "@/constants/carbon_chatbot";
import type {
  INotificationHistoryPage,
  INotificationItem,
  INotificationList,
  INotificationSummary,
} from "@/interfaces/notification";
import { listPendingInvitationsForUser } from "@/services/team_invitation.service";

/**
 * Info: (20260821 - Luphia) 小鈴鐺通知 Service（ADR 021 補充）。
 *
 * 摘要那句話「N 則待辦事項、M 個工作完成通知」的兩個數字來源不同：
 *
 * - 待辦 = **活算的**團隊邀請（向邀請表現查，不存副本）＋ 存在 DB 的
 *   待辦型通知（目前只有「系統要求升級錢包」）
 * - 完成 = 存在 DB 的事件型未讀通知（分析／憑證掃描完成）
 *
 * 為什麼邀請不入庫：邀請被接受、撤回、過期時，通知必須**同步**消失。
 * 存一份副本就要在每一條會改變邀請狀態的路徑上記得去改副本——漏一條就是
 * 一則永遠掛著的假待辦。活算沒有這個同步問題，代價只是一次查詢。
 */

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

/**
 * Info: (20260825 - Julian) 未預期的錯誤要留線索再往上丟。
 *
 * 原本是靜默轉成 `IS_UNKNOWN`：連線耗盡、schema 漂移、Prisma 參數錯誤
 * 全部塌成同一個 `IS000099`，而伺服器端沒有一行紀錄。
 * 「塌成同一個值」在驗收裡的後果是偵測不到缺陷，在 log 裡的後果是
 * 查不出成因（檢查清單 §一.9）。
 */
/**
 * Info: (20260826 - Julian) 腳本用的匯出：**要拋，但拋自己的型別**（review §5.2）。
 *
 * `guarded()` 把任何失敗轉成 `IS_UNKNOWN` 的 `ApiError`，那對 route 是對的
 * ——端點必須回一個可預期的信封。但 `dismissWalletUpgrade` 與
 * `listUsersWithPendingWalletUpgrade` 的呼叫端是 CLI 腳本：它們**需要**
 * 例外往上拋（逐人 try/catch、失敗清單、非 0 exit code 都靠它）。
 *
 * 先前的做法是完全不包，於是原始的 Prisma 錯誤被腳本原文印進 stderr ——
 * 連線字串、資料表結構、有時是欄位值都跟著出去，而排程的 stderr
 * 通常會進到日誌系統。
 *
 * 這裡取中間：包成自有型別、記一行結構化的 log，把原因留在 `cause`
 * 給需要的人（`--verbose` 之類）而不是預設印出去。
 */
export class NotificationOperationError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`通知操作失敗：${operation}`);
    this.name = "NotificationOperationError";
    this.cause = cause;
  }
}

/**
 * Info: (20260826 - Julian) 與 `guarded` 的差別只有一個：這支**保留可拋性**。
 * 兩支並存而不是加一個布林參數：那個布林切換的正是呼叫端最該想清楚的事
 * （這條路徑失敗時，是要回一個信封，還是要讓流程停下來）。
 */
async function guardedThrowing<T>(
  operation: () => Promise<T>,
  context: { operation: string } & Record<string, unknown>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("notification operation failed", {
      ...context,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw new NotificationOperationError(context.operation, error);
  }
}

async function guarded<T>(
  operation: () => Promise<T>,
  context: Record<string, unknown>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("notification service failed", {
      ...context,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw toApiError(API_ERRORS.IS_UNKNOWN);
  }
}

/**
 * Info: (20260825 - Julian) 待辦型的邀請由 `team_invitation.service` 現算。
 *
 * 不在這裡自己查的理由：團隊頁（`/user/team`）也要回答同一個問題，而鈴鐺上
 * 那則通知點下去正是導到那一頁。兩邊各查一次的話，兩個答案遲早會分岔，
 * 而症狀是「通知說有一封邀請，點進去那一頁說沒有」。
 *
 * 「哪些邀請算數」（已驗證信箱、未過期）的判斷收在那一支裡，見它的說明。
 */
async function listPendingInvitations(
  userId: string,
  address: string,
  nowMs: number,
) {
  return listPendingInvitationsForUser({ userId, address, nowMs });
}

// Info: (20260821 - Luphia) 摘要（登入氣泡與輪詢都打這一支：兩個數字，愈便宜愈好）
export async function getNotificationSummary(params: {
  userId: string;
  address: string;
  nowMs: number;
}): Promise<INotificationSummary> {
  return guarded(
    async () => {
      /**
       * Info: (20260828 - Julian) 第三個活算來源：可以繼續的暫停任務。
       *
       * 與邀請同一個形狀（來源本身是活狀態，不入庫），所以也放進這個
       * `Promise.all` —— 三支查詢並行，往返次數多一次但不多一輪等待。
       *
       * ⚠️ 這一支讓摘要從兩趟 DB 變三趟，而它每 60 秒被每個在線使用者打一次。
       * 計畫書 §6 第 7 項說效能從來沒量過 —— 加了這一支之後**要量**。
       */
      const [invitations, unread, resumableJobs] = await Promise.all([
        listPendingInvitations(params.userId, params.address, params.nowMs),
        notificationRepo.summarizeUnread(params.userId),
        resumableJobRepo.listResumableByUser(params.userId),
      ]);
      const unreadByType = unread.counts;
      /**
       * Info: (20260821 - Luphia) 分組是「待辦型 vs 其他」，不是逐型別列舉：
       * 未來新增事件型通知時這裡不需要跟著改，只有新增**待辦型**才要動
       * TODO_NOTIFICATION_TYPES（常數層的單一清單）。
       */
      let storedTodos = 0;
      let completed = 0;
      for (const [type, count] of unreadByType) {
        if ((TODO_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
          storedTodos += count;
        } else {
          completed += count;
        }
      }
      /**
       * Info: (20260826 - Julian) **活算的邀請也要算進來**（review 1.1；D17 的補正）。
       *
       * 先前這裡只取入庫通知的時間，理由寫的是「新邀請一定讓 todoCount 上升，
       * 任何一個變了 key 就變了」—— 那句話混淆了兩個不同的條件：
       *
       * - `hasNewArrival` 要的是「總數**上升**」：邀請確實滿足
       * - `arrivalKeyOf` 要的是「兩次不同的抵達**鍵不同**」：邀請不滿足
       *
       * 純邀請使用者的 `latestUnreadAt` 恆為 null，鍵退化成
       * `0:todoCount:completedCount` —— 正是 D17 修正前的形狀。實際序列：
       * 邀請 A 抵達（`0:1:0`，響）→ 接受 A（歸零）→ 邀請 B 抵達（又是 `0:1:0`）
       * → `seenKeys` 記過了 → **搖但不響，且此後永久靜音**（`ChimeGate`
       * 沒有 reset，`resetBaseline` 只動總數基準，唯一出路是整頁重整）。
       *
       * 身上掛著一則收不掉的錢包升級待辦時更容易撞上：數量在
       * `T:1:0` 與 `T:2:0` 之間來回，兩個值都被記過。
       *
       * 併進來不多一趟 DB —— `invitations` 已經在手上。取兩邊的最大值：
       * 新的東西必然有更晚的時間，這正是 D17 要的「由來源決定、所有分頁一致」。
       */
      const latestStoredAt = unread.latestCreatedAt
        ? unread.latestCreatedAt.getTime()
        : 0;
      const latestInvitationAt = invitations.reduce(
        (latest, invitation) =>
          Math.max(latest, invitation.createdAt.getTime()),
        0,
      );
      /**
       * Info: (20260828 - Julian) 任務用 `updatedAt` 而不是 `createdAt`。
       *
       * 上面那段（D17 的補正）要的是「兩次不同的抵達，鍵要不同」。
       * 任務的 `createdAt` 是**開始匯入**的時間，而它在暫停與翻面之間不會變 ——
       * 用它的話，同一個任務暫停 → 補點數 → 再暫停 → 再補點數，
       * 兩次「可以繼續了」會算出同一個鍵，第二次搖而不響（D17 的形狀）。
       *
       * `updatedAt` 在每次狀態轉換都會動，正是「這一次翻面」的時間。
       */
      const latestResumableAt = resumableJobs.reduce(
        (latest, job) => Math.max(latest, job.updatedAt.getTime()),
        0,
      );

      return {
        todoCount: invitations.length + resumableJobs.length + storedTodos,
        completedCount: completed,
        // Info: (20260826 - Julian) 兩者皆無時回 null（`0` 會被誤讀成 epoch）
        latestUnreadAt:
          Math.max(latestStoredAt, latestInvitationAt, latestResumableAt) ||
          null,
      };
    },
    { operation: "getNotificationSummary", userId: params.userId },
  );
}

/**
 * Info: (20260826 - Julian) 通知列 → 前端型別。
 *
 * 提到模組層由鈴鐺清單與分頁歷史共用：兩邊各寫一次的話，
 * 「payload 為 null 時給空物件」這種小決定遲早只有一邊做，
 * 而症狀是其中一個畫面偶爾整列空白。
 */
function toItem(notification: {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  readAt: Date | null;
}): INotificationItem {
  return {
    id: notification.id,
    type: notification.type,
    payload: (notification.payload ?? {}) as Record<string, unknown>,
    createdAt: notification.createdAt.getTime(),
    readAt: notification.readAt ? notification.readAt.getTime() : null,
  };
}

/**
 * Info: (20260821 - Luphia) 鈴鐺展開的清單：待辦與完成分節。
 *
 * Info: (20260825 - Julian) 待辦型與事件型**分兩次查**，不是撈一批再分類。
 * 理由見 `notificationRepo.listUnreadByTypes` 的說明（計畫書 D4）：
 * 一支查詢加上 `take` 會讓舊的待辦被新的完成通知擠出清單，
 * 而摘要的計數沒有截斷、照樣算它 —— 徽章與清單就此分岔。
 */
export async function listNotifications(params: {
  userId: string;
  address: string;
  nowMs: number;
}): Promise<INotificationList> {
  return guarded(
    async () => {
      const [invitations, storedTodos, completedPage, resumableJobs] =
        await Promise.all([
          listPendingInvitations(params.userId, params.address, params.nowMs),
          notificationRepo.listUnreadByTypes(
            params.userId,
            TODO_NOTIFICATION_TYPES,
            NOTIFICATION_TODO_LIST_LIMIT,
          ),
          /**
           * Info: (20260825 - Julian) 事件型改成帶回**歷史**（含已讀）。
           *
           * 原本只回未讀，於是「已讀」等同「從畫面上消失」——使用者點過一則
           * 分析完成通知之後就再也找不到它，而那是他唯一一個「哪些報告跑完了」
           * 的入口。待辦型不變：它的存在條件是「事情還沒做完」，讀過不等於做完。
           */
          notificationRepo.listRecentExcludingTypes(
            params.userId,
            TODO_NOTIFICATION_TYPES,
            NOTIFICATION_HISTORY_LIMIT,
          ),
          // Info: (20260828 - Julian) 第三個活算來源，理由同 getNotificationSummary
          resumableJobRepo.listResumableByUser(params.userId),
        ]);

      const todos: INotificationItem[] = invitations.map((invitation) => ({
        /**
         * Info: (20260821 - Luphia) derived 待辦以來源 id 合成識別：
         * 前端只拿它當 React key 與去重依據，不會拿去打任何 API。
         *
         * Info: (20260826 - Julian) 這句話一度不成立（review B3），所以補記
         * **是什麼在維持它**：`notification_row.tsx` 以 `canMarkReadByClick`
         * 擋掉待辦型的 onClick，因此合成 id 走不到 `.../{id}/read`。
         *
         * 先前它只是一句宣稱：面板改成逐則已讀之後，整份清單（含待辦區）
         * 都被交給同一支 `markOneRead`，而那支的早退條件是 `readAt !== null` ——
         * 活算待辦的 `readAt` 恆為 null，於是每點一次邀請就對這個合成 id
         * 打一次 API。宣稱沒有變，事實變了，而沒有任何東西發現。
         */
        id: `invitation:${invitation.id}`,
        type: NOTIFICATION_TYPE.TEAM_INVITATION,
        payload: {
          invitationId: invitation.id,
          teamId: invitation.teamId,
          teamName: invitation.team?.name ?? "",
          inviterName: invitation.inviter?.name ?? "",
        },
        createdAt: invitation.createdAt.getTime(),
        // Info: (20260825 - Julian) 活算的待辦沒有已讀概念：它在就是還沒處理
        readAt: null,
      }));

      /**
       * Info: (20260828 - Julian) 可以繼續的任務 —— 與邀請同一個活算形狀。
       *
       * `createdAt` 取 `updatedAt`：那是**這一次翻面**的時間，而不是開始匯入的時間。
       * 清單依 `createdAt` 排序，用開始時間的話，一份放了三天才補到點數的匯入
       * 會沉在最底下 —— 而它正是這一刻最需要被看到的那一則。
       */
      todos.push(
        ...resumableJobs.map((job) => {
          /**
           * Info: (20260828 - Julian) 深連結要的 `sessionId` 在這裡切出來
           *（計劃 `resumable_job_resume_landing_and_copy.md` §2.2）。
           *
           * 切在這一層而不是 `notification_message.ts`：那一層是
           *「型別 × payload → 去處」的純函式，不該懂任何一種 `JOB_TYPE`
           * 的資源格式 —— 今天懂了碳盤查的頻道，下一種任務出現時它就要懂第二種。
           *
           * 切不出來時**不放這個鍵**（不是放空字串）：`resolvePathTokens`
           * 的約定是「任一 token 代不出來就整條回 null」，於是那一則渲染成
           * 不可點。未來若有非碳盤查的 `JOB_TYPE`，它會落在這條路上 ——
           * 不可點是誠實的預設，導到一個猜出來的會話不是。
           */
          const channel = parseCarbonChatChannel(job.resourceKey);

          return {
            // Info: (20260828 - Julian) 合成 id，理由同上方邀請那段（不會拿去打 API）
            id: `job:${job.id}`,
            type: NOTIFICATION_TYPE.JOB_RESUMABLE,
            payload: {
              jobId: job.id,
              jobType: job.type,
              resourceKey: job.resourceKey,
              completedSteps: job.completedSteps,
              totalSteps: job.totalSteps,
              ...(channel === null ? {} : { sessionId: channel.sessionId }),
            },
            createdAt: job.updatedAt.getTime(),
            // Info: (20260828 - Julian) 活算的待辦沒有已讀概念：它在就是還沒處理
            readAt: null,
          };
        }),
      );

      todos.push(...storedTodos.map(toItem));
      todos.sort((a, b) => b.createdAt - a.createdAt);

      return {
        todos,
        completed: completedPage.items.map(toItem),
        hasMoreCompleted: completedPage.hasMore,
      };
    },
    { operation: "listNotifications", userId: params.userId },
  );
}

/**
 * Info: (20260826 - Julian) 事件型歷史的分頁查詢（`/user/notifications` 頁面）。
 *
 * 為什麼另開一支而不是給 `listNotifications` 加 `page` 參數：那一支是鈴鐺
 * **每 60 秒**打的端點，而分頁需要一次 `count()`。加參數的話，
 * 不分頁的呼叫端也要付那次查詢，或者這支函式裡出現一個
 * 「有沒有要總數」的旗標 —— 而旗標切換的正是它最貴的那一半。
 *
 * 待辦型不在這裡：它由 `listNotifications` 現算（邀請是活的狀態），
 * 而且天然有限，沒有分頁的必要。頁面上兩區各自向對應的端點要資料。
 */
export async function listNotificationHistory(params: {
  userId: string;
  page: number;
  limit: number;
}): Promise<INotificationHistoryPage> {
  return guarded(
    async () => {
      /**
       * Info: (20260826 - Julian) 上限在 service 再夾一次，不只在端點夾。
       *
       * 端點的 `parsePositiveInt` 已經夾過，但那是**呼叫端**的防線；
       * 下一個呼叫這支函式的人（腳本、另一支端點）不會經過它。
       * 「不要一次撈整張表」是這支函式自己的性質，就該由它自己保證。
       */
      const limit = Math.min(
        Math.max(1, Math.floor(params.limit)),
        NOTIFICATION_PAGE_SIZE_MAX,
      );

      const totalItems = await notificationRepo.countHistory(
        params.userId,
        TODO_NOTIFICATION_TYPES,
      );
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      /**
       * Info: (20260826 - Julian) 超出範圍夾回最後一頁，而不是回一頁空的。
       *
       * `?page=99` 會從兩個地方進來：使用者存的書籤，以及「讀掉幾則之後
       * 總數變少」。兩種情形下回一片空白都像是通知不見了，而正確的答案
       * （最後一頁）就在手上。夾完的值回給呼叫端（`currentPage`），
       * 畫面才不會停在一個它其實沒有顯示的頁碼上。
       */
      const currentPage = Math.min(
        Math.max(1, Math.floor(params.page)),
        totalPages,
      );

      const rows = await notificationRepo.listHistoryPage(
        params.userId,
        TODO_NOTIFICATION_TYPES,
        (currentPage - 1) * limit,
        limit,
      );

      return {
        items: rows.map(toItem),
        totalItems,
        totalPages,
        currentPage,
      };
    },
    { operation: "listNotificationHistory", userId: params.userId },
  );
}

/**
 * Info: (20260825 - Julian) 把**單獨一則**標為已讀（點哪則收哪則）。
 *
 * 已讀從「打開鈴鐺」改成「點擊個別通知」的理由：面板現在會留著已讀的通知
 * 讓人翻歷史，而未讀靠一顆紅點區分。如果打開面板就全部變已讀，
 * 那顆紅點在使用者能看清楚之前就全滅了 —— 它會是一個永遠不出現的提示。
 *
 * `TODO_NOTIFICATION_TYPES` 一樣排除。這裡的排除比「全部已讀」那條路徑
 * 更重要：那一支的輸入只有 userId，而這一支的輸入是**前端傳來的 id** ——
 * 沒有這道條件，任何人只要湊出一個 id 就能把自己的錢包升級待辦收掉，
 * 而那則待辦補不回來（D1）。
 *
 * @returns 有沒有真的標記到（false = 不存在／不是你的／已讀過／是待辦型）
 */
export async function markNotificationRead(params: {
  userId: string;
  notificationId: string;
  nowMs: number;
}): Promise<boolean> {
  return guarded(
    async () => {
      const count = await notificationRepo.markReadById(
        params.userId,
        params.notificationId,
        TODO_NOTIFICATION_TYPES,
        params.nowMs,
      );
      return count > 0;
    },
    { operation: "markNotificationRead", userId: params.userId },
  );
}

/**
 * Info: (20260825 - Julian) 錢包升級待辦的關閉路徑（計畫書 D1）。
 *
 * 由 `scripts/request_wallet_upgrades.ts` 在探針轉 true 時呼叫 ——
 * 也就是「這個人的錢包真的升級好了」的那一刻。這是待辦型與事件型
 * 最大的差別：事件型讀過即已讀，待辦型要等事情做完。
 *
 * 回傳收掉的筆數，讓腳本能把「本來就沒有」與「收掉了一則」分開回報。
 */
export async function dismissWalletUpgrade(params: {
  userId: string;
  nowMs: number;
}): Promise<number> {
  return guardedThrowing(
    () =>
      notificationRepo.markReadByType(
        params.userId,
        NOTIFICATION_TYPE.WALLET_UPGRADE,
        params.nowMs,
      ),
    { operation: "dismissWalletUpgrade", userId: params.userId },
  );
}

/**
 * Info: (20260821 - Luphia) 分析／憑證掃描完成時發通知（recorder 呼叫）。
 *
 * **永不拋錯**：發通知是分析入庫的附帶動作，通知失敗不能讓結果寫入跟著回滾
 * ——使用者寧可少一則通知，也不要一份消失的報告。冪等由 dedupeKey 保證
 * （recorder 重試同一個 taskId 不會發第二則）。
 */
export async function notifyAnalysisCompleted(params: {
  userId: string;
  analysisId: string;
  analysisType: string;
  /**
   * Info: (20260827 - Julian) 帳本 id，`:accountBookId` 的來源（D43 第二步）。
   *
   * 可選：只有憑證分析與日記帳修正的去處需要它，其餘類別的路徑沒有 token。
   * 缺了它 `notificationHrefOf` 會讓整條路徑退化為 `null`（不可點），
   * 而不是組出 `/user/account_book/undefined/journal` —— 那是 D43 要修掉的
   * 症狀本身，修法不該再製造一次。
   */
  accountBookId?: string;
}): Promise<void> {
  try {
    await notificationRepo.createIfAbsent({
      userId: params.userId,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: {
        analysisId: params.analysisId,
        analysisType: params.analysisType,
        /**
         * Info: (20260827 - Julian) 沒有值時**不寫這個鍵**，不要寫 null。
         *
         * `resolvePathTokens` 判斷的是「型別是不是非空字串」，null 與缺鍵
         * 對它一樣；但 payload 是永久保存的資料，一個恆為 null 的欄位
         * 會讓之後查資料的人以為「這筆分析沒有帳本」，而事實是
         * 「發通知的當下取不到」。與 `analysisType` 同一種寫法。
         */
        ...(params.accountBookId
          ? { accountBookId: params.accountBookId }
          : {}),
      } as Prisma.InputJsonObject,
      dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.ANALYSIS_COMPLETED}${params.analysisId}`,
    });
  } catch (error) {
    logger.warn("analysis-completed notification failed (non-fatal)", {
      analysisId: params.analysisId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Info: (20260825 - Julian) 這批使用者裡，誰還掛著未讀的錢包升級待辦。
 *
 * 只給**預演**用：`request_wallet_upgrades.ts` 不帶 `--commit` 時要能回報
 * 「有幾則待辦會被收掉」。沒有這一支的話，預演只講得出「會發幾則」，
 * 講不出「會收幾則」—— 而這支腳本重跑時同時做這兩件事，
 * 預演少講一半等於它只驗了一半。
 */
export async function listUsersWithPendingWalletUpgrade(params: {
  userIds: readonly string[];
}): Promise<Set<string>> {
  return guardedThrowing(
    () =>
      notificationRepo.listUserIdsWithUnread(
        NOTIFICATION_TYPE.WALLET_UPGRADE,
        params.userIds,
      ),
    {
      operation: "listUsersWithPendingWalletUpgrade",
      userCount: params.userIds.length,
    },
  );
}

/**
 * Info: (20260825 - Julian) 分析**失敗**時發通知（recorder 呼叫，計畫書 D16）。
 *
 * 與 `notifyAnalysisCompleted` 同樣永不拋錯：失敗處理路徑上再拋一個錯，
 * 只會把一個已經很難查的情境變得更難查。
 *
 * 冪等鍵用 **orderId**：失敗的路徑上 `analysis` 可能根本不存在
 * （結果解析不出來、payload 缺漏），而 order 一定在。
 * 一張訂單失敗一次、發一則 —— 而 recorder 每次重掃已失敗的訂單時
 * 撞唯一鍵回 null，不會重發。
 *
 * **重試中不發**：`failed_*.md` 的第 1、2 次是系統內部重試，
 * 使用者收到只會是雜訊。只有 `Order.status` 真的被寫成 `FAILED`
 * 的那一刻才發（見 recorder 的 `becameFailed`）。
 */
export async function notifyAnalysisFailed(params: {
  userId: string;
  orderId: string;
  /**
   * Info: (20260825 - Julian) 報告類別，用來組出「『交易市場趨勢』分析失敗了」。
   *
   * 可選，因為失敗路徑上 `analysis` 未必存在（結果解析不出來時只有 order）。
   * 沒有它就退回不帶標題的那句話 —— 少一個詞比顯示 `undefined` 好。
   */
  analysisType?: string;
  // Info: (20260827 - Julian) 同上（D43 第二步）；失敗路徑從 `order.data` 取得
  accountBookId?: string;
}): Promise<void> {
  try {
    await notificationRepo.createIfAbsent({
      userId: params.userId,
      type: NOTIFICATION_TYPE.ANALYSIS_FAILED,
      payload: {
        orderId: params.orderId,
        ...(params.analysisType ? { analysisType: params.analysisType } : {}),
        ...(params.accountBookId
          ? { accountBookId: params.accountBookId }
          : {}),
      } as Prisma.InputJsonObject,
      dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.ANALYSIS_FAILED}${params.orderId}`,
    });
  } catch (error) {
    logger.warn("analysis-failed notification failed (non-fatal)", {
      orderId: params.orderId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Info: (20260821 - Luphia) 系統要求升級錢包（ADR 021 rollout 第 5 步的入口）。
 * 由 `scripts/request_wallet_upgrades.ts` 逐使用者發出；一人一則（dedupeKey）。
 *
 * Info: (20260825 - Julian) **這支會拋錯，與 `notifyAnalysisCompleted` 不同。**
 *
 * 兩者的呼叫端不一樣：那支掛在分析入庫的路徑上，失敗吞掉是因為
 * 「少一則通知」遠好過「一份消失的報告」；這支的呼叫端是一支批次腳本，
 * 而腳本需要知道哪些人沒發成功才能重跑。吞掉會讓失敗變成一個
 * 沒有人看得到的數字。
 *
 * 呼叫端的義務：**逐人 try/catch，並在最後回報失敗清單**。
 * 一路往上丟到 `main().catch` 的話，第 500 位使用者的連線中斷會讓
 * 剩下的一則都沒發，而腳本沒有續跑點也沒有進度檔。
 */
export async function notifyWalletUpgradeRequested(params: {
  userId: string;
}): Promise<boolean> {
  /**
   * Info: (20260827 - Julian) 補上 `guardedThrowing`（review）。
   *
   * 這是本檔第三支由腳本呼叫、且**刻意保留可拋性**的函式，而先前只有它沒包。
   * 於是 Prisma 的原始錯誤訊息（連線字串、表結構）會被批次腳本原文印進 stderr
   * —— 而 `guardedThrowing` 的檔頭寫的正是「這層包裝就是為了防這件事」。
   *
   * 包了之後拋出的是 `NotificationOperationError`，原因留在 `cause`：
   * 腳本的逐人 try/catch 與非 0 exit code 都還在，只是不再洩漏內部細節。
   */
  const created = await guardedThrowing(
    () =>
      notificationRepo.createIfAbsent({
        userId: params.userId,
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        payload: {} as Prisma.InputJsonObject,
        dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.WALLET_UPGRADE}${params.userId}`,
      }),
    { operation: "notifyWalletUpgradeRequested", userId: params.userId },
  );
  return created !== null;
}
