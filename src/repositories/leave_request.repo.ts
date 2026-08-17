import { randomUUID } from "crypto";
import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import { WorkDayType } from "@/constants/attendance";
import { LeaveRequestStatus } from "@/constants/leave";
import {
  LeaveApprovalStepStatus,
  LeaveLedgerEntryType,
} from "@/constants/leave_policy";
import { allocateConsumption } from "@/lib/leave_entitlement_rules";
import { activeKeyOf } from "@/repositories/leave.repo";
import {
  ILeaveApprovalStepRecord,
  ILeaveRequestRecord,
  ILeaveRequestRepository,
  LeaveApprovalOutcome,
} from "@/interfaces/leave_request";

/**
 * Info: (20260817 - Julian) 假單的送出與簽核（唯一碰 Prisma 的一層）。
 *
 * ## 三個方法都是 unit-of-work
 *
 * 送出要一次寫三張表（假單、逐日、簽核鏈快照），最後一關通過要一次寫五張
 * （簽核節點、假單狀態、額度帳本、餘額快取、排班投影）。少任一步就會留下
 * 永久說謊的中間狀態，而原子性只有 DB 給得起 —— 把 `$transaction` 拉到
 * service 會違反優先度更高的「只有 Repository 能碰 Prisma」。
 * 判準與理由同 `leave.repo.ts` 的 `resolveRecall`（見 attendance_demo_plan.md §7.4）。
 *
 * ## 狀態轉移一律用附條件的 `updateMany`
 *
 * `count === 0` 就是輸給另一個分頁或另一張單。不能先查再寫：兩個請求會同時
 * 看到 PENDING，一個核准一個駁回，最後狀態是 REJECTED 但額度已經被扣掉。
 *
 * ## 分配在交易內重算
 *
 * service 傳進來的只有總量。它在送出前也算過一次分配，但那一份在另一張單
 * 先扣走之後就是舊的 —— 寫進帳本的 `grantBalanceAfterMinutes` 會因此對不上，
 * 而那正是每日勾稽要抓的東西，不該由我們自己製造（ADR 022 §2.3）。
 */

const STEP_SELECT = {
  id: true,
  order: true,
  nodeKind: true,
  approverEmployeeId: true,
  approverEmployeeNo: true,
  approverName: true,
  status: true,
  pendingKey: true,
} as const;

const REQUEST_INCLUDE = {
  days: { select: { id: true, workDate: true, minutes: true } },
  approvalSteps: { select: STEP_SELECT, orderBy: { order: "asc" } },
} as const;

/**
 * Info: (20260817 - Julian) 逐批餘額 = 授予分鐘 + Σ(該批的異動)。
 *
 * 不另存 `LeaveGrant.remainingMinutes`：那會是第三份真相（帳本、餘額快取、批次餘額），
 * 而 ADR 022 §2.3 只授權了兩份。
 *
 * ToDo: (20260817 - Julian) 帳本列數成長後這個 groupBy 會變慢。屆時的解法是
 * 為 `LeaveGrant` 加一個**遵守同樣三規矩**的 `remainingMinutes` 快取
 * （同交易更新、可重建、每日勾稽），而不是把它變成一個沒有勾稽的欄位。
 */
const readGrantBalances = async (
  tx: Prisma.TransactionClient,
  params: { accountBookId: string; employeeId: string; leavePolicyId: string },
) => {
  const grants = await tx.leaveGrant.findMany({
    where: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
    },
    select: {
      id: true,
      grantedMinutes: true,
      expiresOn: true,
      createdAt: true,
    },
  });
  if (grants.length === 0) return [];

  const consumed = await tx.leaveLedgerEntry.groupBy({
    by: ["leaveGrantId"],
    where: { leaveGrantId: { in: grants.map((grant) => grant.id) } },
    _sum: { deltaMinutes: true },
  });
  const deltaByGrant = new Map(
    consumed.map((row) => [row.leaveGrantId, row._sum.deltaMinutes ?? 0]),
  );

  return grants.map((grant) => ({
    grantId: grant.id,
    // Info: (20260817 - Julian) GRANT 本身也是一筆正的異動，故直接取異動總和即為餘額
    remainingMinutes: deltaByGrant.get(grant.id) ?? 0,
    expiresOn: grant.expiresOn,
    createdAt: grant.createdAt.toISOString(),
  }));
};

