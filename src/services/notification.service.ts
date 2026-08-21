import { Prisma } from "@/generated";
import {
  NOTIFICATION_DEDUPE_PREFIX,
  NOTIFICATION_LIST_LIMIT,
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

async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(API_ERRORS.IS_UNKNOWN);
  }
}

export interface INotificationSummary {
  todoCount: number;
  completedCount: number;
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
}

/**
 * Info: (20260821 - Luphia) 未過期的待接受邀請（derived 待辦）。
 *
 * 過期的要濾掉：`getPendingInvitationsByAddress` 只看 status，而 email 邀請
 * 有 `expiresAt`——過期的邀請點進去也接受不了，掛在鈴鐺上只會製造一個
 * 按了沒反應的待辦。
 */
async function listPendingInvitations(address: string, nowMs: number) {
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
  return guarded(async () => {
    const [invitations, unreadByType] = await Promise.all([
      listPendingInvitations(params.address, params.nowMs),
      notificationRepo.countUnreadByType(params.userId),
    ]);
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
    };
  });
}

// Info: (20260821 - Luphia) 鈴鐺展開的清單：待辦與完成分節
export async function listNotifications(params: {
  userId: string;
  address: string;
  nowMs: number;
}): Promise<INotificationList> {
  return guarded(async () => {
    const [invitations, stored] = await Promise.all([
      listPendingInvitations(params.address, params.nowMs),
      notificationRepo.listUnread(params.userId, NOTIFICATION_LIST_LIMIT),
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

    const completed: INotificationItem[] = [];
    for (const notification of stored) {
      const item: INotificationItem = {
        id: notification.id,
        type: notification.type,
        payload: (notification.payload ?? {}) as Record<string, unknown>,
        createdAt: notification.createdAt.getTime(),
      };
      if (
        (TODO_NOTIFICATION_TYPES as readonly string[]).includes(
          notification.type,
        )
      ) {
        todos.push(item);
      } else {
        completed.push(item);
      }
    }

    todos.sort((a, b) => b.createdAt - a.createdAt);
    return { todos, completed };
  });
}

/**
 * Info: (20260821 - Luphia) 打開鈴鐺＝看過了：事件型全部標已讀。
 * derived 待辦不受影響（它的消失只由來源狀態決定）。
 */
export async function markNotificationsRead(params: {
  userId: string;
  nowMs: number;
}): Promise<number> {
  return guarded(() =>
    notificationRepo.markAllRead(params.userId, params.nowMs),
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
 * Info: (20260821 - Luphia) 系統要求升級錢包（ADR 021 rollout 第 5 步的入口）。
 * 由 `scripts/request_wallet_upgrades.ts` 逐使用者發出；一人一則（dedupeKey）。
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
