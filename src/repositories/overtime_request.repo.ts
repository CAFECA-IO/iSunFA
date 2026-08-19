import { prisma } from "@/lib/prisma";
import {
  LeaveCashOutReason,
  LeaveGrantSource,
  LeaveLedgerEntryType,
} from "@/constants/leave_policy";
import {
  buildOvertimeGrantIdempotencyKey,
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeSegment,
  OvertimeDecisionOutcome,
} from "@/interfaces/overtime";
import { deriveCompensatoryGrantDays } from "@/lib/overtime_rules";
import {
  sumLedgerMinutes,
  writeBalance,
} from "@/repositories/leave_grant.repo";
import { assertGrantSource } from "@/repositories/leave_grant_invariant";
import {
  assertOvertimeFilingType,
  IStorableOvertimeRequest,
} from "@/repositories/overtime_request_invariant";

/**
 * Info: (20260818 - Julian) 加班單的寫入端。
 *
 * ## 核准是一個 unit-of-work
 *
 * 「改狀態、寫分段、換補休（或產折現事件）」三件事少任一步就會留下一個
 * 永久說謊的中間狀態：狀態說已核准但沒有分段，總量加起來是 0；
 * 有分段沒有補休批次，員工的加班換到的是一場空。原子性只有 DB 給得起
 * （同 `leave.repo.ts` 的 `resolveRecall`，判準見 coding_guidelines §1.1）。
 *
 * ## 為什麼分段一筆一筆建而不是 `createMany`
 *
 * 換補休時每一段都要掛一筆 `LeaveGrant`，而 `createMany` 不回 id。
 * 一次 3 小時平日加班切成兩段就是兩批補休，級距跟著批次走（ADR 024 §5.2）——
 * 拿不到 id 就掛不上去。
 *
 * ## 狀態轉移用附條件更新
 *
 * `updateMany(where: { status: PENDING })` 的 `count === 0` 即「已被決行」，
 * 而不是先讀再寫 —— 兩個分頁同時按核准時，先讀再寫會兩邊都通過。
 */

export interface IOvertimeApprovalWrite {
  accountBookId: string;
  requestId: string;
  employeeId: string;
  workDate: string;
  actorEmployeeId: string;
  approvedMinutes: number;
  recognizedMinutes: number;
  /**
   * Info: (20260818 - Julian) 佐證來源在**核准當下**才定得了 —— 送出時還不知道
   * 那一天有沒有打卡。由 service 依實際打卡判定後傳進來，與狀態同一次更新落地：
   * 停在送出時填的 `PUNCH_RECORD`，會讓一筆完全沒有出勤紀錄的認列
   * 在 L28 的佐證來源欄裡混進「有打卡佐證」那一格（ADR 024 §2.2）。
   */
  evidenceBasis: OvertimeEvidenceBasis;
  segments: readonly IOvertimeSegment[];
  engineVersion: number;
  /** Info: (20260818 - Julian) 由 service 組好，repository 只負責在寫入前擋一次 */
  invariant: IStorableOvertimeRequest;
  /** Info: (20260818 - Julian) 選 `COMPENSATORY_LEAVE` 時有值 */
  compensatory: {
    leavePolicyId: string;
    dayEquivalentMinutes: number;
    expiresOn: string;
  } | null;
  /** Info: (20260818 - Julian) 選 `PAYMENT` 時有值 */
  cashOut: {
    dayEquivalentMinutes: number;
    legalBasis: string;
  } | null;
}

export interface IOvertimeApprovalWriteResult {
  outcome: OvertimeDecisionOutcome;
  grantCount: number;
  cashOutEventIds: string[];
}

export interface IOvertimeRequestRepository {
  create(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    filingType: OvertimeFilingType;
    compensationMode: OvertimeCompensationMode;
    evidenceBasis: OvertimeEvidenceBasis;
    requestedStartMinute: number;
    requestedEndMinute: number;
    reason: string;
    isEmergency: boolean;
    invariant: IStorableOvertimeRequest;
  }): Promise<string>;
  approve(
    params: IOvertimeApprovalWrite,
  ): Promise<IOvertimeApprovalWriteResult>;
  reject(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<OvertimeDecisionOutcome>;
  /**
   * Info: (20260818 - Julian) 申請人撤回。與 `reject` 同樣是附條件更新 ——
   * 差別在於它同時把撤回的時點與理由固化下來。
   */
  withdraw(params: {
    accountBookId: string;
    requestId: string;
    withdrawnAt: Date;
    withdrawReason: string | null;
  }): Promise<OvertimeDecisionOutcome>;
}

