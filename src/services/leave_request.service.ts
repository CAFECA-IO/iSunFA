import { decryptPii } from "@/lib/hr_pii_crypto";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";
import { auditLogRepo } from "@/repositories/audit_log.repo";

/**
 * Info: (20260817 - Julian) 個資讀取軌跡的最小介面。
 *
 * 只宣告 `createAuditLog`，不引用整個 `IAuditLogRepository` ——
 * service 用不到的方法不該出現在它的相依裡，而測試更不該為了
 * 建構一個 service 去假造整組稽核查詢。
 */
export interface ILeaveAuditTrail {
  createAuditLog(data: {
    userId: string;
    accountBookId: string;
    dataType: AuditLogDataType;
    dataId: string;
    action: AuditLogAction;
  }): Promise<unknown>;
}
import { randomUUID } from "crypto";
import { encryptPii } from "@/lib/hr_pii_crypto";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { WorkDayType } from "@/constants/attendance";
import { LeaveRequestStatus } from "@/constants/leave";
import {
  LeaveApprovalNodeKind,
  LeaveApprovalStepStatus,
  LeaveConcurrencyAction,
  LeaveDaySegment,
  LeaveQuotaMode,
} from "@/constants/leave_policy";
import { HrPiiTable } from "@/constants/hr_pii";
import {
  LeaveRuleError,
  allocateConsumption,
  resolveLeaveMinutes,
} from "@/lib/leave_entitlement_rules";
import { resolveApprovalChain } from "@/lib/leave_approval_chain";
import { leaveRequestRepo } from "@/repositories/leave_request.repo";
import { leaveRequestContextRepo } from "@/repositories/leave_request_context.repo";
import {
  IApprovalChainResolution,
  ILeaveDayPlan,
  ILeaveRequestContext,
  ILeaveRequestInput,
  ILeaveRequestDetail,
  ILeaveRequestPreview,
  ILeaveRequestRecord,
  ILeaveRequestListQuery,
  ILeaveRequestRepository,
  ILeaveRequestSummary,
  LeaveApprovalOutcome,
} from "@/interfaces/leave_request";

/**
 * Info: (20260817 - Julian) 請假的送出、試算與簽核（L10–L17）。
 *
 * ## 額度不預扣
 *
 * 送出時檢查餘額只為了給員工即時回饋，**不扣**。真正的扣減發生在
 * 最後一個簽核節點通過的那個交易內（ADR 023 §6）。
 * 預扣要處理駁回、撤回、簽核中主管離職三條補償路徑，每一條都是一個
 * 可能漏掉的分支，而漏掉的後果是額度憑空消失 —— 那是員工會投訴、
 * HR 查不出原因的那種 bug。不預扣則只有一條路徑會動到額度。
 *
 * ## 「現在」由呼叫端注入
 *
 * 每個方法都收 `observedAt`。service 不呼叫 `Date.now()`，
 * 理由同判定引擎：跨日邊界上的行為必須能在測試裡重現。
 */
export class LeaveRequestService {
  constructor(
    private readonly requests: ILeaveRequestRepository,
    private readonly context: ILeaveRequestContext,
    /**
     * Info: (20260817 - Julian) 注入而不是 import 單例。
     *
     * 第一版直接 import `auditLogRepo`，測試因此只能靠一個容器專用的替身
     * 去攔截它 —— 而那個替身檔不進 repo，於是**測試在別人的機器上跑不起來**。
     * 注入之後，測試傳自己的假物件，不必知道生產環境用的是哪一個。
     */
    private readonly audit: ILeaveAuditTrail = auditLogRepo,
  ) {}

