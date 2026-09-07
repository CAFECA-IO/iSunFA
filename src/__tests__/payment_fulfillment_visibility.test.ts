import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { paymentRepo } from "@/repositories/payment.repo";
import type { IOrderWithUser } from "@/repositories/payment.repo";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { WALLET_OP_OUTCOME } from "@/constants/subscription_quota";
import type { IOenCallbackData } from "@/interfaces/payment";

/**
 * Info: (20260814 - Luphia) 「已扣款但無法履行」必須看得見（設計書 §6.1、§7）。
 *
 * 原本的履行段落是三個 if 沒有 else：訂單缺 teamId、缺 planId 或入池被拒時，
 * 什麼都不做——不套方案、不入池、不改狀態、不報錯。訂單停在 PAID（訂閱訂單
 * 甚至連分支都進不來，停在 PENDING），而錢已經收了。沒有任何人會發現。
 *
 * 這組測試把「靜默」本身當成缺陷來守：每一條履行失敗的路徑都必須把訂單推進到
 * MINT_FAILED 並在 data.error 寫下原因（前端訂單查詢與後台訂單管理都認得這個狀態）。
 */

jest.mock("@/lib/prisma", () => {
  const tx = {
    paymentMethod: { findFirst: jest.fn(), create: jest.fn() },
    receipt: { create: jest.fn(async () => ({ id: "receipt-1" })) },
    paymentTransaction: { updateMany: jest.fn() },
    order: { update: jest.fn() },
  };
  return {
    prisma: {
      $transaction: jest.fn(async (fn: (arg: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    },
    txMock: tx,
  };
});

jest.mock("@/repositories/team_wallet.repo", () => ({
  creditPoolInTx: jest.fn(),
}));

jest.mock("@/repositories/team_subscription.repo", () => ({
  applyTeamSubscriptionInTx: jest.fn(),
}));

interface ITxMock {
  paymentMethod: {
    findFirst: ReturnType<typeof jest.fn>;
    create: ReturnType<typeof jest.fn>;
  };
  receipt: { create: ReturnType<typeof jest.fn> };
  paymentTransaction: { updateMany: ReturnType<typeof jest.fn> };
  order: { update: ReturnType<typeof jest.fn> };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { txMock } = require("@/lib/prisma") as { txMock: ITxMock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { creditPoolInTx } = require("@/repositories/team_wallet.repo") as {
  creditPoolInTx: ReturnType<typeof jest.fn>;
};
const { applyTeamSubscriptionInTx } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/repositories/team_subscription.repo") as {
    applyTeamSubscriptionInTx: ReturnType<typeof jest.fn>;
  };

const SUCCESS_BODY = { success: true } as unknown as IOenCallbackData;

function buildOrder(
  type: string,
  data: Record<string, unknown>,
): IOrderWithUser {
  return {
    id: "order-1",
    userId: "user-1",
    type,
    amount: BigInt(1000),
    status: ORDER_STATUS.PENDING,
    data,
    user: { id: "user-1", name: "Tester" },
  } as unknown as IOrderWithUser;
}

// Info: (20260814 - Luphia) 取出所有把訂單改成 MINT_FAILED 的呼叫，斷言原因有被寫下
function failedUpdates() {
  return txMock.order.update.mock.calls
    .map((call) => call[0] as { data?: { status?: string; data?: unknown } })
    .filter((arg) => arg.data?.status === ORDER_STATUS.MINT_FAILED);
}

describe("payment fulfillment visibility", () => {
  beforeEach(() => {
    txMock.order.update.mockReset();
    txMock.paymentMethod.findFirst.mockReset();
    creditPoolInTx.mockReset();
    applyTeamSubscriptionInTx.mockReset();
  });

  it("marks a team point order without teamId as unfulfilled", async () => {
    const order = buildOrder(ORDER_TYPE.BILLING_TEAM_POINT, { credits: 100 });

    await paymentRepo.processOenPayment(order, SUCCESS_BODY, "SUCCESS");

    expect(creditPoolInTx).not.toHaveBeenCalled();
    const failures = failedUpdates();
    expect(failures).toHaveLength(1);
    expect(
      (failures[0].data as { data: { error: string } }).data.error,
    ).toContain("teamId");
  });

  it("marks a team point order as unfulfilled when the pool rejects it", async () => {
    creditPoolInTx.mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    const order = buildOrder(ORDER_TYPE.BILLING_TEAM_POINT, {
      credits: 100,
      teamId: "team-1",
    });

    await paymentRepo.processOenPayment(order, SUCCESS_BODY, "SUCCESS");

    const failures = failedUpdates();
    expect(failures).toHaveLength(1);
    expect(
      (failures[0].data as { data: { error: string } }).data.error,
    ).toContain(WALLET_OP_OUTCOME.FROZEN);
  });

  /**
   * Info: (20260814 - Luphia) 這條是最貴的一種靜默：訂閱訂單少了 teamId，
   * 原本連履行分支都進不來，訂單停在 PENDING、沒有收據、沒有錯誤，
   * 而金流那端錢已經收了。
   */
  it("marks a subscription order without teamId as unfulfilled", async () => {
    const order = buildOrder(ORDER_TYPE.BILLING_SUBSCRIBE, {
      planId: "team",
      credits: 0,
    });

    await paymentRepo.processOenPayment(order, SUCCESS_BODY, "SUCCESS");

    expect(applyTeamSubscriptionInTx).not.toHaveBeenCalled();
    const failures = failedUpdates();
    expect(failures).toHaveLength(1);
    expect(
      (failures[0].data as { data: { error: string } }).data.error,
    ).toContain("teamId");
  });

  it("marks a subscription order without planId as unfulfilled", async () => {
    const order = buildOrder(ORDER_TYPE.BILLING_SUBSCRIBE, {
      teamId: "team-1",
      credits: 0,
    });

    await paymentRepo.processOenPayment(order, SUCCESS_BODY, "SUCCESS");

    expect(applyTeamSubscriptionInTx).not.toHaveBeenCalled();
    const failures = failedUpdates();
    expect(failures).toHaveLength(1);
    expect(
      (failures[0].data as { data: { error: string } }).data.error,
    ).toContain("planId");
  });

  // Info: (20260814 - Luphia) 資料齊全的正常路徑不受影響：套用方案並 COMPLETED
  it("completes a well-formed subscription order", async () => {
    const order = buildOrder(ORDER_TYPE.BILLING_SUBSCRIBE, {
      teamId: "team-1",
      planId: "team",
      credits: 0,
    });

    await paymentRepo.processOenPayment(order, SUCCESS_BODY, "SUCCESS");

    expect(applyTeamSubscriptionInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ teamId: "team-1", planId: "team" }),
    );
    expect(failedUpdates()).toHaveLength(0);
    const completed = txMock.order.update.mock.calls
      .map((call) => call[0] as { data?: { status?: string } })
      .filter((arg) => arg.data?.status === ORDER_STATUS.COMPLETED);
    expect(completed).toHaveLength(1);
  });
});
