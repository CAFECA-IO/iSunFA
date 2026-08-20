import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  OVERTIME_DAILY_TOTAL_LIMIT_MINUTES,
  overtimeLimitsOf,
} from "@/constants/overtime";
import { IOvertimePolicyView } from "@/interfaces/overtime";
import {
  employeeHrFunctionRepo,
  IEmployeeHrFunctionRepository,
} from "@/repositories/employee_hr_function.repo";
import {
  IOvertimePolicyRepository,
  overtimePolicyRepo,
} from "@/repositories/overtime_policy.repo";
import { OvertimePolicyInvariantError } from "@/repositories/overtime_policy_invariant";
import {
  IOvertimeRequestContext,
  overtimeRequestContextRepo,
} from "@/repositories/overtime_request_context.repo";
import { IOvertimePolicyUpdatePayload } from "@/validators/overtime";

/**
 * Info: (20260818 - Julian) 加班政策（L30）。
 *
 * ## 為什麼設定要 HR 職能而不是帳本 ADMIN
 *
 * 三條軸線互不相干：`Role` 是平台身分、`TeamRole` 是帳本存取權、
 * HR 職能才是「這個人在人事上能做什麼」。財務的帳本 `ADMIN` 不是人資，
 * 而把 54 小時的開關交給他，等於讓一個看不懂 §32 III 的人去按它
 * （ADR 023 §8.3）。判斷與簽核規則設定共用同一道閘。
 *
 * ## 讀取不設限
 *
 * 「這個帳本的加班上限是幾小時」不是機密 —— 藏起來的效果是員工不知道
 * 自己這個月還能加幾小時（同 L1 假別清單全體可讀的理由）。
 */
export class OvertimePolicyService {
  constructor(
    private readonly context: IOvertimeRequestContext,
    private readonly policies: IOvertimePolicyRepository,
    private readonly hrFunctions: IEmployeeHrFunctionRepository,
  ) {}

  public async read(accountBookId: string): Promise<IOvertimePolicyView> {
    const policy = await this.context.findPolicy(accountBookId);
    const extendedLimitAgreed = policy?.extendedLimitAgreed ?? false;
    const limits = overtimeLimitsOf(extendedLimitAgreed);

    return {
      extendedLimitAgreed,
      agreementRecordUrl: policy?.agreementRecordUrl ?? null,
      agreedAt: policy?.agreedAt?.toISOString() ?? null,
      compensatoryExpiryMonths: policy?.compensatoryExpiryMonths ?? null,
      // Info: (20260818 - Julian) 單日 12 小時是法定的、不可設定，但畫面要看得到
      dailyTotalLimitMinutes: OVERTIME_DAILY_TOTAL_LIMIT_MINUTES,
      monthlyLimitMinutes: limits.monthlyMinutes,
      quarterlyLimitMinutes: limits.quarterlyMinutes,
    };
  }

  public async update(params: {
    accountBookId: string;
    actorEmployeeId: string;
    input: IOvertimePolicyUpdatePayload;
  }): Promise<IOvertimePolicyView> {
    await this.assertMayConfigure(params);

    /**
     * Info: (20260820 - Julian) 不變式要收斂成 4xx（review 第 5 輪 M9）。
     *
     * `assertOvertimePolicy` 丟的 `OvertimePolicyInvariantError` 不是 `AppError`，
     * 不包的話 route 走到最後的 catch-all 變成 **500**。實際會踩到的情境很平常：
     * HR 勾了「已取得工會同意」但忘了貼會議紀錄連結 —— 那是一個表單漏填，
     * 使用者看到的卻是伺服器故障，而畫面上沒有任何線索指向那一格。
     *
     * 同 PR 的 `LeavePolicyService.write()` 已經對三種 repository 例外做了
     * 這件事；這一支漏了。
     */
    try {
      await this.policies.upsert({
        accountBookId: params.accountBookId,
        extendedLimitAgreed: params.input.extendedLimitAgreed,
        agreementRecordUrl: params.input.agreementRecordUrl,
        agreedAt:
          params.input.agreedAt === null
            ? null
            : new Date(params.input.agreedAt),
        compensatoryExpiryMonths: params.input.compensatoryExpiryMonths,
      });
    } catch (error) {
      if (error instanceof OvertimePolicyInvariantError) {
        throw new AppError(API_ERRORS.VA_OVERTIME_AGREEMENT_RECORD_REQUIRED);
      }
      throw error;
    }

    return this.read(params.accountBookId);
  }

  private async assertMayConfigure(params: {
    accountBookId: string;
    actorEmployeeId: string;
  }): Promise<void> {
    const isHr = await this.hrFunctions.hasAnyFunction({
      accountBookId: params.accountBookId,
      employeeId: params.actorEmployeeId,
      hrFunctions: [EmployeeHrFunction.HR_ADMIN],
    });
    if (!isHr) {
      throw new AppError(API_ERRORS.FO_HR_FUNCTION_REQUIRED);
    }
  }
}

export const overtimePolicyService = new OvertimePolicyService(
  overtimeRequestContextRepo,
  overtimePolicyRepo,
  employeeHrFunctionRepo,
);
