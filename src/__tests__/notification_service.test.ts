import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  dismissWalletUpgrade,
  getNotificationSummary,
  listNotifications,
  markNotificationsRead,
  notifyAnalysisCompleted,
  notifyWalletUpgradeRequested,
} from "@/services/notification.service";
import { notificationRepo } from "@/repositories/notification.repo";
import { teamRepo } from "@/repositories/team.repo";
import {
  NOTIFICATION_LIST_LIMIT,
  NOTIFICATION_TYPE,
} from "@/constants/notification";

/**
 * Info: (20260821 - Luphia) 小鈴鐺 service（ADR 021 補充）。
 *
 * 重點釘三件事：
 *
 * 1. 摘要的兩個數字**來源不同**（邀請活算 + DB 分組計數），且過期邀請要濾掉
 * 2. 計數用 groupBy 而不是截斷在 20 則的清單——否則「37 個完成通知」會顯示成 20
 * 3. 完成通知的發送**永不拋錯**且冪等（發通知不能讓分析結果的寫入跟著回滾）
 *
 * Info: (20260825 - Julian) repo 的替身改成**有狀態的假實作**（檢查清單 §一.8）。
 *
 * 原本的替身是四支固定回傳的 `jest.fn`，於是三件事在測試裡是死的：
 *
 * - `createIfAbsent` 永遠回 `{id:"n-1"}`，從不回 `null` —— 於是
 *   「worker 重試不會發第二則」那條測試的名字，一個字都沒有被證明。
 *   把 `dedupeKey: params.dedupeKey ?? null` 改成 `dedupeKey: null`
 *   （去重完全失效）測試照樣綠。
 * - `listUnread` 不理會 `limit` —— 正確與錯誤的截斷寫法結果一模一樣。
 * - `markAllRead` 不會讓後續查詢少掉那些列 —— 於是「打開鈴鐺會不會把
 *   待辦一起收掉」這個 D1 的核心行為根本無從觀測。
 *
 * 判準（§一.8）：把替身換成真的實作，結論應該一樣。不一樣就代表
 * 替身在替程式回答問題。
 *
 * ⚠️ 這個假實作仍**不是**真的 Prisma：`type.in` / `notIn` / `take` 的語意是
 * 我在這裡重寫的。`NotificationRepository` 本身還缺一支對真資料庫的 e2e
 * （§一.2：決定 mock 掉某支協作者，就要另有一支測試直接測它）。
 */

interface IRow {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  dedupeKey: string | null;
  readAt: Date | null;
  createdAt: Date;
}

