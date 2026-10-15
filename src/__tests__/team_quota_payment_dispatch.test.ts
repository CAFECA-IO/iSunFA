import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/user/order/[order_id]/team_quota_payment/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getPendingOrder,
  markOrderPaid,
  markOrderPaying,
  updateOrderStatus,
} from "@/services/order.service";
import { fulfillPaidAnalysisOrder } from "@/services/analysis_fulfillment.service";
import { refundCredits, spendCredits } from "@/services/spend.service";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";

/**
 * Info: (20261015 - Luphia) 團隊額度付款之後，任務必須能被派發（使用者回報 20261015）。
 *
 * 任務派發（issue.service）只撿 PAID 訂單。這支端點原本履行後直接標 COMPLETED，
 * 於是團隊額度付款的分析永遠不會變成任務。這裡釘住：付款成功 → PAID，
 * 且整個流程中不會把訂單標成 COMPLETED（那是 recorder 在任務完成後的事）。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({ id: "user-1" })),
}));

jest.mock("@/services/order.service", () => ({
  failOrder: jest.fn(async () => undefined),
  getPendingOrder: jest.fn(),
  markOrderPaid: jest.fn(async () => true),
  markOrderPaying: jest.fn(async () => undefined),
  updateOrderStatus: jest.fn(async () => undefined),
}));

jest.mock("@/services/analysis_fulfillment.service", () => ({
  fulfillPaidAnalysisOrder: jest.fn(async () => ({ reportId: "report-1" })),
}));

jest.mock("@/services/spend.service", () => {
  class QuotaExceededError extends Error {
    data = {};
  }
  return {
    QuotaExceededError,
    refundCredits: jest.fn(async () => undefined),
    resolvePayingTeamId: jest.fn(async () => "team-1"),
    spendCredits: jest.fn(async () => ({ source: "QUOTA", amount: "10" })),
  };
});

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function post(): {
  request: NextRequest;
  params: Promise<{ order_id: string }>;
} {
  return {
    request: new NextRequest(
      "https://isunfa.com/api/v1/user/order/order-1/team_quota_payment",
      {
        method: "POST",
        headers: { authorization: "Bearer dewt" },
        body: JSON.stringify({}),
      },
    ),
    params: Promise.resolve({ order_id: "order-1" }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-1" });
  asMock(getPendingOrder).mockResolvedValue({
    id: "order-1",
    type: ORDER_TYPE.ANALYSIS,
    amount: BigInt(-10),
    data: { category: "financial_health" },
  });
});

describe("POST team_quota_payment", () => {
  it("付款成功後把訂單交給任務派發（PAID）", async () => {
    const { request, params } = post();
    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    expect(spendCredits).toHaveBeenCalled();
    expect(markOrderPaying).toHaveBeenCalledWith(
      "order-1",
      expect.stringContaining("team_quota"),
    );
    expect(markOrderPaid).toHaveBeenCalledWith("order-1");

    // Info: (20261015 - Luphia) 先 PAYING（履行中不被派發）、履行完才 PAID
    const payingOrder = asMock(markOrderPaying).mock.invocationCallOrder[0];
    const fulfillOrder = asMock(fulfillPaidAnalysisOrder).mock
      .invocationCallOrder[0];
    const paidOrder = asMock(markOrderPaid).mock.invocationCallOrder[0];
    expect(payingOrder).toBeLessThan(fulfillOrder);
    expect(fulfillOrder).toBeLessThan(paidOrder);
  });

  it("履行失敗時退還扣抵、不交給派發", async () => {
    asMock(fulfillPaidAnalysisOrder).mockRejectedValueOnce(new Error("boom"));
    const { request, params } = post();
    const response = await POST(request, { params });

    expect(response.status).not.toBe(200);
    expect(refundCredits).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "analysis:order-1" }),
    );
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("物流碳足跡不派任務：維持 COMPLETED，由試算端點同步算出結果", async () => {
    asMock(getPendingOrder).mockResolvedValue({
      id: "order-1",
      type: ORDER_TYPE.ANALYSIS,
      amount: BigInt(-10),
      data: { category: ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT },
    });
    const { request, params } = post();
    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(updateOrderStatus).toHaveBeenCalledWith(
      "order-1",
      ORDER_STATUS.COMPLETED,
    );
  });
});
