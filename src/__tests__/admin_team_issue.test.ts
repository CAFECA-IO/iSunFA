import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { issueTeamCreditsByAdmin } from "@/services/team_wallet.service";
import { teamRepo } from "@/repositories/team.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { WALLET_OP_OUTCOME } from "@/constants/subscription_quota";

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamById: jest.fn() },
}));
jest.mock("@/repositories/team_wallet.repo", () => ({
  teamWalletRepo: { creditPool: jest.fn() },
}));
jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    createOrder: jest.fn(),
    // Info: (20260815 - Luphia) 冪等查詢（PR #6652 第二輪 C-9）
    findOrderByIdempotencyKey: jest.fn(async () => null),
  },
}));

/**
 * Info: (20260813 - Luphia) 後台發放點數給團隊（/admin/user）。
 * 重點：入的是離鏈錢包而非鏈上 mint、留下可追溯的訂單、錢包凍結時不得入帳。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

describe("issueTeamCreditsByAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamRepo.getTeamById).mockResolvedValue({ id: "team-1" });
    asMock(paymentRepo.createOrder).mockResolvedValue({ id: "order-1" });
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(null);
    asMock(teamWalletRepo.creditPool).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
    });
  });

  it("credits the team wallet pool and records an auditable order", async () => {
    const result = await issueTeamCreditsByAdmin({
      teamId: "team-1",
      credits: BigInt(500),
      operatorUserId: "admin-1",
    });

    expect(paymentRepo.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        type: "ADMIN_ISSUED",
        amount: BigInt(500),
        // Info: (20260813 - Luphia) data.teamId 是這筆屬於團隊而非管理員個人的唯一線索
        data: expect.objectContaining({ teamId: "team-1" }),
      }),
    );
    expect(teamWalletRepo.creditPool).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        credits: BigInt(500),
        orderId: "order-1",
        // Info: (20260815 - Luphia) 鍵改由操作者 + 團隊 + 金額 + 分鐘桶推導（第二輪 C-9）
        idempotencyKey: expect.stringContaining("admin-issue:admin-1:team-1:"),
      }),
    );
    expect(result).toEqual({ orderId: "order-1", credits: "500" });
  });

  it("rejects a non-positive amount before touching any ledger", async () => {
    await expect(
      issueTeamCreditsByAdmin({
        teamId: "team-1",
        credits: BigInt(0),
        operatorUserId: "admin-1",
      }),
    ).rejects.toMatchObject({ code: "TW000007" });
    expect(paymentRepo.createOrder).not.toHaveBeenCalled();
  });

  it("rejects an unknown team", async () => {
    asMock(teamRepo.getTeamById).mockResolvedValue(null);
    await expect(
      issueTeamCreditsByAdmin({
        teamId: "ghost",
        credits: BigInt(10),
        operatorUserId: "admin-1",
      }),
      // Info: (20260818 - Luphia) NF_TEAM 的碼由 NF000017 改為 NF000024（第五輪 B-1）
    ).rejects.toMatchObject({ code: "NF000024" });
    expect(teamWalletRepo.creditPool).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 凍結的意思就是「這本帳現在不可信」：
   * 往裡面加點數只會讓人工核帳更難，因此必須擋下。
   */
  it("refuses to credit a frozen wallet", async () => {
    asMock(teamWalletRepo.creditPool).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(
      issueTeamCreditsByAdmin({
        teamId: "team-1",
        credits: BigInt(10),
        operatorUserId: "admin-1",
      }),
    ).rejects.toMatchObject({ code: "TW000005" });
  });

  /**
   * Info: (20260815 - Luphia) 連點兩下不該發兩次（PR #6652 第二輪 C-9）。
   *
   * 原本的冪等鍵是 `admin-issue:{order.id}`，而 order 是這一次剛建的——
   * 對重複點擊提供的保護是 0：建兩張單、入帳兩次。而發點等同發錢。
   */
  it("does not issue twice for a repeated click", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      id: "order-existing",
    });

    const result = await issueTeamCreditsByAdmin({
      teamId: "team-1",
      credits: BigInt(500),
      operatorUserId: "admin-1",
      nowMs: 1_760_000_000_000,
    });

    expect(result.orderId).toBe("order-existing");
    expect(paymentRepo.createOrder).not.toHaveBeenCalled();
    expect(teamWalletRepo.creditPool).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260815 - Luphia) 鍵由「操作者 + 團隊 + 金額 + 分鐘桶」推導，
   * 且訂單與入帳共用同一把——兩層防護指向同一件事，不會各擋各的。
   */
  it("derives a stable key from the operator, team, amount and minute", async () => {
    await issueTeamCreditsByAdmin({
      teamId: "team-1",
      credits: BigInt(500),
      operatorUserId: "admin-1",
      nowMs: 1_760_000_000_000,
    });

    const expectedKey = `admin-issue:admin-1:team-1:500:${Math.floor(
      1_760_000_000_000 / 60_000,
    )}`;
    expect(paymentRepo.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: expectedKey }),
    );
    expect(teamWalletRepo.creditPool).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: expectedKey }),
    );
  });
});