jest.mock("@/repositories/notification.repo", () => {
  const rows: IRow[] = [];
  let sequence = 0;

  const unread = (userId: string) =>
    rows
      .filter((row) => row.userId === userId && row.readAt === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    notificationRepo: {
      // Info: (20260825 - Julian) 測試專用：清空與植入
      __reset: () => {
        rows.length = 0;
        sequence = 0;
      },
      __seed: (seeded: IRow[]) => {
        rows.push(...seeded);
      },
      __rows: () => rows,

      // Info: (20260825 - Julian) 真的 enforce dedupeKey 唯一（撞鍵回 null）
      createIfAbsent: jest.fn(
        async (params: {
          userId: string;
          type: string;
          payload: Record<string, unknown>;
          dedupeKey?: string;
        }) => {
          const key = params.dedupeKey ?? null;
          if (key !== null && rows.some((row) => row.dedupeKey === key)) {
            return null;
          }
          sequence += 1;
          const row: IRow = {
            id: `n-${sequence}`,
            userId: params.userId,
            type: params.type,
            payload: params.payload,
            dedupeKey: key,
            readAt: null,
            createdAt: new Date(1_760_000_000_000 + sequence),
          };
          rows.push(row);
          return row;
        },
      ),

      // Info: (20260825 - Julian) 真的吃 types 與 limit
      listUnreadByTypes: jest.fn(
        async (userId: string, types: readonly string[], limit: number) =>
          types.length === 0
            ? []
            : unread(userId)
                .filter((row) => types.includes(row.type))
                .slice(0, limit),
      ),

      // Info: (20260825 - Julian) 真的排除型別、真的截斷、真的算 hasMore
      listUnreadExcludingTypes: jest.fn(
        async (
          userId: string,
          excludeTypes: readonly string[],
          limit: number,
        ) => {
          const matched = unread(userId).filter(
            (row) => !excludeTypes.includes(row.type),
          );
          return {
            items: matched.slice(0, limit),
            hasMore: matched.length > limit,
          };
        },
      ),

      // Info: (20260825 - Julian) 從同一份資料算，不是另一個固定值
      countUnreadByType: jest.fn(async (userId: string) => {
        const counts = new Map<string, number>();
        unread(userId).forEach((row) => {
          counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
        });
        return counts;
      }),

      // Info: (20260825 - Julian) 真的把 readAt 寫進去，後續查詢會少掉那些列
      markReadExcludingTypes: jest.fn(
        async (
          userId: string,
          excludeTypes: readonly string[],
          nowMs: number,
        ) => {
          const targets = unread(userId).filter(
            (row) => !excludeTypes.includes(row.type),
          );
          targets.forEach((row) => {
            row.readAt = new Date(nowMs);
          });
          return targets.length;
        },
      ),

      markReadByType: jest.fn(
        async (userId: string, type: string, nowMs: number) => {
          const targets = unread(userId).filter((row) => row.type === type);
          targets.forEach((row) => {
            row.readAt = new Date(nowMs);
          });
          return targets.length;
        },
      ),
    },
  };
});

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getPendingInvitationsByAddress: jest.fn(async () => []) },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const fakeRepo = notificationRepo as unknown as {
  __reset: () => void;
  __seed: (rows: IRow[]) => void;
  __rows: () => IRow[];
};

const NOW_MS = 1_760_000_000_000;
const USER = "user-1";
const ADDRESS = "0xabc";

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    teamId: "team-1",
    expiresAt: null,
    createdAt: new Date(NOW_MS - 1000),
    team: { name: "T" },
    inviter: { name: "Amy" },
    ...overrides,
  };
}

function row(overrides: Partial<IRow> = {}): IRow {
  return {
    id: "seed",
    userId: USER,
    type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
    payload: {},
    dedupeKey: null,
    readAt: null,
    createdAt: new Date(NOW_MS - 100),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  fakeRepo.__reset();
  asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([]);
});

