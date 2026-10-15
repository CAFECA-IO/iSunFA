import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import { pointService } from "@/services/point.service";
import {
  getMembershipExp,
  getPointAccountSnapshot,
  grantCampaignBonus,
  grantRegistrationReward,
  issuePointsByAdmin,
} from "@/services/point_account.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { pointLedgerRepo } from "@/repositories/point_ledger.repo";
import { campaignRepo } from "@/repositories/campaign.repo";
import { creditPoints, getPointBalance } from "@/services/point_ledger.service";
import { CURRENCY_UNIT, REWARD_AMOUNTS } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import {
  POINT_LEDGER_ENTRY_TYPE,
  POINT_LEDGER_KEY,
  POINT_LEDGER_OUTCOME,
} from "@/constants/point_ledger";
import { MEMBERSHIP_TIER } from "@/constants/point_payment";

/**
 * Info: (20261015 - Luphia) 個人點數的發放、查詢與點數歷程（區塊鏈退役）。
 *
 * 原本這些都經過 MembershipSystem 合約；現在全部以 DB 帳本為準，
 * 並以「來源」產生冪等鍵（與復原指令共用）。
 */

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    getOrdersByUserId: jest.fn(),
    createOrderWithPointCredit: jest.fn(),
    updateOrderCompleted: jest.fn(),
  },
}));
jest.mock("@/repositories/point_ledger.repo", () => ({
  pointLedgerRepo: {
    listByUser: jest.fn(),
    findByIdempotencyKey: jest.fn(),
  },
}));
jest.mock("@/repositories/campaign.repo", () => ({
  campaignRepo: { findRegistrationsByUserId: jest.fn() },
}));
jest.mock("@/services/point_ledger.service", () => ({
  creditPoints: jest.fn(),
  getPointBalance: jest.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function ledgerEntry(
  entryType: string,
  amount: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `entry-${entryType}`,
    userId: "user-1",
    entryType,
    amount: BigInt(amount),
    balanceAfter: BigInt(0),
    createdAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

function order(type: string, amount: number, data: object | null = null) {
  return {
    id: `order-${type}`,
    type,
    unit: CURRENCY_UNIT.ICP,
    amount: BigInt(amount),
    status: ORDER_STATUS.COMPLETED,
    data,
    createdAt: new Date("2026-10-02T00:00:00Z"),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(paymentRepo.getOrdersByUserId).mockResolvedValue([]);
  asMock(pointLedgerRepo.listByUser).mockResolvedValue([]);
  asMock(campaignRepo.findRegistrationsByUserId).mockResolvedValue([]);
  asMock(creditPoints).mockResolvedValue({ outcome: POINT_LEDGER_OUTCOME.OK });
});

describe("點數歷程（getPointHistory）", () => {
  /**
   * Info: (20261015 - Luphia) 多數人的註冊獎勵沒有訂單列：原本回頭讀合約的註冊時間，
   * 現在讀帳本的 REGISTRATION_REWARD 分錄。
   */
  it("沒有訂單列時以帳本的註冊獎勵補上", async () => {
    asMock(pointLedgerRepo.listByUser).mockResolvedValue([
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD, 100),
    ]);

    const history = await pointService.getPointHistory({ id: "user-1" });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      type: "REWARD",
      sourceKey: "billing.point_history.source_registration",
      amount: BigInt(100),
      status: ORDER_STATUS.COMPLETED,
    });
  });

  it("有註冊獎勵訂單列時不重複顯示帳本那一筆", async () => {
    asMock(paymentRepo.getOrdersByUserId).mockResolvedValue([
      order(ORDER_TYPE.REGISTRATION_REWARD, 100),
    ]);
    asMock(pointLedgerRepo.listByUser).mockResolvedValue([
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD, 100),
    ]);

    const history = await pointService.getPointHistory({ id: "user-1" });

    expect(
      history.filter(
        (item) =>
          item.sourceKey === "billing.point_history.source_registration",
      ),
    ).toHaveLength(1);
    expect(pointLedgerRepo.listByUser).not.toHaveBeenCalled();
  });

  it("沒有註冊獎勵就不憑空產生一筆", async () => {
    const history = await pointService.getPointHistory({ id: "user-1" });
    expect(history).toEqual([]);
  });

  /**
   * Info: (20261015 - Luphia) 原本比對字面量 "CHECKIN_REWARD"，而訂單型別是
   * CHECK_IN_REWARD——簽到獎勵落到「消費」分支，被顯示成一筆服務使用。
   */
  it("歷史簽到獎勵顯示為獎勵而不是消費", async () => {
    asMock(paymentRepo.getOrdersByUserId).mockResolvedValue([
      order(ORDER_TYPE.CHECK_IN_REWARD, 10),
    ]);

    const history = await pointService.getPointHistory({ id: "user-1" });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      type: "REWARD",
      sourceKey: "billing.point_history.source_checkin",
    });
  });

  it("帳本讀取失敗不讓整份歷程失敗", async () => {
    asMock(paymentRepo.getOrdersByUserId).mockResolvedValue([
      order(ORDER_TYPE.ADMIN_ISSUED, 50, { adminIssued: true }),
    ]);
    asMock(pointLedgerRepo.listByUser).mockRejectedValue(new Error("db"));

    const history = await pointService.getPointHistory({ id: "user-1" });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ type: "REWARD", amount: BigInt(50) });
  });
});

