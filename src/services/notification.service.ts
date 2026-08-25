import { Prisma } from "@/generated";
import {
  NOTIFICATION_DEDUPE_PREFIX,
  NOTIFICATION_LIST_LIMIT,
  NOTIFICATION_TODO_LIST_LIMIT,
  NOTIFICATION_TYPE,
  TODO_NOTIFICATION_TYPES,
} from "@/constants/notification";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { notificationRepo } from "@/repositories/notification.repo";
import { teamRepo } from "@/repositories/team.repo";

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
}

/**
 * Info: (20260821 - Luphia) 未過期的待接受邀請（derived 待辦）。
 *
 * 過期的要濾掉：`getPendingInvitationsByAddress` 只看 status，而 email 邀請
 * 有 `expiresAt`——過期的邀請點進去也接受不了，掛在鈴鐺上只會製造一個
 * 按了沒反應的待辦。
 */
async function listPendingInvitations(address: string, nowMs: number) {
  /**
   * Info: (20260825 - Julian) 空位址一律回空集合，不進 Prisma。
   *
   * `where: { inviteeAddress: undefined }` 在 Prisma 是**沒有這個條件**，
   * 於是查詢退化成「列出全站待接受邀請」，而 payload 會吐出別人團隊的
   * teamId / teamName / inviterName。這是跨租戶外洩的標準形狀
   * （檢查清單 §三.1）。
   *
   * 今天的 `getIdentityFromDeWT` 兩條路徑都保證 address 有值
   * （線上模式回 DB 的 User，離線模式 `if (!payload.sub || !payload.address) return null`），
   * 所以這一行現在攔不到任何東西 —— 它防的是**那個保證哪天不成立**，
   * 而失效時的症狀是靜默外洩，不是報錯。
   */
  if (!address) return [];
  const invitations = await teamRepo.getPendingInvitationsByAddress(address);
  return invitations.filter(
    (invitation) =>
      !invitation.expiresAt || invitation.expiresAt.getTime() > nowMs,
  );
}

// Info: (20260821 - Luphia) 摘要（登入氣泡與輪詢都打這一支：兩個數字，愈便宜愈好）
export async function getNotificationSummary(params: {
  userId: string;
  address: string;
  nowMs: number;
}): Promise<INotificationSummary> {
  return guarded(
    async () => {
      const [invitations, unread] = await Promise.all([
        listPendingInvitations(params.address, params.nowMs),
        notificationRepo.summarizeUnread(params.userId),
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
      return {
        todoCount: invitations.length + storedTodos,
        completedCount: completed,
        /**
         * Info: (20260825 - Julian) 只看**入庫**的通知，不含活算的邀請。
         *
         * 邀請沒有通知列，取不到 createdAt。少了它會不會漏響？不會 ——
         * 新邀請一定讓 `todoCount` 上升，而識別值是這三個值一起組出來的
         * （見 `arrivalKeyOf`），任何一個變了 key 就變了。
         */
        latestUnreadAt: unread.latestCreatedAt
          ? unread.latestCreatedAt.getTime()
          : null,
      };
    },
    { operation: "getNotificationSummary", userId: params.userId },
  );
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
      const [invitations, storedTodos, completedPage] = await Promise.all([
        listPendingInvitations(params.address, params.nowMs),
        notificationRepo.listUnreadByTypes(
          params.userId,
          TODO_NOTIFICATION_TYPES,
          NOTIFICATION_TODO_LIST_LIMIT,
        ),
        notificationRepo.listUnreadExcludingTypes(
          params.userId,
          TODO_NOTIFICATION_TYPES,
          NOTIFICATION_LIST_LIMIT,
        ),
      ]);

      const todos: INotificationItem[] = invitations.map((invitation) => ({
        /**
         * Info: (20260821 - Luphia) derived 待辦以來源 id 合成識別：
         * 前端只拿它當 React key 與去重依據，不會拿去打任何 API。
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
      }));

      const toItem = (notification: {
        id: string;
        type: string;
        payload: unknown;
        createdAt: Date;
      }): INotificationItem => ({
        id: notification.id,
        type: notification.type,
        payload: (notification.payload ?? {}) as Record<string, unknown>,
        createdAt: notification.createdAt.getTime(),
      });

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
 * Info: (20260821 - Luphia) 打開鈴鐺＝看過了：事件型全部標已讀。
 * derived 待辦不受影響（它的消失只由來源狀態決定）。
 *
 * Info: (20260825 - Julian) **入庫的待辦型也不受影響**（計畫書 D1）。
 *
 * 原本 `markAllRead` 不分型別，於是點一下鈴鐺就會把「系統要求升級錢包」
 * 標成已讀 —— 連展開都不必。而它補不回來：`dedupeKey` 是永久唯一鍵，
 * 重跑腳本會撞 P2002 並被回報成「先前已發過」，
 * ADR 021 rollout 第 5 步從此對那個人失效。
 *
 * 待辦型的關閉走 `dismissWalletUpgrade`：由「事情真的做完了」驅動，
 * 不由「使用者看過了」驅動。
 */
export async function markNotificationsRead(params: {
  userId: string;
  nowMs: number;
}): Promise<number> {
  return guarded(
    () =>
      notificationRepo.markReadExcludingTypes(
        params.userId,
        TODO_NOTIFICATION_TYPES,
        params.nowMs,
      ),
    { operation: "markNotificationsRead", userId: params.userId },
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
  return notificationRepo.markReadByType(
    params.userId,
    NOTIFICATION_TYPE.WALLET_UPGRADE,
    params.nowMs,
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
}): Promise<void> {
  try {
    await notificationRepo.createIfAbsent({
      userId: params.userId,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: {
        analysisId: params.analysisId,
        analysisType: params.analysisType,
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
  return notificationRepo.listUserIdsWithUnread(
    NOTIFICATION_TYPE.WALLET_UPGRADE,
    params.userIds,
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
}): Promise<void> {
  try {
    await notificationRepo.createIfAbsent({
      userId: params.userId,
      type: NOTIFICATION_TYPE.ANALYSIS_FAILED,
      payload: { orderId: params.orderId } as Prisma.InputJsonObject,
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
  const created = await notificationRepo.createIfAbsent({
    userId: params.userId,
    type: NOTIFICATION_TYPE.WALLET_UPGRADE,
    payload: {} as Prisma.InputJsonObject,
    dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.WALLET_UPGRADE}${params.userId}`,
  });
  return created !== null;
}