class OvertimeRequestRepository implements IOvertimeRequestRepository {
  public async create(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    filingType: OvertimeFilingType;
    compensationMode: OvertimeCompensationMode;
    evidenceBasis: OvertimeEvidenceBasis;
    requestedStartMinute: number;
    requestedEndMinute: number;
    reason: string;
    isEmergency: boolean;
    invariant: IStorableOvertimeRequest;
  }): Promise<string> {
    assertOvertimeFilingType(params.invariant);

    const created = await prisma.overtimeRequest.create({
      data: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: params.workDate,
        filingType: params.filingType,
        compensationMode: params.compensationMode,
        evidenceBasis: params.evidenceBasis,
        requestedStartMinute: params.requestedStartMinute,
        requestedEndMinute: params.requestedEndMinute,
        reason: params.reason,
        isEmergency: params.isEmergency,
        status: OvertimeRequestStatus.PENDING,
      },
      select: { id: true },
    });
    return created.id;
  }

  public async approve(
    params: IOvertimeApprovalWrite,
  ): Promise<IOvertimeApprovalWriteResult> {
    assertOvertimeFilingType(params.invariant);

    return prisma.$transaction(async (tx) => {
      const moved = await tx.overtimeRequest.updateMany({
        where: {
          id: params.requestId,
          accountBookId: params.accountBookId,
          status: OvertimeRequestStatus.PENDING,
        },
        data: {
          status: OvertimeRequestStatus.APPROVED,
          approvedMinutes: params.approvedMinutes,
          recognizedMinutes: params.recognizedMinutes,
          evidenceBasis: params.evidenceBasis,
        },
      });
      if (moved.count === 0) {
        return {
          outcome: OvertimeDecisionOutcome.ALREADY_REVIEWED,
          grantCount: 0,
          cashOutEventIds: [],
        };
      }

      const cashOutEventIds: string[] = [];
      let grantCount = 0;

      for (const segment of params.segments) {
        const stored = await tx.overtimeSegment.create({
          data: {
            overtimeRequestId: params.requestId,
            order: segment.order,
            tier: segment.tier,
            minutes: segment.minutes,
            engineVersion: params.engineVersion,
          },
          select: { id: true },
        });

        if (params.compensatory !== null) {
          const { leavePolicyId, dayEquivalentMinutes, expiresOn } =
            params.compensatory;
          const grantedDays = deriveCompensatoryGrantDays({
            minutes: segment.minutes,
            dayEquivalentMinutes,
          });

          /**
           * Info: (20260818 - Julian) 1:1 由 `assertGrantSource` 把關（§32-1）。
           * 這裡把分段分鐘一併傳進去 —— 不傳它就驗不了 1:1，
           * 而驗不了的時候不變式會直接拒絕，不會默默放行。
           */
          assertGrantSource({
            source: LeaveGrantSource.OVERTIME_CONVERSION,
            grantedDays,
            dayEquivalentMinutes,
            grantedMinutes: segment.minutes,
            cycleStartDate: params.workDate,
            cycleEndDate: params.workDate,
            expiresOn,
            overtimeSegmentId: stored.id,
            overtimeSegmentMinutes: segment.minutes,
            reason: null,
          });

          const grant = await tx.leaveGrant.create({
            data: {
              accountBookId: params.accountBookId,
              employeeId: params.employeeId,
              leavePolicyId,
              source: LeaveGrantSource.OVERTIME_CONVERSION,
              // Info: (20260818 - Julian) Decimal 以字串落地（邊界防護，CLAUDE.md §2）
              grantedDays: String(grantedDays),
              dayEquivalentMinutes,
              grantedMinutes: segment.minutes,
              /**
               * Info: (20260818 - Julian) 補休的「週期」就是加班那一天本身。
               * 它不像特休有年度週期 —— 額度來自一次事件，而 `expiresOn`
               * 依帳本協商的期限往後推（§32-1）。
               */
              cycleStartDate: params.workDate,
              cycleEndDate: params.workDate,
              expiresOn,
              overtimeSegmentId: stored.id,
            },
            select: { id: true },
          });

          await tx.leaveLedgerEntry.create({
            data: {
              leaveGrantId: grant.id,
              entryType: LeaveLedgerEntryType.GRANT,
              deltaMinutes: segment.minutes,
              grantBalanceAfterMinutes: segment.minutes,
              actorEmployeeId: params.actorEmployeeId,
              idempotencyKey: buildOvertimeGrantIdempotencyKey(stored.id),
            },
          });
          grantCount += 1;
          continue;
        }

        if (params.cashOut !== null) {
          /**
           * Info: (20260818 - Julian) 一段一筆折現事件。
           *
           * `LeaveCashOutEvent` 只有單一 `premiumTier` 與單一 `minutes` ——
           * 把三小時併成一筆就說不出「哪兩小時是 1/3、哪一小時是 2/3」，
           * 而薪資模組要的正是那個切分（ADR 024 §5.2、§7）。
           * **事件沒有金額欄位**：本模組不算錢。
           */
          const event = await tx.leaveCashOutEvent.create({
            data: {
              accountBookId: params.accountBookId,
              employeeId: params.employeeId,
              reason: LeaveCashOutReason.OVERTIME_PAYMENT,
              minutes: segment.minutes,
              premiumTier: segment.tier,
              grantDayEquivalentMinutes: params.cashOut.dayEquivalentMinutes,
              cashOutDayEquivalentMinutes: params.cashOut.dayEquivalentMinutes,
              // Info: (20260818 - Julian) 加班費的折現不來自任何額度批次
              sourceGrantIds: [],
              legalBasis: params.cashOut.legalBasis,
            },
            select: { id: true },
          });
          cashOutEventIds.push(event.id);
        }
      }

      /**
       * Info: (20260818 - Julian) 餘額快取與帳本同交易更新（ADR 022 §4 第一條規矩）。
       * 一次寫完所有分段之後才算，而不是每段各算一次 —— 中間值沒有人會讀到，
       * 多算幾次只是多幾次全表加總。
       */
      if (grantCount > 0 && params.compensatory !== null) {
        const scope = {
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.compensatory.leavePolicyId,
        };
        await writeBalance(tx, {
          ...scope,
          remainingMinutes: await sumLedgerMinutes(tx, scope),
        });
      }

      return {
        outcome: OvertimeDecisionOutcome.DECIDED,
        grantCount,
        cashOutEventIds,
      };
    });
  }

  public async withdraw(params: {
    accountBookId: string;
    requestId: string;
    withdrawnAt: Date;
    withdrawReason: string | null;
  }): Promise<OvertimeDecisionOutcome> {
    /**
     * Info: (20260818 - Julian) `status: PENDING` 是更新條件本身，不是先查再寫。
     *
     * 申請人在手機上按撤回、主管同一刻在電腦上按核准 —— 先讀再寫會兩邊都通過，
     * 於是一張單同時是「已撤回」與「已核准」，而補休批次已經入帳了
     * （同 `approve` 與 `reject` 的既有處置）。
     */
    const moved = await prisma.overtimeRequest.updateMany({
      where: {
        id: params.requestId,
        accountBookId: params.accountBookId,
        status: OvertimeRequestStatus.PENDING,
      },
      data: {
        status: OvertimeRequestStatus.WITHDRAWN,
        withdrawnAt: params.withdrawnAt,
        withdrawReason: params.withdrawReason,
      },
    });
    return moved.count === 0
      ? OvertimeDecisionOutcome.ALREADY_REVIEWED
      : OvertimeDecisionOutcome.DECIDED;
  }

  public async reject(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<OvertimeDecisionOutcome> {
    const moved = await prisma.overtimeRequest.updateMany({
      where: {
        id: params.requestId,
        accountBookId: params.accountBookId,
        status: OvertimeRequestStatus.PENDING,
      },
      data: { status: OvertimeRequestStatus.REJECTED },
    });
    return moved.count === 0
      ? OvertimeDecisionOutcome.ALREADY_REVIEWED
      : OvertimeDecisionOutcome.DECIDED;
  }
}

export const overtimeRequestRepo: IOvertimeRequestRepository =
  new OvertimeRequestRepository();
