import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import {
  teamWalletRepo,
  creditPoolInTx,
} from "@/repositories/team_wallet.repo";
import { runWalletConservationAudit } from "@/services/cron/wallet_audit.cron";
import {
  ALLOCATE_OFFCHAIN_EXIT_PREFIX,
  TEAM_WALLET_ENTRY_TYPE,
  TEAM_WALLET_STATUS,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { CURRENCY_UNIT } from "@/constants/price";

/**
 * Info: (20260818 - Luphia) 分配之後守恆勾稽必須通過（真資料庫）。
 *
 * 這條**只有真資料庫測得出來**。`wallet_audit.test.ts` 把 repo 整包 mock 掉，因此它
 * 驗的是「勾稽會不會算」，而不是「`allocate()` 實際寫進去的東西能不能通過勾稽」——
 * 而缺陷正好落在那個縫裡：
 *
 * 分配改為鑄到成員自己的鏈上錢包之後（ADR 015 修訂），`allocate()` 扣了池、寫了一筆
 * 被勾稽排除的 `ALLOCATE`，卻**不再有分配列去承接**那筆餘額。恆等式右側因此少了
 * 分配金額、左側不動，**按一次「分配」就足以讓下一輪勾稽凍結錢包**。
 * 那份 mock fixture 之所以綠，是因為它同時給了 `ALLOCATE 50` 與 `分配餘額 47`——
 * 一種真實資料裡不可能出現的狀態（checklist §1.4）。
 *
 * 因此這一支跑真的 `allocate()` 與真的勾稽，並且**限定在自己那一團**：
 * 勾稽會凍結它掃到的每一個違反者，而開發機的資料庫裡有真實團隊。
 */

// Info: (20260818 - Luphia) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免凍結真實團隊錢包！",
  );
}

const STAMP = Date.now();
const ALLOCATE_KEY = `e2e-conservation-allocate:${STAMP}`;

let teamId = "";
let walletId = "";
let ownerId = "";
let memberId = "";

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: `e2e-conservation-${STAMP}` },
  });
  teamId = team.id;

  const owner = await prisma.user.create({
    data: { address: `e2e_cons_owner_${STAMP}`, name: "E2E owner" },
  });
  const member = await prisma.user.create({
    data: { address: `e2e_cons_member_${STAMP}`, name: "E2E member" },
  });
  ownerId = owner.id;
  memberId = member.id;

  // Info: (20260818 - Luphia) 走真的購點入池：池餘額與 PURCHASE 分錄必須同源
  const order = await prisma.order.create({
    data: {
      userId: ownerId,
      type: ORDER_TYPE.BILLING_POINT,
      // Info: (20260818 - Luphia) BigInt 欄位不接受原生 number（資料庫邊界防護）
      amount: BigInt(1000),
      unit: CURRENCY_UNIT.ICP,
      status: ORDER_STATUS.COMPLETED,
      data: {},
      // Info: (20260818 - Luphia) challenge 為必填（訂單簽章用），e2e 給一個可辨識的值
      challenge: `e2e-conservation-${STAMP}`,
    },
  });
  await prisma.$transaction(async (tx) => {
    const result = await creditPoolInTx(tx, {
      teamId,
      credits: BigInt(1000),
      orderId: order.id,
      operatorUserId: ownerId,
      idempotencyKey: `e2e-conservation-purchase:${STAMP}`,
    });
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
  });

  const wallet = await prisma.teamWallet.findUniqueOrThrow({
    where: { teamId },
  });
  walletId = wallet.id;
});

afterAll(async () => {
  await prisma.teamWalletLedger.deleteMany({
    where: { teamWalletId: walletId },
  });
  await prisma.teamWalletAllocation.deleteMany({ where: { teamId } });
  await prisma.teamWallet.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.order.deleteMany({ where: { userId: ownerId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } });
  await prisma.$disconnect();
});

