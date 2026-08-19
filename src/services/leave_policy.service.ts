import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { LeaveAccrualMethod } from "@/constants/leave_policy";
import {
  ILeaveAccrualTierView,
  ILeavePolicyDetail,
  ILeavePolicyWritable,
} from "@/interfaces/leave_policy_option";
import {
  employeeHrFunctionRepo,
  IEmployeeHrFunctionRepository,
} from "@/repositories/employee_hr_function.repo";
import { LeaveAccrualTierInvariantError } from "@/repositories/leave_accrual_tier_invariant";
import {
  ILeavePolicyRepository,
  leavePolicyRepo,
  LeavePolicyCodeTakenError,
  LeavePolicyMissingError,
} from "@/repositories/leave_policy.repo";
import {
  assertNoMergeCycle,
  LeavePolicyInvariantError,
} from "@/repositories/leave_policy_invariant";
import {
  ILeaveAccrualTierTablePayload,
  ILeavePolicyWritePayload,
} from "@/validators/leave_policy";

/**
 * Info: (20260818 - Julian) 假別設定（L2–L6）。
 *
 * ## 為什麼現在才做得了
 *
 * 這五支端點從里程碑 1 就設計好了，但一直沒有實作 —— 不是因為難，
 * 是因為**沒有人可以被授權**：`Employee` 上原本沒有任何 HR 角色來源，
 * 平台的 `Role` 與帳本的 `TeamRole` 都不是人資（ADR 023 §8.3）。
 * `EmployeeHrFunctionAssignment`（待辦甲-1）落地之後才有一道擋得住的閘。
 *
 * ## 內建假別只開放公司政策欄位
 *
 * 十三種內建假別由 seed 產生，它們的給假方式、工資比例、雇主有無准駁權
 * 直接來自勞基法與性平法。開放修改的效果不是彈性 —— 是讓一個違法的設定
 * 看起來像一筆正常的假別，而受影響的人要到請假被扣錯天數時才會發現。
 *
 * 可改的四類：名稱、最小請假單位、證明文件要求與門檻、遞延月數。
 * 每一項在文件裡都有「這是公司政策不是法定數字」的明文
 * （`proofThresholdDays` 見計畫書 §17 缺口 11、遞延見 §38 IV 的協商）。
 */

/**
 * Info: (20260818 - Julian) 內建假別可由租戶修改的欄位。
 *
 * 白名單而不是黑名單：日後 `LeavePolicy` 加欄位時，新欄位預設是**鎖住的**。
 * 黑名單的話新欄位預設開放，而那個方向錯了會直接讓法定值可被改寫。
 */
const TENANT_EDITABLE_FIELDS: readonly (keyof ILeavePolicyWritable)[] = [
  "name",
  "minimumUnitMinutes",
  "proofRequirement",
  "proofThresholdDays",
  "carryForwardMonths",
];

export class LeavePolicyService {
  constructor(
    private readonly policies: ILeavePolicyRepository,
    private readonly hrFunctions: IEmployeeHrFunctionRepository,
  ) {}

