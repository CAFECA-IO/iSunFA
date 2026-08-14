import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import {
  LeaveRecallDecision,
  LeaveRecallStatus,
  LeaveRequestStatus,
} from "@/constants/leave";
import { WorkDayType } from "@/constants/attendance";
import { assertSchedulableDay } from "@/repositories/attendance_schedule_invariant";

/**
 * Info: (20260813 - Julian) 假勤資料存取層（唯一碰 Prisma），不含業務判斷。
 *
 * `activeKey` 的組法只存在於這一層（`"<employeeId>:<workDate>"`），
 * 它是「同一人同一天只能有一張生效假單」這個保證的全部，不得讓 service 自己組。
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
  resolveRecall(params: {
    recallId: string;
    decision: LeaveRecallDecision;
    note?: string;
    respondedAt: Date;
    /** Info: (20260813 - Julian) 僅 ACCEPT 需要：要退出生效的請假日與要投影回去的排班 */
    projection?: ILeaveRecallProjection;
  }): Promise<ILeaveRecallRecord>;
}

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
   * Info: (20260813 - Julian) 回應徵詢。同意時三件事包在同一個交易裡：
   * 徵詢變 ACCEPTED 並清空 `pendingLeaveDayId`、請假日退出生效（`activeKey = null`），
   * 排班改回上班日。少了排班那步會變成 `NO_SCHEDULE` 而非 `WORK`；
   * 少了退出生效那步，同一天會同時「在請假」與「要上班」。
   */
  public async resolveRecall(params: {
    recallId: string;
    decision: LeaveRecallDecision;
    note?: string;
    respondedAt: Date;
    projection?: ILeaveRecallProjection;
  }): Promise<ILeaveRecallRecord> {
    const { recallId, decision, note, respondedAt, projection } = params;

    if (decision === LeaveRecallDecision.DECLINE) {
      return prisma.leaveRecall.update({
        where: { id: recallId },
        data: {
          status: LeaveRecallStatus.DECLINED,
          respondedAt,
          responseNote: note ?? null,
          pendingLeaveDayId: null,
        },
        include: RECALL_INCLUDE,
      });
    }

    if (!projection) {
      throw new Error("resolveRecall: ACCEPT requires a schedule projection");
    }

    // Info: (20260813 - Julian) 與 upsertShiftDay 同一個閘口；投影的組合同樣得先過不變式
    assertSchedulableDay({
      dayType: WorkDayType.WORK,
      shiftPatternId: projection.shiftPatternId,
    });

    return prisma.$transaction(async (tx) => {
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

      return tx.leaveRecall.update({
        where: { id: recallId },
        data: {
          status: LeaveRecallStatus.ACCEPTED,
          respondedAt,
          responseNote: note ?? null,
          pendingLeaveDayId: null,
        },
        include: RECALL_INCLUDE,
      });
    });
  }
}

export const leaveRepo = new LeaveRepository();
export { activeKeyOf };
