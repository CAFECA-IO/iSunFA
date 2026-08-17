/**
 * Info: (20260817 - Julian) 假別設定的「不得同時宣稱兩件互斥的事」不變式。
 *
 * ## 這條規則守的是什麼
 *
 * `LeavePolicy` 把「行為分類」放在 enum、「參數」放在欄位（ADR 021 §2）。
 * 這個切法只在**兩者不矛盾**時成立 —— 一列宣稱「最小單位以固定分鐘計」
 * 卻沒有分鐘數，或宣稱「依年資級距給假」卻同時帶著一個固定年度日數，
 * 都是兩個各自合法、互相矛盾的事實同時存在，而系統沒有依據判斷該信哪一個。
 * 那正是 ADR 019 §1 表格裡評為「最惡劣」的第 3 種非法狀態。
 *
 * ## 為什麼擋在 repository 而不是 service
 *
 * repository 是唯一的 DB 閘口。假別設定的高風險寫入路徑不是 API ——
 * 是 **seed**：內建假別由 seed 產生（ADR 021 §5 的代價之一是「seed 成為
 * 正確性的一部分」），而 seed 繞過所有 service。
 *
 * ## 為什麼即使 API 端已用 Zod 擋過也要留
 *
 * Zod 擋的是「這個請求的欄位型別對不對」，這裡擋的是「這些欄位放在一起
 * 說不說得通」。前者每個端點各驗一次，後者只有一份 —— 而假別設定會被
 * 建立、修改、seed、租戶複製四條路徑寫入。
 */

import {
  LeaveAccrualMethod,
  LeaveQuotaMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";

export class LeavePolicyInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`LeavePolicy: ${reason} (${detail})`);
    this.name = "LeavePolicyInvariantError";
  }
}

export interface IStorableLeavePolicy {
  /** Info: (20260817 - Julian) 新建時為 undefined；更新時用於擋自我併計 */
  id?: string | null;
  accrualMethod: LeaveAccrualMethod;
  quotaMode: LeaveQuotaMode;
  unitBasis: LeaveUnitBasis;
  minimumUnitMinutes: number | null | undefined;
  annualDays: number | null | undefined;
  cashOutOnExpiry: boolean;
  mergesIntoPolicyId: string | null | undefined;
}

/**
 * Info: (20260817 - Julian) 寫入前檢查；違反即丟具名錯誤，由 service 轉成
 * `VA_INVALID_INPUT_DATA`。丟具名型別的理由同 `assertStorablePii`：
 * service 一律把 catch 到的東西包成 `IS_DB_FAILED`(500)，而這個守衛觸發時
 * DB 完全正常，呼叫端會收到一個與成因無關的 500。
 */
export function assertLeavePolicyUnit(params: IStorableLeavePolicy): void {
  const hasUnitMinutes =
    params.minimumUnitMinutes !== null &&
    params.minimumUnitMinutes !== undefined;

  if (params.unitBasis === LeaveUnitBasis.FIXED_MINUTES) {
    if (!hasUnitMinutes) {
      throw new LeavePolicyInvariantError(
        "unitBasis is FIXED_MINUTES but no minimumUnitMinutes was given; the engine cannot round anything",
        `unitBasis=${params.unitBasis}, minimumUnitMinutes=${params.minimumUnitMinutes}`,
      );
    }
    const minutes = params.minimumUnitMinutes as number;
    /**
     * Info: (20260817 - Julian) 必須整除 60。
     *
     * 不是為了好看：一個 7 分鐘的最小單位會讓「請一小時」變成
     * 9 個單位 63 分鐘，而使用者在畫面上選的是「1 小時」。
     * 能整除 60 才保證「整點的請假時數不會被捨入改寫」。
     */
    if (!Number.isInteger(minutes) || minutes <= 0 || 60 % minutes !== 0) {
      throw new LeavePolicyInvariantError(
        "minimumUnitMinutes must be a positive integer dividing 60; otherwise whole-hour requests get silently rounded up",
        `minimumUnitMinutes=${minutes}`,
      );
    }
  } else if (hasUnitMinutes) {
    /**
     * Info: (20260817 - Julian) 反方向也擋，而且是**必須為 null 而非「忽略」**。
     *
     * 一個 `unitBasis = HALF_WORKDAY` 卻存著 `minimumUnitMinutes = 30` 的假別，
     * 在設定畫面上看起來就是「最小單位 30 分鐘」—— 它不影響計算，
     * 但它會讓看設定的人（含未來接手的工程師）相信一件不成立的事。
     */
    throw new LeavePolicyInvariantError(
      "minimumUnitMinutes is only meaningful for FIXED_MINUTES; a leftover value reads as a setting that does nothing",
      `unitBasis=${params.unitBasis}, minimumUnitMinutes=${params.minimumUnitMinutes}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 依年資級距給假者不得同時帶固定年度日數。
   *
   * 兩者都是「這個假別一年給幾天」的答案，而它們可以不一致 ——
   * 級距表說滿三年 14 日、`annualDays` 說 7 日，引擎讀級距、
   * 設定畫面讀 `annualDays`，同一個假別在兩個地方顯示不同的數字。
   */
  if (
    params.accrualMethod === LeaveAccrualMethod.SENIORITY_TIER &&
    params.annualDays !== null &&
    params.annualDays !== undefined
  ) {
    throw new LeavePolicyInvariantError(
      "SENIORITY_TIER reads the tier table; a fixed annualDays would be a second, contradictable answer",
      `accrualMethod=${params.accrualMethod}, annualDays=${params.annualDays}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 不限額度者不得標「屆期折現」。
   *
   * `UNLIMITED` 的假別（公傷病假、產假）不建 `LeaveGrant`，因此沒有任何
   * 批次會到期。標了 `cashOutOnExpiry` 的效果是：年度終結 Worker 會去找
   * 一組永遠是空的批次，然後什麼也不做 —— 而 HR 會以為系統在幫他算折現。
   */
  if (params.quotaMode === LeaveQuotaMode.UNLIMITED && params.cashOutOnExpiry) {
    throw new LeavePolicyInvariantError(
      "an unlimited leave type has no grants to expire; cashOutOnExpiry would silently do nothing",
      `quotaMode=${params.quotaMode}, cashOutOnExpiry=${params.cashOutOnExpiry}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 併計對象不得是自己。
   *
   * 家庭照顧假併入事假（性平法 §20）是一個有向關係；指向自己會讓
   * `allocateConsumption` 在同一個假別上扣兩次 —— 請一天家庭照顧假扣兩天。
   * 更長的環（A→B→A）這裡擋不到，需要在 service 走一次可達性檢查。
   * ToDo: (20260817 - Julian) 併計成環的偵測留在 service，本檔只擋最常見的自指。
   */
  if (
    params.id !== null &&
    params.id !== undefined &&
    params.mergesIntoPolicyId === params.id
  ) {
    throw new LeavePolicyInvariantError(
      "a leave type cannot merge into itself; consumption would be deducted twice",
      `id=${params.id}, mergesIntoPolicyId=${params.mergesIntoPolicyId}`,
    );
  }
}
