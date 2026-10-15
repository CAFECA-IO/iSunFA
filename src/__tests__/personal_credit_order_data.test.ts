import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  ensurePersonalCreditCharge,
  refundPersonalCreditCharge,
} from "@/services/personal_credit.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { refundPointsForOrder } from "@/services/point_ledger.service";
import { ORDER_STATUS } from "@/constants/status";
import { POINT_LEDGER_OUTCOME } from "@/constants/point_ledger";
import { PERSONAL_CREDIT_CHARGE_KIND } from "@/constants/point_payment";

/**
 * Info: (20260902 - Julian) 待付訂單真的帶著 `resourceKey`（review #6732 R3 的 A7）。
 *
 * 「付款 → 釋放那一份匯入」的鏈條有四節，而**前兩節先前零守門**：
 *
 * | # | 位置                                             | 守門 |
 * |---|--------------------------------------------------|------|
 * | 1 | `carbon_billing.service.ts` 傳 `resourceKey`      | 本輪補（`carbon_billing_service.test.ts`）|
 * | 2 | 這裡：把它寫進 `Order.data`                       | 本檔 |
 * | 3 | 點數付款交出整包 `order.data`                     | 既有（掃描）|
 * | 4 | `releasePaymentBlockedJobs` 以它查任務             | 既有（六條行為測試）|
 *
 * 少了 1 或 2，`resourceKeyOfOrderData` 恆回 null → 釋放恆回 0 → 使用者付了錢
 * 而那份匯入永遠停在「等付款」。唯一的觀測量是一行 log，
 * 而它與常態（付的是一則對話，本來就沒有對應任務）長得一模一樣。
 *
 * 這一檔 mock 的是 `paymentRepo`，斷言的是**交給它的那個物件**。
 */

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    findOrderByIdempotencyKey: jest.fn(async () => null),
    createOrder: jest.fn(async () => ({ id: "order-1" })),
    updateOrderData: jest.fn(),
  },
}));

// Info: (20261015 - Luphia) 退款改入個人點數帳本（區塊鏈退役）
jest.mock("@/services/point_ledger.service", () => ({
  refundPointsForOrder: jest.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const BASE = {
  userId: "user-1",
  credits: 6,
  idempotencyKey: "carbon-chat:user-1:msg-1",
  category: "CARBON_CHAT",
};

const CHANNEL = "carbon-chat-0xabc-s123";

const dataOf = (): Record<string, unknown> =>
  (
    asMock(paymentRepo.createOrder).mock.calls[0][0] as {
      data: Record<string, unknown>;
    }
  ).data;

describe("個人待付訂單的 data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(null);
    asMock(paymentRepo.createOrder).mockResolvedValue({ id: "order-1" });
  });

  it("帶 resourceKey 時原封不動寫進 Order.data", async () => {
    await ensurePersonalCreditCharge({ ...BASE, resourceKey: CHANNEL });

    expect(dataOf().resourceKey).toBe(CHANNEL);
  });

  /**
   * Info: (20260902 - Julian) 缺席時**不寫這個鍵**，不是寫 null 或空字串。
   *
   * `resourceKeyOfOrderData` 對空字串與 null 都回 null，所以行為上分不出來；
   * 但 `Order.data` 是永久保存的資料，而 `challenge` 是它的雜湊 ——
   * 多一個恆為 null 的鍵會讓每一張沒有任務的訂單都換一個雜湊，
   * 也會讓之後查資料的人以為「這筆付款曾經指向某個任務」。
   */
  it.each([
    ["沒有傳", undefined],
    ["傳 null", null],
    ["傳空字串", ""],
  ])("%s 時 Order.data 沒有 resourceKey 這個鍵", async (unusedLabel, value) => {
    await ensurePersonalCreditCharge({
      ...BASE,
      resourceKey: value as string | null | undefined,
    });

    expect(Object.keys(dataOf())).not.toContain("resourceKey");
  });

  /**
   * Info: (20260902 - Julian) 反面：其他欄位沒被這次改動弄掉。
   *
   * 少了這條，「`data` 只寫 resourceKey」也會讓上面兩條全綠 ——
   * 而 `challenge` 簽的正是這整包，少一個欄位就是換一張訂單。
   */
  it("既有欄位仍在（category / idempotencyKey / amount）", async () => {
    await ensurePersonalCreditCharge({ ...BASE, resourceKey: CHANNEL });

    expect(dataOf()).toMatchObject({
      category: BASE.category,
      idempotencyKey: BASE.idempotencyKey,
      amount: "-6",
    });
  });
});

