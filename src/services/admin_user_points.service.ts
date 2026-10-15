import { adminUserPointsRepo } from "@/repositories/admin_user_points.repo";
import {
  allocationSiblingKeys,
  deriveTeamAllocationStatuses,
  sumTeamAllocatedForUser,
  summarisePointLedger,
} from "@/lib/quota/admin_user_points";
import { TEAM_ALLOCATION_RECORD_STATUS } from "@/constants/admin_user_points";
import type {
  IAdminListPage,
  IAdminTeamAllocationRecordView,
  IAdminUserPointsView,
} from "@/interfaces/admin_user_points";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」（區塊鏈退役後個人點數在 DB 帳本）。
 *
 * 只讀：餘額快取對帳本、依型別加總、各團隊實際給到的點數、帳本與團隊分錄清單。
 * 金額內部一律 BigInt，出口才轉字串。
 */

function totalPagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

async function existingSiblingKeys(
  rows: readonly { entryType: string; idempotencyKey: string }[],
): Promise<Set<string>> {
  const keys = allocationSiblingKeys(rows);
  if (keys.length === 0) return new Set();
  return new Set(await adminUserPointsRepo.findExistingIdempotencyKeys(keys));
}

// Info: (20261015 - Luphia) 用戶不存在時回 null，由 route 回 NF_USER
export async function getAdminUserPoints(params: {
  userId: string;
  page: number;
  pageSize: number;
}): Promise<IAdminUserPointsView | null> {
  const { userId, page, pageSize } = params;
  const user = await adminUserPointsRepo.findUserBalance(userId);
  if (!user) return null;

  const [groups, ledgerPage, creditableRows] = await Promise.all([
    adminUserPointsRepo.sumPointLedgerByType(userId),
    adminUserPointsRepo.listPointLedger(userId, page, pageSize),
    adminUserPointsRepo.listCreditableTeamLedger(userId),
  ]);

  const { breakdown, ledgerTotal } = summarisePointLedger(groups);

  const siblingKeys = await existingSiblingKeys(creditableRows);
  const teamTotals = sumTeamAllocatedForUser(
    userId,
    creditableRows,
    siblingKeys,
  );
  const teamNames = new Map(creditableRows.map((r) => [r.teamId, r.teamName]));
  let teamAllocatedTotal = BigInt(0);
  const teams = [...teamTotals.entries()].map(([teamId, total]) => {
    teamAllocatedTotal += total;
    return {
      teamId,
      teamName: teamNames.get(teamId) ?? "",
      total: total.toString(),
    };
  });

  return {
    userId: user.id,
    balance: user.pointBalance.toString(),
    ledgerTotal: ledgerTotal.toString(),
    balanceMismatch: user.pointBalance !== ledgerTotal,
    breakdown: breakdown.map((item) => ({
      entryType: item.entryType,
      count: item.count,
      total: item.total.toString(),
    })),
    teamAllocated: { teams, total: teamAllocatedTotal.toString() },
    ledger: {
      items: ledgerPage.items.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        amount: entry.amount.toString(),
        balanceAfter: entry.balanceAfter.toString(),
        orderId: entry.orderId,
        sourceRef: entry.sourceRef,
        note: entry.note,
        idempotencyKey: entry.idempotencyKey,
        createdAt: entry.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total: ledgerPage.total,
      totalPages: totalPagesOf(ledgerPage.total, pageSize),
    },
  };
}

// Info: (20261015 - Luphia) 用戶不存在時回 null，由 route 回 NF_USER
export async function listAdminUserTeamAllocations(params: {
  userId: string;
  page: number;
  pageSize: number;
}): Promise<IAdminListPage<IAdminTeamAllocationRecordView> | null> {
  const { userId, page, pageSize } = params;
  const user = await adminUserPointsRepo.findUserBalance(userId);
  if (!user) return null;

  const { items, total } = await adminUserPointsRepo.listTargetedTeamLedger(
    userId,
    page,
    pageSize,
  );
  const siblingKeys = await existingSiblingKeys(items);
  const statuses = deriveTeamAllocationStatuses(items, siblingKeys);
  const operators = await adminUserPointsRepo.findOperators([
    ...new Set(items.map((row) => row.operatorUserId)),
  ]);
  const operatorById = new Map(operators.map((op) => [op.id, op]));

  return {
    items: items.map((row) => {
      const operator = operatorById.get(row.operatorUserId);
      return {
        id: row.id,
        teamId: row.teamId,
        teamName: row.teamName,
        entryType: row.entryType,
        amount: row.amount.toString(),
        operatorUserId: row.operatorUserId,
        operatorName: operator?.name ?? null,
        operatorAddress: operator?.address ?? null,
        txHash: row.txHash,
        idempotencyKey: row.idempotencyKey,
        status: statuses.get(row.id) ?? TEAM_ALLOCATION_RECORD_STATUS.OTHER,
        createdAt: row.createdAt.toISOString(),
      };
    }),
    page,
    pageSize,
    total,
    totalPages: totalPagesOf(total, pageSize),
  };
}
