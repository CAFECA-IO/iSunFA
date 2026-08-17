import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { memoryItemId } from "@/lib/faith_memory/items";
import {
  deleteFaithMemoryItem,
  isFaithMemoryEnabled,
  listFaithMemory,
  loadFaithMemoryForPrompt,
  recordFaithMemoryItems,
} from "@/services/faith_memory.service";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { TEAM_PLAN } from "@/constants/subscription_quota";
import { FAITH_MEMORY_CATEGORY } from "@/constants/faith_memory";

/**
 * Info: (20260817 - Luphia) 方案 Gate 與過期守衛（第一輪 C-1、規範 §6.3 / §7.2）。
 *
 * 條款把長期記憶寫成**團隊版與企業版專屬**，而免費版只有任務短期記憶。
 * 因此這兩件事都是承諾的一部分，不是最佳化：
 * 1. 免費版**不讀也不寫**——單邊 gate 會出現「免費版讀得到舊記憶」
 *    或更糟的「免費版持續累積個資」
 * 2. 已過期但守護行程尚未刪到的記憶**不得注入**——
 *    fail-closed 的順序永遠是先停止使用，再實際刪除
 */

jest.mock("@/repositories/faith_memory.repo", () => ({
  faithMemoryRepo: {
    get: jest.fn(),
    upsert: jest.fn(),
    // Info: (20260818 - Luphia) 逐條刪除也要寫稽核（第三輪 C-6）
    upsertWithDeletionLog: jest.fn(),
    deleteByScope: jest.fn(),
  },
}));
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn() },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_SEC = 1_760_000_000;
const ITEM = {
  category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
  statement: "回答請簡短",
  updatedAt: NOW_SEC,
};

function mockPlan(planId: string, periodEndSec = NOW_SEC + 86_400) {
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
    planId,
    status: "ACTIVE",
    currentPeriodEnd: new Date(periodEndSec * 1000),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlan(TEAM_PLAN.TEAM);
  asMock(faithMemoryRepo.get).mockResolvedValue({
    items: [ITEM],
    expiresAt: null,
  });
});

describe("isFaithMemoryEnabled", () => {
  it("付費且在期內為 true", async () => {
    expect(await isFaithMemoryEnabled("team-1", NOW_SEC)).toBe(true);
  });

  it("免費版為 false", async () => {
    mockPlan(TEAM_PLAN.FREE);
    expect(await isFaithMemoryEnabled("team-1", NOW_SEC)).toBe(false);
  });

  // Info: (20260817 - Luphia) 過期的付費訂閱等同免費版（fail-closed）
  it("付費但已過期為 false", async () => {
    mockPlan(TEAM_PLAN.TEAM, NOW_SEC - 1);
    expect(await isFaithMemoryEnabled("team-1", NOW_SEC)).toBe(false);
  });

  it("查無訂閱為 false", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
    expect(await isFaithMemoryEnabled("team-1", NOW_SEC)).toBe(false);
  });

  // Info: (20260817 - Luphia) 查詢失敗時同樣當免費版：不讀不寫才是保守解
  it("查詢失敗為 false 而非拋錯", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockRejectedValue(
      new Error("db down"),
    );
    expect(await isFaithMemoryEnabled("team-1", NOW_SEC)).toBe(false);
  });
});

