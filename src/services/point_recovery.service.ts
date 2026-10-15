import { Prisma } from "@/generated";
import { CURRENCY_UNIT, REWARD_AMOUNTS } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import {
  POINT_LEDGER_ENTRY_TYPE,
  POINT_LEDGER_KEY,
  POINT_LEDGER_OUTCOME,
  PointLedgerEntryType,
} from "@/constants/point_ledger";
import { MEMBER_ALLOCATION_KIND } from "@/constants/subscription_quota";
import { resolveMemberAllocationCredits } from "@/lib/quota/member_allocation";
import {
  IRecoveryCampaignRow,
  IRecoveryExistingEntryRow,
  IRecoveryOrderRow,
  IRecoveryTeamLedgerRow,
  IRecoveryUserRow,
  pointRecoveryRepo,
} from "@/repositories/point_recovery.repo";
import { pointLedgerRepo } from "@/repositories/point_ledger.repo";

/**
 * Info: (20261015 - Luphia) 依 DB 紀錄重建個人點數（區塊鏈損毀後的一次性復原，可重跑）。
 *
 * 鏈上餘額已無法讀取，因此以「每一筆曾經讓點數進出的 DB 紀錄」重建帳本：
 *
 * 入帳
 * - 購點（OEN_PAYMENT / BILLING_POINT）：`data.credits`。COMPLETED 之外，
 *   PAID（扣款成功、鑄點未確認）與 MINT_FAILED（扣款成功、鑄點失敗）也補發——
 *   使用者付了錢，鏈上有沒有鑄成已無從得知，一律視為欠他的（產品拍板 20261015）。
 * - 後台發放（ADMIN_ISSUED，無 data.teamId）、歷史簽到獎勵（CHECK_IN_REWARD）。
 * - 註冊獎勵：有 REGISTRATION_REWARD 訂單用訂單金額；沒有的使用者一律補
 *   `REWARD_AMOUNTS.REGISTRATION_REWARD`（原本由合約鑄造、DB 無紀錄；拍板 20261015）。
 * - 活動贈點：每筆 CampaignRegistration 的 `bonusPoints`（DB 未記錄鑄造成敗，一律計入）。
 * - 團隊分配：`resolveMemberAllocationCredits`（lib/quota/member_allocation）判定「實際給到成員」的
 *   ALLOCATE 與遷移的 `migrate-allocation:` ADJUST。遷移前的離鏈 ALLOCATE **不計**——
 *   它剩下的部分已由遷移分錄計入（20261015 修正：第一版把兩者都算，會重複入帳）。
 *   依舊規則已寫入、現在不符的 TEAM_ALLOCATION 分錄，以反向 ADJUST 撤銷。
 * - 退款：已扣款的消費訂單帶 `data.refundedAt` 或 `data.refundOwed`（欠款一併結清）。
 *
 * 出帳
 * - ICP 負數訂單、狀態為 PAID / EXECUTING / COMPLETED / FAILED（付款後才失敗），
 *   且不是團隊額度支付（`verifiedVia: team_quota` 不動個人點數）。
 * - PAYING（鏈上付款在途）**不扣**：鏈已損毀無從確認，視為未付款並終結為 PAYMENT_FAILED。
 *
 * 冪等：每筆的鍵與線上流程相同（`POINT_LEDGER_KEY`），因此可以重跑、也可以在
 * 新版上線、已有新分錄之後再跑，不會重複入帳。
 */

const PERSONAL_PURCHASE_TYPES: ReadonlySet<string> = new Set([
  ORDER_TYPE.OEN_PAYMENT,
  ORDER_TYPE.BILLING_POINT,
]);

const PURCHASE_CREDITED_STATUSES: ReadonlySet<string> = new Set([
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.PAID,
  ORDER_STATUS.MINT_FAILED,
]);

const DEBITED_STATUSES: ReadonlySet<string> = new Set([
  ORDER_STATUS.PAID,
  ORDER_STATUS.EXECUTING,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.FAILED,
]);