  /**
   * Info: (20260817 - Julian) L10 假單清單。
   *
   * ## 可見範圍
   *
   * 未指定 `employeeId` 即為自己。指定他人時**必須是該員工假單的簽核者** ——
   * 而「是不是簽核者」要逐張單判斷，不是一個部門層級的權限。
   * 因此這裡的做法是：先取回那個人的清單，再濾掉自己不在鏈上的單。
   *
   * 這比「先判權限再查」慢，但正確：一個主管在 8 月調離某部門後，
   * 他仍然應該看得到 7 月那幾張自己簽過的單，而部門層級的權限判斷會把它們藏起來。
   *
   * ToDo: (20260817 - Julian) HR 應可見全部，但帳本層級的 HR 角色來源尚未決定
   * （ADR 023 §8.3）。在它決定之前，HR 只看得到自己簽過的單。
   */
  public async list(params: {
    accountBookId: string;
    actorEmployeeId: string;
    query: ILeaveRequestListQuery;
  }): Promise<ILeaveRequestSummary[]> {
    const targetEmployeeId = params.query.employeeId ?? params.actorEmployeeId;
    const rows = await this.requests.listByEmployee({
      accountBookId: params.accountBookId,
      employeeId: targetEmployeeId,
      from: params.query.from,
      to: params.query.to,
    });

    if (targetEmployeeId === params.actorEmployeeId) return rows;

    const visible: ILeaveRequestSummary[] = [];
    for (const row of rows) {
      if (
        await this.isOnChain(
          params.accountBookId,
          row.id,
          params.actorEmployeeId,
        )
      ) {
        visible.push(row);
      }
    }
    /**
     * Info: (20260817 - Julian) 一張都看不到時擋下，而不是回空陣列。
     *
     * 空陣列是對資料的陳述（「他沒有請過假」），被擋是對請求的陳述
     * （「你不能看他的假單」）—— 兩者混在一起會讓人以為同事從不請假
     * （同 `attendanceResultQuerySchema` 對 `from > to` 的處置理由）。
     */
    if (visible.length === 0) {
      throw new AppError(API_ERRORS.FO_LEAVE_REQUEST_SCOPE);
    }
    return visible;
  }

  /**
   * Info: (20260817 - Julian) L16 待我簽核。
   *
   * 只回「當前待簽」的那一關是我的單 —— 排在第二關的人在第一關通過之前
   * 不該看到它出現在待辦清單裡，否則他會去簽一張還沒輪到他的單，
   * 然後收到一個他看不懂的 403。
   */
  public async listPending(params: {
    accountBookId: string;
    actorEmployeeId: string;
  }): Promise<ILeaveRequestSummary[]> {
    return this.requests.listPendingForApprover({
      accountBookId: params.accountBookId,
      approverEmployeeId: params.actorEmployeeId,
    });
  }