describe("loadFaithMemoryForPrompt", () => {
  it("付費方案讀得到記憶", async () => {
    const result = await loadFaithMemoryForPrompt({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });
    expect(result.text).toContain("回答請簡短");
    expect(result.totalChars).toBe(result.text.length);
  });

  /**
   * Info: (20260817 - Luphia) 免費版連讀都不讀：降級之後不該還在用付費期間累積的記憶。
   */
  it("免費版不讀取，也不碰資料庫", async () => {
    mockPlan(TEAM_PLAN.FREE);

    const result = await loadFaithMemoryForPrompt({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });

    expect(result).toEqual({ text: "", totalChars: 0 });
    expect(faithMemoryRepo.get).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260817 - Luphia) 已過期但還沒被守護行程刪到的記憶不得注入（規範 §7.2）。
   * 守護行程有間隙是允許的，「間隙期間照用」不是。
   */
  it("已過期的記憶不注入，即使尚未被刪除", async () => {
    asMock(faithMemoryRepo.get).mockResolvedValue({
      items: [ITEM],
      expiresAt: new Date((NOW_SEC - 1) * 1000),
    });

    const result = await loadFaithMemoryForPrompt({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });

    expect(result).toEqual({ text: "", totalChars: 0 });
  });

  it("尚未到期的記憶照常注入", async () => {
    asMock(faithMemoryRepo.get).mockResolvedValue({
      items: [ITEM],
      expiresAt: new Date((NOW_SEC + 86_400) * 1000),
    });

    const result = await loadFaithMemoryForPrompt({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });

    expect(result.text).toContain("回答請簡短");
  });

  it("查無記憶時回空", async () => {
    asMock(faithMemoryRepo.get).mockResolvedValue(null);
    const result = await loadFaithMemoryForPrompt({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });
    expect(result).toEqual({ text: "", totalChars: 0 });
  });
});

describe("recordFaithMemoryItems", () => {
  it("付費方案寫得進去", async () => {
    await recordFaithMemoryItems({
      userId: "u1",
      teamId: "t1",
      items: [ITEM],
      nowSec: NOW_SEC,
    });
    expect(faithMemoryRepo.upsert).toHaveBeenCalled();
  });

  /**
   * Info: (20260817 - Luphia) 免費版**不寫入**。這一條比讀取側更重要：
   * 讀不到只是少一個功能，寫得進去等於在沒有付費的情境下持續累積個資，
   * 而條款並未就此取得同意。
   */
  it("免費版不寫入", async () => {
    mockPlan(TEAM_PLAN.FREE);

    await recordFaithMemoryItems({
      userId: "u1",
      teamId: "t1",
      items: [ITEM],
      nowSec: NOW_SEC,
    });

    expect(faithMemoryRepo.upsert).not.toHaveBeenCalled();
  });

  it("沒有項目時不做任何事", async () => {
    await recordFaithMemoryItems({
      userId: "u1",
      teamId: "t1",
      items: [],
      nowSec: NOW_SEC,
    });
    expect(faithMemoryRepo.upsert).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.getByTeamId).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260818 - Luphia) 檢視也要 gate（第三輪 B-5）。
 *
 * 這個檔案原本完全沒碰 `listFaithMemory`，於是拿掉那支函式裡的方案判定
 * 仍然全綠——效果是**降級後的免費版成員讀得到付費期間累積的全部記憶**，
 * 正是本檔開頭宣稱要防的事。
 */
describe("listFaithMemory", () => {
  it("付費方案讀得到條目", async () => {
    const view = await listFaithMemory({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });

    expect(view.enabled).toBe(true);
    expect(view.items).toHaveLength(1);
    expect(view.items[0].statement).toBe("回答請簡短");
    // Info: (20260818 - Luphia) 逐條刪除靠這個 id，不能沒有
    expect(view.items[0].id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("免費版讀不到，也不碰資料庫", async () => {
    mockPlan(TEAM_PLAN.FREE);

    const view = await listFaithMemory({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });

    expect(view).toEqual({ enabled: false, items: [] });
    expect(faithMemoryRepo.get).not.toHaveBeenCalled();
  });

  // Info: (20260818 - Luphia) 已過期未刪的記憶同樣不該出現在檢視裡
  it("已過期的記憶不列出", async () => {
    asMock(faithMemoryRepo.get).mockResolvedValue({
      items: [ITEM],
      expiresAt: new Date((NOW_SEC - 1) * 1000),
    });

    const view = await listFaithMemory({
      userId: "u1",
      teamId: "t1",
      nowSec: NOW_SEC,
    });

    expect(view.items).toEqual([]);
  });
});

/**
 * Info: (20260818 - Luphia) 刪除必寫稽核，逐條也一樣（第三輪 C-6）。
 *
 * 規範 §6.2 的分級規則是「刪除必寫稽核」。先前只有刪到一條不剩才留紀錄——
 * 刪掉 49/50 條，稽核表一列都沒有，而那與整包刪除在資料上的差別只有一條。
 */
describe("deleteFaithMemoryItem", () => {
  const OTHER = {
    category: FAITH_MEMORY_CATEGORY.TERMINOLOGY,
    statement: "稱我為林會計",
    updatedAt: NOW_SEC,
  };

  beforeEach(() => {
    asMock(faithMemoryRepo.get).mockResolvedValue({
      items: [ITEM, OTHER],
      expiresAt: null,
    });
  });

  it("還有剩餘條目時，更新內容並寫稽核", async () => {
    const removed = await deleteFaithMemoryItem({
      userId: "u1",
      teamId: "t1",
      itemId: memoryItemId(ITEM),
    });

    expect(removed).toBe(true);
    expect(faithMemoryRepo.upsertWithDeletionLog).toHaveBeenCalledWith(
      expect.objectContaining({ removedCount: 1 }),
    );
    // Info: (20260818 - Luphia) 不可以走不寫稽核的那條路
    expect(faithMemoryRepo.upsert).not.toHaveBeenCalled();
  });

  // Info: (20260818 - Luphia) 刪到一條不剩就整列刪除，同樣寫稽核
  it("刪到空時整列刪除", async () => {
    asMock(faithMemoryRepo.get).mockResolvedValue({
      items: [ITEM],
      expiresAt: null,
    });

    await deleteFaithMemoryItem({
      userId: "u1",
      teamId: "t1",
      itemId: memoryItemId(ITEM),
    });

    expect(faithMemoryRepo.deleteByScope).toHaveBeenCalled();
  });

  it("找不到條目時什麼都不做", async () => {
    const removed = await deleteFaithMemoryItem({
      userId: "u1",
      teamId: "t1",
      itemId: "notexist",
    });

    expect(removed).toBe(false);
    expect(faithMemoryRepo.upsertWithDeletionLog).not.toHaveBeenCalled();
  });
});