// Info: (20261015 - Luphia) 團隊額度支付的訂單標記（見 team_quota_payment route）
const TEAM_QUOTA_VERIFIED_VIA = "team_quota";
// Info: (20261015 - Luphia) 線上分配與復原指令共用的團隊分配分錄鍵前綴（見 POINT_LEDGER_KEY.teamAllocation）
const TEAM_ALLOCATION_KEY_PREFIX = POINT_LEDGER_KEY.teamAllocation("");

/**
 * Info: (20261015 - Luphia) 早期簽到獎勵訂單的型別字串（常數化之前寫入的歷史列）。
 * 點數歷程原本比對的就是這個拼法，兩種都要認。
 */
const LEGACY_CHECK_IN_REWARD_TYPE = "CHECKIN_REWARD";

export const LEGACY_PAYING_FAILURE_REASON =
  "chain retired: on-chain payment could not be confirmed";
export const RESTORED_NOTE = "restored from DB records after chain retirement";

export interface IRecoveryEntry {
  userId: string;
  amount: bigint;
  entryType: PointLedgerEntryType;
  idempotencyKey: string;
  orderId?: string;
  sourceRef?: string;
  note: string;
}

export interface IRecoveryPlan {
  entries: IRecoveryEntry[];
  // Info: (20261015 - Luphia) 補發後要推進到 COMPLETED 的購點訂單（原狀態 PAID / MINT_FAILED）
  purchasesToSettle: { orderId: string; fromStatus: string }[];
  // Info: (20261015 - Luphia) 鏈上付款在途、不扣款並終結為 PAYMENT_FAILED 的舊訂單
  legacyPayingOrderIds: string[];
  // Info: (20261015 - Luphia) 規則未涵蓋、需要人工確認的紀錄（不入帳）
  anomalies: string[];
}

export interface IRecoveryInput {
  users: IRecoveryUserRow[];
  orders: IRecoveryOrderRow[];
  campaignRegistrations: IRecoveryCampaignRow[];
  teamLedger: IRecoveryTeamLedgerRow[];
  // Info: (20261015 - Luphia) 帳本裡既有的 TEAM_ALLOCATION 分錄（用來撤銷舊規則誤發的部分）
  existingTeamAllocations: IRecoveryExistingEntryRow[];
}

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readVerifiedVia(signature: string | null): string | null {
  if (!signature) return null;
  try {
    const parsed: unknown = JSON.parse(signature);
    if (parsed && typeof parsed === "object" && "verifiedVia" in parsed) {
      const via = (parsed as { verifiedVia: unknown }).verifiedVia;
      return typeof via === "string" ? via : null;
    }
  } catch {
    // Info: (20261015 - Luphia) 早期訂單的 signature 是 WebAuthn 原始簽章，不是 JSON
  }
  return null;
}