describe("發點入口的冪等鍵", () => {
  it("註冊獎勵以 registration(userId) 為鍵", async () => {
    await grantRegistrationReward("user-1");

    expect(creditPoints).toHaveBeenCalledWith({
      userId: "user-1",
      amount: REWARD_AMOUNTS.REGISTRATION_REWARD,
      entryType: POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
      idempotencyKey: POINT_LEDGER_KEY.registration("user-1"),
    });
  });

  it("活動贈點以 campaign(registrationId) 為鍵，失敗不丟錯", async () => {
    await expect(
      grantCampaignBonus({
        userId: "user-1",
        registrationId: "reg-1",
        bonusPoints: 30,
      }),
    ).resolves.toBe(true);
    expect(creditPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: POINT_LEDGER_ENTRY_TYPE.CAMPAIGN_BONUS,
        idempotencyKey: POINT_LEDGER_KEY.campaign("reg-1"),
        amount: 30,
      }),
    );

    asMock(creditPoints).mockRejectedValue(new Error("db"));
    await expect(
      grantCampaignBonus({
        userId: "user-1",
        registrationId: "reg-1",
        bonusPoints: 30,
      }),
    ).resolves.toBe(false);
  });

  it("後台發放把建單與入帳交給同一筆交易", async () => {
    asMock(paymentRepo.createOrderWithPointCredit).mockResolvedValue({
      id: "order-9",
    });

    await expect(
      issuePointsByAdmin({
        targetUserId: "user-1",
        amount: BigInt(200),
        adminUserId: "admin-1",
      }),
    ).resolves.toEqual({ orderId: "order-9" });

    const [orderInput, credit] = asMock(paymentRepo.createOrderWithPointCredit)
      .mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(orderInput).toMatchObject({
      userId: "user-1",
      type: ORDER_TYPE.ADMIN_ISSUED,
      status: ORDER_STATUS.COMPLETED,
      amount: BigInt(200),
    });
    expect(orderInput).not.toHaveProperty("transactionHash");
    expect(credit).toMatchObject({
      userId: "user-1",
      amount: BigInt(200),
      entryType: POINT_LEDGER_ENTRY_TYPE.ADMIN_ISSUED,
    });
  });
});

describe("點數快照與會員 EXP", () => {
  /**
   * Info: (20261015 - Luphia) isVerified = 註冊獎勵已入帳（保守：沒入帳就是未完成）。
   * 前端以它決定付款前要不要先打 /api/v1/user/kyc，而那支補發的正是這一筆。
   */
  it("isVerified 以註冊獎勵是否入帳判斷", async () => {
    asMock(getPointBalance).mockResolvedValue(BigInt(130));
    asMock(pointLedgerRepo.findByIdempotencyKey).mockResolvedValue(null);

    await expect(getPointAccountSnapshot("user-1")).resolves.toEqual({
      credits: "130",
      isVerified: false,
    });
    expect(pointLedgerRepo.findByIdempotencyKey).toHaveBeenCalledWith(
      POINT_LEDGER_KEY.registration("user-1"),
    );

    asMock(pointLedgerRepo.findByIdempotencyKey).mockResolvedValue(
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD, 100),
    );
    await expect(getPointAccountSnapshot("user-1")).resolves.toMatchObject({
      isVerified: true,
    });
  });

  it("EXP 是累計入帳，排除退款、調整與消費", async () => {
    asMock(pointLedgerRepo.listByUser).mockResolvedValue([
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD, 100),
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.PURCHASE, 300),
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION, 50),
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.CONSUME, -80),
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.REFUND, 80),
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.ADJUST, 1000),
    ]);

    await expect(getMembershipExp("user-1")).resolves.toEqual({
      exp: "450",
      tier: MEMBERSHIP_TIER.BRONZE,
    });
  });

  it.each([
    [499, MEMBERSHIP_TIER.BRONZE],
    [500, MEMBERSHIP_TIER.SILVER],
    [2000, MEMBERSHIP_TIER.GOLD],
  ])("EXP %s → %s", async (exp, tier) => {
    asMock(pointLedgerRepo.listByUser).mockResolvedValue([
      ledgerEntry(POINT_LEDGER_ENTRY_TYPE.PURCHASE, exp),
    ]);
    await expect(getMembershipExp("user-1")).resolves.toMatchObject({ tier });
  });
});
