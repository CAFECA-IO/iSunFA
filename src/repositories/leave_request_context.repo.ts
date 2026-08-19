import { prisma } from "@/lib/prisma";
import { readConsumableGrants } from "@/repositories/leave_ledger";
import { WorkDayType } from "@/constants/attendance";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { LeaveRequestStatus } from "@/constants/leave";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";
import { LeaveConcurrencyAction } from "@/constants/leave_policy";
import { IConsumableGrant } from "@/interfaces/leave_entitlement";
import {
  IApprovalOrgSnapshot,
  IApprovalRuleWithSteps,
  ILeaveConcurrencyStatus,
  ILeaveDaySchedule,
  ILeavePolicySnapshot,
  ILeaveRequestContext,
} from "@/interfaces/leave_request";

/**
 * Info: (20260817 - Julian) 送出與簽核所需的唯讀查詢（唯一碰 Prisma 的一層）。
 *
 * 與 `leave_request.repo.ts` 分開：那裡是 unit-of-work 的寫入，這裡是純查詢。
 * 混在一起會讓「哪些方法必須在交易內」變成一件要靠記憶的事。
 *
 * **這一層不做授權判斷。** 可見範圍是 service 的職責 —— 把它寫進查詢條件，
 * 就會有一天有人寫出一個「忘了帶那個條件」的新查詢，而那種漏洞在
 * code review 時看起來只是少了一行。
 */
