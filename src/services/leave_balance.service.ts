import { randomUUID } from "crypto";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { LeaveAccrualMethod, LeaveQuotaMode } from "@/constants/leave_policy";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import { toZonedParts } from "@/lib/utils/attendance_time";
import { deriveGrantSchedule } from "@/lib/leave_entitlement_rules";
import { IPlannedGrant } from "@/interfaces/leave_entitlement";
import {
  ILeaveBalanceView,
  ILedgerEntryView,
} from "@/interfaces/leave_balance";
import {
  ILeaveGrantRepository,
  LeaveGrantMissingError,
  leaveGrantRepo,
} from "@/repositories/leave_grant.repo";
import {
  ILeaveAccrualContextRepository,
  leaveAccrualContextRepo,
} from "@/repositories/leave_accrual_context.repo";
import {
  assertMayAccrueBalance,
  assertMayAdjustBalance,
  assertMayViewLeaveBalanceOf,
} from "@/services/leave_visibility";

/**
 * Info: (20260817 - Julian) 額度查詢與授予（L7 / L8 / L9 / L33）。
 *
 * ## 授予為什麼是一支可以隨便重跑的方法
 *
 * `deriveGrantSchedule` 回的是**應然** —— 「到今天為止這個人應該有哪些批次」。
 * 這裡把它交給 repository 與既有的比對，只補缺的。因此：每日 Worker 重跑、
 * 補跑三個月前漏掉的、同一秒被觸發兩次，結果都一樣。
 *
 * ADR 022 選擇批次授予而不是「請假時才算」的理由也在這裡：
 * 額度必須在**請假之前**就看得到，否則員工無從規劃，
 * 而「查詢時順便產生副作用」是一種沒有人預期得到的行為。
 *
 * ## 為什麼沒有排程器
 *
 * 目前由 seed 與 L33 手動觸發。掛上 Worker 是里程碑 4 的事，
 * 而在那之前這支方法已經是冪等的 —— 排程器只是換一個呼叫它的人。
 * ToDo: (20260817 - Julian) 接上每日 Worker，並在同一支裡做 EXPIRE 與勾稽。
 */
export class LeaveBalanceService {
  public constructor(
    private readonly grants: ILeaveGrantRepository,
    private readonly context: ILeaveAccrualContextRepository,
  ) {}

  /**
   * Info: (20260817 - Julian) L7：某員工各假別的餘額。
   *
   * Info: (20260819 - Julian) 權限閘放在 service 而不是 route：四個入口
   * 對「誰看得到誰的額度」必須給同一個答案，而 seed 與日後的 Worker
   * 也走這裡（見 `leave_visibility.ts`）。
   */
  public async list(params: {
    accountBookId: string;
    actorEmployeeId: string;
    employeeId: string;
    asOfDate: string;
  }): Promise<ILeaveBalanceView> {
    await assertMayViewLeaveBalanceOf({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      targetEmployeeId: params.employeeId,
    });

    return {
      employeeId: params.employeeId,
      asOfDate: params.asOfDate,
      balances: await this.grants.summarize({
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
      }),
    };
  }

  // Info: (20260817 - Julian) L8：額度異動明細
  public async listLedger(params: {
    accountBookId: string;
    actorEmployeeId: string;
    employeeId: string;
    leavePolicyId?: string;
    limit: number;
  }): Promise<ILedgerEntryView[]> {
    await assertMayViewLeaveBalanceOf({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      targetEmployeeId: params.employeeId,
    });

    /**
     * Info: (20260819 - Julian) 明確挑欄位傳下去，不用 `...params` 整包丟。
     * `actorEmployeeId` 是授權用的，不是查詢條件 —— 整包丟會讓 repository
     * 收到一個它不該關心的欄位，而下一個人會以為那是過濾條件之一。
     */
    return this.grants.listLedger({
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
      limit: params.limit,
    });
  }

