import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { receiptRepo } from "@/repositories/receipt.repo";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260815 - Luphia) 收據只能取自己的訂單（PR #6652 第二輪 §E）。
 *
 * 端點原本只檢查「有沒有登入」，而 repo 只憑 orderId 查詢——任何登入者把網址上的
 * order_id 換掉，就能取得他人的收據，內含金額、買方姓名與 buyerId。
 *
 * 這裡驗的是**查詢條件本身帶了擁有者**：把 `userId` 從 where 拿掉，
 * 這支測試會紅。權限檢查寫在資料存取層而不只是端點，是因為端點會增生，
 * 而下一支忘記檢查的端點不會有人記得補。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst: jest.fn(), findUnique: jest.fn() },
    receipt: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

describe("receiptRepo.getOrCreateReceipt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("looks the order up by owner, not by order id alone", async () => {
    asMock(prisma.order.findFirst).mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      amount: BigInt(-5),
      data: {},
      user: { name: "Owner" },
    });
    asMock(prisma.receipt.findUnique).mockResolvedValue({ id: "receipt-1" });

    const receipt = await receiptRepo.getOrCreateReceipt("order-1", "user-1");

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1", userId: "user-1" },
      }),
    );
    expect(receipt).toEqual({ id: "receipt-1" });
  });

  /**
   * Info: (20260815 - Luphia) 別人的訂單一律回 null，**不區分**「不存在」與「不是你的」。
   * 區分等於告訴對方「這張訂單存在，只是不屬於你」，那本身就是一則不該外流的資訊。
   */
  it("returns null for an order that does not belong to the caller", async () => {
    asMock(prisma.order.findFirst).mockResolvedValue(null);

    const receipt = await receiptRepo.getOrCreateReceipt("order-1", "user-2");

    expect(receipt).toBeNull();
    // Info: (20260815 - Luphia) 沒有擁有權就連收據都不該去讀
    expect(prisma.receipt.findUnique).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260815 - Luphia) 順序也要固定：先驗擁有者再取收據。
   * 反過來（先讀收據、有就直接回）等於完全沒有檢查——那正是修正前的樣子。
   */
  it("never returns an existing receipt without checking ownership first", async () => {
    asMock(prisma.order.findFirst).mockResolvedValue(null);
    asMock(prisma.receipt.findUnique).mockResolvedValue({ id: "receipt-1" });

    const receipt = await receiptRepo.getOrCreateReceipt("order-1", "user-2");

    expect(receipt).toBeNull();
  });
});