describe("摘要", () => {
  it("待辦 = 活算的邀請 + DB 的待辦型；完成 = 其餘未讀", async () => {
    asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([
      invitation(),
      invitation({ id: "inv-2" }),
    ]);
    fakeRepo.__seed([
      row({ id: "w", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
      ...Array.from({ length: 37 }, (unused, index) =>
        row({ id: `d-${index}` }),
      ),
    ]);

    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(summary).toEqual({ todoCount: 3, completedCount: 37 });
  });

  /**
   * Info: (20260825 - Julian) 兩支查詢各自拿到**自己那個維度**的值。
   *
   * 替身不看參數的話，把 `countUnreadByType(params.userId)` 寫成
   * `countUnreadByType(params.address)`（跨租戶取錯計數）不會讓任何測試變紅。
   */
  it("計數以 userId 查、邀請以 address 查", async () => {
    await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(asMock(notificationRepo.countUnreadByType)).toHaveBeenCalledWith(
      USER,
    );
    expect(
      asMock(teamRepo.getPendingInvitationsByAddress),
    ).toHaveBeenCalledWith(ADDRESS);
  });

  /**
   * Info: (20260821 - Luphia) 過期的邀請點進去也接受不了，掛在鈴鐺上只會製造
   * 一個按了沒反應的待辦。
   */
  it("過期的邀請不算待辦", async () => {
    asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([
      invitation({ expiresAt: new Date(NOW_MS - 1) }),
      invitation({ id: "inv-2", expiresAt: new Date(NOW_MS + 1000) }),
    ]);

    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(summary.todoCount).toBe(1);
  });

  /**
   * Info: (20260825 - Julian) 空位址不得退化成「列出全站邀請」（計畫書 D5）。
   *
   * 斷言成對：回 0 **且**根本沒有去查邀請表。只驗前者的話，
   * 「查了全站、剛好那個測試環境沒有資料」也會通過。
   */
  it("空位址回空待辦，且不查邀請表", async () => {
    const summary = await getNotificationSummary({
      userId: USER,
      address: "",
      nowMs: NOW_MS,
    });

    expect(summary.todoCount).toBe(0);
    expect(
      asMock(teamRepo.getPendingInvitationsByAddress),
    ).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260825 - Julian) 0/0 是塌陷值（檢查清單 §一.9）：
   * 「真的都讀完了」「查詢條件寫錯撈不到」「service 直接 return 0」
   * 三種相反狀態都是這個答案。所以同時驗**兩支查詢真的被呼叫過** ——
   * 那是能區分「真的空」與「根本沒查」的觀測量。
   */
  it("什麼都沒有時兩個數字都是 0（且真的查過）", async () => {
    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(summary).toEqual({ todoCount: 0, completedCount: 0 });
    expect(asMock(notificationRepo.countUnreadByType)).toHaveBeenCalledTimes(1);
    expect(
      asMock(teamRepo.getPendingInvitationsByAddress),
    ).toHaveBeenCalledTimes(1);
  });
});

describe("清單", () => {
  it("邀請進待辦節、完成通知進完成節，錢包升級歸待辦", async () => {
    asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([
      invitation(),
    ]);
    fakeRepo.__seed([
      row({
        id: "n-wallet",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        createdAt: new Date(NOW_MS - 500),
      }),
      row({
        id: "n-done",
        payload: { analysisId: "a-1" },
        createdAt: new Date(NOW_MS - 200),
      }),
    ]);

    const list = await listNotifications({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    // Info: (20260821 - Luphia) 待辦節新到舊排序：錢包升級（NOW-500）比邀請（NOW-1000）新
    expect(list.todos.map((item) => item.type)).toEqual([
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      NOTIFICATION_TYPE.TEAM_INVITATION,
    ]);
    expect(list.completed.map((item) => item.id)).toEqual(["n-done"]);
    // Info: (20260821 - Luphia) derived 待辦以來源 id 合成識別（React key 用）
    expect(list.todos[1].id).toBe("invitation:inv-1");
    expect(list.todos[1].payload.teamName).toBe("T");
    expect(list.hasMoreCompleted).toBe(false);
  });

  /**
   * Info: (20260825 - Julian) 徽章與清單不得分岔（計畫書 D4）。
   *
   * 一則舊的待辦 + 25 則新的完成通知。用一支不帶型別條件的查詢加 `take: 20`
   * 的話，最新 20 則全是完成通知，待辦被擠掉 —— 而摘要的 groupBy 沒有截斷、
   * 照樣算它。畫面會說「1 則待辦事項」而待辦區整個不存在。
   */
  it("未讀超過上限時，待辦仍在清單裡，且與摘要一致", async () => {
    fakeRepo.__seed([
      row({
        id: "old-wallet",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        createdAt: new Date(NOW_MS - 3 * 86_400_000),
      }),
      ...Array.from({ length: 25 }, (unused, index) =>
        row({ id: `d-${index}`, createdAt: new Date(NOW_MS - index) }),
      ),
    ]);

    const [summary, list] = await Promise.all([
      getNotificationSummary({ userId: USER, address: ADDRESS, nowMs: NOW_MS }),
      listNotifications({ userId: USER, address: ADDRESS, nowMs: NOW_MS }),
    ]);

    expect(summary).toEqual({ todoCount: 1, completedCount: 25 });
    expect(list.todos.map((item) => item.id)).toEqual(["old-wallet"]);
    expect(list.completed).toHaveLength(NOTIFICATION_LIST_LIMIT);
    // Info: (20260825 - Julian) 截斷了就要說出來，不能讓畫面把 20 讀成全部
    expect(list.hasMoreCompleted).toBe(true);
  });
});

describe("標記已讀", () => {
  /**
   * Info: (20260825 - Julian) D1：打開鈴鐺不得收掉待辦型。
   *
   * 斷言成對：完成通知真的被收掉（證明有做事）**且**待辦還在
   * （證明沒做過頭）。只驗後者的話，「一律不標記」也會通過。
   */
  it("只標記事件型，待辦型不受影響", async () => {
    fakeRepo.__seed([
      row({ id: "w", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
      row({ id: "d1" }),
      row({ id: "d2" }),
    ]);

    const marked = await markNotificationsRead({ userId: USER, nowMs: NOW_MS });

    expect(marked).toBe(2);
    const after = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    expect(after).toEqual({ todoCount: 1, completedCount: 0 });
  });

  /**
   * Info: (20260825 - Julian) 待辦型的關閉路徑：事情做完了才收。
   * 由 `request_wallet_upgrades.ts` 在探針轉 true 時呼叫。
   */
  it("dismissWalletUpgrade 收掉錢包升級待辦", async () => {
    fakeRepo.__seed([
      row({ id: "w", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
      row({ id: "d1" }),
    ]);

    const dismissed = await dismissWalletUpgrade({
      userId: USER,
      nowMs: NOW_MS,
    });

    expect(dismissed).toBe(1);
    const after = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    expect(after).toEqual({ todoCount: 0, completedCount: 1 });
  });

  // Info: (20260825 - Julian) 沒有未讀時回 0，而不是假裝收掉了一則
  it("沒有待辦時 dismissWalletUpgrade 回 0", async () => {
    expect(await dismissWalletUpgrade({ userId: USER, nowMs: NOW_MS })).toBe(0);
  });
});

describe("完成通知的發送", () => {
  it("以 analysisId 為 dedupe key（worker 重試不會發第二則）", async () => {
    await notifyAnalysisCompleted({
      userId: USER,
      analysisId: "a-9",
      analysisType: "CERTIFICATE_ANALYSIS",
    });

    expect(asMock(notificationRepo.createIfAbsent)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
        dedupeKey: "analysis-completed:a-9",
      }),
    );
  });

  /**
   * Info: (20260825 - Julian) 冪等要用**行為**證明，不是用參數字串證明。
   *
   * 上一條只斷言「傳了那個字串」。呼叫兩次、數列數，才會在
   * `dedupeKey: params.dedupeKey ?? null` 被改成 `dedupeKey: null`
   * （去重完全失效）時變紅 —— 而那正是 recorder 三輪重試變成
   * 三則「您的報告已完成」的成因。
   */
  it("同一個 analysisId 呼叫兩次只留下一列", async () => {
    await notifyAnalysisCompleted({
      userId: USER,
      analysisId: "a-9",
      analysisType: "CERTIFICATE_ANALYSIS",
    });
    await notifyAnalysisCompleted({
      userId: USER,
      analysisId: "a-9",
      analysisType: "CERTIFICATE_ANALYSIS",
    });

    expect(fakeRepo.__rows()).toHaveLength(1);
  });

  /**
   * Info: (20260821 - Luphia) 永不拋錯：發通知是分析入庫的附帶動作，
   * 通知失敗不能讓已寫入的結果跟著回滾。
   */
  it("repo 失敗時不拋錯", async () => {
    asMock(notificationRepo.createIfAbsent).mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(
      notifyAnalysisCompleted({
        userId: USER,
        analysisId: "a-9",
        analysisType: "CERTIFICATE_ANALYSIS",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("錢包升級待辦的發送", () => {
  it("一人一則：第二次回 false", async () => {
    expect(await notifyWalletUpgradeRequested({ userId: USER })).toBe(true);
    expect(await notifyWalletUpgradeRequested({ userId: USER })).toBe(false);
    expect(fakeRepo.__rows()).toHaveLength(1);
  });

  /**
   * Info: (20260825 - Julian) 這支**會拋**，與 `notifyAnalysisCompleted` 相反。
   *
   * 呼叫端是批次腳本，需要知道哪些人沒發成功才能重跑；吞掉會讓失敗
   * 變成一個沒有人看得到的數字。這條測試把那個契約釘住 ——
   * 有人「順手」補上 try/catch 讓兩支一致時，它會紅。
   */
  it("repo 失敗時往上拋（腳本要能逐人接住）", async () => {
    asMock(notificationRepo.createIfAbsent).mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(
      notifyWalletUpgradeRequested({ userId: USER }),
    ).rejects.toThrow("db down");
  });
});
