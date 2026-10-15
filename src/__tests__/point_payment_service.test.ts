import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  isPersonalCreditChargeOrderData,
  payOrderWithPoints,
  releaseDebitOfCancelledOrder,
} from "@/services/point_payment.service";
import { getPendingOrder } from "@/services/order.service";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import { verifyChallengeToken } from "@/lib/auth/challenge_token";
import { webAuthnService } from "@/services/webauthn.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { pointLedgerRepo } from "@/repositories/point_ledger.repo";
import {
  debitPointsForOrder,
  refundPointsForOrder,
} from "@/services/point_ledger.service";
import { fulfillPaidAnalysisOrder } from "@/services/analysis_fulfillment.service";
import { releasePaymentBlockedJobs } from "@/services/resumable_job.service";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { CURRENCY_UNIT } from "@/constants/price";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { WalletCustodyType } from "@/constants/auth_provider";
import { POINT_LEDGER_OUTCOME } from "@/constants/point_ledger";
import {
  PERSONAL_CREDIT_CHARGE_KIND,
  POINT_PAYMENT_SIGNATURE,
} from "@/constants/point_payment";
import type { Order } from "@/generated";

/**
 * Info: (20261015 - Luphia) 個人點數付款（區塊鏈退役，取代 blockchain_payment）。
 *
 * 釘住的是付款的四件事：授權（passkey 仍須簽章、託管直接扣）、扣點與餘額不足、
 * 「只有搶到 PENDING → PAID 的請求才履行」、以及履行失敗時退點。
 */

jest.mock("@/services/order.service", () => ({
  getPendingOrder: jest.fn(),
}));
jest.mock("@/lib/auth/user_approval", () => ({
  resolveCustodyType: jest.fn(),
}));
jest.mock("@/lib/auth/challenge_token", () => ({
  verifyChallengeToken: jest.fn(),
}));
jest.mock("@/services/webauthn.service", () => ({
  webAuthnService: { verifySignature: jest.fn() },
}));
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: { findUserById: jest.fn() },
}));
jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    markPendingOrderPaid: jest.fn(),
    getOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
  },
}));
jest.mock("@/repositories/point_ledger.repo", () => ({
  pointLedgerRepo: { findByIdempotencyKey: jest.fn() },
}));
jest.mock("@/services/point_ledger.service", () => ({
  debitPointsForOrder: jest.fn(),
  refundPointsForOrder: jest.fn(),
}));
jest.mock("@/services/analysis_fulfillment.service", () => ({
  fulfillPaidAnalysisOrder: jest.fn(),
}));
jest.mock("@/services/resumable_job.service", () => ({
  releasePaymentBlockedJobs: jest.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const ANALYSIS_DATA = {
  type: ORDER_TYPE.ANALYSIS,
  data: { category: "BALANCE_SHEET", periodType: "year" },
};

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    userId: "user-1",
    type: ORDER_TYPE.ANALYSIS,
    unit: CURRENCY_UNIT.ICP,
    amount: BigInt(-10),
    status: ORDER_STATUS.PENDING,
    data: ANALYSIS_DATA,
    signature: null,
    ...overrides,
  } as unknown as Order;
}

const FIDO2 = {
  authentication: { id: "cred-1", response: {} },
  challengeToken: "challenge-token",
};

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getPendingOrder).mockResolvedValue(buildOrder());
  asMock(resolveCustodyType).mockResolvedValue(WalletCustodyType.PASSKEY);
  asMock(webAuthnRepo.findUserById).mockResolvedValue({
    id: "user-1",
    address: "0xuser",
  });
  asMock(verifyChallengeToken).mockResolvedValue("expected-challenge");
  asMock(webAuthnService.verifySignature).mockResolvedValue(true);
  asMock(debitPointsForOrder).mockResolvedValue({
    outcome: POINT_LEDGER_OUTCOME.OK,
  });
  asMock(refundPointsForOrder).mockResolvedValue({
    outcome: POINT_LEDGER_OUTCOME.OK,
  });
  asMock(paymentRepo.markPendingOrderPaid).mockResolvedValue(true);
  asMock(fulfillPaidAnalysisOrder).mockResolvedValue({ reportId: "report-1" });
  asMock(releasePaymentBlockedJobs).mockResolvedValue(0);
});