export class LeaveRequestContextRepository implements ILeaveRequestContext {
  public async findActivePolicy(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicySnapshot | null> {
    const policy = await prisma.leavePolicy.findFirst({
      where: {
        id: params.leavePolicyId,
        accountBookId: params.accountBookId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        quotaMode: true,
        unitBasis: true,
        minimumUnitMinutes: true,
        roundingMode: true,
        employerMayReject: true,
      },
    });
    return policy as ILeavePolicySnapshot | null;
  }

  public async findApprovalRules(params: {
    accountBookId: string;
  }): Promise<IApprovalRuleWithSteps[]> {
    const rules = await prisma.leaveApprovalRule.findMany({
      where: { accountBookId: params.accountBookId },
      select: {
        leavePolicyId: true,
        minDays: true,
        maxDays: true,
        steps: {
          select: { order: true, nodeKind: true, specificEmployeeId: true },
          orderBy: { order: "asc" },
        },
      },
    });
    return rules.map((rule) => ({
      leavePolicyId: rule.leavePolicyId,
      // Info: (20260817 - Julian) Decimal → number：天數是有限小數的門檻值，不參與金額運算
      minDays: Number(rule.minDays),
      maxDays: rule.maxDays === null ? null : Number(rule.maxDays),
      steps: rule.steps.map((step) => ({
        order: step.order,
        nodeKind:
          step.nodeKind as IApprovalRuleWithSteps["steps"][number]["nodeKind"],
        specificEmployeeId: step.specificEmployeeId,
      })),
    }));
  }

  /**
   * Info: (20260817 - Julian) 組織快照。
   *
   * 部門經理採「沿部門樹向上找第一個有 `managerId` 的節點」—— 小部門常常
   * 沒有自己的經理，直接回 null 會讓每一張長假都送不出去。向上找是實務，
   * 不是寬鬆：那個人確實是這位員工的部門主管。
   *
   * Info: (20260818 - Julian) `hrEmployeeIds` 取自 `EmployeeHrFunctionAssignment`
   * 中仍生效的 `HR_ADMIN`（甲-1）。**不是 `Role`、不是 `TeamRole`** ——
   * 三條軸線的區別見 ADR 023 §8.3 的修訂。
   *
   * 帳本一個 `HR_ADMIN` 都沒有時仍然回空陣列，含 HR 節點的規則因此以
   * `NO_HR` 擋下。**那是刻意的**：靜默挑一個人去簽，比擋下來難處理得多。
   */
  public async buildOrgSnapshot(params: {
    accountBookId: string;
    applicantEmployeeId: string;
  }): Promise<IApprovalOrgSnapshot> {
    const applicant = await prisma.employee.findFirstOrThrow({
      where: {
        id: params.applicantEmployeeId,
        accountBookId: params.accountBookId,
      },
      select: { id: true, managerId: true, departmentId: true },
    });

    const departmentManagerId = await this.resolveDepartmentManager(
      params.accountBookId,
      applicant.departmentId,
    );

    const hrEmployeeIds = await employeeHrFunctionRepo.listHolderIds({
      accountBookId: params.accountBookId,
      hrFunction: EmployeeHrFunction.HR_ADMIN,
    });

    const ids = [
      applicant.id,
      applicant.managerId,
      departmentManagerId,
      ...hrEmployeeIds,
    ].filter((id): id is string => id !== null);

    const people = await prisma.employee.findMany({
      where: { id: { in: ids }, accountBookId: params.accountBookId },
      select: {
        id: true,
        employeeNo: true,
        name: true,
        jobTitle: { select: { title: true } },
      },
    });

    return {
      applicantEmployeeId: applicant.id,
      directManagerId: applicant.managerId,
      departmentManagerId,
      hrEmployeeIds,
      directory: Object.fromEntries(
        people.map((person) => [
          person.id,
          {
            employeeId: person.id,
            employeeNo: person.employeeNo,
            name: person.name,
            jobTitle: person.jobTitle?.title ?? null,
          },
        ]),
      ),
    };
  }

  /**
   * Info: (20260817 - Julian) 沿部門樹向上找第一個有主管的節點。
   *
   * 迴圈上界 32 層是防呆而非業務規則：`Department.parentId` 是自關聯，
   * 資料上做得出環，而一個沒有上界的 while 迴圈會讓一次錯誤的部門設定
   * 變成一支永遠不回應的 API。
   */
  private async resolveDepartmentManager(
    accountBookId: string,
    departmentId: string | null,
  ): Promise<string | null> {
    let current = departmentId;
    for (let depth = 0; depth < 32 && current !== null; depth += 1) {
      const department = await prisma.department.findFirst({
        where: { id: current, accountBookId },
        select: { managerId: true, parentId: true },
      });
      if (department === null) return null;
      if (department.managerId !== null) return department.managerId;
      current = department.parentId;
    }
    return null;
  }

  public async findSchedules(params: {
    accountBookId: string;
    employeeId: string;
    workDates: readonly string[];
  }): Promise<Readonly<Record<string, ILeaveDaySchedule | undefined>>> {
    const rows = await prisma.employeeShiftDay.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: { in: [...params.workDates] },
      },
      select: {
        workDate: true,
        dayType: true,
        shiftPattern: {
          select: {
            requiredWorkMinutes: true,
            breakMinutes: true,
            // Info: (20260819 - Julian) 連續時段的首末日要靠它切區間（見 `leave_span.ts`）
            coreStartMinute: true,
            coreEndMinute: true,
          },
        },
      },
    });

    return Object.fromEntries(
      rows.map((row) => [
        row.workDate,
        {
          dayType: row.dayType as WorkDayType,
          // Info: (20260817 - Julian) 非上班日必無班別（assertSchedulableDay 保證）
          shift:
            row.shiftPattern === null
              ? null
              : {
                  requiredWorkMinutes: row.shiftPattern.requiredWorkMinutes,
                  breakMinutes: row.shiftPattern.breakMinutes,
                },
          core:
            row.shiftPattern === null
              ? null
              : {
                  startMinute: row.shiftPattern.coreStartMinute,
                  endMinute: row.shiftPattern.coreEndMinute,
                },
        },
      ]),
    );
  }

  /**
   * Info: (20260817 - Julian) 可扣減的批次。
   *
   * 餘額由帳本推導（`Σ deltaMinutes`），不另存欄位。
   *
   * 已過期的批次不回：`expiresOn < asOfDate` 的額度即使帳面還有分鐘，
   * 也不該被這一次請假扣到。過期本身由每日 Worker 寫 `EXPIRE` 分錄結清，
   * 這裡的過濾是為了「Worker 還沒跑到」的那段空窗。
   *
   * Info: (20260819 - Julian) 條件與實際扣減**共用同一支**
   * （`readConsumableGrants`，review B4）。先前這裡與交易內的
   * `readGrantBalances` 各有一份，而兩份不一樣：那一份沒有到期過濾，
   * 於是試算說扣本年度、帳本卻先扣光已過期的批次。
   */
  public async findConsumableGrants(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    asOfDate: string;
  }): Promise<IConsumableGrant[]> {
    return readConsumableGrants(prisma, params);
  }

  /**
   * Info: (20260817 - Julian) 併休狀況。
   *
   * 只回**超限**的日期，不回每一天的計數：呼叫端要的是「哪幾天有問題」，
   * 而把全部日期都回去會讓 service 再過濾一次相同的條件。
   *
   * 規則以「部門 × 假別」四種組合疊加取最嚴的一條 —— 通則與專屬規則
   * 在這裡是**疊加**而非取代（與簽核規則相反）：併休上限是營運限制，
   * 兩條都成立時當然是兩條都要遵守。
   */
  public async findConcurrencyStatus(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    workDates: readonly string[];
  }): Promise<ILeaveConcurrencyStatus[]> {
    const employee = await prisma.employee.findFirst({
      where: { id: params.employeeId, accountBookId: params.accountBookId },
      select: { departmentId: true },
    });
    if (employee === null) return [];

    const rules = await prisma.leaveConcurrencyRule.findMany({
      where: {
        accountBookId: params.accountBookId,
        OR: [{ departmentId: null }, { departmentId: employee.departmentId }],
        AND: [
          {
            OR: [
              { leavePolicyId: null },
              { leavePolicyId: params.leavePolicyId },
            ],
          },
        ],
      },
      select: {
        departmentId: true,
        leavePolicyId: true,
        maxConcurrentEmployees: true,
        maxConcurrentRatio: true,
        action: true,
      },
    });
    if (rules.length === 0) return [];

    const headcount = await prisma.employee.count({
      where: {
        accountBookId: params.accountBookId,
        departmentId: employee.departmentId,
      },
    });

    const statuses: ILeaveConcurrencyStatus[] = [];
    for (const workDate of params.workDates) {
      /**
       * Info: (20260817 - Julian) 只數**生效中**的假（`activeKey` 非 null）。
       * 待簽的單不算 —— 它們可能被駁回，把它們算進去會讓一個還沒發生的
       * 併休把後面的人擋在門外。
       */
      const observedCount = await prisma.leaveDay.count({
        where: {
          workDate,
          activeKey: { not: null },
          leaveRequest: {
            accountBookId: params.accountBookId,
            status: LeaveRequestStatus.APPROVED,
            employee: { departmentId: employee.departmentId },
          },
        },
      });

      for (const rule of rules) {
        const limit =
          rule.maxConcurrentEmployees ??
          Math.floor(headcount * Number(rule.maxConcurrentRatio ?? 0));
        if (observedCount + 1 > limit) {
          statuses.push({
            workDate,
            observedCount: observedCount + 1,
            limitValue: limit,
            action: rule.action as LeaveConcurrencyAction,
          });
          // Info: (20260817 - Julian) 一天回報一次就夠，取第一條命中的規則
          break;
        }
      }
    }
    return statuses;
  }
}

export const leaveRequestContextRepo = new LeaveRequestContextRepository();
