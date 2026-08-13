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
 * Info: (20260813 - Julian) 假勤資料存取層（唯一碰 Prisma）；不含任何業務判斷。
 *
 * ## `activeKey` 的組法只存在於這一層
 *
 * 值是 `"<employeeId>:<workDate>"`，而 `employeeId` 要從 `leaveRequest` 取。
 * 讓 service 自己組，等於把一條唯一鍵的定義散到呼叫端 ——
 * 而那條鍵正是「同一人同一天只能有一張生效假單」這個保證的全部。
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
  /**
   * Info: (20260813 - Julian) 某一天生效中的請假。
   *
   * 條件是 `activeKey: { not: null }` 而不是 `leaveRequest.status = APPROVED` ——
   * 兩者在正常情況下等價，但被單日銷假之後只有前者會變。
   * 用狀態判斷會讓已銷假的那一天繼續出現在請假名單上。
   */
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

  /**
   * Info: (20260813 - Julian) 建立徵詢。`pendingLeaveDayId` 與 `leaveDayId` 同值。
   *
   * 那個欄位是 `@unique`，因此「同一天掛兩張待回應徵詢」會在這裡撞唯一鍵，
   * 而不是靠 service 先查一次再寫 —— 查與寫之間的空窗，正是兩個分頁同時按下去時
   * 會發生的事。service 仍然先查，是為了回一個看得懂的 409 而不是 P2002。
   */
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
   * Info: (20260813 - Julian) 回應徵詢。同意時三件事必須一起成立，因此包在交易裡。
   *
   * 1. 徵詢變成 ACCEPTED，且 `pendingLeaveDayId` 清空（放行下一張徵詢）
   * 2. 該請假日退出生效（`activeKey = null`）並記下 `recalledAt`
   * 3. 排班改回上班日
   *
   * 少了第 3 步，那天會變成「沒有排班」而不是「要上班」——
   * 判定引擎的 `NO_SCHEDULE` 與 `WORK` 是兩件完全不同的事。
   * 少了第 2 步，同一天會同時「在請假」與「要上班」，那是最惡劣的一種非法狀態。
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
