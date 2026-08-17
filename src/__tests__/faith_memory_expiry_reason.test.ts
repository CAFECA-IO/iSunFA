import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { FAITH_MEMORY_DELETION_REASON } from "@/constants/faith_memory";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260818 - Luphia) 排定刪除必須記下「是誰排的」（PR #6652 第三輪 C-8）。
 *
 * 保留期對帳每 6 小時跑一次，對仍在訂閱的團隊呼叫 `clearExpiry`。
 * 少了 `expiryReason` 的條件，它會把**任何來源**排定的期限一起清掉——
 * 包含未來的帳戶終止寬限期。結果是：團隊只要持續付費，
 * 那個期限每輪被清一次，到期刪除永遠不會發生。
 *
 * 條款 §3.7 寫的是「以較早屆至者為準」，而那句話要成立，
 * 各來源排定的期限就必須彼此獨立。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    faithMemory: {
      updateMany: jest.fn(async () => ({ count: 0 })),
      findUnique: jest.fn(async () => null),
    },
  },
}));

const updateMany = prisma.faithMemory.updateMany as unknown as ReturnType<
  typeof jest.fn
>;
const findUnique = prisma.faithMemory.findUnique as unknown as ReturnType<
  typeof jest.fn
>;

const EXPIRES_AT = new Date(1_760_000_000_000);

beforeEach(() => {
  jest.clearAllMocks();
  updateMany.mockResolvedValue({ count: 0 });
  findUnique.mockResolvedValue(null);
});

function argsOf(call: number) {
  return updateMany.mock.calls[call][0] as {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  };
}

describe("setExpiry", () => {
  it("寫入期限時一併記下來源", async () => {
    await faithMemoryRepo.setExpiry(
      "t1",
      EXPIRES_AT,
      FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    );

    expect(argsOf(0).data).toEqual({
      expiresAt: EXPIRES_AT,
      expiryReason: FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    });
  });

  /**
   * Info: (20260818 - Luphia) 只排給還沒有期限的列。
   * 覆寫既有期限會把「較早屆至」往後推，而那個方向是對使用者不利的：
   * 該刪的資料被延後刪除。
   */
  it("不覆寫已排定的期限", async () => {
    await faithMemoryRepo.setExpiry(
      "t1",
      EXPIRES_AT,
      FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    );

    expect(argsOf(0).where).toEqual({ teamId: "t1", expiresAt: null });
  });
});

describe("clearExpiry", () => {
  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：只清**自己排的那一種**。
   * 少了 reason 條件，對帳會清掉別的來源排定的刪除，那份記憶就再也不會到期。
   */
  it("只清同一個來源排定的期限", async () => {
    await faithMemoryRepo.clearExpiry(
      "t1",
      FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    );

    expect(argsOf(0).where).toEqual({
      teamId: "t1",
      expiresAt: { not: null },
      expiryReason: FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    });
  });

  // Info: (20260818 - Luphia) 取消時 reason 也要清掉，否則下一次排定會留著舊的來源
  it("一併清掉來源標記", async () => {
    await faithMemoryRepo.clearExpiry(
      "t1",
      FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    );

    expect(argsOf(0).data).toEqual({ expiresAt: null, expiryReason: null });
  });

  it("回傳實際受影響的列數", async () => {
    updateMany.mockResolvedValue({ count: 3 });

    expect(
      await faithMemoryRepo.clearExpiry(
        "t1",
        FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
      ),
    ).toBe(3);
  });
});

describe("deleteByScope", () => {
  // Info: (20260818 - Luphia) 查無記憶不是錯誤：多數成員從來沒有累積過記憶
  it("查無記憶時回 false 且不刪任何東西", async () => {
    findUnique.mockResolvedValue(null);

    expect(
      await faithMemoryRepo.deleteByScope(
        "u1",
        "t1",
        FAITH_MEMORY_DELETION_REASON.MEMBER_REMOVED,
      ),
    ).toBe(false);
  });

  /**
   * Info: (20260818 - Luphia) 只讀 id 與筆數——刪除不需要看見任何一個字。
   * 這是規範 §6.1「不提供單邊查詢」在刪除路徑上的具體要求。
   */
  it("查詢時不讀密文", async () => {
    await faithMemoryRepo.deleteByScope(
      "u1",
      "t1",
      FAITH_MEMORY_DELETION_REASON.MEMBER_REMOVED,
    );

    const args = findUnique.mock.calls[0][0] as {
      select: Record<string, unknown>;
    };
    expect(args.select).toEqual({ id: true, itemCount: true });
  });
});