function readPositiveInteger(value: unknown): bigint | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function planOrder(order: IRecoveryOrderRow, plan: IRecoveryPlan): void {
  const data = asObject(order.data);

  if (PERSONAL_PURCHASE_TYPES.has(order.type)) {
    if (!PURCHASE_CREDITED_STATUSES.has(order.status)) return;
    const credits = readPositiveInteger(data.credits);
    if (credits === null) {
      plan.anomalies.push(
        `order ${order.id} (${order.type}/${order.status}) has no positive data.credits`,
      );
      return;
    }
    plan.entries.push({
      userId: order.userId,
      amount: credits,
      entryType: POINT_LEDGER_ENTRY_TYPE.PURCHASE,
      idempotencyKey: POINT_LEDGER_KEY.orderCredit(order.id),
      orderId: order.id,
      note: RESTORED_NOTE,
    });
    if (order.status !== ORDER_STATUS.COMPLETED) {
      plan.purchasesToSettle.push({
        orderId: order.id,
        fromStatus: order.status,
      });
    }
    return;
  }

  if (order.unit !== CURRENCY_UNIT.ICP) return;

  if (order.type === ORDER_TYPE.ADMIN_ISSUED) {
    // Info: (20261015 - Luphia) 帶 teamId 的是團隊入池，掛在操作管理員名下但不是他的點數
    if (data.teamId) return;
    if (order.status !== ORDER_STATUS.COMPLETED || order.amount <= 0) return;
    plan.entries.push({
      userId: order.userId,
      amount: order.amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.ADMIN_ISSUED,
      idempotencyKey: POINT_LEDGER_KEY.orderCredit(order.id),
      orderId: order.id,
      note: RESTORED_NOTE,
    });
    return;
  }

  if (order.type === ORDER_TYPE.REGISTRATION_REWARD) {
    if (order.status !== ORDER_STATUS.COMPLETED || order.amount <= 0) return;
    plan.entries.push({
      userId: order.userId,
      amount: order.amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
      // Info: (20261015 - Luphia) 以使用者為鍵：註冊獎勵一人一次，與線上發放共用
      idempotencyKey: POINT_LEDGER_KEY.registration(order.userId),
      orderId: order.id,
      note: RESTORED_NOTE,
    });
    return;
  }

  if (
    order.type === ORDER_TYPE.CHECK_IN_REWARD ||
    order.type === LEGACY_CHECK_IN_REWARD_TYPE
  ) {
    if (order.status !== ORDER_STATUS.COMPLETED || order.amount <= 0) return;
    plan.entries.push({
      userId: order.userId,
      amount: order.amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.CHECK_IN_REWARD,
      idempotencyKey: POINT_LEDGER_KEY.orderCredit(order.id),
      orderId: order.id,
      note: RESTORED_NOTE,
    });
    return;
  }

  if (order.amount < 0) {
    if (readVerifiedVia(order.signature) === TEAM_QUOTA_VERIFIED_VIA) return;

    if (order.status === ORDER_STATUS.PAYING) {
      plan.legacyPayingOrderIds.push(order.id);
      return;
    }
    if (!DEBITED_STATUSES.has(order.status)) return;

    plan.entries.push({
      userId: order.userId,
      amount: order.amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.CONSUME,
      idempotencyKey: POINT_LEDGER_KEY.orderDebit(order.id),
      orderId: order.id,
      note: RESTORED_NOTE,
    });

    if (data.refundedAt || data.refundOwed === true) {
      plan.entries.push({
        userId: order.userId,
        amount: -order.amount,
        entryType: POINT_LEDGER_ENTRY_TYPE.REFUND,
        idempotencyKey: POINT_LEDGER_KEY.orderRefund(order.id),
        orderId: order.id,
        note: RESTORED_NOTE,
      });
    }
    return;
  }

  if (order.amount > 0 && order.status === ORDER_STATUS.COMPLETED) {
    plan.anomalies.push(
      `order ${order.id} is a completed positive ICP order of unhandled type ${order.type}`,
    );
  }
}

function planTeamLedger(
  rows: IRecoveryTeamLedgerRow[],
  existing: IRecoveryExistingEntryRow[],
  plan: IRecoveryPlan,
): void {
  const { credits, skipped } = resolveMemberAllocationCredits(rows);
  for (const skip of skipped) {
    plan.anomalies.push(`team ledger ${skip.ledgerId}: ${skip.reason}`);
  }

  const qualifying = new Set<string>();
  for (const credit of credits) {
    const isMigration = credit.kind === MEMBER_ALLOCATION_KIND.MIGRATION;
    const idempotencyKey = isMigration
      ? POINT_LEDGER_KEY.teamMigration(credit.ledgerId)
      : POINT_LEDGER_KEY.teamAllocation(credit.ledgerId);
    qualifying.add(idempotencyKey);
    plan.entries.push({
      userId: credit.userId,
      amount: credit.amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
      idempotencyKey,
      sourceRef: credit.ledgerId,
      note: RESTORED_NOTE,
    });
  }

  /**
   * Info: (20261015 - Luphia) 撤銷第一版規則誤發的分配：遷移前的離鏈 ALLOCATE 曾被當成給到成員。
   * 只看 `team-allocate:` 鍵（線上分配也用這把鍵，但線上分配一定符合現行規則，不會被撤）。
   */
  for (const entry of existing) {
    if (!entry.idempotencyKey.startsWith(TEAM_ALLOCATION_KEY_PREFIX)) continue;
    if (qualifying.has(entry.idempotencyKey)) continue;
    plan.entries.push({
      userId: entry.userId,
      amount: -entry.amount,
      entryType: POINT_LEDGER_ENTRY_TYPE.ADJUST,
      idempotencyKey: POINT_LEDGER_KEY.teamAllocationReversal(entry.id),
      sourceRef: entry.sourceRef ?? undefined,
      note: "reverse team allocation credited twice (pre-migration off-chain ALLOCATE)",
    });
  }
}

