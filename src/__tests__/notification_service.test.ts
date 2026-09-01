import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  dismissWalletUpgrade,
  NotificationOperationError,
  getNotificationSummary,
  listUsersWithPendingWalletUpgrade,
  listNotificationHistory,
  listNotifications,
  markNotificationRead,
  notifyAnalysisCompleted,
  notifyAnalysisFailed,
  notifyWalletUpgradeRequested,
} from "@/services/notification.service";
import { notificationRepo } from "@/repositories/notification.repo";
import { listPendingInvitationsForUser } from "@/services/team_invitation.service";
import { arrivalKeyOf, ChimeGate } from "@/lib/notification_sound";
import {
  NOTIFICATION_DEDUPE_PREFIX,
  NOTIFICATION_HISTORY_LIMIT,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PAGE_SIZE_MAX,
  NOTIFICATION_TODO_LIST_LIMIT,
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

      /**
       * Info: (20260825 - Julian) 事件型歷史：與上面那支的差別**只有**不濾 readAt。
       *
       * 替身也照這個差別寫，而不是回一份固定清單 —— 否則「service 拿錯支查詢」
       * （拿只回未讀的那支去組歷史）在測試裡看不出來。
       */
      listRecentExcludingTypes: jest.fn(
        async (
          userId: string,
          excludeTypes: readonly string[],
          limit: number,
        ) => {
          const matched = rows
            .filter(
              (row) =>
                row.userId === userId && !excludeTypes.includes(row.type),
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return {
            items: matched.slice(0, limit),
            hasMore: matched.length > limit,
          };
        },
      ),

      /**
       * Info: (20260826 - Julian) 分頁歷史：`skip` / `take` 真的套用。
       *
       * 排序條件與 `listRecentExcludingTypes` 相同（含已讀），因為真的那支
       * 也是同一組 —— 替身在這裡走樣的話，「頁面看得到已讀、鈴鐺看不到」
       * 這種分岔會被替身掩蓋掉。
       */
      listHistoryPage: jest.fn(
        async (
          userId: string,
          excludeTypes: readonly string[],
          skip: number,
          take: number,
        ) =>
          rows
            .filter(
              (row) =>
                row.userId === userId && !excludeTypes.includes(row.type),
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(skip, skip + take),
      ),

      /**
       * Info: (20260826 - Julian) 總數從**同一份 rows、同一組條件**算。
       *
       * 寫死一個數字的話，「count 與 list 的 where 分岔」正好是這個替身
       * 該幫忙抓、卻反而會掩蓋的那一種錯 —— 而它的症狀是頁碼指向一頁空清單。
       */
      countHistory: jest.fn(
        async (userId: string, excludeTypes: readonly string[]) =>
          rows.filter(
            (row) => row.userId === userId && !excludeTypes.includes(row.type),
          ).length,
      ),

      // Info: (20260825 - Julian) 四個條件全都真的套用（少一個就是一種真實的失效）
      markReadById: jest.fn(
        async (
          userId: string,
          notificationId: string,
          excludeTypes: readonly string[],
          nowMs: number,
        ) => {
          const target = rows.find(
            (row) =>
              row.id === notificationId &&
              row.userId === userId &&
              row.readAt === null &&
              !excludeTypes.includes(row.type),
          );
          if (!target) return 0;
          target.readAt = new Date(nowMs);
          return 1;
        },
      ),

      // Info: (20260825 - Julian) 從同一份資料算，不是另一個固定值
      summarizeUnread: jest.fn(async (userId: string) => {
        const counts = new Map<string, number>();
        let latestCreatedAt: Date | null = null;
        unread(userId).forEach((row) => {
          counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
          /**
           * Info: (20260825 - Julian) 最新時間也從同一份 rows 算出來。
           * 寫死成一個固定值的話，「摘要回的是別人的最新時間」這種錯
           * 不會讓任何測試變紅 —— 而那正是提示音去重要靠的值（D17）。
           */
          if (latestCreatedAt === null || row.createdAt > latestCreatedAt) {
            latestCreatedAt = row.createdAt;
          }
        });
        return { counts, latestCreatedAt };
      }),

      // Info: (20260825 - Julian) 真的依 type 與 userIds 過濾，且回「有未讀的人」不是「未讀的列」
      listUserIdsWithUnread: jest.fn(
        async (type: string, userIds: readonly string[]) =>
          new Set(
            rows
              .filter(
                (row) =>
                  row.readAt === null &&
                  row.type === type &&
                  userIds.includes(row.userId),
              )
              .map((row) => row.userId),
          ),
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

/**
 * Info: (20260825 - Julian) 邀請的查詢已收進 `team_invitation.service`（兩個消費者共用），
 * 所以這裡換成 mock 那一支。「哪些邀請算數」（已驗證信箱、未過期、空位址早退）
 * 由它自己的測試守，這一檔只驗**通知服務怎麼把它的結果組進待辦節**。
 */
jest.mock("@/services/team_invitation.service", () => ({
  listPendingInvitationsForUser: jest.fn(async () => []),
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
  asMock(listPendingInvitationsForUser).mockResolvedValue([]);
});

describe("摘要", () => {
  it("待辦 = 活算的邀請 + DB 的待辦型；完成 = 其餘未讀", async () => {
    asMock(listPendingInvitationsForUser).mockResolvedValue([
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

    expect(summary).toEqual({
      todoCount: 3,
      completedCount: 37,
      // Info: (20260825 - Julian) 所有植入的列都是 NOW_MS - 100（見 `row()`）
      latestUnreadAt: NOW_MS - 100,
    });
  });

  /**
   * Info: (20260825 - Julian) 最新未讀時間要是**未讀之中**的最新，
   * 不是全部通知之中的最新（計畫書 D17）。
   *
   * 已讀的列不該影響它：讀完之後來一則新的，識別值必須跟著變，
   * 而如果它是從「所有列」算出來的，一則更晚建立但已讀的列會把它釘住，
   * 於是那一則新的算出同一把鍵、被 `seenKeys` 擋下 —— 搖但不響。
   */
  it("最新未讀時間只看未讀的列", async () => {
    fakeRepo.__seed([
      row({ id: "old-unread", createdAt: new Date(NOW_MS - 900) }),
      row({
        id: "newer-but-read",
        createdAt: new Date(NOW_MS - 100),
        readAt: new Date(NOW_MS),
      }),
    ]);

    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(summary.latestUnreadAt).toBe(NOW_MS - 900);
    expect(summary.completedCount).toBe(1);
  });

  /**
   * Info: (20260825 - Julian) 兩支查詢各自拿到**自己那個維度**的值。
   *
   * 替身不看參數的話，把 `summarizeUnread(params.userId)` 寫成
   * `summarizeUnread(params.address)`（跨租戶取錯計數）不會讓任何測試變紅。
   */
  it("計數以 userId 查、邀請以 address 查", async () => {
    await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(asMock(notificationRepo.summarizeUnread)).toHaveBeenCalledWith(USER);
    expect(asMock(listPendingInvitationsForUser)).toHaveBeenCalledWith({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
  });

  /**
   * Info: (20260825 - Julian) 「過期的邀請不算待辦」與「空位址不得查全站」
   * 這兩條已移到 `team_invitation_pending_list.test.ts` ——
   * 判斷本身搬進了 `listPendingInvitationsForUser`，而這一檔已經把它 mock 掉，
   * 留在這裡只會變成「測試我自己寫的替身」。
   */

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

    expect(summary).toEqual({
      todoCount: 0,
      completedCount: 0,
      latestUnreadAt: null,
    });
    expect(asMock(notificationRepo.summarizeUnread)).toHaveBeenCalledTimes(1);
    expect(asMock(listPendingInvitationsForUser)).toHaveBeenCalledTimes(1);
  });
});

/**
 * Info: (20260826 - Julian) 提示音的抵達識別值，以**真的 service** 走一遍（review 1.1）。
 *
 * `notification_sound.test.ts` 測得了 `arrivalKeyOf` 本身，但測不到這個缺陷：
 * 那支純函式看不見 `latestUnreadAt` 從哪裡來，而缺陷正在來源
 *（`getNotificationSummary` 只取入庫通知的時間，活算的邀請零貢獻）。
 *
 * 於是純邀請使用者的鍵退化成 `0:todoCount:completedCount` —— D17 修正前的形狀。
 * 這裡把整條路徑接起來：summary → arrivalKeyOf → ChimeGate，
 * 因為「會不會出聲」這件事只有在三者串起來時才有意義。
 */
describe("提示音的抵達識別值（D17）", () => {
  const keyOfSummary = async (): Promise<string> => {
    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    return arrivalKeyOf(
      summary.latestUnreadAt,
      summary.todoCount,
      summary.completedCount,
    );
  };

  /**
   * Info: (20260826 - Julian) 時鐘要會走，否則第二次 claim 會被**節流**擋下，
   * 而那與這條測試要驗的事無關 —— 測試會綠得或紅得莫名其妙。
   */
  const buildClock = () => {
    let current = 0;
    return {
      now: () => current,
      advance: (ms: number) => {
        current += ms;
      },
    };
  };

  /**
   * Info: (20260826 - Julian) 缺陷序列：A 響 → 接受 A → B **搖但不響**。
   *
   * 兩次抵達的數量組合一模一樣（`todoCount` 都是 1），差別只有來源時間。
   * `latestUnreadAt` 不含邀請時兩把鍵都是 `0:1:0`，而 `ChimeGate.seenKeys`
   * 記得第一把 —— 第二封起永久靜音，且沒有 reset，唯一出路是整頁重整。
   */
  it("邀請 A 響過並被收掉之後，邀請 B 仍然出得了聲", async () => {
    const clock = buildClock();
    const gate = new ChimeGate({ now: clock.now });

    asMock(listPendingInvitationsForUser).mockResolvedValue([
      invitation({ id: "inv-a", createdAt: new Date(NOW_MS - 5_000) }),
    ]);
    const firstKey = await keyOfSummary();
    expect(gate.claim(firstKey)).toBe(true);

    // Info: (20260826 - Julian) 接受 A：待辦歸零（這一步不會 claim，總數沒上升）
    asMock(listPendingInvitationsForUser).mockResolvedValue([]);
    await keyOfSummary();

    clock.advance(10 * 60 * 1000);

    // Info: (20260826 - Julian) 邀請 B：數量與 A 那次相同，只有來源時間不同
    asMock(listPendingInvitationsForUser).mockResolvedValue([
      invitation({ id: "inv-b", createdAt: new Date(NOW_MS - 1_000) }),
    ]);
    const secondKey = await keyOfSummary();

    expect(secondKey).not.toBe(firstKey);
    expect(gate.claim(secondKey)).toBe(true);
  });

  /**
   * Info: (20260826 - Julian) 身上掛著收不掉的待辦時更容易撞上。
   *
   * 錢包升級待辦讓數量在 `1 ↔ 2` 之間來回，兩個值都會被 `seenKeys` 記過 ——
   * 也就是說「零入庫通知的使用者」不是這個缺陷的邊界，只是最容易描述的那個。
   */
  it("身上有一則錢包升級待辦時，第二封邀請一樣要出聲", async () => {
    const clock = buildClock();
    const gate = new ChimeGate({ now: clock.now });
    fakeRepo.__seed([
      row({
        id: "w",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        createdAt: new Date(NOW_MS - 90_000),
      }),
    ]);

    asMock(listPendingInvitationsForUser).mockResolvedValue([
      invitation({ id: "inv-a", createdAt: new Date(NOW_MS - 5_000) }),
    ]);
    const firstKey = await keyOfSummary();
    expect(gate.claim(firstKey)).toBe(true);

    asMock(listPendingInvitationsForUser).mockResolvedValue([]);
    await keyOfSummary();
    clock.advance(10 * 60 * 1000);

    asMock(listPendingInvitationsForUser).mockResolvedValue([
      invitation({ id: "inv-b", createdAt: new Date(NOW_MS - 1_000) }),
    ]);
    const secondKey = await keyOfSummary();

    expect(secondKey).not.toBe(firstKey);
    expect(gate.claim(secondKey)).toBe(true);
  });

  /**
   * Info: (20260826 - Julian) 反面：入庫通知比邀請新時，取的是入庫那個。
   *
   * 少了這條，「把 latestUnreadAt 改成只看邀請」也會讓上面兩條全綠 ——
   * 而那會把缺陷原封不動搬到另一半（完成通知那一側）。
   */
  it("兩種來源都有時取較晚的那一個", async () => {
    fakeRepo.__seed([row({ id: "d", createdAt: new Date(NOW_MS - 100) })]);
    asMock(listPendingInvitationsForUser).mockResolvedValue([
      invitation({ createdAt: new Date(NOW_MS - 9_000) }),
    ]);

    const later = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    expect(later.latestUnreadAt).toBe(NOW_MS - 100);

    fakeRepo.__reset();
    fakeRepo.__seed([row({ id: "d", createdAt: new Date(NOW_MS - 9_000) })]);
    asMock(listPendingInvitationsForUser).mockResolvedValue([
      invitation({ createdAt: new Date(NOW_MS - 100) }),
    ]);

    const earlier = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    expect(earlier.latestUnreadAt).toBe(NOW_MS - 100);
  });
});

describe("清單", () => {
  it("邀請進待辦節、完成通知進完成節，錢包升級歸待辦", async () => {
    asMock(listPendingInvitationsForUser).mockResolvedValue([invitation()]);
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
   * 一則舊的待辦 + 一批新的完成通知。用一支不帶型別條件的查詢加 `take` 的話，
   * 最新那批全是完成通知，待辦被擠掉 —— 而摘要的 groupBy 沒有截斷、
   * 照樣算它。畫面會說「1 則待辦事項」而待辦區整個不存在。
   */
  it("未讀超過上限時，待辦仍在清單裡，且與摘要一致", async () => {
    const overflow = NOTIFICATION_HISTORY_LIMIT + 5;
    fakeRepo.__seed([
      row({
        id: "old-wallet",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        createdAt: new Date(NOW_MS - 3 * 86_400_000),
      }),
      ...Array.from({ length: overflow }, (unused, index) =>
        row({ id: `d-${index}`, createdAt: new Date(NOW_MS - index) }),
      ),
    ]);

    const [summary, list] = await Promise.all([
      getNotificationSummary({ userId: USER, address: ADDRESS, nowMs: NOW_MS }),
      listNotifications({ userId: USER, address: ADDRESS, nowMs: NOW_MS }),
    ]);

    expect(summary).toEqual({
      todoCount: 1,
      completedCount: overflow,
      // Info: (20260825 - Julian) 這批裡最新的是 index 0（NOW_MS - 0）
      latestUnreadAt: NOW_MS,
    });
    expect(list.todos.map((item) => item.id)).toEqual(["old-wallet"]);
    expect(list.completed).toHaveLength(NOTIFICATION_HISTORY_LIMIT);
    // Info: (20260825 - Julian) 截斷了就要說出來，不能讓畫面把 30 讀成全部
    expect(list.hasMoreCompleted).toBe(true);
  });

  /**
   * Info: (20260825 - Julian) 已讀的事件型要**留在**清單裡（新需求：可翻歷史）。
   *
   * 斷言成對：已讀的還在（證明查詢真的不濾 readAt）**且**它帶著 `readAt`
   * （證明畫面分得出未讀）。只驗前者的話，「全部回報成未讀」也會通過 ——
   * 而那會讓每一則歷史都掛著紅點。
   */
  it("已讀的事件型留在清單裡，並帶著 readAt", async () => {
    fakeRepo.__seed([
      row({ id: "unread-one" }),
      row({
        id: "read-one",
        createdAt: new Date(NOW_MS - 500),
        readAt: new Date(NOW_MS - 100),
      }),
    ]);

    const list = await listNotifications({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(list.completed.map((item) => item.id)).toEqual([
      "unread-one",
      "read-one",
    ]);
    expect(list.completed[0].readAt).toBeNull();
    expect(list.completed[1].readAt).toBe(NOW_MS - 100);
  });

  /**
   * Info: (20260825 - Julian) 待辦型**不**適用「已讀留著」那條規則。
   *
   * 待辦的存在條件是「事情還沒做完」，不是「還沒看過」。收掉的錢包升級待辦
   * 留在畫面上，會讓一個已經處理完的東西看起來還要處理。
   */
  it("已讀的待辦型不留在清單裡", async () => {
    fakeRepo.__seed([
      row({
        id: "done-wallet",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        readAt: new Date(NOW_MS - 100),
      }),
    ]);

    const list = await listNotifications({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(list.todos).toHaveLength(0);
  });
});

/**
 * Info: (20260826 - Julian) 「全部標為已讀」的端點與 service 已於 20260826 移除
 *（逐則已讀上線後零呼叫端），因此這一組只剩**待辦型的關閉路徑** ——
 * 它由「事情真的做完了」驅動（探針轉 true），與使用者的已讀行為無關。
 */
describe("待辦型的關閉", () => {
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
    expect(after).toEqual({
      todoCount: 0,
      completedCount: 1,
      latestUnreadAt: NOW_MS - 100,
    });
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

describe("逐則標記已讀", () => {
  /**
   * Info: (20260825 - Julian) 核心：只動被點的那一則。
   *
   * 斷言成對：那一則真的變已讀（證明有做事）**且**另一則還是未讀
   * （證明沒做過頭）。只驗前者的話，拿一支「全部標已讀」來實作這個功能
   * 也會通過 —— 而那正是這次改掉的行為（該端點與 service 已於 20260826
   * 移除，逐則已讀上線之後它就沒有任何呼叫端）。
   */
  it("只標記被點的那一則", async () => {
    fakeRepo.__seed([row({ id: "clicked" }), row({ id: "untouched" })]);

    await expect(
      markNotificationRead({
        userId: USER,
        notificationId: "clicked",
        nowMs: NOW_MS,
      }),
    ).resolves.toBe(true);

    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    expect(summary.completedCount).toBe(1);

    const list = await listNotifications({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    const byId = new Map(list.completed.map((item) => [item.id, item.readAt]));
    expect(byId.get("clicked")).toBe(NOW_MS);
    expect(byId.get("untouched")).toBeNull();
  });

  /**
   * Info: (20260825 - Julian) 待辦型不能被這條路徑收掉（計畫書 D1）。
   *
   * 這一條比「全部標已讀」那支的同名保護更要緊：那一支的輸入只有 userId，
   * 而這一支的輸入是**前端送來的 id**。少了型別條件，湊出一個 id 就能
   * 收掉自己的錢包升級待辦，而 `dedupeKey` 是永久唯一鍵、補不回來。
   */
  it("待辦型標記不動，且回報沒有標記到", async () => {
    fakeRepo.__seed([
      row({ id: "wallet", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
    ]);

    await expect(
      markNotificationRead({
        userId: USER,
        notificationId: "wallet",
        nowMs: NOW_MS,
      }),
    ).resolves.toBe(false);

    const summary = await getNotificationSummary({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });
    expect(summary.todoCount).toBe(1);
  });

  /**
   * Info: (20260825 - Julian) 跨租戶：id 是別人的就標不到。
   * 檢查清單 §三.1 把「`where` 少一個條件 → 動到別人的資料」列為標準形狀，
   * 而這支端點的 id 直接來自前端。
   */
  it("別人的通知標記不到", async () => {
    fakeRepo.__seed([row({ id: "theirs", userId: "user-2" })]);

    await expect(
      markNotificationRead({
        userId: USER,
        notificationId: "theirs",
        nowMs: NOW_MS,
      }),
    ).resolves.toBe(false);
    expect(fakeRepo.__rows()[0].readAt).toBeNull();
  });

  // Info: (20260825 - Julian) 重複點擊不改寫已讀時間（否則它會變成「最後一次點」）
  it("已經讀過的再點一次回報沒有標記到", async () => {
    fakeRepo.__seed([row({ id: "already", readAt: new Date(NOW_MS - 5_000) })]);

    await expect(
      markNotificationRead({
        userId: USER,
        notificationId: "already",
        nowMs: NOW_MS,
      }),
    ).resolves.toBe(false);
    expect(fakeRepo.__rows()[0].readAt?.getTime()).toBe(NOW_MS - 5_000);
  });
});

describe("預演要答得出「會收掉幾則」", () => {
  /**
   * Info: (20260825 - Julian) `request_wallet_upgrades.ts` 不帶 `--commit` 時
   * 要能回報「有幾則待辦會被收掉」，而那不能靠真的去收一次。
   *
   * 斷言成對：有未讀待辦的人在集合裡（證明查得到）**且**已讀的人不在
   * （證明 `readAt: null` 這個條件真的生效）。只驗前者的話，
   * 「一律回全部」也會通過。
   */
  it("只回還掛著未讀待辦的人", async () => {
    fakeRepo.__seed([
      row({ id: "w1", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
      row({
        id: "w2",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        userId: "user-2",
        readAt: new Date(NOW_MS),
      }),
      row({ id: "d1", userId: "user-3" }),
    ]);

    const pending = await listUsersWithPendingWalletUpgrade({
      userIds: [USER, "user-2", "user-3"],
    });

    expect([...pending]).toEqual([USER]);
  });

  // Info: (20260825 - Julian) 不在名單裡的人不該被算進來（`--user` 模式的前提）
  it("只看傳進來的那批使用者", async () => {
    fakeRepo.__seed([
      row({ id: "w1", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
    ]);

    expect([
      ...(await listUsersWithPendingWalletUpgrade({ userIds: ["user-2"] })),
    ]).toEqual([]);
  });

  it("空名單回空集合", async () => {
    expect(
      (await listUsersWithPendingWalletUpgrade({ userIds: [] })).size,
    ).toBe(0);
  });
});

describe("錢包升級待辦的發送", () => {
  it("一人一則：第二次回 false", async () => {
    expect(await notifyWalletUpgradeRequested({ userId: USER })).toBe(true);
    expect(await notifyWalletUpgradeRequested({ userId: USER })).toBe(false);
    expect(fakeRepo.__rows()).toHaveLength(1);
  });

  /**
   * Info: (20260827 - Julian) 錢包升級那三支的共同契約：**包裝但仍然拋**。
   *
   * ## 為什麼是三支一起，而不是各驗一次
   *
   * `notifyWalletUpgradeRequested` 先前是三支裡唯一沒包 `guardedThrowing` 的，
   * 於是 Prisma 的原始錯誤（連線字串、表結構）會被批次腳本原文印進 stderr。
   * 那個遺漏之所以能存在，正是因為契約沒有被**成組**釘住 ——
   * 逐支各寫一條的話，新增第四支時沒有人會發現又漏了。
   *
   * ## 兩件事要同時成立，缺一不可
   *
   * 1. **仍然拋**：呼叫端是批次腳本，需要知道哪些人沒發成功才能重跑。
   *    吞掉會讓失敗變成一個沒有人看得到的數字（這是原本這條測試守的東西）。
   * 2. **包裝過**：往外拋的是 `NotificationOperationError`，訊息不含內部細節，
   *    而原因留在 `cause` —— 少了第 2 點就是洩漏，少了第 1 點就是靜默。
   *
   * 原本這條斷言 `rejects.toThrow("db down")`，也就是**原始訊息**。
   * 那個斷言與「要包裝」直接衝突：包了就會紅。所以它改成驗 `cause`，
   * 而不是把包裝拿掉來讓測試變綠。
   */
  it.each([
    [
      "notifyWalletUpgradeRequested",
      "createIfAbsent" as const,
      () => notifyWalletUpgradeRequested({ userId: USER }),
    ],
    [
      "dismissWalletUpgrade",
      "markReadByType" as const,
      () => dismissWalletUpgrade({ userId: USER, nowMs: NOW_MS }),
    ],
    [
      "listUsersWithPendingWalletUpgrade",
      "listUserIdsWithUnread" as const,
      () => listUsersWithPendingWalletUpgrade({ userIds: [USER] }),
    ],
  ])(
    "%s：repo 失敗時包成 NotificationOperationError 並保留 cause",
    async (operation, repoMethod, call) => {
      const original = new Error("db down");
      asMock(notificationRepo[repoMethod]).mockRejectedValueOnce(original);

      await expect(call()).rejects.toThrow(NotificationOperationError);

      asMock(notificationRepo[repoMethod]).mockRejectedValueOnce(original);
      const caught = await call().catch((error: unknown) => error);

      expect(caught).toBeInstanceOf(NotificationOperationError);
      // Info: (20260827 - Julian) 訊息不得洩漏內部細節，但要說得出是哪一支
      expect((caught as Error).message).toContain(operation);
      expect((caught as Error).message).not.toContain("db down");
      // Info: (20260827 - Julian) 原因仍然拿得到 —— 這是 guardedThrowing 的重點
      expect((caught as Error).cause).toBe(original);
    },
  );
});

/**
 * Info: (20260826 - Julian) 分頁歷史。
 *
 * 這一組驗的全部是 **service 自己的**判斷 —— repo 只負責 `skip` / `take`，
 * 而「第幾頁」「一頁幾則」怎麼算在這裡。e2e（`notification_repo.e2e.test.ts`）
 * 驗的是另一半：真 Prisma 的排序與 `where` 一致性。
 */
describe("分頁歷史", () => {
  const seedHistory = (count: number) => {
    fakeRepo.__seed(
      Array.from({ length: count }, (unused, index) =>
        row({
          id: `h-${index}`,
          createdAt: new Date(NOW_MS - index * 1000),
        }),
      ),
    );
  };

  it("回的是那一頁的內容，且總數與頁數對得上", async () => {
    seedHistory(25);

    const page = await listNotificationHistory({
      userId: USER,
      page: 2,
      limit: 10,
    });

    expect(page.totalItems).toBe(25);
    expect(page.totalPages).toBe(3);
    expect(page.currentPage).toBe(2);
    expect(page.items.map((item) => item.id)).toEqual(
      Array.from({ length: 10 }, (unused, index) => `h-${index + 10}`),
    );
  });

  /**
   * Info: (20260826 - Julian) 超出範圍夾回最後一頁，而不是回一頁空的。
   *
   * `?page=99` 會從書籤進來，也會在「讀掉幾則之後總數變少」時出現。
   * 兩種情形回一片空白都像是通知不見了，而正確答案就在手上。
   */
  it("頁碼超出範圍時夾回最後一頁，並如實回報夾到哪裡", async () => {
    seedHistory(25);

    const page = await listNotificationHistory({
      userId: USER,
      page: 99,
      limit: 10,
    });

    expect(page.currentPage).toBe(3);
    expect(page.items).toHaveLength(5);
  });

  /**
   * Info: (20260826 - Julian) 上限在 service 也夾一次。
   *
   * 端點的 `parsePositiveInt` 已經夾過，但那是呼叫端的防線 —— 下一個呼叫
   * 這支函式的人（腳本、另一支端點）不會經過它。斷言的是**筆數**而不是
   * 「有沒有呼叫 repo」：後者在 `take` 被原樣傳下去時照樣是綠的。
   */
  it("limit 超過上限時夾到上限（不是把整張表撈回來）", async () => {
    seedHistory(150);

    const page = await listNotificationHistory({
      userId: USER,
      page: 1,
      limit: 100_000,
    });

    expect(page.items).toHaveLength(NOTIFICATION_PAGE_SIZE_MAX);
    expect(page.totalItems).toBe(150);
  });

  /**
   * Info: (20260826 - Julian) 待辦型不在歷史裡（它是活的狀態，不是紀錄）。
   *
   * 少了這條排除，錢包升級待辦會出現在歷史頁上，而使用者點它就是
   * 一則永遠標不掉的通知 —— `markReadById` 對待辦型回 0（D1）。
   */
  it("排除待辦型", async () => {
    fakeRepo.__seed([
      row({ id: "done" }),
      row({ id: "todo", type: NOTIFICATION_TYPE.WALLET_UPGRADE }),
    ]);

    const page = await listNotificationHistory({
      userId: USER,
      page: 1,
      limit: 10,
    });

    expect(page.items.map((item) => item.id)).toEqual(["done"]);
    expect(page.totalItems).toBe(1);
  });

  /**
   * Info: (20260826 - Julian) 已讀的照樣在歷史裡 —— 那正是這個頁面的用途。
   *
   * 這一條與「鈴鐺面板保留已讀」是同一個需求的兩半，而它們走不同的查詢，
   * 所以要各自釘住。
   */
  it("已讀的仍然算進歷史", async () => {
    fakeRepo.__seed([row({ id: "read", readAt: new Date(NOW_MS) })]);

    const page = await listNotificationHistory({
      userId: USER,
      page: 1,
      limit: 10,
    });

    expect(page.totalItems).toBe(1);
    expect(page.items[0]?.readAt).toBe(NOW_MS);
  });

  // Info: (20260826 - Julian) 空的時候頁數是 1，不是 0（分頁元件吃的是 >= 1）
  it("沒有任何歷史時 totalPages 是 1", async () => {
    const page = await listNotificationHistory({
      userId: USER,
      page: 1,
      limit: 10,
    });

    expect(page).toMatchObject({
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
    });
    expect(page.items).toEqual([]);
  });

  // Info: (20260826 - Julian) 跨租戶：別人的歷史一則都不能算進來
  it("只算自己的", async () => {
    fakeRepo.__seed([
      row({ id: "mine" }),
      row({ id: "theirs", userId: "user-2" }),
    ]);

    const page = await listNotificationHistory({
      userId: USER,
      page: 1,
      limit: 10,
    });

    expect(page.items.map((item) => item.id)).toEqual(["mine"]);
    expect(page.totalItems).toBe(1);
  });
});

/**
 * Info: (20260826 - Julian) 兩支發射函式的 **payload 與 dedupeKey**（review T1/T2）。
 *
 * ## 為什麼要單獨一組
 *
 * `notifyAnalysisFailed` 先前**零 unit test** —— 它唯一出現的地方是
 * `issue_recorder_giveup.test.ts`，而那裡它是被 mock 掉的。所以
 * 「刪掉它的 `dedupeKey`」不會讓任何測試變紅，而後果是 recorder 每重掃
 * 一次就多發一則失敗通知。
 *
 * ## 為什麼用 `toEqual` 而不是 `objectContaining`
 *
 * `objectContaining({ type, dedupeKey })` 對 payload 的內容完全不設限，
 * 而 `toHaveBeenCalledWith` 又會忽略值為 `undefined` 的屬性 —— 兩者疊起來，
 * 「把 `analysisType` 整個拿掉」是一個沒有任何測試看得到的改動，
 * 而它會讓附錄 A 的「通知帶得出報告名稱」全站失效。
 *
 * 這裡對整個參數物件做精確比對：多一個欄位、少一個欄位都要紅。
 */
describe("發射函式的 payload 與 dedupeKey", () => {
  it("完成通知：payload 帶 analysisId 與 analysisType，dedupeKey 以 analysisId 為鍵", async () => {
    await notifyAnalysisCompleted({
      userId: USER,
      analysisId: "a-1",
      analysisType: "market_trends",
    });

    expect(asMock(notificationRepo.createIfAbsent)).toHaveBeenCalledWith({
      userId: USER,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: { analysisId: "a-1", analysisType: "market_trends" },
      dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.ANALYSIS_COMPLETED}a-1`,
    });
  });

  it("失敗通知：payload 帶 orderId 與 analysisType，dedupeKey 以 orderId 為鍵", async () => {
    await notifyAnalysisFailed({
      userId: USER,
      orderId: "o-1",
      analysisType: "market_trends",
    });

    expect(asMock(notificationRepo.createIfAbsent)).toHaveBeenCalledWith({
      userId: USER,
      type: NOTIFICATION_TYPE.ANALYSIS_FAILED,
      payload: { orderId: "o-1", analysisType: "market_trends" },
      dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.ANALYSIS_FAILED}o-1`,
    });
  });

  /**
   * Info: (20260826 - Julian) 失敗路徑上 `analysis` 可能不存在。
   *
   * 那時 payload 裡**不該有** `analysisType` 這個鍵（而不是有一個 undefined）：
   * 前端以 `typeof type !== "string"` 判斷要不要帶標題，寫進去一個
   * `undefined` 會被 JSON 序列化吃掉，行為碰巧一樣 —— 但「碰巧一樣」
   * 會在下一個讀 payload 的人手上變成不一樣。
   */
  it("失敗通知：沒有 analysisType 時 payload 不含該鍵", async () => {
    await notifyAnalysisFailed({ userId: USER, orderId: "o-2" });

    expect(asMock(notificationRepo.createIfAbsent)).toHaveBeenCalledWith({
      userId: USER,
      type: NOTIFICATION_TYPE.ANALYSIS_FAILED,
      payload: { orderId: "o-2" },
      dedupeKey: `${NOTIFICATION_DEDUPE_PREFIX.ANALYSIS_FAILED}o-2`,
    });
  });

  /**
   * Info: (20260826 - Julian) dedupeKey 真的擋得住重發（用有狀態的假 repo 驗）。
   *
   * 上面三條驗的是「傳了什麼」，這一條驗「傳的東西有沒有用」——
   * 假 repo 真的 enforce dedupeKey 唯一，所以第二次呼叫不會多一列。
   * 少了它，把 dedupeKey 改成帶時間戳也會讓前三條全綠。
   */
  it("同一張訂單失敗兩次只留一則", async () => {
    await notifyAnalysisFailed({ userId: USER, orderId: "o-3" });
    await notifyAnalysisFailed({ userId: USER, orderId: "o-3" });

    expect(
      fakeRepo
        .__rows()
        .filter((r) => r.type === NOTIFICATION_TYPE.ANALYSIS_FAILED),
    ).toHaveLength(1);
  });

  // Info: (20260826 - Julian) 不同訂單各發一則（證明上一條不是「永遠只發一則」）
  it("不同訂單各留一則", async () => {
    await notifyAnalysisFailed({ userId: USER, orderId: "o-4" });
    await notifyAnalysisFailed({ userId: USER, orderId: "o-5" });

    expect(
      fakeRepo
        .__rows()
        .filter((r) => r.type === NOTIFICATION_TYPE.ANALYSIS_FAILED),
    ).toHaveLength(2);
  });

  /**
   * Info: (20260826 - Julian) 發通知永遠不該讓主流程失敗（與 `notifyWalletUpgradeRequested` 相反）。
   *
   * recorder 在寫完結果之後才發通知；這裡拋出去會讓一個已經成功的分析
   * 看起來像失敗。兩支的契約刻意不同，所以兩支都要有測試釘住。
   */
  it("repo 失敗時不拋（recorder 的主流程不受影響）", async () => {
    asMock(notificationRepo.createIfAbsent).mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(
      notifyAnalysisFailed({ userId: USER, orderId: "o-6" }),
    ).resolves.toBeUndefined();
  });
});

/**
 * Info: (20260826 - Julian) 上限的**值**要以字面值釘住（review T11）。
 *
 * 這個檔案其餘的測試用 `NOTIFICATION_HISTORY_LIMIT` 當期望值 —— 那是對的，
 * 它們驗的是「截斷發生在上限處」這個行為，而把數字寫死會讓它們在調整上限時
 * 全部一起紅，紅的原因卻與缺陷無關。
 *
 * 但那也代表**沒有任何測試在看那個數字本身**：把它改成 3 或 1000，
 * `npm test` 全綠。而它是使用者看得到的行為（面板往回看多遠、一頁幾則），
 * 也寫在計畫書與 ADR 裡。
 *
 * 同 PR 的 `notification_rate_limit.test.ts` 對限流窗口用的正是字面值
 *（`[NOTIFICATION_READ, 30, 8_000]`），兩支標準不一致 —— 這裡對齊它。
 *
 * **改動請連同 `documents/architecture/notification_module_plan.md` 一起改。**
 */
describe("上限常數的對外契約", () => {
  it.each([
    ["NOTIFICATION_HISTORY_LIMIT", NOTIFICATION_HISTORY_LIMIT, 10],
    ["NOTIFICATION_TODO_LIST_LIMIT", NOTIFICATION_TODO_LIST_LIMIT, 20],
    ["NOTIFICATION_PAGE_SIZE", NOTIFICATION_PAGE_SIZE, 20],
    ["NOTIFICATION_PAGE_SIZE_MAX", NOTIFICATION_PAGE_SIZE_MAX, 100],
  ])("%s 是 %i", (unused, actual, expected) => {
    expect(actual).toBe(expected);
  });

  /**
   * Info: (20260826 - Julian) 這裡原本有一條「歷史上限 > 待辦上限」的斷言，已移除。
   *
   * 那是**臆測出來的約束**：我當時的理由是「待辦很多會把完成區擠出面板」，
   * 但待辦型實際上最多一兩則（邀請 + 錢包升級），20 是安全上限而不是預期值，
   * 而面板本來就會捲動。歷史上限降到 10 之後那條就紅了 —— 紅的是斷言，
   * 不是程式。
   *
   * 留這段話而不是靜靜刪掉：**寫測試時把「我覺得應該如此」寫成不變式，
   * 代價是它日後會擋住正確的改動**，而擋住的時候看起來像抓到了缺陷。
   * 判準是「這條規則違反時，使用者會遇到什麼具體的壞事？」——
   * 答不出具體後果的，就不該是斷言。
   */

  // Info: (20260826 - Julian) 單頁預設不得大於硬上限，否則預設值本身就會被夾
  it("預設頁面大小不超過硬上限", () => {
    expect(NOTIFICATION_PAGE_SIZE).toBeLessThanOrEqual(
      NOTIFICATION_PAGE_SIZE_MAX,
    );
  });
});
