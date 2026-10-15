import { Order } from "@/generated";
import { CURRENCY_UNIT, REWARD_AMOUNTS } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import {
  POINT_LEDGER_ENTRY_TYPE,
  POINT_LEDGER_KEY,
  POINT_LEDGER_OUTCOME,
} from "@/constants/point_ledger";
import {
  MEMBERSHIP_EXP_ENTRY_TYPES,
  MEMBERSHIP_TIER,
  MEMBERSHIP_TIER_THRESHOLD,
  MembershipTier,
} from "@/constants/point_payment";
import { IOenOrderData } from "@/interfaces/payment";
import { paymentRepo } from "@/repositories/payment.repo";
import { pointLedgerRepo } from "@/repositories/point_ledger.repo";
import type { IPointLedgerResult } from "@/repositories/point_ledger.repo";
import { creditPoints, getPointBalance } from "@/services/point_ledger.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261015 - Luphia) 個人點數的發放與查詢（區塊鏈退役）。
 *
 * 原本這些事都經過 MembershipSystem 合約（`member.service`）：註冊獎勵是
 * `registerUser`、購點／後台發放／活動贈點是 `issuePurchasedPoints`、
 * 會員 EXP 讀合約上的累計值。自建鏈損毀後，個人點數以 DB 帳本為唯一真相，
 * 這裡是那些入口的 DB 版本。每一筆都以「來源」產生冪等鍵（`POINT_LEDGER_KEY`），
 * 與復原指令共用，重試或補跑都只入帳一次。
 */

export interface IPointAccountSnapshot {
  // Info: (20261015 - Luphia) 整數點數的十進位字串（BigInt 不能直接 JSON 序列化）
  credits: string;
  isVerified: boolean;
}

export interface IMembershipExp {
  exp: string;
  tier: MembershipTier;
}

function isCredited(result: IPointLedgerResult): boolean {
  return (
    result.outcome === POINT_LEDGER_OUTCOME.OK ||
    result.outcome === POINT_LEDGER_OUTCOME.DUPLICATE
  );
}

/**
 * Info: (20261015 - Luphia) 註冊獎勵（取代 MembershipSystem.registerUser）。
 *
 * 合約版本對同一個地址只發一次；這裡以 `registration(userId)` 為鍵達到同一件事，
 * 因此登入（checkin）與 KYC 兩個入口重複呼叫都安全。
 */
export async function grantRegistrationReward(
  userId: string,
): Promise<IPointLedgerResult> {
  return creditPoints({
    userId,
    amount: REWARD_AMOUNTS.REGISTRATION_REWARD,
    entryType: POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
    idempotencyKey: POINT_LEDGER_KEY.registration(userId),
  });
}

/**
 * Info: (20261015 - Luphia) 活動報名贈點（取代報名後的 issuePurchasedPoints）。
 *
 * 失敗不讓報名失敗：報名紀錄已經寫入，而復原指令以同一把鍵依報名紀錄補發，
 * 所以這裡留 log 讓它可追，而不是把一筆成功的報名回報成失敗。
 */
