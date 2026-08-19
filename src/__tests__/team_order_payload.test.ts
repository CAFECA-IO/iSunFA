import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { generatePaymentOrder } from "@/services/order.service";
import { ORDER_TYPE } from "@/constants/status";
import { CURRENCY_UNIT } from "@/constants/price";

/**
 * Info: (20260814 - Luphia) 團隊訂單的 teamId 必須落在 order.data 頂層（設計書 §6.1、§7）。
 *
 * generatePaymentOrder 是把整包 params 展開成 order.data 的：放進 `params.data` 的欄位
 * 會沉到 `order.data.data` 底下，而兩條履行路徑（webhook 與 checkout）讀的都是
 * `order.data.teamId`。teamId 曾經就是這樣被埋掉的——訂單建得成、款扣得掉、
 * 履行時卻永遠找不到團隊。
 *
 * 既有的服務測試只斷言「傳給 generatePaymentOrder 的參數」，因此看不到這件事；
 * 這支測試斷言的是**訂單真正存進 DB 的形狀**，也就是履行端會讀到的那一份。
 */

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    createOrder: jest.fn(async () => ({ id: "order-1" })),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { paymentRepo } = require("@/repositories/payment.repo") as {
  paymentRepo: { createOrder: ReturnType<typeof jest.fn> };
};

function savedOrderData(): Record<string, unknown> {
  const call = paymentRepo.createOrder.mock.calls[0][0] as {
    data: Record<string, unknown>;
  };
  return call.data;
}

describe("team order payload", () => {
  beforeEach(() => {
    paymentRepo.createOrder.mockClear();
  });

  it("keeps teamId readable at the top level of order.data", async () => {
    await generatePaymentOrder("user-1", {
      type: ORDER_TYPE.BILLING_TEAM_POINT,
      amount: 600,
      unit: CURRENCY_UNIT.TWD,
      credits: 700,
      paymentMethodId: "pm-1",
      teamId: "team-1",
      data: { creditPlanId: "tier2" },
    });

    const data = savedOrderData();
    expect(data.teamId).toBe("team-1");
  });

  it("keeps subscription teamId and planId readable at the top level", async () => {
    await generatePaymentOrder("user-1", {
      type: ORDER_TYPE.BILLING_SUBSCRIBE,
      amount: 8400,
      unit: CURRENCY_UNIT.TWD,
      credits: 1000,
      paymentMethodId: "pm-1",
      planId: "team",
      billingInterval: "year",
      teamId: "team-1",
    });

    const data = savedOrderData();
    expect(data.teamId).toBe("team-1");
    expect(data.planId).toBe("team");
    expect(data.billingInterval).toBe("year");
  });

  /**
   * Info: (20260814 - Luphia) 反向守衛：params.data 的內容確實會沉一層。
   * 這條測試存在的意義是說明「為什麼 teamId 不能放在 data 裡」，
   * 而不是鼓勵誰把履行要用的欄位塞進去。
   */
  it("nests params.data one level below, which is why fulfillment fields must not live there", async () => {
    await generatePaymentOrder("user-1", {
      type: ORDER_TYPE.BILLING_TEAM_POINT,
      amount: 600,
      unit: CURRENCY_UNIT.TWD,
      credits: 700,
      paymentMethodId: "pm-1",
      teamId: "team-1",
      data: { creditPlanId: "tier2" },
    });

    const data = savedOrderData();
    expect((data.data as { creditPlanId: string }).creditPlanId).toBe("tier2");
    expect((data.data as { teamId?: string }).teamId).toBeUndefined();
  });
});
