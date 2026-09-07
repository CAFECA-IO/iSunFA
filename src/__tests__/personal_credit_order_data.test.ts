import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import { ensurePersonalCreditCharge } from "@/services/personal_credit.service";
import { paymentRepo } from "@/repositories/payment.repo";

/**
 * Info: (20260902 - Julian) 待付訂單真的帶著 `resourceKey`（review #6732 R3 的 A7）。
 *
 * 「付款 → 釋放那一份匯入」的鏈條有四節，而**前兩節先前零守門**：
 *
 * | # | 位置                                             | 守門 |
 * |---|--------------------------------------------------|------|
 * | 1 | `carbon_billing.service.ts` 傳 `resourceKey`      | 本輪補（`carbon_billing_service.test.ts`）|
 * | 2 | 這裡：把它寫進 `Order.data`                       | 本檔 |
 * | 3 | TxTracker 交出整包 `order.data`                   | 既有（掃描）|
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
  },
}));

// Info: (20260902 - Julian) 這條路走不到鏈上，但模組會 import 它們
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: { findUserById: jest.fn(async () => null) },
}));

jest.mock("@/services/member.service", () => ({
  issuePurchasedPointsToMember: jest.fn(async () => ({ success: true })),
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