  /**
   * Info: (20260817 - Julian) L9：人工調整。
   *
   * **理由必填**由 validator 擋（非空字串），這裡擋的是語意：
   * 調整量為 0 不是一個調整，它只會在帳本上留下一筆什麼也沒做的紀錄，
   * 而那會讓對帳的人以為漏看了什麼。
   */
  public async adjust(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    deltaMinutes: number;
    reason: string;
    actorEmployeeId: string;
    // Info: (20260817 - Julian) 「現在」由呼叫端注入，service 不呼叫 Date.now()
    asOfDate: string;
  }): Promise<ILeaveBalanceView> {
    /**
     * Info: (20260819 - Julian) **限 HR_ADMIN。** 排在最前面：授權要在
     * 任何驗證與寫入之前，否則一個沒有權限的人可以靠錯誤訊息的差別
     * 探知這個帳本裡有沒有某個員工／某個假別。
     */
    await assertMayAdjustBalance({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      // Info: (20260820 - Julian) 不得調整自己的額度（review 第 5 條）
      targetEmployeeId: params.employeeId,
    });

    if (params.deltaMinutes === 0) {
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    try {
      await this.grants.adjust({
        ...params,
        /**
         * Info: (20260817 - Julian) 人工調整的冪等鍵用隨機值。
         *
         * 與授予相反：授予是「這個週期只能有一筆」，重複觸發必須被擋；
         * 人工調整則是「HR 想調幾次就幾次」—— 同一天對同一個人補兩次
         * 各有各的理由，用內容組鍵會把第二次靜默吃掉。
         */
        idempotencyKey: `adjust:${randomUUID()}`,
      });
    } catch (error) {
      if (error instanceof LeaveGrantMissingError) {
        throw new AppError(API_ERRORS.NF_LEAVE_GRANT);
      }
      throw error;
    }

    logger.info(
      `[leave] balance adjusted: employee=${params.employeeId} policy=${params.leavePolicyId} delta=${params.deltaMinutes}`,
    );
    return this.list({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      employeeId: params.employeeId,
      asOfDate: params.asOfDate,
    });
  }

  /**
   * Info: (20260817 - Julian) L33：把某員工的額度補到 `asOfDate` 為止。
   *
   * 回傳實際新增的批次數。0 代表「已經是最新的」，不是失敗。
   */
  public async accrueForEmployee(params: {
    accountBookId: string;
    employeeId: string;
    /** Info: (20260820 - Julian) 授予到哪一天為止。**不得晚於 `observedAt` 那一天** */
    asOfDate: string;
    actorEmployeeId: string | null;
    /** Info: (20260820 - Julian) 「現在」由呼叫端注入，service 不取 `Date.now()` */
    observedAt: Date;
  }): Promise<number> {
    /**
     * Info: (20260819 - Julian) `actorEmployeeId` 為 null 代表**系統**
     * （seed 與日後的每日 Worker），不受此閘限制 —— 它不是任何人按的。
     * 由人觸發時一律限 `HR_ADMIN`：手動端點是 Worker 上線前的替身，
     * 替身沒有理由比本尊寬鬆（見 `assertMayAccrueBalance` 的說明）。
     */
    /**
     * Info: (20260820 - Julian) **`asOfDate` 不得指向未來**（review 第 9 輪第 2 條）。
     *
     * `asOfDate` 就是 `deriveGrantSchedule` 的 horizon，而它先前沒有任何上界：
     * `"9999-12-31"` 一次請求鑄出 7,980 批、239,117 日的額度（實測，曆年制）。
     * 而這一支明文允許對自己執行，理由是「它交出去的是引擎算出的**應然**……
     * 生不出多的」—— 沒有上界的 horizon 讓那句話不成立。
     *
     * 擋在授權之前：一個把日期填到三千年後的請求，不需要先問他是不是人資。
     * 「今天」由呼叫端注入（`observedAt`），這一層不取 `Date.now()`。
     */
    const today = toZonedParts(params.observedAt, DEMO_TIME_ZONE).isoDate;
    if (params.asOfDate > today) {
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    if (params.actorEmployeeId !== null) {
      /**
       * Info: (20260820 - Julian) 走 `assertMayAccrueBalance` 而不是
       * `assertMayAdjustBalance`（review 第 5 條）：授予**允許對自己**。
       * 它交出去的是引擎算出的應然，補得出漏掉的、生不出多的；
       * 擋掉的話，只有一位人資的公司裡那位人資的特休永遠沒有人授予得了。
       */
      await assertMayAccrueBalance({
        accountBookId: params.accountBookId,
        actorEmployeeId: params.actorEmployeeId,
      });
    }

    const employee = await this.context.findEmployeeForAccrual({
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
    });
    if (!employee) throw new AppError(API_ERRORS.NF_EMPLOYEE);

    /**
     * Info: (20260817 - Julian) 沒有班別就沒有「一天是幾分鐘」。
     *
     * 引擎明確拒絕猜這件事（`dayEquivalentMinutes <= 0` 直接丟）——
     * 而猜錯的後果是每一批額度的面額都錯，且錯得看不出來。
     */
    if (employee.dayEquivalentMinutes <= 0) {
      throw new AppError(API_ERRORS.VA_LEAVE_NO_SHIFT_FOR_ACCRUAL);
    }

    const policies = await this.context.findAccrualPolicies(
      params.accountBookId,
    );

    let issued = 0;
    for (const policy of policies) {
      /**
       * Info: (20260817 - Julian) 只有 QUOTA 且按時間累積的假別需要授予。
       *
       * `UNLIMITED`（公傷病假、產假）不建批次 —— 它們沒有額度可扣，
       * 建一批零額度的批次只會讓餘額畫面多出一列說「還有 0 分鐘」。
       * `PER_EVENT` / `NONE` 由 `deriveGrantSchedule` 自己回空陣列，
       * 這裡先擋是為了不必要的往返。
       */
      if (policy.quotaMode !== LeaveQuotaMode.QUOTA) continue;
      if (
        policy.accrual.accrualMethod === LeaveAccrualMethod.NONE ||
        policy.accrual.accrualMethod === LeaveAccrualMethod.PER_EVENT
      ) {
        continue;
      }

      const planned: IPlannedGrant[] = deriveGrantSchedule({
        hireDate: employee.hireDate,
        asOfDate: params.asOfDate,
        leaveDate: employee.leaveDate,
        policy: policy.accrual,
        dayEquivalentMinutes: employee.dayEquivalentMinutes,
      });

      issued += await this.grants.issue({
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        leavePolicyId: policy.id,
        planned,
        actorEmployeeId: params.actorEmployeeId,
      });
    }

    if (issued > 0) {
      logger.info(
        `[leave] accrued ${issued} grant(s): employee=${params.employeeId} asOf=${params.asOfDate}`,
      );
    }
    return issued;
  }
}

export const leaveBalanceService = new LeaveBalanceService(
  leaveGrantRepo,
  leaveAccrualContextRepo,
);