  /**
   * Info: (20260818 - Julian) 設定畫面的單筆讀取。
   *
   * 計畫書 §10 沒有為它編號 —— 改不了自己看不到的東西，而 L1 回的是
   * 請假的人需要的欄位（不含 `paidRatio` 與給假規則）。理由同 L30 的 GET。
   *
   * ToDo: (20260818 - Julian) 「列出含已停用的假別」與「重新啟用」兩件事
   * §10 都沒有編號，因此停用之後那一列在設定畫面上會消失。
   * 缺口記於本輪交付說明，待假別設定頁動工時一併補。
   */
  public async read(params: {
    accountBookId: string;
    actorEmployeeId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicyDetail> {
    await this.assertMayConfigure(params);
    return this.mustFind(params);
  }

  // Info: (20260818 - Julian) L2：新增自訂假別
  public async create(params: {
    accountBookId: string;
    actorEmployeeId: string;
    input: ILeavePolicyWritePayload;
  }): Promise<ILeavePolicyDetail> {
    await this.assertMayConfigure(params);
    await this.assertMergeTargetExists(params.accountBookId, params.input);

    /**
     * Info: (20260818 - Julian) 新建的假別**不可能**參與環：它還不存在，
     * 因此沒有任何一列指向它。成環只在修改既有假別時才可能發生。
     */
    return this.write(() =>
      this.policies.create({
        accountBookId: params.accountBookId,
        input: params.input,
      }),
    );
  }

  // Info: (20260818 - Julian) L3：修改假別設定
  public async update(params: {
    accountBookId: string;
    actorEmployeeId: string;
    leavePolicyId: string;
    input: ILeavePolicyWritePayload;
  }): Promise<ILeavePolicyDetail> {
    await this.assertMayConfigure(params);

    const current = await this.mustFind(params);
    if (current.isSystemDefined) {
      this.assertOnlyTenantFieldsChanged(current, params.input);
    }

    await this.assertMergeTargetExists(params.accountBookId, params.input);
    if (params.input.mergesIntoPolicyId !== null) {
      const edges = await this.policies.listMergeEdges(params.accountBookId);
      this.wrapInvariant(() =>
        assertNoMergeCycle({
          edges,
          from: params.leavePolicyId,
          to: params.input.mergesIntoPolicyId,
        }),
      );
    }

    return this.write(() =>
      this.policies.update({
        accountBookId: params.accountBookId,
        leavePolicyId: params.leavePolicyId,
        input: params.input,
      }),
    );
  }

  /**
   * Info: (20260818 - Julian) L4：停用假別。
   *
   * 內建假別不可停用 —— 停掉特休不會讓法定義務消失，只會讓員工請不了假，
   * 而 `leave_seed_integrity` 對「內建假別齊備」的保證也會變成一句空話
   * （ADR 021 §5）。
   *
   * Info: (20260819 - Julian) 那支測試在 review B8 之前並不存在，現已補上（T23）。
   * 但要說準它守的範圍：它驗的是 `DEFAULT_LEAVE_POLICY_SEED` 這份**規格**
   * —— 十三個代號齊備、每一列過得了寫入不變式、法源與留白的欄位正確。
   * ToDo: (20260819 - Julian) 「**這個帳本**真的把十三列都種進去了嗎」
   * 需要連得上資料庫才答得出來，那條要跟每日勾稽 Worker 一起做
   * （計畫書 §16 T23 的狀態欄）。這一行擋的是停用，擋不了從未種進去。
   *
   * 已經停用的假別再停一次回原狀，不視為錯誤：那是冪等，不是衝突。
   */
  public async deactivate(params: {
    accountBookId: string;
    actorEmployeeId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicyDetail> {
    await this.assertMayConfigure(params);

    const current = await this.mustFind(params);
    if (current.isSystemDefined) {
      throw new AppError(API_ERRORS.VA_LEAVE_POLICY_LOCKED_FIELD);
    }

    await this.policies.deactivate({
      accountBookId: params.accountBookId,
      leavePolicyId: params.leavePolicyId,
    });
    return this.mustFind(params);
  }

  // Info: (20260818 - Julian) L5：年資級距表
  public async listTiers(params: {
    accountBookId: string;
    actorEmployeeId: string;
    leavePolicyId: string;
  }): Promise<ILeaveAccrualTierView[]> {
    await this.assertMayConfigure(params);
    await this.mustFind(params);
    return this.policies.listTiers(params.leavePolicyId);
  }

  /**
   * Info: (20260818 - Julian) L6：覆寫年資級距表（全量取代，非差異更新）。
   *
   * 這是 2016 年那次修法要改的東西 —— 級距表**會變**，所以它是資料不是程式碼
   * （`ANNUAL_LEAVE_TIER_SEED` 的檔頭）。因此內建假別的級距表**可以改**：
   * 鎖住的是給假方式與工資比例，不是法定日數本身會不會修法。
   */
  public async replaceTiers(params: {
    accountBookId: string;
    actorEmployeeId: string;
    leavePolicyId: string;
    input: ILeaveAccrualTierTablePayload;
  }): Promise<ILeaveAccrualTierView[]> {
    await this.assertMayConfigure(params);

    const current = await this.mustFind(params);
    if (current.accrualMethod !== LeaveAccrualMethod.SENIORITY_TIER) {
      throw new AppError(API_ERRORS.VA_LEAVE_TIER_NOT_APPLICABLE);
    }

    try {
      return await this.policies.replaceTiers({
        leavePolicyId: params.leavePolicyId,
        tiers: params.input.tiers,
      });
    } catch (error) {
      if (error instanceof LeaveAccrualTierInvariantError) {
        throw new AppError(API_ERRORS.VA_LEAVE_TIER_TABLE_INVALID);
      }
      throw error;
    }
  }

  /**
   * Info: (20260818 - Julian) 設定假別需 `HR_ADMIN` 職能。
   *
   * 與簽核規則設定（L31／L32）與加班政策（L30）共用同一道閘：三者都是
   * 「改了會影響全公司每一個人請假結果」的設定，而財務的帳本 `ADMIN`
   * 不是人資（ADR 023 §8.3）。
   */
  private async assertMayConfigure(params: {
    accountBookId: string;
    actorEmployeeId: string;
  }): Promise<void> {
    const isHr = await this.hrFunctions.hasAnyFunction({
      accountBookId: params.accountBookId,
      employeeId: params.actorEmployeeId,
      hrFunctions: [EmployeeHrFunction.HR_ADMIN],
    });
    if (!isHr) throw new AppError(API_ERRORS.FO_HR_FUNCTION_REQUIRED);
  }

  private async mustFind(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicyDetail> {
    const found = await this.policies.findDetailById(params);
    if (found === null) throw new AppError(API_ERRORS.NF_LEAVE_POLICY);
    return found;
  }

  /**
   * Info: (20260818 - Julian) 併計對象必須存在**且在同一個帳本**。
   *
   * 不檢查的話，一個跨帳本的 id 會被寫進去而外鍵不會擋（兩者都是
   * `LeavePolicy`）—— 結果是 A 公司的家庭照顧假併進 B 公司的事假。
   */
  private async assertMergeTargetExists(
    accountBookId: string,
    input: ILeavePolicyWritePayload,
  ): Promise<void> {
    if (input.mergesIntoPolicyId === null) return;

    const target = await this.policies.findDetailById({
      accountBookId,
      leavePolicyId: input.mergesIntoPolicyId,
    });
    if (target === null) throw new AppError(API_ERRORS.NF_LEAVE_POLICY);
  }

  /**
   * Info: (20260818 - Julian) 內建假別只允許白名單內的欄位有變化。
   *
   * 逐欄比對而不是「只取白名單欄位、其餘照舊」：後者會**安靜地忽略**
   * 使用者送上來的法定欄位異動，而畫面上那個欄位看起來是可以編輯的。
   * 擋下來並指出哪一欄，使用者才知道那不是他能改的東西。
   */
  private assertOnlyTenantFieldsChanged(
    current: ILeavePolicyDetail,
    input: ILeavePolicyWritePayload,
  ): void {
    const editable = new Set<string>(TENANT_EDITABLE_FIELDS);

    for (const key of Object.keys(input) as (keyof ILeavePolicyWritable)[]) {
      if (editable.has(key)) continue;
      if (input[key] === current[key]) continue;

      throw new AppError({
        ...API_ERRORS.VA_LEAVE_POLICY_LOCKED_FIELD,
        message: `${API_ERRORS.VA_LEAVE_POLICY_LOCKED_FIELD.message}: ${key}`,
      });
    }
  }

  // Info: (20260818 - Julian) repository 的具名錯誤轉成使用者看得懂的碼；不變式觸發時 DB 完全正常
  private async write(
    action: () => Promise<ILeavePolicyDetail>,
  ): Promise<ILeavePolicyDetail> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof LeavePolicyCodeTakenError) {
        throw new AppError(API_ERRORS.CF_LEAVE_POLICY_CODE_TAKEN);
      }
      if (error instanceof LeavePolicyMissingError) {
        throw new AppError(API_ERRORS.NF_LEAVE_POLICY);
      }
      if (error instanceof LeavePolicyInvariantError) {
        throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
      }
      throw error;
    }
  }

  private wrapInvariant(check: () => void): void {
    try {
      check();
    } catch (error) {
      if (error instanceof LeavePolicyInvariantError) {
        throw new AppError(API_ERRORS.VA_LEAVE_POLICY_MERGE_CYCLE);
      }
      throw error;
    }
  }
}

export const leavePolicyService = new LeavePolicyService(
  leavePolicyRepo,
  employeeHrFunctionRepo,
);