/**
 * Info: (20261015 - Luphia) 純函式：由 DB 紀錄算出應寫入的帳本分錄。
 * 不讀 DB、不寫 DB，規則可以逐條單測。
 */
export function buildRecoveryPlan(input: IRecoveryInput): IRecoveryPlan {
  const plan: IRecoveryPlan = {
    entries: [],
    purchasesToSettle: [],
    legacyPayingOrderIds: [],
    anomalies: [],
  };
  const userIds = new Set(input.users.map((u) => u.id));

  for (const order of input.orders) planOrder(order, plan);

  const usersWithRegistrationOrder = new Set(
    plan.entries
      .filter(
        (e) => e.entryType === POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
      )
      .map((e) => e.userId),
  );
  for (const user of input.users) {
    if (usersWithRegistrationOrder.has(user.id)) continue;
    plan.entries.push({
      userId: user.id,
      amount: BigInt(REWARD_AMOUNTS.REGISTRATION_REWARD),
      entryType: POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
      idempotencyKey: POINT_LEDGER_KEY.registration(user.id),
      note: RESTORED_NOTE,
    });
  }

  for (const reg of input.campaignRegistrations) {
    if (reg.bonusPoints <= 0) continue;
    plan.entries.push({
      userId: reg.userId,
      amount: BigInt(reg.bonusPoints),
      entryType: POINT_LEDGER_ENTRY_TYPE.CAMPAIGN_BONUS,
      idempotencyKey: POINT_LEDGER_KEY.campaign(reg.id),
      sourceRef: reg.id,
      note: `${RESTORED_NOTE} (${reg.campaignName})`,
    });
  }

  planTeamLedger(input.teamLedger, input.existingTeamAllocations, plan);

  // Info: (20261015 - Luphia) 只針對指定使用者時，團隊分錄等全域來源也要濾掉別人的
  plan.entries = plan.entries.filter((e) => userIds.has(e.userId));

  // Info: (20261015 - Luphia) 同一把鍵只留第一筆（例如同一人有兩張註冊獎勵訂單）
  const seen = new Set<string>();
  plan.entries = plan.entries.filter((e) => {
    if (seen.has(e.idempotencyKey)) return false;
    seen.add(e.idempotencyKey);
    return true;
  });

  return plan;
}

export interface IRecoveryUserSummary {
  userId: string;
  credited: bigint;
  debited: bigint;
  net: bigint;
}

export function summarizePlan(plan: IRecoveryPlan): IRecoveryUserSummary[] {
  const byUser = new Map<string, IRecoveryUserSummary>();
  for (const entry of plan.entries) {
    const row = byUser.get(entry.userId) ?? {
      userId: entry.userId,
      credited: BigInt(0),
      debited: BigInt(0),
      net: BigInt(0),
    };
    if (entry.amount >= 0) row.credited += entry.amount;
    else row.debited += -entry.amount;
    row.net += entry.amount;
    byUser.set(entry.userId, row);
  }
  return [...byUser.values()];
}

