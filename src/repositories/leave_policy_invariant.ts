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
  LeaveCycleBasis,
  LeaveProofRequirement,
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
  cycleBasis: LeaveCycleBasis;
  quotaMode: LeaveQuotaMode;
  unitBasis: LeaveUnitBasis;
  minimumUnitMinutes: number | null | undefined;
  annualDays: number | null | undefined;
  cashOutOnExpiry: boolean;
  mergesIntoPolicyId: string | null | undefined;
  proofRequirement: LeaveProofRequirement;
  proofThresholdDays: number | null | undefined;
}

/**
 * Info: (20260817 - Julian) 寫入前檢查；違反即丟具名錯誤，由 service 轉成
 * `VA_INVALID_INPUT_DATA`。丟具名型別的理由同 `assertStorablePii`：
 * service 一律把 catch 到的東西包成 `IS_DB_FAILED`(500)，而這個守衛觸發時
 * DB 完全正常，呼叫端會收到一個與成因無關的 500。
 *
 * ToDo: (20260817 - Julian) 函式名已經比它做的事窄 —— 它現在檢查單位、級距、
 * 折現、併計、證明五組互斥組合。改名為 `assertStorableLeavePolicy` 較貼切，
 * 但那會動到 seed 與測試的呼叫點，留待下一次進到這個檔案時一併處理。
 */
export function assertLeavePolicyUnit(params: IStorableLeavePolicy): void {
  /**
   * Info: (20260819 - Julian) **年資級距 + 曆年制暫時不可用**（review B3、計畫書 §17 缺口 9）。
   *
   * ## 為什麼擋
   *
   * ADR 021 §3.1 承諾了一條下界：曆年制的授予不得低於同期週年制
   * （§38 是法定**最低**標準，換一種給假週期不能把它換低）。那條護欄叫
   * `assertCycleNotDisadvantageous`，而**它從來沒有被實作** —— 引擎側的
   * `compareCycleBasisEntitlement()` 有、錯誤碼 `VA_LEAVE_CYCLE_DISADVANTAGEOUS`
   * 有、斷言它存在的測試也有，就是沒有任何地方丟它。
   *
   * ## 為什麼不是直接把護欄接上
   *
   * 因為現行的曆年制比例公式本身是錯的（缺口 9：3/1 到職者第一個年資年度
   * 拿到 3 × 122/365 ≈ 1.1 日，法定 3 日）。接上護欄會讓**每一個**曆年制設定
   * 都授予失敗 —— 而 13 個內建假別裡有 11 個是曆年制。那不是 fail fast，
   * 是產品停擺，而真正的錯誤在公式不在設定。
   *
   * ## 為什麼只擋這一個組合
   *
   * 會踩到法定下界的只有 `SENIORITY_TIER`（§38 特休的年資級距）。
   * `FIXED_PER_CYCLE`（事假 14 日、病假 30 日）與 `PER_EVENT`（婚假、喪假）
   * 是「一年內不超過」的上限額度，沒有一條逐年的法定**下界**要守。
   * 因此只擋危險的那一格：內建假別無一使用此組合（特休是年資級距 + 週年制），
   * 租戶自訂時才擋得到。
   *
   * ToDo: (20260819 - Julian) 缺口 9 的公式修正（曆年制應為「提前給」而非
   * 「按比例砍」）落地後，改為接上 `assertCycleNotDisadvantageous`，並移除本段。
   */
  if (
    params.accrualMethod === LeaveAccrualMethod.SENIORITY_TIER &&
    params.cycleBasis === LeaveCycleBasis.CALENDAR_YEAR
  ) {
    throw new LeavePolicyInvariantError(
      "SENIORITY_TIER with CALENDAR_YEAR is temporarily rejected: the proportional first-cycle formula grants less than the statutory minimum (Article 38), and the guard that would catch it is not wired yet",
      `accrualMethod=${params.accrualMethod}, cycleBasis=${params.cycleBasis}`,
    );
  }

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
   * 更長的環（A→B→A）這裡擋不到 —— 它需要整個帳本的併計關係圖，
   * 見本檔下方的 `assertNoMergeCycle`（2026-08-18 補）。
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

  assertProofRequirement(params);
}

/**
 * Info: (20260817 - Julian) 「超過門檻要證明」必須有門檻。
 *
 * ## 為什麼要單獨擋
 *
 * 第一版的 `DEFAULT_LEAVE_POLICY_SEED` 有五個假別標了
 * `REQUIRED_OVER_THRESHOLD`，而 `ILeavePolicySeed` 根本沒有門檻欄位 ——
 * 五列全部帶著 `proofThresholdDays = null` 落地。
 *
 * 那不會報錯，這正是問題：一個「超過 null 日要證明」的假別，
 * 將來寫檢查的人有兩種寫法，`days > null` 恆為 false（永遠不要求證明）
 * 或當場丟例外，而**兩種都不是設定它的人想要的**。
 * 形狀與上面 `FIXED_MINUTES ⇒ minimumUnitMinutes` 那條完全相同。
 */