export class LeaveRequestRepository implements ILeaveRequestRepository {
  public async findById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestRecord | null> {
    const found = await prisma.leaveRequest.findFirst({
      where: { id: params.requestId, accountBookId: params.accountBookId },
      include: REQUEST_INCLUDE,
    });
    return found === null ? null : toRecord(found);
  }

  /**
   * Info: (20260817 - Julian) 送出：假單 + 逐日 + 簽核鏈快照，一個交易。
   *
   * `LeaveDay.activeKey` 此時**留空** —— 它的語意是「生效中」，而待簽的假單
   * 尚未生效。兩張待簽的假單可以涵蓋同一天，衝突要到核准時才成立
   * （對應 service 端「不預扣」的設計）。
   *
   * `id` 由應用層 `randomUUID()` 產生而非 `@default(uuid())`：
   * `reasonCipher` 的 AAD 綁定 `LeaveRequest:{id}:reasonCipher:{keyVersion}`，
   * 加密時就必須知道 id（ADR 018 §7 對 AttendancePunch 的同一處置）。
   */
  public async createWithChain(
    params: Parameters<ILeaveRequestRepository["createWithChain"]>[0],
  ): Promise<ILeaveRequestRecord> {
    const requestId = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.create({
        data: {
          id: requestId,
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.leavePolicyId,
          reason: params.reason,
          status: LeaveRequestStatus.PENDING,
          totalMinutes: params.totalMinutes,
          totalDays: params.totalDays,
          concurrencyWarned: params.concurrencyWarned,
          days: {
            create: params.days.map((day) => ({
              workDate: day.workDate,
              segment: day.segment,
              startMinute: day.startMinute,
              endMinute: day.endMinute,
              minutes: day.minutes,
              dayEquivalentMinutes: day.dayEquivalentMinutes,
            })),
          },
          approvalSteps: {
            create: params.steps.map((step) => ({
              order: step.order,
              nodeKind: step.nodeKind,
              approverEmployeeId: step.approver.employeeId,
              approverEmployeeNo: step.approver.employeeNo,
              approverName: step.approver.name,
              approverJobTitle: step.approver.jobTitle,
              mergedFromKinds: step.mergedFromKinds,
              escalatedReason: step.escalatedReason,
              status: LeaveApprovalStepStatus.PENDING,
              // Info: (20260817 - Julian) 只有第一關是「當前待簽」，其餘留 null（partial unique）
              pendingKey: step.order === 0 ? requestId : null,
            })),
          },
        },
      });

      return tx.leaveRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: REQUEST_INCLUDE,
      });
    });

    return toRecord(created);
  }

  /**
   * Info: (20260817 - Julian) 中間節點通過：本關結案、把「當前待簽」交給下一關。
   *
   * `pendingKey` 的交棒必須在同一個交易內：中間若斷開，這張單會變成
   * 一張所有節點都不是待簽的假單 —— 沒有人會在待辦清單裡看到它，
   * 而它在申請人眼中仍然是「簽核中」。
   */
  public async advanceStep(
    params: Parameters<ILeaveRequestRepository["advanceStep"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveApprovalStep.updateMany({
        where: {
          id: params.stepId,
          status: LeaveApprovalStepStatus.PENDING,
          pendingKey: { not: null },
        },
        data: {
          status: LeaveApprovalStepStatus.APPROVED,
          decidedAt: params.decidedAt,
          comment: params.comment ?? null,
          pendingKey: null,
        },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      const current = await tx.leaveApprovalStep.findUniqueOrThrow({
        where: { id: params.stepId },
        select: { order: true, leaveRequestId: true },
      });
      await tx.leaveApprovalStep.updateMany({
        where: {
          leaveRequestId: current.leaveRequestId,
          order: current.order + 1,
        },
        data: { pendingKey: current.leaveRequestId },
      });

      return LeaveApprovalOutcome.ADVANCED;
    });
  }

  /**
   * Info: (20260817 - Julian) 最後一關通過：五件事一起做完，或一件都不做。
   *
   * 1. 搶下本關（附條件 updateMany，輸了就整個交易不動）
   * 2. 假單狀態改 APPROVED
   * 3. 依交易內讀到的餘額重算 FIFO 分配，逐批寫 `LeaveLedgerEntry`
   * 4. 更新 `LeaveBalance` 快取（附條件，額度不足即判輸）
   * 5. 投影 `EmployeeShiftDay.dayType = LEAVE`，並把 `LeaveDay.activeKey` 填上
   *
   * 第 5 步的 `activeKey` 是「同一人同一天只能有一張生效假單」的全部 ——
   * 撞上唯一約束代表另一張單先生效了，那是衝突不是故障。
   */
  public async completeApproval(
    params: Parameters<ILeaveRequestRepository["completeApproval"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveApprovalStep.updateMany({
        where: {
          id: params.stepId,
          status: LeaveApprovalStepStatus.PENDING,
          pendingKey: { not: null },
        },
        data: {
          status: LeaveApprovalStepStatus.APPROVED,
          decidedAt: params.decidedAt,
          comment: params.comment ?? null,
          pendingKey: null,
        },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      if (params.totalMinutes > 0) {
        const balances = await readGrantBalances(tx, {
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.leavePolicyId,
        });
        const allocation = allocateConsumption({
          grants: balances,
          requiredMinutes: params.totalMinutes,
        });
        // Info: (20260817 - Julian) 交易內才發現不足 —— 另一張單先扣走了
        if (allocation.shortfallMinutes > 0) {
          return LeaveApprovalOutcome.BALANCE_RACE;
        }

        for (const item of allocation.allocations) {
          await tx.leaveLedgerEntry.create({
            data: {
              leaveGrantId: item.grantId,
              entryType: LeaveLedgerEntryType.CONSUME,
              deltaMinutes: -item.minutes,
              grantBalanceAfterMinutes: item.grantBalanceAfterMinutes,
              actorEmployeeId: params.actorEmployeeId,
              // Info: (20260817 - Julian) 冪等鍵：同一張單同一批只能扣一次
              idempotencyKey: `consume:${params.requestId}:${item.grantId}`,
            },
          });
        }

        /**
         * Info: (20260817 - Julian) 餘額快取以附條件更新，`count === 0` 即判輸。
         * 這是併發下唯一有效的判準 —— 讀後寫會讓兩張單都過（ADR 023 §6.4）。
         */
        const deducted = await tx.leaveBalance.updateMany({
          where: {
            employeeId: params.employeeId,
            leavePolicyId: params.leavePolicyId,
            remainingMinutes: { gte: params.totalMinutes },
          },
          data: { remainingMinutes: { decrement: params.totalMinutes } },
        });
        if (deducted.count === 0) return LeaveApprovalOutcome.BALANCE_RACE;
      }

      const request = await tx.leaveRequest.update({
        where: { id: params.requestId },
        data: { status: LeaveRequestStatus.APPROVED },
        include: { days: { select: { id: true, workDate: true } } },
      });

      for (const day of request.days) {
        await tx.leaveDay.update({
          where: { id: day.id },
          data: { activeKey: activeKeyOf(params.employeeId, day.workDate) },
        });
        /**
         * Info: (20260817 - Julian) 投影成 `LEAVE`，**不帶班別** ——
         * `assertSchedulableDay` 要求非上班日不得掛班別。
         * 判定引擎只讀 `EmployeeShiftDay`，不知道假單存在（單向依賴鐵律）。
         */
        await tx.employeeShiftDay.update({
          where: {
            accountBookId_employeeId_workDate: {
              accountBookId: params.accountBookId,
              employeeId: params.employeeId,
              workDate: day.workDate,
            },
          },
          data: { dayType: WorkDayType.LEAVE, shiftPatternId: null },
        });
      }

      return LeaveApprovalOutcome.COMPLETED;
    });
  }

  /**
   * Info: (20260817 - Julian) 駁回：任一節點駁回即整張單駁回，**額度不動**。
   *
   * 其餘尚未輪到的節點標 `SKIPPED` 而非留在 PENDING ——
   * 留著會讓它們永遠出現在那些人的待辦清單裡。
   */
  public async rejectStep(
    params: Parameters<ILeaveRequestRepository["rejectStep"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveApprovalStep.updateMany({
        where: {
          id: params.stepId,
          status: LeaveApprovalStepStatus.PENDING,
          pendingKey: { not: null },
        },
        data: {
          status: LeaveApprovalStepStatus.REJECTED,
          decidedAt: params.decidedAt,
          comment: params.comment ?? null,
          pendingKey: null,
        },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      await tx.leaveApprovalStep.updateMany({
        where: {
          leaveRequestId: params.requestId,
          status: LeaveApprovalStepStatus.PENDING,
        },
        data: { status: LeaveApprovalStepStatus.SKIPPED, pendingKey: null },
      });
      await tx.leaveRequest.update({
        where: { id: params.requestId },
        data: { status: LeaveRequestStatus.REJECTED },
      });

      return LeaveApprovalOutcome.COMPLETED;
    });
  }

  // Info: (20260817 - Julian) 撤回：只能發生在尚未有任何決定之前，額度不動
  public async withdraw(
    params: Parameters<ILeaveRequestRepository["withdraw"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveRequest.updateMany({
        where: { id: params.requestId, status: LeaveRequestStatus.PENDING },
        data: { status: LeaveRequestStatus.WITHDRAWN },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      await tx.leaveApprovalStep.updateMany({
        where: {
          leaveRequestId: params.requestId,
          status: LeaveApprovalStepStatus.PENDING,
        },
        data: { status: LeaveApprovalStepStatus.SKIPPED, pendingKey: null },
      });

      return LeaveApprovalOutcome.COMPLETED;
    });
  }
}

/**
 * Info: (20260817 - Julian) 攤平成 service 認得的形狀。
 *
 * `isPending` 由 `pendingKey` 推出而非另存一個欄位 ——
 * 兩者可以互相矛盾，而 `pendingKey` 是有唯一約束保護的那一個。
 */
const toRecord = (row: {
  id: string;
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  status: string;
  totalMinutes: number;
  totalDays: unknown;
  days: { id: string; workDate: string; minutes: number }[];
  approvalSteps: {
    id: string;
    order: number;
    nodeKind: string;
    approverEmployeeId: string | null;
    approverEmployeeNo: string;
    approverName: string;
    status: string;
    pendingKey: string | null;
  }[];
}): ILeaveRequestRecord => ({
  id: row.id,
  accountBookId: row.accountBookId,
  employeeId: row.employeeId,
  leavePolicyId: row.leavePolicyId,
  status: row.status as ILeaveRequestRecord["status"],
  totalMinutes: row.totalMinutes,
  totalDays: Number(row.totalDays),
  days: row.days,
  steps: row.approvalSteps.map(
    (step): ILeaveApprovalStepRecord => ({
      id: step.id,
      order: step.order,
      nodeKind: step.nodeKind as ILeaveApprovalStepRecord["nodeKind"],
      approverEmployeeId: step.approverEmployeeId,
      approverEmployeeNo: step.approverEmployeeNo,
      approverName: step.approverName,
      status: step.status as ILeaveApprovalStepRecord["status"],
      isPending: step.pendingKey !== null,
    }),
  ),
});

export const leaveRequestRepo = new LeaveRequestRepository();
