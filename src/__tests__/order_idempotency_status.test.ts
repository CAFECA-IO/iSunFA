import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { paymentRepo } from "@/repositories/payment.repo";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS } from "@/constants/status";

/**
 * Info: (20260818 - Luphia) 冪等查詢必須看訂單狀態（PR #6652 第三輪 A-2）。
 *
 * 扣款失敗時訂單改成 `PAYMENT_FAILED`，但 `idempotencyKey` 這個唯一欄位原封留著。
 * 原本的查詢不看狀態，於是管理員在畫面上重按一次邀請，就會找到那張失敗的訂單、
 * 走進重放分支——**不扣款、不加席次，卻照樣建立邀請並寄信**。一個沒付錢的席次。
 *
 * 判準是「這筆錢是否可能已經或即將離開用戶的帳戶」，不是「有沒有這筆訂單」。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const order = (status: string) => ({
  id: "order-1",
  userId: "user-1",
  status,
  amount: BigInt(420),
});

beforeEach(() => {
  jest.clearAllMocks();
  asMock(prisma.order.findFirst).mockResolvedValue(null);
});

describe("findOrderByIdempotencyKey", () => {
  const CHARGED = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.PAYING,
    ORDER_STATUS.PAID,
    ORDER_STATUS.EXECUTING,
    ORDER_STATUS.COMPLETED,
    // Info: (20260818 - Luphia) 錢收到了、只是履行失敗——那要走補償，不是重收一次
    ORDER_STATUS.MINT_FAILED,
  ];

  it.each(CHARGED)("視 %s 為已扣過款", async (status) => {
    asMock(prisma.order.findUnique).mockResolvedValue(order(status));

    const found = await paymentRepo.findOrderByIdempotencyKey("user-1", "k1");
    expect(found).not.toBeNull();
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：失敗與取消的訂單必須被視為
   * 「沒扣過」，重試才會真的再扣一次款。
   */
  const NOT_CHARGED = [
    ORDER_STATUS.PAYMENT_FAILED,
    ORDER_STATUS.FAILED,
    ORDER_STATUS.CANCEL,
  ];

  it.each(NOT_CHARGED)("視 %s 為沒扣過款", async (status) => {
    asMock(prisma.order.findUnique).mockResolvedValue(order(status));

    const found = await paymentRepo.findOrderByIdempotencyKey("user-1", "k1");
    expect(found).toBeNull();
  });

  // Info: (20260815 - Luphia) 他人的訂單一律不算（第二輪既有行為，不可退化）
  it("不採用他人的訂單", async () => {
    asMock(prisma.order.findUnique).mockResolvedValue({
      ...order(ORDER_STATUS.COMPLETED),
      userId: "someone-else",
    });

    const found = await paymentRepo.findOrderByIdempotencyKey("user-1", "k1");
    expect(found).toBeNull();
  });

  /**
   * Info: (20260818 - Luphia) 舊訂單只有 `data.idempotencyKey`，回頭查 JSON path 時
   * 同樣要帶狀態條件——否則失敗的舊訂單會從這條路徑漏進來。
   */
  it("回頭查 JSON path 時同樣帶狀態條件", async () => {
    asMock(prisma.order.findUnique).mockResolvedValue(null);

    await paymentRepo.findOrderByIdempotencyKey("user-1", "k1");

    const where = asMock(prisma.order.findFirst).mock.calls[0][0].where;
    expect(where.status.in).toEqual(expect.arrayContaining(CHARGED));
    expect(where.status.in).not.toContain(ORDER_STATUS.PAYMENT_FAILED);
  });
});