export async function loadRecoveryPlan(
  userId?: string,
): Promise<IRecoveryPlan> {
  const [users, orders, campaignRegistrations, teamLedger, existing] =
    await Promise.all([
      pointRecoveryRepo.listUsers(userId),
      pointRecoveryRepo.listOrders(userId),
      pointRecoveryRepo.listCampaignRegistrations(userId),
      pointRecoveryRepo.listTeamAllocationLedger(),
      pointRecoveryRepo.listExistingTeamAllocationEntries(userId),
    ]);
  return buildRecoveryPlan({
    users,
    orders,
    campaignRegistrations,
    teamLedger,
    existingTeamAllocations: existing,
  });
}

export interface IRecoveryApplyResult {
  applied: number;
  duplicated: number;
  failed: { idempotencyKey: string; reason: string }[];
  settledPurchases: number;
  failedLegacyPaying: number;
}

export async function applyRecoveryPlan(
  plan: IRecoveryPlan,
): Promise<IRecoveryApplyResult> {
  const result: IRecoveryApplyResult = {
    applied: 0,
    duplicated: 0,
    failed: [],
    settledPurchases: 0,
    failedLegacyPaying: 0,
  };

  for (const entry of plan.entries) {
    const outcome = await pointLedgerRepo.applyEntry({
      userId: entry.userId,
      amount: entry.amount,
      entryType: entry.entryType,
      idempotencyKey: entry.idempotencyKey,
      orderId: entry.orderId,
      sourceRef: entry.sourceRef,
      note: entry.note,
      // Info: (20261015 - Luphia) 歷史分錄的寫入順序不等於當時鏈上的發生順序，中途可能暫時為負
      allowNegative: true,
    });
    if (outcome.outcome === POINT_LEDGER_OUTCOME.OK) result.applied += 1;
    else if (outcome.outcome === POINT_LEDGER_OUTCOME.DUPLICATE) {
      result.duplicated += 1;
    } else {
      result.failed.push({
        idempotencyKey: entry.idempotencyKey,
        reason: outcome.outcome,
      });
    }
  }

  for (const { orderId, fromStatus } of plan.purchasesToSettle) {
    if (
      await pointRecoveryRepo.settleRestoredPurchase(
        orderId,
        fromStatus,
        RESTORED_NOTE,
      )
    ) {
      result.settledPurchases += 1;
    }
  }

  for (const orderId of plan.legacyPayingOrderIds) {
    if (
      await pointRecoveryRepo.failLegacyPayingOrder(
        orderId,
        LEGACY_PAYING_FAILURE_REASON,
      )
    ) {
      result.failedLegacyPaying += 1;
    }
  }

  return result;
}

export interface IBalanceMismatch {
  userId: string;
  cached: bigint;
  ledger: bigint;
}

// Info: (20261015 - Luphia) 勾稽：`User.pointBalance` 快取必須等於帳本加總
export async function verifyBalances(userId?: string): Promise<{
  checked: number;
  mismatches: IBalanceMismatch[];
  negatives: IBalanceMismatch[];
}> {
  const [users, sums] = await Promise.all([
    pointRecoveryRepo.listUsers(userId),
    pointRecoveryRepo.sumLedgerByUser(),
  ]);
  const mismatches: IBalanceMismatch[] = [];
  const negatives: IBalanceMismatch[] = [];
  for (const user of users) {
    const ledger = sums.get(user.id) ?? BigInt(0);
    const row = { userId: user.id, cached: user.pointBalance, ledger };
    if (ledger !== user.pointBalance) mismatches.push(row);
    if (ledger < 0) negatives.push(row);
  }
  return { checked: users.length, mismatches, negatives };
}

export async function repairBalanceCache(
  mismatches: IBalanceMismatch[],
): Promise<void> {
  for (const row of mismatches) {
    await pointRecoveryRepo.overwriteBalanceCache(row.userId, row.ledger);
  }
}