function assertProofRequirement(params: IStorableLeavePolicy): void {
  const hasThreshold =
    params.proofThresholdDays !== null &&
    params.proofThresholdDays !== undefined;

  if (
    params.proofRequirement === LeaveProofRequirement.REQUIRED_OVER_THRESHOLD
  ) {
    if (!hasThreshold) {
      throw new LeavePolicyInvariantError(
        "proofRequirement is REQUIRED_OVER_THRESHOLD but no proofThresholdDays was given; the check would silently never fire",
        `proofRequirement=${params.proofRequirement}, proofThresholdDays=${params.proofThresholdDays}`,
      );
    }
    /**
     * Info: (20260817 - Julian) 門檻必須 > 0，**刻意不接受 0**。
     *
     * `threshold = 0` 讀起來是「超過 0 日就要證明」＝ 一律要證明。
     * 那個語意是真實存在的需求（公傷病假要職災認定文件、產假要診斷證明，
     * 都與日數無關），但 `LeaveProofRequirement` **沒有表達它的成員** ——
     * 只有 NONE / OPTIONAL / REQUIRED_OVER_THRESHOLD。
     *
     * 放行 0 等於讓人用門檻欄位偷渡一個缺失的 enum 值，而那個缺口從此
     * 不會有人再提。擋下來，讓它以「需要新增 `REQUIRED`」的形式浮出水面。
     * ToDo: (20260817 - Julian) 補 `LeaveProofRequirement.REQUIRED`（計畫書 §17）。
     */
    const days = params.proofThresholdDays as number;
    if (!(days > 0)) {
      throw new LeavePolicyInvariantError(
        "proofThresholdDays must be greater than 0; a zero threshold means 'always required', which this enum cannot express yet",
        `proofThresholdDays=${days}`,
      );
    }
  } else if (hasThreshold) {
    /**
     * Info: (20260817 - Julian) 反方向同樣擋，理由同 `minimumUnitMinutes`：
     * 一個 `proofRequirement = OPTIONAL` 卻存著 `proofThresholdDays = 3` 的假別，
     * 在設定畫面上看起來就是「超過三天要證明」，而它什麼也不做。
     */
    throw new LeavePolicyInvariantError(
      "proofThresholdDays is only meaningful for REQUIRED_OVER_THRESHOLD; a leftover value reads as a rule that does nothing",
      `proofRequirement=${params.proofRequirement}, proofThresholdDays=${params.proofThresholdDays}`,
    );
  }
}

/**
 * Info: (20260818 - Julian) 併計關係不得成環。
 *
 * ## 為什麼自指擋不夠
 *
 * `assertLeavePolicyUnit` 只看得到被寫入的那一列，因此只擋得住 A→A。
 * 但 A→B→A 的效果一樣壞：`allocateConsumption` 沿著併計鏈往下扣，
 * 環會讓它一直走 —— 請一天家庭照顧假，事假與家庭照顧假各扣一天，
 * 而兩邊的餘額都對不上帳本。
 *
 * ## 為什麼參數是整張圖
 *
 * 走訪需要「這個帳本每個假別併到哪裡」，那要查 DB，屬 repository 的職責。
 * 函式本身只走訪不查詢 —— 理由同 `deriveOvertimeSegments` 收 `priorRecognizedMinutes`：
 * 一個會自己查資料的守衛，其結果無法在測試裡完整重現。
 *
 * `edges` 是既有的關係（不含這次要寫入的那一筆），`from` 與 `to` 是這次的異動。
 * 分開傳而不是要呼叫端先把圖改好：那會讓「檢查之前先改壞資料」變成必要步驟。
 */
export function assertNoMergeCycle(params: {
  edges: Readonly<Record<string, string | null>>;
  from: string;
  to: string | null;
}): void {
  if (params.to === null) return;

  // Info: (20260818 - Julian) 自指由 `assertLeavePolicyUnit` 擋，這裡一併涵蓋，兩處都擋不算重複
  const visited = new Set<string>([params.from]);
  let cursor: string | null = params.to;

  while (cursor !== null) {
    if (visited.has(cursor)) {
      throw new LeavePolicyInvariantError(
        "merging into that leave type closes a cycle; consumption would be deducted around the loop",
        `from=${params.from}, to=${params.to}, revisited=${cursor}`,
      );
    }
    visited.add(cursor);
    /**
     * Info: (20260818 - Julian) 走到圖外（被停用或已刪的假別）就停，不當成環。
     * `mergesIntoPolicyId` 是 `onDelete: SetNull`，所以斷鏈是正常狀態。
     */
    cursor = params.edges[cursor] ?? null;
  }
}