export async function grantCampaignBonus(params: {
  userId: string;
  registrationId: string;
  bonusPoints: number;
}): Promise<boolean> {
  const { userId, registrationId, bonusPoints } = params;
  if (!Number.isInteger(bonusPoints) || bonusPoints <= 0) return false;
  try {
    const result = await creditPoints({
      userId,
      amount: bonusPoints,
      entryType: POINT_LEDGER_ENTRY_TYPE.CAMPAIGN_BONUS,
      idempotencyKey: POINT_LEDGER_KEY.campaign(registrationId),
      sourceRef: registrationId,
    });
    if (isCredited(result)) return true;
    logger.error("campaign bonus not credited", {
      userId,
      registrationId,
      outcome: result.outcome,
    });
    return false;
  } catch (error) {
    logger.error("campaign bonus credit failed", {
      userId,
      registrationId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Info: (20261015 - Luphia) 後台發放點數給個人（取代「先鑄造、再建單」）。
 *
 * 建單與入帳在同一筆交易（見 `createOrderWithPointCredit`）：原本鑄造成功而建單失敗時，
 * 點數發出去了卻查無紀錄；反過來的順序則會留下一張沒有點數的已完成訂單。
 */
export async function issuePointsByAdmin(params: {
  targetUserId: string;
  amount: bigint;
  adminUserId: string;
}): Promise<{ orderId: string }> {
  const { targetUserId, amount, adminUserId } = params;
  if (amount <= BigInt(0)) {
    throw new Error("admin issue amount must be a positive integer");
  }
  const order = await paymentRepo.createOrderWithPointCredit(
    {
      userId: targetUserId,
      type: ORDER_TYPE.ADMIN_ISSUED,
      amount,
      unit: CURRENCY_UNIT.ICP,
      status: ORDER_STATUS.COMPLETED,
      challenge: "admin_distribute",
      data: { adminIssued: true, issuedBy: adminUserId },
    },
    {
      userId: targetUserId,
      amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.ADMIN_ISSUED,
      note: `issued by ${adminUserId}`,
    },
  );
  return { orderId: order.id };
}

/**
 * Info: (20261015 - Luphia) 綁卡直扣（checkout）的個人購點履行：入帳後標記 COMPLETED。
 *
 * 原本是鑄造鏈上點數、**拿得到 txHash 才**標 COMPLETED——沒有 txHash 的成功
 * 會讓訂單停在 PAID。帳本沒有交易哈希，完成與否只看入帳結果。
 *
 * 沒有點數的訂單（ON_PREMISE、SOLUTION 等只收款不發點的型別）直接完成：
 * 原本它們走同一條路鑄 0 點，結果也是完成。
 */
export async function fulfillPersonalPointPurchase(order: Order): Promise<{
  completed: boolean;
  message?: string;
}> {
  const credits = Number((order.data as IOenOrderData | null)?.credits ?? 0);
  if (!Number.isFinite(credits) || !Number.isInteger(credits)) {
    return { completed: false, message: "order credits is not an integer" };
  }

  if (credits > 0) {
    const result = await creditPoints({
      userId: order.userId,
      amount: credits,
      entryType: POINT_LEDGER_ENTRY_TYPE.PURCHASE,
      idempotencyKey: POINT_LEDGER_KEY.orderCredit(order.id),
      orderId: order.id,
    });
    if (!isCredited(result)) {
      return { completed: false, message: `credit ${result.outcome}` };
    }
  }

  await paymentRepo.updateOrderCompleted(order.id);
  return { completed: true };
}

/**
 * Info: (20261015 - Luphia) `/auth/me` 的點數快照（取代前端直接讀鏈上 balanceOf / isBlacklisted）。
 *
 * `isVerified` 原本是「不在 DynamicKycMembership 黑名單上」。DB 沒有黑名單，
 * 而 `User.kycData` 從未被寫入（`updateKYCData` 的呼叫一直是註解掉的），
 * 拿它當依據等於宣告全站都沒驗證。前端用這個值決定「付款前要不要先跑一次
 * `/api/v1/user/kyc`」，而那支現在做的事就是補發註冊獎勵——所以這裡改成
 * **註冊獎勵已入帳**：保守（沒入帳就視為未完成），而且答案與那支端點的效果同源，
 * 跑過一次就會翻成 true，不會每次付款都再跑。
 */
export async function getPointAccountSnapshot(
  userId: string,
): Promise<IPointAccountSnapshot> {
  const [balance, registration] = await Promise.all([
    getPointBalance(userId),
    pointLedgerRepo.findByIdempotencyKey(POINT_LEDGER_KEY.registration(userId)),
  ]);
  return {
    credits: balance.toString(),
    isVerified: registration !== null,
  };
}

/**
 * Info: (20261015 - Luphia) 會員 EXP 與等級（取代讀 MembershipSystem 的累計值）。
 *
 * 定義見 `MEMBERSHIP_EXP_ENTRY_TYPES`：累計入帳，排除退款與人工調整。
 * 合約上的「最後簽到時間」等純鏈上欄位不再提供。
 */
export async function getMembershipExp(
  userId: string,
): Promise<IMembershipExp> {
  const entries = await pointLedgerRepo.listByUser(userId);
  const exp = entries
    .filter(
      (entry) =>
        entry.amount > BigInt(0) &&
        MEMBERSHIP_EXP_ENTRY_TYPES.includes(entry.entryType),
    )
    .reduce((sum, entry) => sum + entry.amount, BigInt(0));

  const tier =
    exp >= MEMBERSHIP_TIER_THRESHOLD.GOLD
      ? MEMBERSHIP_TIER.GOLD
      : exp >= MEMBERSHIP_TIER_THRESHOLD.SILVER
        ? MEMBERSHIP_TIER.SILVER
        : MEMBERSHIP_TIER.BRONZE;

  return { exp: exp.toString(), tier };
}
