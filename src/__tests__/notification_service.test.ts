import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  getNotificationSummary,
  listNotifications,
  notifyAnalysisCompleted,
} from "@/services/notification.service";
import { notificationRepo } from "@/repositories/notification.repo";
import { teamRepo } from "@/repositories/team.repo";
import { NOTIFICATION_TYPE } from "@/constants/notification";

/**
 * Info: (20260821 - Luphia) 小鈴鐺 service（ADR 021 補充）。
 *
 * 重點釘三件事：
 *
 * 1. 摘要的兩個數字**來源不同**（邀請活算 + DB 分組計數），且過期邀請要濾掉
 * 2. 計數用 groupBy 而不是截斷在 20 則的清單——否則「37 個完成通知」會顯示成 20
 * 3. 完成通知的發送**永不拋錯**且冪等（發通知不能讓分析結果的寫入跟著回滾）
 */

jest.mock("@/repositories/notification.repo", () => ({
  notificationRepo: {
    createIfAbsent: jest.fn(async () => ({ id: "n-1" })),
    listUnread: jest.fn(async () => []),
    countUnreadByType: jest.fn(async () => new Map()),
    markAllRead: jest.fn(async () => 0),
  },
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getPendingInvitationsByAddress: jest.fn(async () => []) },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_MS = 1_760_000_000_000;

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

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([]);
  asMock(notificationRepo.countUnreadByType).mockResolvedValue(new Map());
  asMock(notificationRepo.listUnread).mockResolvedValue([]);
  asMock(notificationRepo.createIfAbsent).mockResolvedValue({ id: "n-1" });
});

describe("摘要", () => {
  it("待辦 = 活算的邀請 + DB 的待辦型；完成 = 其餘未讀", async () => {
    asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([
      invitation(),
      invitation({ id: "inv-2" }),
    ]);
    asMock(notificationRepo.countUnreadByType).mockResolvedValue(
      new Map([
        [NOTIFICATION_TYPE.WALLET_UPGRADE, 1],
        [NOTIFICATION_TYPE.ANALYSIS_COMPLETED, 37],
      ]),
    );

    const summary = await getNotificationSummary({
      userId: "user-1",
      address: "0xabc",
      nowMs: NOW_MS,
    });

    expect(summary).toEqual({ todoCount: 3, completedCount: 37 });
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
      userId: "user-1",
      address: "0xabc",
      nowMs: NOW_MS,
    });

    expect(summary.todoCount).toBe(1);
  });

  it("什麼都沒有時兩個數字都是 0", async () => {
    const summary = await getNotificationSummary({
      userId: "user-1",
      address: "0xabc",
      nowMs: NOW_MS,
    });

    expect(summary).toEqual({ todoCount: 0, completedCount: 0 });
  });
});

describe("清單", () => {
  it("邀請進待辦節、完成通知進完成節，錢包升級歸待辦", async () => {
    asMock(teamRepo.getPendingInvitationsByAddress).mockResolvedValue([
      invitation(),
    ]);
    asMock(notificationRepo.listUnread).mockResolvedValue([
      {
        id: "n-wallet",
        type: NOTIFICATION_TYPE.WALLET_UPGRADE,
        payload: {},
        createdAt: new Date(NOW_MS - 500),
      },
      {
        id: "n-done",
        type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
        payload: { analysisId: "a-1" },
        createdAt: new Date(NOW_MS - 200),
      },
    ]);

    const list = await listNotifications({
      userId: "user-1",
      address: "0xabc",
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
  });
});

describe("完成通知的發送", () => {
  it("以 analysisId 為 dedupe key（worker 重試不會發第二則）", async () => {
    await notifyAnalysisCompleted({
      userId: "user-1",
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
   * Info: (20260821 - Luphia) 永不拋錯：發通知是分析入庫的附帶動作，
   * 通知失敗不能讓已寫入的結果跟著回滾。
   */
  it("repo 失敗時不拋錯", async () => {
    asMock(notificationRepo.createIfAbsent).mockRejectedValue(
      new Error("db down"),
    );

    await expect(
      notifyAnalysisCompleted({
        userId: "user-1",
        analysisId: "a-9",
        analysisType: "CERTIFICATE_ANALYSIS",
      }),
    ).resolves.toBeUndefined();
  });
});
