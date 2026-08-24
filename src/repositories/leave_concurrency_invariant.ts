import { LeaveConcurrencyAction } from "@/constants/leave_policy";

/**
 * Info: (20260820 - Julian) 併休上限規則的不變式（review 第 5 輪 M2）。
 *
 * ## 為什麼這支先前不存在
 *
 * schema 的檔頭寫著「`maxConcurrentEmployees` 與 `maxConcurrentRatio`
 * **恰有一個為 null**，由 repository 不變式擋」，而 `src/repositories/` 下
 * 十支 `*_invariant.ts` 裡沒有任何一支處理併休規則 —— 那句話從落地的第一天起
 * 就沒有執行者。它造成的不是理論風險：讀取端寫的是
 *
 * ```ts
 * rule.maxConcurrentEmployees ?? Math.floor(headcount * Number(rule.maxConcurrentRatio ?? 0))
 * ```
 *
 * 兩欄皆 null 時 `?? 0` 讓上限變成 **0 人**，於是該部門**每一張假單**都超限。
 * 若規則的 `action` 是 `BLOCK`，整個部門從此請不了假，而畫面上的理由是
 * 「同時請假人數已達上限 0 人」——一句沒有人看得懂的話。
 *
 * ## 為什麼擋在 repository
 *
 * 這一列會被 seed、資料遷移與日後的規則管理畫面各自寫入，而它們不會都經過
 * 同一支 service（同 `overtime_policy_invariant.ts` 存在的理由）。
 *
 * ## 目前的呼叫端：**只有讀取端**
 *
 * 說清楚以免下一個人誤讀：`grep leaveConcurrencyRule.create` 全庫零筆 ——
 * 這張表在本模組**沒有任何寫入路徑**，既有列只能由 SQL 進來。因此
 * `assertConcurrencyRule` 現在掛在 `findConcurrencyStatus` 的讀取端，
 * 那是它今天唯一咬得到東西的地方。
 * ToDo: (20260820 - Julian) 併休規則的管理端點落地時，`create`／`update`
 * 兩條路徑要各呼叫它一次，而讀取端那一次保留（seed 與 SQL 仍不經過 service）。
 */
export class LeaveConcurrencyInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`LeaveConcurrencyRule: ${reason} (${detail})`);
    this.name = "LeaveConcurrencyInvariantError";
  }
}

export interface IStorableConcurrencyRule {
  maxConcurrentEmployees: number | null | undefined;
  /** Info: (20260820 - Julian) Decimal 欄位。以字串傳遞，避免 double 在邊界上洗掉尾數 */
  maxConcurrentRatio: string | null | undefined;
  action: LeaveConcurrencyAction;
  /**
   * Info: (20260820 - Julian) 這條規則綁定的假別是否「雇主得拒絕」。
   *
   * 規則綁到特定假別時必填；`leavePolicyId` 為 null（所有假別合計）時傳
   * `null` —— 那種規則涵蓋多個假別，`employerMayReject` 是逐假別的屬性，
   * 對它沒有單一答案。
   */
  employerMayReject: boolean | null | undefined;
  /** Info: (20260820 - Julian) null 表這條規則涵蓋所有假別合計 */
  leavePolicyId: string | null | undefined;
}

/**
 * Info: (20260820 - Julian) 十進位字串的正負判定，不經過 double。
 * `Number("0.00000000000000000001") > 0` 是對的，但
 * `Number("0.1") + Number("0.2")` 那一類的誤差正是本輪 M1 的成因 ——
 * 這裡連轉都不轉。
 */
const isPositiveDecimalText = (text: string): boolean =>
  /^\+?0*[1-9]\d*(\.\d*)?$|^\+?0*\.\d*[1-9]\d*$/.test(text.trim());