  /**
   * Info: (20260817 - Julian) L12 假單明細。
   *
   * 可見者：申請人本人，或**鏈上任何一個節點**（不限當前待簽）——
   * 簽過的人有權回看自己簽了什麼，那是他的責任的一部分。
   */
  public async get(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    /** Info: (20260817 - Julian) 寫個資讀取軌跡需要平台身分，不是員工 id */
    actorUserId: string;
  }): Promise<ILeaveRequestDetail> {
    const row = await this.requests.findDetailById(params);
    if (row === null) throw new AppError(API_ERRORS.NF_LEAVE_REQUEST);

    const isApplicant = row.employeeId === params.actorEmployeeId;
    const onChain = row.approvalSteps.some(
      (step) => step.approverEmployeeId === params.actorEmployeeId,
    );
    if (!isApplicant && !onChain) {
      throw new AppError(API_ERRORS.FO_LEAVE_REQUEST_SCOPE);
    }

    const summary = await this.requests.findSummaryById(params);
    if (summary === null) throw new AppError(API_ERRORS.NF_LEAVE_REQUEST);

    /**
     * Info: (20260817 - Julian) 別人看你的事由要留痕，自己看自己的不用。
     *
     * `AuditLogAction.READ` 的存在理由是「個資被看過本身就是事件」，
     * 而那句話的前提是**被看的人與看的人不是同一個** ——
     * 把本人的每一次開啟也記上，軌跡會被自己的瀏覽紀錄淹沒，
     * 而「誰看過我的病假事由」這個唯一重要的問題反而查不出來。
     *
     * `dataId` 填申請人的 `Employee.id` 而不是假單 id：
     * 個資調查的軸線是「哪些人受影響」（`AuditLogDataType.EMPLOYEE_PII` 的契約）。
     */
    if (!isApplicant) {
      await this.audit.createAuditLog({
        userId: params.actorUserId,
        accountBookId: params.accountBookId,
        dataType: AuditLogDataType.EMPLOYEE_PII,
        dataId: row.employeeId,
        action: AuditLogAction.READ,
      });
    }

    return {
      summary,
      reason: this.decryptReason(row),
      days: row.days.map((day) => ({
        workDate: day.workDate,
        segment: day.segment as LeaveDaySegment,
        startMinute: day.startMinute,
        endMinute: day.endMinute,
        minutes: day.minutes,
        dayEquivalentMinutes: day.dayEquivalentMinutes,
        recalledAt: day.recalledAt ? day.recalledAt.toISOString() : null,
      })),
      steps: row.approvalSteps.map((step) => ({
        order: step.order,
        nodeKind: step.nodeKind as LeaveApprovalNodeKind,
        approverEmployeeNo: step.approverEmployeeNo,
        approverName: step.approverName,
        approverJobTitle: step.approverJobTitle,
        status: step.status as LeaveApprovalStepStatus,
        mergedFromKinds: step.mergedFromKinds as LeaveApprovalNodeKind[],
        escalatedReason: step.escalatedReason,
        decidedAt: step.decidedAt ? step.decidedAt.toISOString() : null,
        comment: step.comment,
      })),
      concurrencyWarned: row.concurrencyWarned,
      viewerIsCurrentApprover: row.approvalSteps.some(
        (step) =>
          step.pendingKey !== null &&
          step.approverEmployeeId === params.actorEmployeeId,
      ),
    };
  }

  /**
   * Info: (20260817 - Julian) 解事由。解不開時回 null，不讓整頁 500。
   *
   * 金鑰輪替出問題時，這張單的其他資訊（誰、什麼假、幾天、簽到哪）仍然有用 ——
   * 把一個欄位的故障放大成整頁失敗，只會讓維運同時失去問題與線索。
   * 記 warn 而不是 error：它不是這次請求的失敗，是一個需要有人去查的狀態。
   */
  private decryptReason(row: {
    id: string;
    reasonCipher: string;
    piiKeyVersion: number;
  }): string | null {
    try {
      return decryptPii(
        row.reasonCipher,
        {
          table: HrPiiTable.LEAVE_REQUEST,
          field: "reasonCipher",
          recordId: row.id,
        },
        row.piiKeyVersion,
      );
    } catch (error) {
      logger.warn(
        `[leave] reason decrypt failed: request=${row.id} keyVersion=${row.piiKeyVersion} (${(error as Error).message})`,
      );
      return null;
    }
  }

  // Info: (20260817 - Julian) 呼叫者是否出現在該單的簽核鏈上（不限當前待簽）
  private async isOnChain(
    accountBookId: string,
    requestId: string,
    actorEmployeeId: string,
  ): Promise<boolean> {
    const record = await this.requests.findById({ accountBookId, requestId });
    return (
      record !== null &&
      record.steps.some((step) => step.approverEmployeeId === actorEmployeeId)
    );
  }

  /**
   * Info: (20260817 - Julian) L17 試算。**純計算、不寫入、不預扣。**
   *
   * 這支端點是本模組最重要的一支：若送出前看不到「這樣請會發生什麼」，
   * 員工只能靠試錯，而每一次試錯都是一張要有人去駁回的單。
   */
  public async preview(params: {
    accountBookId: string;
    employeeId: string;
    input: ILeaveRequestInput;
    observedAt: Date;
  }): Promise<ILeaveRequestPreview> {
    const { plan, chain, grants, concurrency, policy } =
      await this.buildPlan(params);

    const totalMinutes = plan.reduce((sum, day) => sum + day.minutes, 0);
    const totalDays = toTotalDays(plan);

    const unlimited = policy.quotaMode === LeaveQuotaMode.UNLIMITED;
    const remainingBefore = unlimited
      ? null
      : grants.reduce((sum, grant) => sum + grant.remainingMinutes, 0);
    const allocation = unlimited
      ? { allocations: [], shortfallMinutes: 0 }
      : allocateConsumption({ grants, requiredMinutes: totalMinutes });

    return {
      days: plan,
      totalMinutes,
      totalDays,
      remainingMinutesBefore: remainingBefore,
      remainingMinutesAfter:
        remainingBefore === null
          ? null
          : Math.max(0, remainingBefore - totalMinutes),
      shortfallMinutes: allocation.shortfallMinutes,
      approvalSteps: chain.ok ? chain.steps : [],
      unresolvedReason: chain.ok ? null : chain.reason,
      concurrencyWarnings: concurrency.map((item) => ({
        workDate: item.workDate,
        observedCount: item.observedCount,
        limitValue: item.limitValue,
        // Info: (20260817 - Julian) 特休（employerMayReject = false）永遠不會 blocking，見 §D14
        blocking:
          item.action === LeaveConcurrencyAction.BLOCK &&
          policy.employerMayReject,
      })),
    };
  }

  // Info: (20260817 - Julian) L11 送出
  public async submit(params: {
    accountBookId: string;
    employeeId: string;
    input: ILeaveRequestInput;
    observedAt: Date;
  }): Promise<ILeaveRequestRecord> {
    const { plan, chain, grants, concurrency, policy } =
      await this.buildPlan(params);

    const totalMinutes = plan.reduce((sum, day) => sum + day.minutes, 0);
    const totalDays = toTotalDays(plan);

    /**
     * Info: (20260817 - Julian) 展不開就拒絕送出，**不是自動核准**（ADR 023 §3）。
     *
     * 自動核准會讓一個設定缺口靜默地變成一張看起來正常的生效假單。
     * 成因寫進 log，因為解法在 HR 手上不在員工手上。
     */
    if (!chain.ok) {
      logger.warn("[leave] approval chain unresolved", {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        reason: chain.reason,
        detail: chain.detail,
      });
      throw new AppError(API_ERRORS.CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED);
    }

    if (policy.quotaMode === LeaveQuotaMode.QUOTA) {
      const { shortfallMinutes } = allocateConsumption({
        grants,
        requiredMinutes: totalMinutes,
      });
      if (shortfallMinutes > 0) {
        throw new AppError(API_ERRORS.VA_LEAVE_INSUFFICIENT_BALANCE);
      }
    }

    /**
     * Info: (20260817 - Julian) 併休超限：只有雇主有准駁權的假別才擋得住。
     *
     * 特休依 §38 II 期日由勞工排定，雇主只能協商調整 —— 在送出端硬擋
     * 等於用技術手段行使一個法律上沒有的否決權（計畫書 §D14）。
     * 超限對特休只留下 `concurrencyWarned`，呈現在簽核者的畫面上。
     */
    const blocking = concurrency.some(
      (item) =>
        item.action === LeaveConcurrencyAction.BLOCK &&
        policy.employerMayReject,
    );
    if (blocking) {
      throw new AppError(API_ERRORS.CF_LEAVE_CONCURRENCY_EXCEEDED);
    }

    /**
     * Info: (20260817 - Julian) id 先產生，因為它是加密 AAD 的一部分，
     * 加密必須在 insert 之前完成（ADR 018 §3；與 `attendance_punch.service`
     * 對 `latitudeCipher` 的處置相同）。
     *
     * 事由是 Tier 2 個資：「回診複檢」「父喪」「出庭」都寫在這一欄，
     * 而假單清單是主管日常會開的畫面 —— 明文入庫等於讓每一次查詢都攤開它。
     */
    const requestId = randomUUID();
    const reason = encryptPii(params.input.reason, {
      table: HrPiiTable.LEAVE_REQUEST,
      field: "reasonCipher",
      recordId: requestId,
    });

    const created = await this.requests.createWithChain({
      id: requestId,
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: policy.id,
      reasonCipher: reason.cipher,
      piiAlgorithm: reason.algorithm,
      piiKeyVersion: reason.keyVersion,
      totalMinutes,
      totalDays,
      days: plan,
      steps: chain.steps,
      concurrencyWarned: concurrency.length > 0,
    });

    logger.info(
      `[leave] request submitted: employee=${params.employeeId} policy=${policy.code} days=${totalDays} steps=${chain.steps.length}`,
    );
    return created;
  }

  // Info: (20260817 - Julian) L14 核准當前節點
  public async approve(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    comment?: string;
    observedAt: Date;
  }): Promise<LeaveApprovalOutcome> {
    const { request, step } = await this.claimStep(params);

    const isFinal = step.order === request.steps.length - 1;
    if (!isFinal) {
      return this.settle(
        await this.requests.advanceStep({
          requestId: request.id,
          stepId: step.id,
          actorEmployeeId: params.actorEmployeeId,
          decidedAt: params.observedAt,
          comment: params.comment,
        }),
      );
    }

    /**
     * Info: (20260817 - Julian) 最後一關：扣額度、投影排班、改狀態必須同一個交易。
     *
     * repository 在交易內重算 FIFO 分配並以附條件的 `updateMany` 判輸 ——
     * 讀後寫在併發下會兩張單都過（ADR 023 §6.4）。
     */
    const policy = await this.requirePolicy(
      params.accountBookId,
      request.leavePolicyId,
    );

    /**
     * Info: (20260817 - Julian) 這裡只做**前置檢查**，不把分配結果傳下去。
     *
     * 分配必須在交易內依交易內讀到的餘額重算 —— 這裡算出來的那一份，
     * 在另一張單先扣走之後就是舊的。前置檢查的價值是：在開交易之前
     * 就給出「額度不足」這個較友善的失敗，而不是讓它變成一個 409 競態。
     */
    if (policy.quotaMode === LeaveQuotaMode.QUOTA) {
      const grants = await this.context.findConsumableGrants({
        accountBookId: params.accountBookId,
        employeeId: request.employeeId,
        leavePolicyId: request.leavePolicyId,
        asOfDate: request.days[0]?.workDate ?? "",
      });
      const { shortfallMinutes } = allocateConsumption({
        grants,
        requiredMinutes: request.totalMinutes,
      });
      if (shortfallMinutes > 0) {
        throw new AppError(API_ERRORS.VA_LEAVE_INSUFFICIENT_BALANCE);
      }
    }

    return this.settle(
      await this.requests.completeApproval({
        accountBookId: params.accountBookId,
        requestId: request.id,
        stepId: step.id,
        actorEmployeeId: params.actorEmployeeId,
        decidedAt: params.observedAt,
        comment: params.comment,
        employeeId: request.employeeId,
        leavePolicyId: request.leavePolicyId,
        totalMinutes: request.totalMinutes,
      }),
    );
  }

  // Info: (20260817 - Julian) L15 駁回。任一節點駁回即整張單駁回，額度不動
  public async reject(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    comment?: string;
    observedAt: Date;
  }): Promise<LeaveApprovalOutcome> {
    const { request, step } = await this.claimStep(params);
    return this.settle(
      await this.requests.rejectStep({
        requestId: request.id,
        stepId: step.id,
        actorEmployeeId: params.actorEmployeeId,
        decidedAt: params.observedAt,
        comment: params.comment,
      }),
    );
  }

  // Info: (20260817 - Julian) L13 撤回。只有申請人自己、且只在尚未有任何決定之前
  public async withdraw(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    observedAt: Date;
  }): Promise<LeaveApprovalOutcome> {
    const request = await this.requireRequest(params);
    if (request.employeeId !== params.actorEmployeeId) {
      throw new AppError(API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER);
    }
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new AppError(API_ERRORS.VA_LEAVE_ALREADY_REVIEWED);
    }
    return this.settle(
      await this.requests.withdraw({
        requestId: request.id,
        decidedAt: params.observedAt,
      }),
    );
  }

  // Info: (20260817 - Julian) ===== 內部 =====

  /**
   * Info: (20260817 - Julian) 送出與試算共用的計算：逐日換算、簽核鏈、額度、併休。
   *
   * 兩支端點必須算出完全一樣的東西 —— 試算顯示「會扣 3 天、簽兩關」，
   * 送出卻扣了 4 天，那比沒有試算更糟。
   */
  private async buildPlan(params: {
    accountBookId: string;
    employeeId: string;
    input: ILeaveRequestInput;
  }) {
    const { accountBookId, employeeId, input } = params;

    if (input.days.length === 0) {
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const policy = await this.requirePolicy(accountBookId, input.leavePolicyId);
    const workDates = input.days.map((day) => day.workDate);
    const schedules = await this.context.findSchedules({
      accountBookId,
      employeeId,
      workDates,
    });

    const plan: ILeaveDayPlan[] = input.days.map((day) => {
      const schedule = schedules[day.workDate];
      /**
       * Info: (20260817 - Julian) 沒有排班或不是上班日的日子不能請假。
       *
       * 在例假日請假不會產生任何效果（判定引擎看非 WORK 就回 OFF_DAY），
       * 但它會扣掉額度 —— 使用者付出了代價卻什麼也沒換到。
       */
      if (
        schedule === undefined ||
        schedule.dayType !== WorkDayType.WORK ||
        schedule.shift === null
      ) {
        throw new AppError(API_ERRORS.VA_LEAVE_ON_NON_WORKING_DAY);
      }
      try {
        const resolved = resolveLeaveMinutes({
          policy: {
            unitBasis: policy.unitBasis,
            minimumUnitMinutes: policy.minimumUnitMinutes,
            roundingMode: policy.roundingMode,
          },
          shift: schedule.shift,
          segment: day.segment,
          startMinute: day.startMinute,
          endMinute: day.endMinute,
        });
        return {
          workDate: day.workDate,
          segment: day.segment,
          startMinute:
            day.segment === LeaveDaySegment.CUSTOM
              ? (day.startMinute ?? null)
              : null,
          endMinute:
            day.segment === LeaveDaySegment.CUSTOM
              ? (day.endMinute ?? null)
              : null,
          minutes: resolved.minutes,
          dayEquivalentMinutes: resolved.dayEquivalentMinutes,
        };
      } catch (error) {
        /**
         * Info: (20260817 - Julian) 引擎的結構性錯誤轉成 400，不讓它變成 500 ——
         * 「這個假別最小單位是整天，不能請半天」是使用者看得懂並能自己修正的事。
         */
        if (error instanceof LeaveRuleError) {
          throw new AppError(API_ERRORS.VA_LEAVE_UNIT_NOT_ALIGNED);
        }
        throw error;
      }
    });

    const totalDays = toTotalDays(plan);
    const [rules, org, grants, concurrency] = await Promise.all([
      this.context.findApprovalRules({ accountBookId }),
      this.context.buildOrgSnapshot({
        accountBookId,
        applicantEmployeeId: employeeId,
      }),
      policy.quotaMode === LeaveQuotaMode.QUOTA
        ? this.context.findConsumableGrants({
            accountBookId,
            employeeId,
            leavePolicyId: policy.id,
            asOfDate: workDates[0],
          })
        : Promise.resolve([]),
      this.context.findConcurrencyStatus({
        accountBookId,
        employeeId,
        leavePolicyId: policy.id,
        workDates,
      }),
    ]);

    const chain: IApprovalChainResolution = resolveApprovalChain({
      leavePolicyId: policy.id,
      totalDays,
      rules,
      org,
    });

    return { policy, plan, chain, grants, concurrency };
  }

  private async requirePolicy(accountBookId: string, leavePolicyId: string) {
    const policy = await this.context.findActivePolicy({
      accountBookId,
      leavePolicyId,
    });
    if (policy === null) throw new AppError(API_ERRORS.NF_LEAVE_POLICY);
    return policy;
  }

  private async requireRequest(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestRecord> {
    const request = await this.requests.findById(params);
    if (request === null) throw new AppError(API_ERRORS.NF_LEAVE_REQUEST);
    return request;
  }

  /**
   * Info: (20260817 - Julian) 取出當前待簽節點並套用職責分離（ADR 023 §5）。
   *
   * 四條規則的順序不是隨意的：**先擋自我核准再擋非授權簽核者**。
   * 反過來的話，一個把自己設成自己主管的人會收到「你不是簽核者」，
   * 而他明明就在鏈上 —— 那個訊息會讓他去找 HR 改權限，改不好。
   */
  private async claimStep(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
  }) {
    const request = await this.requireRequest(params);

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new AppError(API_ERRORS.VA_LEAVE_ALREADY_REVIEWED);
    }
    if (request.employeeId === params.actorEmployeeId) {
      throw new AppError(API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN);
    }

    const step = request.steps.find((item) => item.isPending);
    if (step === undefined) {
      throw new AppError(API_ERRORS.VA_LEAVE_ALREADY_REVIEWED);
    }
    if (step.approverEmployeeId !== params.actorEmployeeId) {
      throw new AppError(API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER);
    }

    return { request, step };
  }

  /**
   * Info: (20260817 - Julian) 把 repository 的結局轉成 API 語意。
   *
   * `BALANCE_RACE` 與 `ALREADY_REVIEWED` 都不是故障，是併發下的正常結局 ——
   * 但呼叫端需要不同的錯誤碼才能給出正確的訊息（一個是「額度被別張單先扣走」、
   * 一個是「這一關已經有人簽過了」）。
   */
  private settle(outcome: LeaveApprovalOutcome): LeaveApprovalOutcome {
    if (outcome === LeaveApprovalOutcome.BALANCE_RACE) {
      throw new AppError(API_ERRORS.CF_LEAVE_BALANCE_RACE);
    }
    if (outcome === LeaveApprovalOutcome.ALREADY_REVIEWED) {
      throw new AppError(API_ERRORS.VA_LEAVE_ALREADY_REVIEWED);
    }
    return outcome;
  }
}

/**
 * Info: (20260817 - Julian) 總日數 = Σ(該日分鐘 ÷ 該日日約當分鐘)。
 *
 * **不是「幾天」的計數。** 半天的日子只算 0.5 天，而不同班別的半天
 * 是不同的分鐘數 —— 這正是逐日固化 `dayEquivalentMinutes` 的用途
 * （計畫書 §D3）。總日數只用於命中簽核規則區間與顯示，帳本記的仍是分鐘。
 */
const toTotalDays = (plan: readonly ILeaveDayPlan[]): number =>
  plan.reduce((sum, day) => sum + day.minutes / day.dayEquivalentMinutes, 0);

/**
 * Info: (20260817 - Julian) 單例。route 只認這一個實例，
 * 依賴注入的形狀留給測試（`leave_request_service.test.ts` 以假 repository 驗編排）。
 */
export const leaveRequestService = new LeaveRequestService(
  leaveRequestRepo,
  leaveRequestContextRepo,
);