/**
 * Info: (20261015 - Luphia) 「付過了沒」與付款端同源（區塊鏈退役）。
 *
 * 付款的結果是 PAID，而放行端原本只認 COMPLETED——使用者付完錢、重送同一則訊息，
 * 拿到的仍然是「請付款」。
 */
describe("個人待付訂單的付款判準", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(paymentRepo.createOrder).mockResolvedValue({ id: "order-1" });
  });

  it("新訂單帶個人扣款標記（付款後放行任務、不產生分析）", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(null);
    await ensurePersonalCreditCharge({ ...BASE });

    expect(dataOf().chargeKind).toBe(PERSONAL_CREDIT_CHARGE_KIND);
  });

  it.each([
    [ORDER_STATUS.PAID, true],
    [ORDER_STATUS.EXECUTING, true],
    [ORDER_STATUS.COMPLETED, true],
    [ORDER_STATUS.PENDING, false],
    [ORDER_STATUS.PAYING, false],
  ])("既有訂單狀態 %s → paid = %s", async (status, paid) => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      id: "order-1",
      status,
      amount: BigInt(-6),
    });

    const result = await ensurePersonalCreditCharge({ ...BASE });

    expect(result).toEqual({ paid, orderId: "order-1", cost: 6 });
    expect(paymentRepo.createOrder).not.toHaveBeenCalled();
  });
});

describe("個人扣款的退款", () => {
  const paidOrder = (data: Record<string, unknown> = {}) => ({
    id: "order-1",
    status: ORDER_STATUS.PAID,
    amount: BigInt(-6),
    data: { idempotencyKey: BASE.idempotencyKey, ...data },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("已付款的訂單以帳本 REFUND 退回並蓋上 refundedAt", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(
      paidOrder(),
    );
    asMock(refundPointsForOrder).mockResolvedValue({
      outcome: POINT_LEDGER_OUTCOME.OK,
    });

    const result = await refundPersonalCreditCharge({
      userId: BASE.userId,
      idempotencyKey: BASE.idempotencyKey,
    });

    expect(result).toEqual({ refunded: true, owed: false });
    expect(refundPointsForOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: BASE.userId,
        orderId: "order-1",
        amount: BigInt(6),
      }),
    );
    const written = asMock(paymentRepo.updateOrderData).mock.calls[0][1] as {
      refundedAt?: string;
      refundOwed?: boolean;
    };
    expect(typeof written.refundedAt).toBe("string");
    expect(written.refundOwed).toBe(false);
  });

  it("退過的訂單不再退第二次", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(
      paidOrder({ refundedAt: "2026-10-15T00:00:00.000Z" }),
    );

    const result = await refundPersonalCreditCharge({
      userId: BASE.userId,
      idempotencyKey: BASE.idempotencyKey,
    });

    expect(result).toEqual({ refunded: true, owed: false });
    expect(refundPointsForOrder).not.toHaveBeenCalled();
  });

  it("沒付成的訂單不退", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      ...paidOrder(),
      status: ORDER_STATUS.PENDING,
    });

    const result = await refundPersonalCreditCharge({
      userId: BASE.userId,
      idempotencyKey: BASE.idempotencyKey,
    });

    expect(result).toEqual({ refunded: false, owed: false });
    expect(refundPointsForOrder).not.toHaveBeenCalled();
  });

  it("帳本退款失敗時留下看得見的欠款", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(
      paidOrder(),
    );
    asMock(refundPointsForOrder).mockRejectedValue(new Error("db down"));

    const result = await refundPersonalCreditCharge({
      userId: BASE.userId,
      idempotencyKey: BASE.idempotencyKey,
    });

    expect(result).toEqual({ refunded: false, owed: true });
    expect(asMock(paymentRepo.updateOrderData).mock.calls[0][1]).toMatchObject({
      refundOwed: true,
      refundError: "db down",
    });
  });
});