export function assertConcurrencyRule(params: IStorableConcurrencyRule): void {
  const hasCount =
    params.maxConcurrentEmployees !== null &&
    params.maxConcurrentEmployees !== undefined;
  const hasRatio =
    params.maxConcurrentRatio !== null &&
    params.maxConcurrentRatio !== undefined &&
    params.maxConcurrentRatio.trim() !== "";

  /**
   * Info: (20260820 - Julian) 恰有一個 —— 兩個方向都要擋。
   *
   * 都沒有：讀取端的 `?? 0` 把上限變成 0 人，整個部門請不了假。
   * 都有：兩個互相矛盾的上限，而系統沒有依據判斷該信哪一個 ——
   * 現行讀取端靜默偏好人數那一欄，於是設定畫面上的比例看起來生效了卻沒有。
   */
  if (!hasCount && !hasRatio) {
    throw new LeaveConcurrencyInvariantError(
      "a concurrency rule must state a limit; a rule with neither a headcount nor a ratio reads as a limit of zero and blocks every request in the department",
      `maxConcurrentEmployees=${params.maxConcurrentEmployees}, maxConcurrentRatio=${params.maxConcurrentRatio}`,
    );
  }
  if (hasCount && hasRatio) {
    throw new LeaveConcurrencyInvariantError(
      "a concurrency rule must state exactly one limit; two limits cannot both be authoritative and the reader silently prefers one of them",
      `maxConcurrentEmployees=${params.maxConcurrentEmployees}, maxConcurrentRatio=${params.maxConcurrentRatio}`,
    );
  }

  if (hasCount && (params.maxConcurrentEmployees as number) < 0) {
    throw new LeaveConcurrencyInvariantError(
      "a negative headcount limit blocks the whole department while reading as a configured rule",
      `maxConcurrentEmployees=${params.maxConcurrentEmployees}`,
    );
  }
  if (hasRatio && !isPositiveDecimalText(params.maxConcurrentRatio as string)) {
    throw new LeaveConcurrencyInvariantError(
      "a ratio limit must be a positive decimal; zero or a negative ratio blocks the whole department while reading as a configured rule",
      `maxConcurrentRatio=${params.maxConcurrentRatio}`,
    );
  }

  /**
   * Info: (20260820 - Julian) `BLOCK` 僅適用於雇主得拒絕的假別（§38 II）。
   *
   * ## 這一條比 schema 註解的字面窄，而窄的那一版才是對的
   *
   * schema 寫「`BLOCK` 僅適用於 `employerMayReject = true` 的假別」，照字面
   * 實作會擋掉一個**合法**的設定：`leavePolicyId = null`（所有假別合計）的
   * `BLOCK` 規則。那種規則對病假該擋、對特休不該擋，而
   * `leave_request.service.ts` 的送出端已經逐假別做了這件事
   * （`item.action === BLOCK && policy.employerMayReject`）—— 它是對的，
   * 不是漏擋。
   *
   * 真正沒有人擋、且真的有害的是另一種：規則**綁定**到一個
   * `employerMayReject = false` 的假別（特休），`action` 卻是 `BLOCK`。
   * 那條規則在畫面上讀起來是一道管制，而它**永遠不會生效** ——
   * 人資以為特休的併休有上限在擋，實際上一個人都擋不住。
   *
   * 特休的期日由勞工排定，雇主只有在「有影響企業運營之虞」時得與勞工協商
   * 調整 —— 那是協商，不是系統自動退件。所以正解不是讓它生效，
   * 而是不讓這條規則被存下來。
   */
  const boundToPolicy =
    params.leavePolicyId !== null && params.leavePolicyId !== undefined;
  if (
    params.action === LeaveConcurrencyAction.BLOCK &&
    boundToPolicy &&
    params.employerMayReject === false
  ) {
    throw new LeaveConcurrencyInvariantError(
      "BLOCK cannot apply to leave whose date the worker sets (Article 38 II); such a rule reads as a control on the screen while never rejecting anything",
      `action=${params.action}, leavePolicyId=${params.leavePolicyId}, employerMayReject=${params.employerMayReject}`,
    );
  }
}

/**
 * Info: (20260820 - Julian) 比例上限的**精確**換算（review 第 5 輪 M1）。
 *
 * ## 被修掉的算式
 *
 * ```ts
 * Math.floor(headcount * Number(rule.maxConcurrentRatio ?? 0))
 * ```
 *
 * `Number("0.7")` 是 0.69999999999999996，`90 × 0.7 = 62.99999999999999`，
 * `Math.floor` → **62**，而正解是 63。實測 headcount 1–200 × ratio 0.01–0.99
 * 共 19,800 組，有 **12 組**少一個名額：
 *
 * ```
 * 50×0.58→28(29)  90×0.70→62(63)  100×0.29→28(29)  100×0.57→56(57)
 * 100×0.58→57(58) 150×0.82→122(123) 170×0.70→118(119) 180×0.35→62(63)
 * 180×0.70→125(126) 200×0.29→57(58) 200×0.57→113(114) 200×0.58→115(116)
 * ```
 *
 * 失效方向是把**合法的請假擋掉**，而畫面只說「已達上限 62 人」——
 * 使用者看不出那個 62 本來應該是 63。
 *
 * ## 為什麼是 BigInt 而不是 decimal.js
 *
 * `maxConcurrentRatio` 是 `Decimal?`（Prisma 預設 65,30），小數位數沒有上界，
 * 而 decimal.js 在預設 20 位有效位數下對 30 位小數會先捨入一次 ——
 * 那正是這條要消滅的那類誤差。整數乘除全程精確，且不依賴任何精度設定
 * （同 `leave_entitlement_rules.ts` 的 exact rational 核心）。
 *
 * **不可用於金額**：這裡算的是人數名額。
 */
export function concurrencyLimitOf(params: {
  headcount: number;
  maxConcurrentEmployees: number | null | undefined;
  maxConcurrentRatio: string | null | undefined;
}): number {
  if (
    params.maxConcurrentEmployees !== null &&
    params.maxConcurrentEmployees !== undefined
  ) {
    return params.maxConcurrentEmployees;
  }

  const text = (params.maxConcurrentRatio ?? "").trim();
  if (text === "") {
    /**
     * Info: (20260820 - Julian) 兩欄皆空。`assertConcurrencyRule` 擋的是**寫入**，
     * 而既有列是在那支不變式存在之前落地的 —— 讀取端也要說得出話來。
     *
     * 回 0 就是原本那個 bug（整個部門請不了假）。丟例外才問得出「這條規則
     * 到底想限制什麼」，而它會被 service 收斂成一句說得出原因的 4xx。
     */
    throw new LeaveConcurrencyInvariantError(
      "a concurrency rule with neither a headcount nor a ratio has no limit to enforce; treating it as zero would block the whole department",
      `headcount=${params.headcount}`,
    );
  }

  const dot = text.indexOf(".");
  const digits = dot === -1 ? text : text.replace(".", "");
  const scale = dot === -1 ? 0 : text.length - dot - 1;
  if (!/^\+?\d+$/.test(digits)) {
    throw new LeaveConcurrencyInvariantError(
      "a ratio limit must be a plain decimal; an unparseable value cannot be turned into a headcount",
      `maxConcurrentRatio=${params.maxConcurrentRatio}`,
    );
  }

  // Info: (20260820 - Julian) floor(headcount × num / 10^scale)，全程整數
  const product = BigInt(params.headcount) * BigInt(digits);
  return Number(product / 10n ** BigInt(scale));
}
