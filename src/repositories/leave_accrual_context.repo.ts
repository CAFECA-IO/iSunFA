import { prisma } from "@/lib/prisma";
import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveQuotaMode,
} from "@/constants/leave_policy";
import { ILeaveAccrualPolicy } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) 授予引擎的輸入來源。
 *
 * 與 `leave_request_context.repo` 分開的理由相同：授予需要的是
 * 「到職日、班別、每個假別的累積規則」，請假需要的是
 * 「排班、餘額、簽核規則、組織」。合成一支會讓兩邊都撈到對方要的東西 ——
 * 而授予是每日對全體員工跑的，多撈一個關聯就是乘上員工數的成本。
 */

export interface IAccrualEmployee {
  hireDate: string;
  leaveDate: string | null;
  /**
   * Info: (20260817 - Julian) 授予當下的日約當分鐘。
   *
   * 取自該員工**目前**掛的班別 —— 授予是往前看的（這個週期給幾天），
   * 而過去某一天的班別與它無關。與 `LeaveDay.dayEquivalentMinutes`
   * 取「該日排班」是兩個不同的問題，不可混用。
   *
   * ToDo: (20260817 - Julian) 週期中途換班別（現場調辦公室）時，
   * 已授予的批次面額不會跟著變。那是刻意的（面額不可變，ADR 022 §3），
   * 但下一個週期才會反映 —— 若法務認為應該即時重算，那是一次補償調整。
   */
  dayEquivalentMinutes: number;
}

export interface IAccrualPolicy {
  id: string;
  code: string;
  quotaMode: LeaveQuotaMode;
  accrual: ILeaveAccrualPolicy;
}

export interface ILeaveAccrualContextRepository {
  findEmployeeForAccrual(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IAccrualEmployee | null>;
  findAccrualPolicies(accountBookId: string): Promise<IAccrualPolicy[]>;
  listAccruableEmployeeIds(accountBookId: string): Promise<string[]>;
}

// Info: (20260817 - Julian) Date → "YYYY-MM-DD"，與 EmployeeShiftDay.workDate 同型別同語意
const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

class LeaveAccrualContextRepository implements ILeaveAccrualContextRepository {
  public async findEmployeeForAccrual(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IAccrualEmployee | null> {
    const employee = await prisma.employee.findFirst({
      where: { id: params.employeeId, accountBookId: params.accountBookId },
      select: { hireDate: true, leaveDate: true },
    });
    if (!employee) return null;

    /**
     * Info: (20260817 - Julian) 班別取自最近一個**有排班的上班日**。
     *
     * 不取「今天」：今天可能是例假、國定假日或他正在請假，而那些日子
     * `shiftPatternId` 必為 null（`assertSchedulableDay`）——
     * 在週日跑授予會讓全公司的額度都算不出來。
     *
     * 往回找而不是往前找：往前找會讓「下週要調班」提前影響這一批的面額，
     * 而面額應該反映授予當下的事實。
     */
    const lastWorkDay = await prisma.employeeShiftDay.findFirst({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        shiftPatternId: { not: null },
      },
      orderBy: { workDate: "desc" },
      select: { shiftPattern: { select: { requiredWorkMinutes: true } } },
    });

    return {
      hireDate: toIsoDate(employee.hireDate),
      leaveDate: employee.leaveDate ? toIsoDate(employee.leaveDate) : null,
      dayEquivalentMinutes: lastWorkDay?.shiftPattern?.requiredWorkMinutes ?? 0,
    };
  }

  public async findAccrualPolicies(
    accountBookId: string,
  ): Promise<IAccrualPolicy[]> {
    const policies = await prisma.leavePolicy.findMany({
      where: { accountBookId, isActive: true },
      select: {
        id: true,
        code: true,
        quotaMode: true,
        accrualMethod: true,
        cycleBasis: true,
        annualDays: true,
        carryForwardMonths: true,
        proratedRoundingScale: true,
        tiers: {
          select: {
            minSeniorityMonths: true,
            days: true,
            incrementDaysPerYear: true,
            maxDays: true,
          },
          orderBy: { minSeniorityMonths: "asc" },
        },
      },
    });

    return policies.map((policy) => ({
      id: policy.id,
      code: policy.code,
      quotaMode: policy.quotaMode as LeaveQuotaMode,
      accrual: {
        accrualMethod: policy.accrualMethod as LeaveAccrualMethod,
        cycleBasis: policy.cycleBasis as LeaveCycleBasis,
        // Info: (20260817 - Julian) Decimal → number：天數是面額的來源，不參與金額運算
        annualDays:
          policy.annualDays === null ? null : Number(policy.annualDays),
        carryForwardMonths: policy.carryForwardMonths,
        proratedRoundingScale: policy.proratedRoundingScale,
        tiers: policy.tiers.map((tier) => ({
          minSeniorityMonths: tier.minSeniorityMonths,
          days: Number(tier.days),
          incrementDaysPerYear:
            tier.incrementDaysPerYear === null
              ? null
              : Number(tier.incrementDaysPerYear),
          maxDays: tier.maxDays === null ? null : Number(tier.maxDays),
        })),
      },
    }));
  }

  /**
   * Info: (20260817 - Julian) 需要授予的員工。**排除已離職者**。
   *
   * 已離職者的 `leaveDate` 會讓 `deriveGrantSchedule` 只授予到離職日，
   * 所以就算跑了也不會多給 —— 但每日對全體跑時，把離職多年的人
   * 一併撈出來只是白費工，而那個成本會隨年資累積。
   */
  public async listAccruableEmployeeIds(
    accountBookId: string,
  ): Promise<string[]> {
    const employees = await prisma.employee.findMany({
      where: { accountBookId, leaveDate: null },
      select: { id: true },
      orderBy: { employeeNo: "asc" },
    });
    return employees.map((employee) => employee.id);
  }
}

export const leaveAccrualContextRepo: ILeaveAccrualContextRepository =
  new LeaveAccrualContextRepository();