describe("payOrderWithPoints 的授權", () => {
  // Info: (20261015 - Luphia) 託管帳號原本就由伺服器代簽：直接扣，不要求簽章
  it("託管帳號不需要簽章即可付款", async () => {
    asMock(resolveCustodyType).mockResolvedValue(WalletCustodyType.CUSTODIAL);

    const result = await payOrderWithPoints({
      userId: "user-1",
      orderId: "order-1",
    });

    expect(result).toEqual({
      orderId: "order-1",
      reportId: "report-1",
      alreadyPaid: false,
    });
    expect(verifyChallengeToken).not.toHaveBeenCalled();
    expect(debitPointsForOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        orderId: "order-1",
        cost: BigInt(10),
      }),
    );
  });

  // Info: (20261015 - Luphia) 條款 §3.3：passkey 帳號的扣除需經帳戶憑證簽章確認
  it("passkey 帳號沒有簽章就不扣點", async () => {
    await expect(
      payOrderWithPoints({ userId: "user-1", orderId: "order-1" }),
    ).rejects.toMatchObject({ apiCode: "VL000004" });

    expect(debitPointsForOrder).not.toHaveBeenCalled();
  });

  it("passkey 帳號以 USER_ACTION challengeToken 驗章後扣點", async () => {
    await payOrderWithPoints({
      userId: "user-1",
      orderId: "order-1",
      fido2Signature: FIDO2,
    });

    expect(verifyChallengeToken).toHaveBeenCalledWith(
      "challenge-token",
      ChallengePurpose.USER_ACTION,
      "user-1",
    );
    expect(asMock(webAuthnService.verifySignature).mock.calls[0]).toEqual([
      "0xuser",
      FIDO2.authentication,
      "expected-challenge",
    ]);
    expect(debitPointsForOrder).toHaveBeenCalled();
  });

  it.each([
    [
      "token 驗證失敗",
      () =>
        asMock(verifyChallengeToken).mockRejectedValue(new Error("expired")),
    ],
    [
      "簽章驗證失敗",
      () =>
        asMock(webAuthnService.verifySignature).mockRejectedValue(
          new Error("bad sig"),
        ),
    ],
    [
      "簽章不成立",
      () => asMock(webAuthnService.verifySignature).mockResolvedValue(false),
    ],
  ])("%s 時拒絕且不扣點", async (_label, arrange) => {
    arrange();

    await expect(
      payOrderWithPoints({
        userId: "user-1",
        orderId: "order-1",
        fido2Signature: FIDO2,
      }),
    ).rejects.toMatchObject({ apiCode: "UN000001" });

    expect(debitPointsForOrder).not.toHaveBeenCalled();
  });
});

