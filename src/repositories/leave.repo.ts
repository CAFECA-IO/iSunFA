import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import {
  LeaveRecallDecision,
  LeaveRecallResolutionOutcome,
  LeaveRecallStatus,
  LeaveRequestStatus,
} from "@/constants/leave";
import { WorkDayType } from "@/constants/attendance";
import { assertSchedulableDay } from "@/repositories/attendance_schedule_invariant";

/**
 * Info: (20260813 - Julian) 假勤資料存取層（唯一碰 Prisma）。
 *
 * `activeKey` 的組法只存在於這一層（`"<employeeId>:<workDate>"`），
 * 它是「同一人同一天只能有一張生效假單」這個保證的全部，不得讓呼叫端自己組
 * —— 種子腳本亦然，請 import `activeKeyOf`。
 *
 * Info: (20260814 - Julian) 本檔不做「該不該做」的判斷，但 `resolveRecall` 是
 * coding_guidelines §1 的 unit-of-work 例外：同意銷假要一次改三張表，少任一步就會留下
 * 永久說謊的中間狀態，而原子性只有 DB 給得起。它保證的不變式列在該方法的註解裡。
 */

const activeKeyOf = (employeeId: string, workDate: string): string =>
  `${employeeId}:${workDate}`;

// Info: (20260813 - Julian) 帶著顯示所需的三層關聯，供 service 攤平成 DTO
const LEAVE_DAY_INCLUDE = {
  leaveRequest: {
    include: {
      employee: {
        select: {
          id: true,
          employeeNo: true,
          name: true,
          department: { select: { name: true } },
          jobTitle: { select: { title: true } },
        },
      },
    },
  },
  recalls: { where: { status: LeaveRecallStatus.PENDING } },
} as const;

const RECALL_INCLUDE = {
  shiftPattern: { select: { id: true, name: true } },
  requestedBy: { select: { employeeNo: true, name: true } },
  leaveDay: {
    include: {
      leaveRequest: {
        include: {
          employee: { select: { id: true, employeeNo: true, name: true } },
        },
      },
    },
  },
} as const;

export type ILeaveDayRecord = Prisma.LeaveDayGetPayload<{
  include: typeof LEAVE_DAY_INCLUDE;
}>;

export type ILeaveRecallRecord = Prisma.LeaveRecallGetPayload<{
  include: typeof RECALL_INCLUDE;
}>;

export interface ILeaveRepository {
  findActiveLeaveDays(params: {
    accountBookId: string;
    workDate: string;
  }): Promise<ILeaveDayRecord[]>;
  findActiveLeaveDayById(params: {
    accountBookId: string;
    leaveDayId: string;
  }): Promise<ILeaveDayRecord | null>;
  createRecall(params: {
    leaveDayId: string;
    shiftPatternId: string;
    requestedByEmployeeId: string;
    reason: string;
  }): Promise<ILeaveRecallRecord>;
  findRecallById(params: {
    accountBookId: string;
    recallId: string;
  }): Promise<ILeaveRecallRecord | null>;
  findPendingRecallsFor(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<ILeaveRecallRecord[]>;
  resolveRecall(
    params: ILeaveRecallResolveParams,
  ): Promise<ILeaveRecallResolution>;
}

/**
 * Info: (20260814 - Julian) ACCEPT 一定要有投影、DECLINE 一定沒有——用可辨識聯集讓
 * 「同意卻沒帶排班」在型別層就寫不出來（ADR 019），而不是寫得出來再於執行期擋。
 * 同 `attendanceScheduleUpdateSchema` 對 `dayType` 的處置。
 */
export type ILeaveRecallResolveParams = {
  recallId: string;
  note?: string;
  respondedAt: Date;
} & (
  | { decision: LeaveRecallDecision.DECLINE }
  | {
      decision: LeaveRecallDecision.ACCEPT;
      /** Info: (20260813 - Julian) 要退出生效的請假日與要投影回去的排班 */
      projection: ILeaveRecallProjection;
    }
);

/**
 * Info: (20260814 - Julian) 回應徵詢只有兩種結局，用可辨識聯集表達：
 * 搶到 PENDING 才有 recall 可讀，沒搶到就只有結局本身，呼叫端不會拿到 undefined 的紀錄。
 */
export type ILeaveRecallResolution =
  | {
      outcome: LeaveRecallResolutionOutcome.RESOLVED;
      recall: ILeaveRecallRecord;
    }
  | { outcome: LeaveRecallResolutionOutcome.ALREADY_ANSWERED };

/** Info: (20260813 - Julian) 同意徵詢時要一起改動的兩張表的定位資料 */
export interface ILeaveRecallProjection {
  leaveDayId: string;
  accountBookId: string;
  employeeId: string;
  workDate: string;
  shiftPatternId: string;
}

class LeaveRepository implements ILeaveRepository {
  // Info: (20260813 - Julian) 條件用 `activeKey: { not: null }` 而非 `leaveRequest.status = APPROVED`——單日銷假後只有前者會變，用狀態判斷會讓已銷假的那天繼續出現在請假名單上
  public async findActiveLeaveDays(params: {
    accountBookId: string;
    workDate: string;
  }): Promise<ILeaveDayRecord[]> {
    return prisma.leaveDay.findMany({
      where: {
        workDate: params.workDate,
        activeKey: { not: null },
        leaveRequest: {
          accountBookId: params.accountBookId,
          status: LeaveRequestStatus.APPROVED,
        },
      },
      include: LEAVE_DAY_INCLUDE,
      orderBy: { leaveRequest: { employee: { employeeNo: "asc" } } },
    });
  }

