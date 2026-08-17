import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import {
  LeaveGrantSource,
  LeaveLedgerEntryType,
  LeaveQuotaMode,
  buildLeaveGrantIdempotencyKey,
} from "@/constants/leave_policy";
import { IPlannedGrant } from "@/interfaces/leave_entitlement";
import {
  IEmployeeGrantSummary,
  ILedgerEntryView,
} from "@/interfaces/leave_balance";
import { assertGrantSource } from "@/repositories/leave_grant_invariant";

/**
 * Info: (20260817 - Julian) 額度批次與餘額快取的寫入端。
 *
 * ## 在它之前這本帳沒有生產者
 *
 * `LeaveGrant` / `LeaveBalance` 都只有讀取端，六種 `LeaveLedgerEntryType`
 * 也只有 `CONSUME` 有人寫。結果是：即使簽核鏈解得出來，任何 QUOTA 假別
 * 都會死在 `VA_LEAVE_INSUFFICIENT_BALANCE` —— 因為每個人的餘額都是零。
 *
 * ## 授予是「對帳」不是「新增」
 *
 * `deriveGrantSchedule` 回的是**應然**（到今天為止應該有哪些批次），
 * 這裡把它與既有的比對後只補寫缺的那幾筆。因此可以每天重跑、
 * 可以補跑三個月前漏掉的、可以在同一秒被觸發兩次 —— 結果都一樣。
 *
 * 冪等靠兩層：`LeaveLedgerEntry.idempotencyKey` 的唯一鍵是最終防線，
 * 而寫入前先撈既有批次是為了不去撞那個唯一鍵
 * （撞了會丟 P2002，而那讀起來像故障）。
 *
 * ## 餘額快取的三規矩（ADR 022 §4）
 *
 * 同交易更新、可重建、每日勾稽。這裡負責前兩項：`issue` 與 `adjust`
 * 在同一個交易內更新 `LeaveBalance`，而 `rebuildBalance` 讓它隨時可以
 * 從帳本重算 —— 快取與帳本不一致時，**帳本是對的那一個**。
 */

export interface ILeaveGrantRepository {
  issue(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    planned: readonly IPlannedGrant[];
    actorEmployeeId: string | null;
  }): Promise<number>;
  adjust(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    deltaMinutes: number;
    reason: string;
    actorEmployeeId: string;
    idempotencyKey: string;
  }): Promise<void>;
  rebuildBalance(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    reconciledAt: Date;
  }): Promise<number>;
  summarize(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IEmployeeGrantSummary[]>;
  listLedger(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId?: string;
    limit: number;
  }): Promise<ILedgerEntryView[]>;
}

/**
 * Info: (20260817 - Julian) 從帳本重算某員工某假別的餘額。
 *
 * 「異動總和」即餘額 —— `GRANT` 是正的、`CONSUME` 是負的，
 * 所以不需要另外記「授予了多少」。這也是 `readGrantBalances` 的作法，
 * 兩邊必須一致，否則勾稽會把自己的算法差異報成資料錯誤。
 */
const sumLedgerMinutes = async (
  tx: Prisma.TransactionClient,
  params: { accountBookId: string; employeeId: string; leavePolicyId: string },
): Promise<number> => {
  const grants = await tx.leaveGrant.findMany({
    where: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
    },
    select: { id: true },
  });
  if (grants.length === 0) return 0;

  const sum = await tx.leaveLedgerEntry.aggregate({
    where: { leaveGrantId: { in: grants.map((grant) => grant.id) } },
    _sum: { deltaMinutes: true },
  });
  return sum._sum.deltaMinutes ?? 0;
};

/**
 * Info: (20260817 - Julian) 餘額快取寫回。**upsert 而非 update**：
 * 第一次授予時那一列還不存在，而 `updateMany` 在沒有列時是安靜的成功
 * （`count === 0` 不是錯誤）—— 那會讓第一批額度授予完成、餘額卻仍是零，
 * 而扣減端的附條件更新會把它讀成「額度不足」。
 */
const writeBalance = async (
  tx: Prisma.TransactionClient,
  params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    remainingMinutes: number;
    reconciledAt?: Date | null;
  },
): Promise<void> => {
  await tx.leaveBalance.upsert({
    where: {
      employeeId_leavePolicyId: {
        employeeId: params.employeeId,
        leavePolicyId: params.leavePolicyId,
      },
    },
    create: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
      remainingMinutes: params.remainingMinutes,
      reconciledAt: params.reconciledAt ?? null,
    },
    update: {
      remainingMinutes: params.remainingMinutes,
      ...(params.reconciledAt ? { reconciledAt: params.reconciledAt } : {}),
    },
  });
};

