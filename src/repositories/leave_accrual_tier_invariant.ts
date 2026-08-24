/**
 * Info: (20260818 - Julian) 年資級距表的「必須是一張讀得出答案的階梯」不變式。
 *
 * ## 這條規則守的是什麼
 *
 * 級距表是特休日數的唯一來源（勞基法 §38 I）。`resolveTierDays` 的作法是
 * 「取最後一個 `minSeniorityMonths <= 年資` 的級距」，因此表本身必須是一張
 * **由低到高、不重複、日數不倒退**的階梯 —— 否則：
 *
 * - 重複的年資下界：兩列同時命中，取到哪一列取決於查詢回來的順序；
 * - 日數倒退：做越久假越少，而那不會報錯，只會少給；
 * - 空表：`SENIORITY_TIER` 的假別查不到任何日數，員工的餘額永遠是零。
 *
 * 三種都是「畫面正常、數字錯誤」的那一類 —— 只有被少給假的人會發現。
 *
 * ## 為什麼擋在 repository
 *
 * 級距表有兩條寫入路徑：L6 的全量取代，以及 seed（`ANNUAL_LEAVE_TIER_SEED`）。
 * 後者繞過所有 service，而它正是 2016 年修法時要重寫的那張表。
 */

export class LeaveAccrualTierInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`LeaveAccrualTier: ${reason} (${detail})`);
    this.name = "LeaveAccrualTierInvariantError";
  }
}

export interface IStorableAccrualTier {
  /** Info: (20260818 - Julian) 年資下界（含），以月為單位。「六個月以上一年未滿」=> 6 */
  minSeniorityMonths: number;
  days: number;
  /** Info: (20260818 - Julian) 超過本級距後每滿一年再加的日數（§38 I ⑥） */
  incrementDaysPerYear: number | null;
  /** Info: (20260818 - Julian) 加給的上限（§38 I ⑥ 的「加至三十日為止」） */
  maxDays: number | null;
}

export function assertAccrualTierTable(
  tiers: readonly IStorableAccrualTier[],
): void {
  if (tiers.length === 0) {
    throw new LeaveAccrualTierInvariantError(
      "a SENIORITY_TIER leave type with an empty tier table grants nobody anything",
      "tiers=[]",
    );
  }

  let previous: IStorableAccrualTier | null = null;

  for (const [index, tier] of tiers.entries()) {
    if (
      !Number.isInteger(tier.minSeniorityMonths) ||
      tier.minSeniorityMonths < 0
    ) {
      throw new LeaveAccrualTierInvariantError(
        "minSeniorityMonths must be a non-negative whole number of months",
        `index=${index}, minSeniorityMonths=${tier.minSeniorityMonths}`,
      );
    }
    if (!(tier.days > 0)) {
      throw new LeaveAccrualTierInvariantError(
        "a tier that grants zero days is indistinguishable from having no tier at all",
        `index=${index}, days=${tier.days}`,
      );
    }

    if (previous !== null) {
      if (tier.minSeniorityMonths === previous.minSeniorityMonths) {
        throw new LeaveAccrualTierInvariantError(
          "two tiers share the same seniority boundary; which one applies would depend on row order",
          `index=${index}, minSeniorityMonths=${tier.minSeniorityMonths}`,
        );
      }
      if (tier.minSeniorityMonths < previous.minSeniorityMonths) {
        throw new LeaveAccrualTierInvariantError(
          "tiers must be given in ascending seniority order",
          `index=${index}, previous=${previous.minSeniorityMonths}, current=${tier.minSeniorityMonths}`,
        );
      }
      /**
       * Info: (20260818 - Julian) 日數不得倒退。
       *
       * 「做越久假越少」在法律上站不住（§38 I 是遞增的），而它不會報錯 ——
       * 只會讓一個滿五年的人拿到比滿三年少的天數，然後沒有人知道為什麼。
       */
      if (tier.days < previous.days) {
        throw new LeaveAccrualTierInvariantError(
          "days must not decrease as seniority grows; longer service would grant less leave",
          `index=${index}, previous=${previous.days}, current=${tier.days}`,
        );
      }
    }

    /**
     * Info: (20260818 - Julian) 每年加給只能掛在**最後一級**。
     *
     * §38 I ⑥ 的「十年以上者，每一年加給一日」是階梯的尾巴 —— 它接在
     * 表的末端往上延伸。掛在中間那一級的話，下一級的固定日數與
     * 累加出來的日數會在同一個年資上給出兩個答案。
     */
    const isLast = index === tiers.length - 1;
    if (!isLast && tier.incrementDaysPerYear !== null) {
      throw new LeaveAccrualTierInvariantError(
        "only the final tier may carry a yearly increment; a mid-table increment collides with the next tier's fixed days",
        `index=${index}, incrementDaysPerYear=${tier.incrementDaysPerYear}`,
      );
    }
    if (
      tier.incrementDaysPerYear !== null &&
      !(tier.incrementDaysPerYear > 0)
    ) {
      throw new LeaveAccrualTierInvariantError(
        "a non-positive yearly increment is a setting that does nothing",
        `index=${index}, incrementDaysPerYear=${tier.incrementDaysPerYear}`,
      );
    }
    /**
     * Info: (20260818 - Julian) 有上限就必須有加給 —— 沒有加給的話沒有東西會逼近上限，
     * 那個數字只會讓看設定的人相信一件不成立的事（同 `minimumUnitMinutes` 反向擋的理由）。
     */
    if (tier.maxDays !== null && tier.incrementDaysPerYear === null) {
      throw new LeaveAccrualTierInvariantError(
        "maxDays without a yearly increment caps something that never grows",
        `index=${index}, maxDays=${tier.maxDays}`,
      );
    }
    if (tier.maxDays !== null && tier.maxDays < tier.days) {
      throw new LeaveAccrualTierInvariantError(
        "maxDays is below the tier's own days; the cap would retroactively reduce the statutory minimum",
        `index=${index}, days=${tier.days}, maxDays=${tier.maxDays}`,
      );
    }

    previous = tier;
  }
}