describe("payOrderWithPoints 的扣點與履行", () => {
  beforeEach(() => {
    asMock(resolveCustodyType).mockResolvedValue(WalletCustodyType.CUSTODIAL);
  });

  it("只付 ICP 計價的消費訂單", async () => {
    asMock(getPendingOrder).mockResolvedValue(
      buildOrder({ type: ORDER_TYPE.OEN_PAYMENT, amount: BigInt(100) }),
    );

    await expect(
      payOrderWithPoints({ userId: "user-1", orderId: "order-1" }),
    ).rejects.toMatchObject({ apiCode: "VA000029" });
    expect(debitPointsForOrder).not.toHaveBeenCalled();
  });

  it("餘額不足回 402 且訂單維持 PENDING", async () => {
    asMock(debitPointsForOrder).mockResolvedValue({
      outcome: POINT_LEDGER_OUTCOME.INSUFFICIENT,
    });

    await expect(
      payOrderWithPoints({ userId: "user-1", orderId: "order-1" }),
    ).rejects.toMatchObject({ apiCode: "TW000035" });

    expect(paymentRepo.markPendingOrderPaid).not.toHaveBeenCalled();
    expect(fulfillPaidAnalysisOrder).not.toHaveBeenCalled();
  });

  it("扣點後以點數帳本標記標成 PAID，並履行分析與釋放任務", async () => {
    await payOrderWithPoints({ userId: "user-1", orderId: "order-1" });

    expect(paymentRepo.markPendingOrderPaid).toHaveBeenCalledWith(
      "order-1",
      POINT_PAYMENT_SIGNATURE,
    );
    expect(JSON.parse(POINT_PAYMENT_SIGNATURE)).toEqual({
      verifiedVia: "point_ledger",
    });
    expect(fulfillPaidAnalysisOrder).toHaveBeenCalledWith(
      "user-1",
      "order-1",
      ANALYSIS_DATA,
    );
    expect(releasePaymentBlockedJobs).toHaveBeenCalledWith({
      userId: "user-1",
      orderData: ANALYSIS_DATA,
    });
  });

  /**
   * Info: (20261015 - Luphia) 伺服器預建的個人扣款訂單不是分析訂單：
   * 舊流程對它呼叫 `fulfillPaidAnalysisOrder`，那支因為缺 periodType 必定丟錯。
   */
  it("個人扣款訂單只釋放任務，不產生分析", async () => {
    const chargeData = {
      chargeKind: PERSONAL_CREDIT_CHARGE_KIND,
      category: "CARBON_CHAT",
      idempotencyKey: "carbon-chat:user-1:msg-1",
      resourceKey: "channel-1",
    };
    asMock(getPendingOrder).mockResolvedValue(buildOrder({ data: chargeData }));

    const result = await payOrderWithPoints({
      userId: "user-1",
      orderId: "order-1",
    });

    expect(result.reportId).toBeUndefined();
    expect(fulfillPaidAnalysisOrder).not.toHaveBeenCalled();
    expect(releasePaymentBlockedJobs).toHaveBeenCalledWith({
      userId: "user-1",
      orderData: chargeData,
    });
  });

  it("釋放任務失敗不影響付款結果", async () => {
    asMock(releasePaymentBlockedJobs).mockRejectedValue(new Error("db"));

    await expect(
      payOrderWithPoints({ userId: "user-1", orderId: "order-1" }),
    ).resolves.toMatchObject({ alreadyPaid: false });
  });

  // Info: (20261015 - Luphia) 同一張單併發付款：扣點只有一筆，履行也只能有一次
  it("沒搶到 PENDING → PAID 而訂單已被點數付掉時，不再履行", async () => {
    asMock(debitPointsForOrder).mockResolvedValue({
      outcome: POINT_LEDGER_OUTCOME.DUPLICATE,
    });
    asMock(paymentRepo.markPendingOrderPaid).mockResolvedValue(false);
    asMock(paymentRepo.getOrderById).mockResolvedValue(
      buildOrder({
        status: ORDER_STATUS.PAID,
        signature: POINT_PAYMENT_SIGNATURE,
      }),
    );

    const result = await payOrderWithPoints({
      userId: "user-1",
      orderId: "order-1",
    });

    expect(result).toEqual({ orderId: "order-1", alreadyPaid: true });
    expect(fulfillPaidAnalysisOrder).not.toHaveBeenCalled();
    expect(refundPointsForOrder).not.toHaveBeenCalled();
  });

  it("扣點後訂單被取消時退回點數", async () => {
    asMock(paymentRepo.markPendingOrderPaid).mockResolvedValue(false);
    asMock(paymentRepo.getOrderById).mockResolvedValue(
      buildOrder({ status: ORDER_STATUS.CANCEL }),
    );

    await expect(
      payOrderWithPoints({ userId: "user-1", orderId: "order-1" }),
    ).rejects.toMatchObject({ apiCode: "VL000011" });

    expect(refundPointsForOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        orderId: "order-1",
        amount: BigInt(10),
      }),
    );
    expect(fulfillPaidAnalysisOrder).not.toHaveBeenCalled();
  });

  it("履行失敗時退點並把訂單標成 FAILED（留下 refundedAt）", async () => {
    asMock(fulfillPaidAnalysisOrder).mockRejectedValue(
      new Error("mission generation failed"),
    );

    await expect(
      payOrderWithPoints({ userId: "user-1", orderId: "order-1" }),
    ).rejects.toThrow("mission generation failed");

    expect(refundPointsForOrder).toHaveBeenCalled();
    const [orderId, status, , extra] = asMock(paymentRepo.updateOrderStatus)
      .mock.calls[0] as [string, string, unknown, { data: object }];
    expect(orderId).toBe("order-1");
    expect(status).toBe(ORDER_STATUS.FAILED);
    expect(extra.data).toMatchObject({
      failureReason: "mission generation failed",
      refundedAt: expect.any(String),
    });
  });
});

describe("isPersonalCreditChargeOrderData", () => {
  it.each([
    [{ chargeKind: PERSONAL_CREDIT_CHARGE_KIND }, true],
    // Info: (20261015 - Luphia) 標記加入前建立的個人扣款訂單：頂層冪等鍵、沒有巢狀 data
    [{ idempotencyKey: "k", category: "CARBON_CHAT" }, true],
    [ANALYSIS_DATA, false],
    [null, false],
  ])("%j → %s", (data, expected) => {
    expect(isPersonalCreditChargeOrderData(data)).toBe(expected);
  });
});

describe("releaseDebitOfCancelledOrder", () => {
  it("沒有扣點的訂單不需要退", async () => {
    asMock(pointLedgerRepo.findByIdempotencyKey).mockResolvedValue(null);

    await expect(releaseDebitOfCancelledOrder(buildOrder())).resolves.toBe(
      true,
    );
    expect(refundPointsForOrder).not.toHaveBeenCalled();
  });

  it("扣過點的訂單退回同額", async () => {
    asMock(pointLedgerRepo.findByIdempotencyKey).mockResolvedValue({
      userId: "user-1",
      amount: BigInt(-10),
    });

    await expect(releaseDebitOfCancelledOrder(buildOrder())).resolves.toBe(
      true,
    );
    expect(refundPointsForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1", amount: BigInt(10) }),
    );
  });

  it("退不成時回 false", async () => {
    asMock(pointLedgerRepo.findByIdempotencyKey).mockResolvedValue({
      userId: "user-1",
      amount: BigInt(-10),
    });
    asMock(refundPointsForOrder).mockRejectedValue(new Error("db down"));

    await expect(releaseDebitOfCancelledOrder(buildOrder())).resolves.toBe(
      false,
    );
  });
});