class LeaveGrantRepository implements ILeaveGrantRepository {
  /**
   * Info: (20260817 - Julian) 授予缺的批次。回傳實際新增的筆數（0 = 已經是最新）。
   *
   * 每一批同時寫兩樣東西：`LeaveGrant`（面額與週期，不可變）與一筆
   * `GRANT` 分錄（帳本的真相）。兩者必須同生共死 —— 只有批次沒有分錄，
   * 餘額算出來是零；只有分錄沒有批次，那筆額度沒有到期日。
   */
  public async issue(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    planned: readonly IPlannedGrant[];
    actorEmployeeId: string | null;
  }): Promise<number> {
    if (params.planned.length === 0) return 0;

    for (const grant of params.planned) {
      assertGrantSource({
        source: grant.source,
        grantedDays: grant.grantedDays,
        dayEquivalentMinutes: grant.dayEquivalentMinutes,
        grantedMinutes: grant.grantedMinutes,
        cycleStartDate: grant.cycleStartDate,
        cycleEndDate: grant.cycleEndDate,
        expiresOn: grant.expiresOn,
        overtimeSegmentId: null,
        reason: null,
      });
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.leaveGrant.findMany({
        where: {
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.leavePolicyId,
          /**
           * Info: (20260817 - Julian) `deriveGrantSchedule` 產出的批次一律是
           * `SENIORITY_ACCRUAL`（引擎唯一會給的 source）。這裡比對它而不是
           * 「非手動」的否定式：手動調整與補休換算都不建 `LeaveGrant`
           * （前者掛在既有批次上、後者由加班模組產生），
           * 用否定式會在它們哪天開始建批次時安靜地把它們算成已授予。
           */
          source: LeaveGrantSource.SENIORITY_ACCRUAL,
        },
        select: { cycleStartDate: true },
      });
      const known = new Set(existing.map((grant) => grant.cycleStartDate));

      let issued = 0;
      for (const plan of params.planned) {
        if (known.has(plan.cycleStartDate)) continue;

        const grant = await tx.leaveGrant.create({
          data: {
            accountBookId: params.accountBookId,
            employeeId: params.employeeId,
            leavePolicyId: params.leavePolicyId,
            source: plan.source,
            // Info: (20260817 - Julian) Decimal 以字串落地（邊界防護，CLAUDE.md §2）
            grantedDays: String(plan.grantedDays),
            dayEquivalentMinutes: plan.dayEquivalentMinutes,
            grantedMinutes: plan.grantedMinutes,
            cycleStartDate: plan.cycleStartDate,
            cycleEndDate: plan.cycleEndDate,
            expiresOn: plan.expiresOn,
            reason: plan.isProrated ? "比例給假（到職未滿一週期）" : null,
          },
          select: { id: true },
        });

        await tx.leaveLedgerEntry.create({
          data: {
            leaveGrantId: grant.id,
            entryType: LeaveLedgerEntryType.GRANT,
            deltaMinutes: plan.grantedMinutes,
            grantBalanceAfterMinutes: plan.grantedMinutes,
            actorEmployeeId: params.actorEmployeeId,
            /**
             * Info: (20260817 - Julian) 以週期起日組鍵（`buildLeaveGrantIdempotencyKey`）。
             * Worker 每日重跑、補跑漏掉的月份、同一秒被觸發兩次 —— 都只會有一筆。
             */
            idempotencyKey: buildLeaveGrantIdempotencyKey({
              employeeId: params.employeeId,
              leavePolicyId: params.leavePolicyId,
              cycleStartDate: plan.cycleStartDate,
            }),
          },
        });
        issued += 1;
      }

      if (issued > 0) {
        await writeBalance(tx, {
          ...params,
          remainingMinutes: await sumLedgerMinutes(tx, params),
        });
      }
      return issued;
    });
  }

  /**
   * Info: (20260817 - Julian) 人工調整（L9）。正負皆可，**理由必填**。
   *
   * 掛在「最晚到期的那一批」上：調整通常是補一個系統算不出來的量
   * （前公司年資、協商遞延、勞檢後補發），把它放在最早到期的批次
   * 會讓它先被扣掉又先過期 —— 而那與「補給他」的意圖相反。
   */
  public async adjust(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    deltaMinutes: number;
    reason: string;
    actorEmployeeId: string;
    idempotencyKey: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const target = await tx.leaveGrant.findFirst({
        where: {
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.leavePolicyId,
        },
        orderBy: [{ expiresOn: "desc" }, { createdAt: "desc" }],
        select: { id: true },
      });
      // Info: (20260817 - Julian) 沒有任何批次可掛 —— 由 service 轉成 NF_LEAVE_GRANT
      if (!target) throw new LeaveGrantMissingError(params.leavePolicyId);

      const sums = await tx.leaveLedgerEntry.aggregate({
        where: { leaveGrantId: target.id },
        _sum: { deltaMinutes: true },
      });
      const balanceAfter = (sums._sum.deltaMinutes ?? 0) + params.deltaMinutes;

      await tx.leaveLedgerEntry.create({
        data: {
          leaveGrantId: target.id,
          entryType: LeaveLedgerEntryType.ADJUST,
          deltaMinutes: params.deltaMinutes,
          grantBalanceAfterMinutes: balanceAfter,
          actorEmployeeId: params.actorEmployeeId,
          reason: params.reason,
          idempotencyKey: params.idempotencyKey,
        },
      });

      await writeBalance(tx, {
        ...params,
        remainingMinutes: await sumLedgerMinutes(tx, params),
      });
    });
  }

  /**
   * Info: (20260817 - Julian) 從帳本重建餘額快取（ADR 022 §4 的第二條規矩）。
   *
   * 回傳重建後的分鐘數。每日勾稽 Worker 拿它與快取原值比對，
   * 不一致即為 `LeaveBalanceHealth.MISMATCH` —— 而**帳本是對的那一個**，
   * 所以這裡直接覆寫，不是報錯了事。
   */
  public async rebuildBalance(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    reconciledAt: Date;
  }): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const remainingMinutes = await sumLedgerMinutes(tx, params);
      await writeBalance(tx, {
        ...params,
        remainingMinutes,
        reconciledAt: params.reconciledAt,
      });
      return remainingMinutes;
    });
  }

  // Info: (20260817 - Julian) L7：各假別的餘額與最近到期日
  public async summarize(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IEmployeeGrantSummary[]> {
    const balances = await prisma.leaveBalance.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
      },
      select: {
        leavePolicyId: true,
        remainingMinutes: true,
        expiringSoonMinutes: true,
        reconciledAt: true,
        leavePolicy: { select: { code: true, name: true, quotaMode: true } },
      },
    });

    const grants = await prisma.leaveGrant.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
      },
      select: { leavePolicyId: true, expiresOn: true },
      orderBy: { expiresOn: "asc" },
    });
    const nextExpiry = new Map<string, string>();
    for (const grant of grants) {
      if (!nextExpiry.has(grant.leavePolicyId)) {
        nextExpiry.set(grant.leavePolicyId, grant.expiresOn);
      }
    }

    return balances.map((balance) => ({
      leavePolicyId: balance.leavePolicyId,
      leavePolicyCode: balance.leavePolicy.code,
      leavePolicyName: balance.leavePolicy.name,
      // Info: (20260817 - Julian) Prisma 回的是字面量聯集，顯式轉回鏡像 enum（同 findSchedules 的處置）
      quotaMode: balance.leavePolicy.quotaMode as LeaveQuotaMode,
      remainingMinutes: balance.remainingMinutes,
      expiringSoonMinutes: balance.expiringSoonMinutes,
      nextExpiresOn: nextExpiry.get(balance.leavePolicyId) ?? null,
      reconciledAt: balance.reconciledAt
        ? balance.reconciledAt.toISOString()
        : null,
    }));
  }

  // Info: (20260817 - Julian) L8：額度異動明細。新到舊，供對帳
  public async listLedger(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId?: string;
    limit: number;
  }): Promise<ILedgerEntryView[]> {
    const rows = await prisma.leaveLedgerEntry.findMany({
      where: {
        leaveGrant: {
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          ...(params.leavePolicyId
            ? { leavePolicyId: params.leavePolicyId }
            : {}),
        },
      },
      select: {
        id: true,
        entryType: true,
        deltaMinutes: true,
        grantBalanceAfterMinutes: true,
        reason: true,
        createdAt: true,
        leaveGrant: { select: { leavePolicyId: true, expiresOn: true } },
        leaveDay: { select: { workDate: true } },
        actor: { select: { employeeNo: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
    });

    return rows.map((row) => ({
      id: row.id,
      entryType: row.entryType as LeaveLedgerEntryType,
      deltaMinutes: row.deltaMinutes,
      grantBalanceAfterMinutes: row.grantBalanceAfterMinutes,
      leavePolicyId: row.leaveGrant.leavePolicyId,
      grantExpiresOn: row.leaveGrant.expiresOn,
      workDate: row.leaveDay?.workDate ?? null,
      reason: row.reason,
      // Info: (20260817 - Julian) 系統排程產生者為 null，畫面顯示「系統」
      actorEmployeeNo: row.actor?.employeeNo ?? null,
      actorName: row.actor?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}

/**
 * Info: (20260817 - Julian) 沒有任何批次可供調整。
 *
 * 丟具名型別而不是回 null：`adjust` 在交易中途發現，回 null 會讓
 * 呼叫端分不出「調整成功但沒事發生」與「根本沒調整」。
 */
export class LeaveGrantMissingError extends Error {
  constructor(public readonly leavePolicyId: string) {
    super(`LeaveGrant: no grant to adjust (leavePolicyId=${leavePolicyId})`);
    this.name = "LeaveGrantMissingError";
  }
}

export const leaveGrantRepo: ILeaveGrantRepository = new LeaveGrantRepository();