describe("分配之後的守恆勾稽（真資料庫）", () => {
  it("購點入池之後守恆成立", async () => {
    const result = await runWalletConservationAudit({ teamId });

    expect(result).toEqual({ checked: 1, violations: 0, frozen: [] });
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：分配之後**勾稽仍然通過**。
   *
   * 修法拿掉（刪掉 `allocate()` 裡那筆負的 `ADJUST`）時，這條會紅：
   * violations 1、frozen 含這個錢包。
   */
  it("分配之後守恆仍然成立，錢包不被凍結", async () => {
    const allocated = await teamWalletRepo.allocate({
      teamId,
      targetUserId: memberId,
      amount: BigInt(300),
      operatorUserId: ownerId,
      idempotencyKey: ALLOCATE_KEY,
    });
    expect(allocated.outcome).toBe(WALLET_OP_OUTCOME.OK);

    // Info: (20260818 - Luphia) 前提：池真的少了 300，而且沒有離鏈分配列
    const wallet = await prisma.teamWallet.findUniqueOrThrow({
      where: { id: walletId },
    });
    expect(wallet.unallocatedBalance).toBe(BigInt(700));
    expect(await prisma.teamWalletAllocation.count({ where: { teamId } })).toBe(
      0,
    );

    const result = await runWalletConservationAudit({ teamId });

    expect(result).toEqual({ checked: 1, violations: 0, frozen: [] });
    expect(
      (await prisma.teamWallet.findUniqueOrThrow({ where: { id: walletId } }))
        .status,
    ).toBe(TEAM_WALLET_STATUS.ACTIVE);
  });

  // Info: (20260818 - Luphia) 讓上一條成立的那筆分錄：負的 ADJUST，鍵由原鍵推導
  it("分配寫下一筆配對的負 ADJUST", async () => {
    const exit = await prisma.teamWalletLedger.findUniqueOrThrow({
      where: {
        idempotencyKey: `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}${ALLOCATE_KEY}`,
      },
    });

    expect(exit.entryType).toBe(TEAM_WALLET_ENTRY_TYPE.ADJUST);
    expect(exit.amount).toBe(BigInt(-300));
    expect(exit.targetUserId).toBe(memberId);
  });

  /**
   * Info: (20260818 - Luphia) 缺陷的重現＋修復程序的驗證，一次跑完。
   *
   * 刪掉那筆出帳分錄 → 資料就回到 2026-08-18 之前的形狀（舊帳）。
   * 於是勾稽必須判違反並凍結；`repair_wallet_conservation.ts` 的邏輯補一筆
   * 負 ADJUST 之後，勾稽必須通過，錢包才可以解凍。
   *
   * 這裡刻意直接刪那一列（帳本平時 append-only，此處是為了製造舊資料）。
   */
  it("回到修法之前的資料形狀時會被凍結，補上出帳分錄後可解凍", async () => {
    await prisma.teamWalletLedger.delete({
      where: {
        idempotencyKey: `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}${ALLOCATE_KEY}`,
      },
    });

    const violated = await runWalletConservationAudit({ teamId });
    expect(violated.violations).toBe(1);
    expect(violated.frozen).toEqual([walletId]);
    expect(
      (await prisma.teamWallet.findUniqueOrThrow({ where: { id: walletId } }))
        .status,
    ).toBe(TEAM_WALLET_STATUS.FROZEN);

    // Info: (20260818 - Luphia) 修復：補一筆負 ADJUST（等同 repair 腳本做的事）
    await prisma.teamWalletLedger.create({
      data: {
        teamWalletId: walletId,
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        amount: BigInt(-300),
        poolBalanceAfter: BigInt(700),
        operatorUserId: "system",
        idempotencyKey: `e2e-conservation-repair:${STAMP}`,
      },
    });

    const repaired = await runWalletConservationAudit({ teamId });
    expect(repaired.violations).toBe(0);

    await teamWalletRepo.reactivateWallet(walletId);
    expect(
      (await prisma.teamWallet.findUniqueOrThrow({ where: { id: walletId } }))
        .status,
    ).toBe(TEAM_WALLET_STATUS.ACTIVE);
  });
});