  public async findActiveLeaveDayById(params: {
    accountBookId: string;
    leaveDayId: string;
  }): Promise<ILeaveDayRecord | null> {
    return prisma.leaveDay.findFirst({
      where: {
        id: params.leaveDayId,
        activeKey: { not: null },
        leaveRequest: {
          accountBookId: params.accountBookId,
          status: LeaveRequestStatus.APPROVED,
        },
      },
      include: LEAVE_DAY_INCLUDE,
    });
  }

  // Info: (20260813 - Julian) `pendingLeaveDayId` 與 `leaveDayId` 同值且 @unique，同一天掛兩張待回應徵詢會在這裡撞唯一鍵；service 仍先查一次是為了回看得懂的 409 而非 P2002
  public async createRecall(params: {
    leaveDayId: string;
    shiftPatternId: string;
    requestedByEmployeeId: string;
    reason: string;
  }): Promise<ILeaveRecallRecord> {
    return prisma.leaveRecall.create({
      data: {
        leaveDayId: params.leaveDayId,
        pendingLeaveDayId: params.leaveDayId,
        shiftPatternId: params.shiftPatternId,
        requestedByEmployeeId: params.requestedByEmployeeId,
        reason: params.reason,
        status: LeaveRecallStatus.PENDING,
      },
      include: RECALL_INCLUDE,
    });
  }

  public async findRecallById(params: {
    accountBookId: string;
    recallId: string;
  }): Promise<ILeaveRecallRecord | null> {
    return prisma.leaveRecall.findFirst({
      where: {
        id: params.recallId,
        leaveDay: { leaveRequest: { accountBookId: params.accountBookId } },
      },
      include: RECALL_INCLUDE,
    });
  }

  public async findPendingRecallsFor(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<ILeaveRecallRecord[]> {
    return prisma.leaveRecall.findMany({
      where: {
        status: LeaveRecallStatus.PENDING,
        leaveDay: {
          leaveRequest: {
            accountBookId: params.accountBookId,
            employeeId: params.employeeId,
          },
        },
      },
      include: RECALL_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Info: (20260813 - Julian) 回應徵詢。coding_guidelines §1 的 unit-of-work 例外，
   * 保證的不變式有三條，缺任一條都會留下永久說謊的中間狀態：
   *
   * 1. 徵詢變 ACCEPTED 並清空 `pendingLeaveDayId` —— 少了它，同一天還能再開一張徵詢
   * 2. 請假日退出生效（`activeKey = null`）—— 少了它，同一天會同時「在請假」與「要上班」
   * 3. 排班改回上班日 —— 少了它，判定引擎看到的是 `NO_SCHEDULE` 而非 `WORK`
   *
   * 「該不該同意」不在這裡判（那是 service 的事），這裡只保證「要做就一起做完」。
   *
   * Info: (20260814 - Julian) 狀態轉移用附條件的 `updateMany(where status = PENDING)` 搶，
   * `count === 0` 就是輸給另一個分頁。不能先查再寫：兩個請求會同時看到 PENDING，
   * 一個同意一個婉拒，最後狀態是 DECLINED 但排班已被改成 WORK，且永遠改不回來。
   * ACCEPT 的搶佔必須在交易內且排在最前面，輸掉時後面兩張表一個字都不會動。
   */
  public async resolveRecall(
    params: ILeaveRecallResolveParams,
  ): Promise<ILeaveRecallResolution> {
    const { recallId, note, respondedAt } = params;

    if (params.decision === LeaveRecallDecision.DECLINE) {
      const claimed = await prisma.leaveRecall.updateMany({
        where: { id: recallId, status: LeaveRecallStatus.PENDING },
        data: {
          status: LeaveRecallStatus.DECLINED,
          respondedAt,
          responseNote: note ?? null,
          pendingLeaveDayId: null,
        },
      });
      if (claimed.count === 0) {
        return { outcome: LeaveRecallResolutionOutcome.ALREADY_ANSWERED };
      }
      return {
        outcome: LeaveRecallResolutionOutcome.RESOLVED,
        recall: await prisma.leaveRecall.findUniqueOrThrow({
          where: { id: recallId },
          include: RECALL_INCLUDE,
        }),
      };
    }

    const { projection } = params;

    // Info: (20260813 - Julian) 與 upsertShiftDay 同一個閘口；投影的組合同樣得先過不變式
    assertSchedulableDay({
      dayType: WorkDayType.WORK,
      shiftPatternId: projection.shiftPatternId,
    });

    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveRecall.updateMany({
        where: { id: recallId, status: LeaveRecallStatus.PENDING },
        data: {
          status: LeaveRecallStatus.ACCEPTED,
          respondedAt,
          responseNote: note ?? null,
          pendingLeaveDayId: null,
        },
      });
      if (claimed.count === 0) {
        return { outcome: LeaveRecallResolutionOutcome.ALREADY_ANSWERED };
      }

      await tx.leaveDay.update({
        where: { id: projection.leaveDayId },
        data: { activeKey: null, recalledAt: respondedAt },
      });

      await tx.employeeShiftDay.upsert({
        where: {
          accountBookId_employeeId_workDate: {
            accountBookId: projection.accountBookId,
            employeeId: projection.employeeId,
            workDate: projection.workDate,
          },
        },
        create: {
          accountBookId: projection.accountBookId,
          employeeId: projection.employeeId,
          workDate: projection.workDate,
          dayType: WorkDayType.WORK,
          shiftPatternId: projection.shiftPatternId,
        },
        update: {
          dayType: WorkDayType.WORK,
          shiftPatternId: projection.shiftPatternId,
        },
      });

      return {
        outcome: LeaveRecallResolutionOutcome.RESOLVED,
        recall: await tx.leaveRecall.findUniqueOrThrow({
          where: { id: recallId },
          include: RECALL_INCLUDE,
        }),
      };
    });
  }
}

export const leaveRepo = new LeaveRepository();
export { activeKeyOf };
