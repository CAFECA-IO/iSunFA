import { prisma } from "@/lib/prisma";
import {
  MIGRATE_ALLOCATION_PREFIX,
  TEAM_WALLET_ENTRY_TYPE,
} from "@/constants/subscription_quota";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」的唯讀查詢（個人點數帳本與指向該用戶的團隊分錄）。
 *
 * 只讀不寫；判定「有沒有給到」的規則全在 `lib/quota/admin_user_points.ts` 的純函式。
 */

export interface IAdminPointLedgerRow {
  id: string;
  entryType: string;
  amount: bigint;
  balanceAfter: bigint;
  orderId: string | null;
  sourceRef: string | null;
  note: string | null;
  idempotencyKey: string;
  createdAt: Date;
}

export interface IAdminTeamLedgerRow {
  id: string;
  teamId: string;
  teamName: string;
  entryType: string;
  amount: bigint;
  targetUserId: string | null;
  operatorUserId: string;
  txHash: string | null;
  idempotencyKey: string;
  createdAt: Date;
}

export interface IAdminOperatorRow {
  id: string;
  name: string | null;
  address: string;
}

// Info: (20261015 - Luphia) 兄弟鍵查詢分批，避免單一 IN 清單超過資料庫參數上限
const SIBLING_KEY_CHUNK = 1000;

// Info: (20261015 - Luphia) 團隊分配紀錄列出的分錄型別（ADJUST 只取有 targetUserId 的，由 where 保證）
const TARGETED_ENTRY_TYPES = [
  TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
  TEAM_WALLET_ENTRY_TYPE.REVOKE,
  TEAM_WALLET_ENTRY_TYPE.ADJUST,
];

const teamLedgerSelect = {
  id: true,
  entryType: true,
  amount: true,
  targetUserId: true,
  operatorUserId: true,
  txHash: true,
  idempotencyKey: true,
  createdAt: true,
  teamWallet: {
    select: { teamId: true, team: { select: { name: true } } },
  },
} as const;

interface ISelectedTeamLedgerRow {
  id: string;
  entryType: string;
  amount: bigint;
  targetUserId: string | null;
  operatorUserId: string;
  txHash: string | null;
  idempotencyKey: string;
  createdAt: Date;
  teamWallet: { teamId: string; team: { name: string } };
}

function toTeamLedgerRow(row: ISelectedTeamLedgerRow): IAdminTeamLedgerRow {
  return {
    id: row.id,
    teamId: row.teamWallet.teamId,
    teamName: row.teamWallet.team.name,
    entryType: row.entryType,
    amount: row.amount,
    targetUserId: row.targetUserId,
    operatorUserId: row.operatorUserId,
    txHash: row.txHash,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
  };
}

export class AdminUserPointsRepository {
  async findUserBalance(
    userId: string,
  ): Promise<{ id: string; pointBalance: bigint } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pointBalance: true },
    });
  }

  async sumPointLedgerByType(
    userId: string,
  ): Promise<{ entryType: string; count: number; total: bigint | null }[]> {
    const groups = await prisma.pointLedger.groupBy({
      by: ["entryType"],
      where: { userId },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      entryType: group.entryType,
      count: group._count._all,
      total: group._sum.amount,
    }));
  }

  async listPointLedger(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: IAdminPointLedgerRow[]; total: number }> {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.pointLedger.findMany({
        where,
        select: {
          id: true,
          entryType: true,
          amount: true,
          balanceAfter: true,
          orderId: true,
          sourceRef: true,
          note: true,
          idempotencyKey: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pointLedger.count({ where }),
    ]);
    return { items, total };
  }

  // Info: (20261015 - Luphia) 可能給到該用戶的團隊分錄：ALLOCATE 與遷移 ADJUST（不分頁，供加總）
  async listCreditableTeamLedger(
    userId: string,
  ): Promise<IAdminTeamLedgerRow[]> {
    const rows = await prisma.teamWalletLedger.findMany({
      where: {
        targetUserId: userId,
        OR: [
          { entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE },
          {
            entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
            idempotencyKey: { startsWith: MIGRATE_ALLOCATION_PREFIX },
          },
        ],
      },
      select: teamLedgerSelect,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTeamLedgerRow);
  }

  async listTargetedTeamLedger(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: IAdminTeamLedgerRow[]; total: number }> {
    const where = {
      targetUserId: userId,
      entryType: { in: TARGETED_ENTRY_TYPES },
    };
    const [rows, total] = await Promise.all([
      prisma.teamWalletLedger.findMany({
        where,
        select: teamLedgerSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teamWalletLedger.count({ where }),
    ]);
    return { items: rows.map(toTeamLedgerRow), total };
  }

  // Info: (20261015 - Luphia) 以精確冪等鍵查兄弟分錄是否存在（補償／出帳分錄可能沒有 targetUserId）
  async findExistingIdempotencyKeys(
    keys: readonly string[],
  ): Promise<string[]> {
    const found: string[] = [];
    for (let i = 0; i < keys.length; i += SIBLING_KEY_CHUNK) {
      const chunk = keys.slice(i, i + SIBLING_KEY_CHUNK);
      const rows = await prisma.teamWalletLedger.findMany({
        where: { idempotencyKey: { in: chunk } },
        select: { idempotencyKey: true },
      });
      for (const row of rows) found.push(row.idempotencyKey);
    }
    return found;
  }

  async findOperators(
    userIds: readonly string[],
  ): Promise<IAdminOperatorRow[]> {
    if (userIds.length === 0) return [];
    return prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, name: true, address: true },
    });
  }
}

export const adminUserPointsRepo = new AdminUserPointsRepository();
