import { WorkDayType } from "@/constants/attendance";
import {
  OVERTIME_DAILY_TOTAL_LIMIT_MINUTES,
  OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES,
  OVERTIME_MONTHLY_LIMIT_MINUTES,
  OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES,
  OVERTIME_TIER_BOUNDARY_MINUTES,
  OvertimePremiumTier,
} from "@/constants/overtime";
import {
  IOvertimeLimitInput,
  IOvertimeLimitResult,
  IOvertimeLimitViolation,
  IOvertimeSegment,
  IOvertimeSegmentInput,
  OvertimeLimitKind,
} from "@/interfaces/overtime";

/**
 * Info: (20260817 - Julian) 加班引擎：純函數，無 DB／I/O，**不呼叫 `Date.now()`**——
 * 「當日先前已認列多少」由呼叫端注入。加班分鐘最終會乘上工資變成錢，
 * 可重算是它唯一的驗收方式。
 *
 * 本引擎**不算金額**，只輸出分鐘與法定加成級距。基準時薪與加班費屬薪資模組
 * （ADR 024 §7，同 ADR 020 對資遣費的處置）。
 */

/**
 * Info: (20260817 - Julian) 規則引擎版本，隨每筆 `OvertimeSegment` 落地。
 * 規則改版後舊資料仍能說明它當初是依哪一版算出來的，語意同 `AttendanceDailyResult.engineVersion`。
 */
export const OVERTIME_ENGINE_VERSION = 1;

/**
 * Info: (20260817 - Julian) 結構性錯誤：這一天的加成標準未定義，不是使用者輸入錯。
 *
 * 帶 `reason` 讓 service 能對應到不同的錯誤碼 —— 例假日要回
 * `FO_OVERTIME_ON_REGULAR_OFF`（403，須依 §40 程序），
 * 停工日則是一個尚未核對法源的空白（計畫書 §8.1 #8）。
 */
export class OvertimeRuleError extends Error {
  public readonly reason: OvertimeRuleErrorReason;

  public constructor(reason: OvertimeRuleErrorReason, message: string) {
    super(message);
    this.name = "OvertimeRuleError";
    this.reason = reason;
  }
}

export enum OvertimeRuleErrorReason {
  /**
   * Info: (20260817 - Julian) 例假日出勤依 §40 原則上不得為之，僅限天災、事變或突發事件，
   * 且須於 24 小時內通報主管機關並事後補假。系統尚未實作通報與補假，故一律擋下 ——
   * 放行會讓一個違法的排班在系統裡看起來像一筆正常的加班。
   */
  REGULAR_OFF_REQUIRES_ARTICLE_40 = "REGULAR_OFF_REQUIRES_ARTICLE_40",
  // Info: (20260817 - Julian) 停工日與請假日的加成標準未定義（法源待核對）
  UNDEFINED_PREMIUM_FOR_DAY_TYPE = "UNDEFINED_PREMIUM_FOR_DAY_TYPE",
  // Info: (20260817 - Julian) 分鐘數不是正整數
  INVALID_MINUTES = "INVALID_MINUTES",
}

/**
 * Info: (20260817 - Julian) 把一段加班切成數個加成級距（計畫書 §8.1）。
 *
 * 判定順序由上而下，第一個命中即決定該段級距：
 *   1. `isEmergency`（§32 IV 天災事變經報備）→ EMERGENCY_DOUBLE
 *   2. HOLIDAY（休假日經同意出勤，§39）      → HOLIDAY_DOUBLE
 *   3. REGULAR_OFF（例假）                    → 擋下，須依 §40 程序
 *   4. REST_DAY  →  前 2 小時 / 2 小時後
 *   5. WORK      →  前 2 小時 / 2 小時後
 *
 * 跨越 120 分鐘邊界時**切成兩段**，各自成為一筆 `OvertimeSegment` ——
 * 合併成一筆的那一刻級距資訊就被銷毀，而 §32-1 的補休屆期折現要求
 * 「依當日工資計算標準發給」，屆時就算不出金額了（ADR 024 §4.4）。
 */
export function deriveOvertimeSegments(
  input: IOvertimeSegmentInput,
): IOvertimeSegment[] {
  const { workDayType, isEmergency, minutes, priorRecognizedMinutes } = input;

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `minutes must be a positive integer, got ${minutes}`,
    );
  }
  if (!Number.isInteger(priorRecognizedMinutes) || priorRecognizedMinutes < 0) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `priorRecognizedMinutes must be a non-negative integer, got ${priorRecognizedMinutes}`,
    );
  }

  // Info: (20260817 - Julian) 判定表 #1：天災事變優先於一切日別
  if (isEmergency) {
    return [{ order: 0, tier: OvertimePremiumTier.EMERGENCY_DOUBLE, minutes }];
  }

  // Info: (20260817 - Julian) 判定表 #2：休假日（國定假日）經同意出勤，工資加倍發給
  if (workDayType === WorkDayType.HOLIDAY) {
    return [{ order: 0, tier: OvertimePremiumTier.HOLIDAY_DOUBLE, minutes }];
  }

  // Info: (20260817 - Julian) 判定表 #3：例假日 —— 擋下而非給一個級距（見 OvertimeRuleErrorReason）
  if (workDayType === WorkDayType.REGULAR_OFF) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.REGULAR_OFF_REQUIRES_ARTICLE_40,
      "Overtime on a statutory rest day requires the Article 40 procedure",
    );
  }

  const tiers = premiumTiersFor(workDayType);

  /**
   * Info: (20260817 - Julian) 前一級距還剩多少額度。
   * `priorRecognizedMinutes` 已用掉的部分先扣掉 —— 上午加班一小時、下午再加兩小時，
   * 第二次的第一小時仍屬前 2 小時級距，第二小時才跨到高階。
   */
  const remainingInFirstTier = Math.max(
    0,
    OVERTIME_TIER_BOUNDARY_MINUTES - priorRecognizedMinutes,
  );
  const firstTierMinutes = Math.min(minutes, remainingInFirstTier);
  const beyondMinutes = minutes - firstTierMinutes;

  const segments: IOvertimeSegment[] = [];
  if (firstTierMinutes > 0) {
    segments.push({
      order: segments.length,
      tier: tiers.first,
      minutes: firstTierMinutes,
    });
  }
  if (beyondMinutes > 0) {
    segments.push({
      order: segments.length,
      tier: tiers.beyond,
      minutes: beyondMinutes,
    });
  }
  return segments;
}

const premiumTiersFor = (
  workDayType: WorkDayType,
): { first: OvertimePremiumTier; beyond: OvertimePremiumTier } => {
  switch (workDayType) {
    case WorkDayType.REST_DAY:
      return {
        first: OvertimePremiumTier.REST_DAY_FIRST_2H,
        beyond: OvertimePremiumTier.REST_DAY_BEYOND_2H,
      };
    case WorkDayType.WORK:
      return {
        first: OvertimePremiumTier.WEEKDAY_FIRST_2H,
        beyond: OvertimePremiumTier.WEEKDAY_BEYOND_2H,
      };
    default:
      /**
       * Info: (20260817 - Julian) 請假日與停工日的加成標準未定義。
       *
       * 停工日（因雨／颱風／災害）在工程業是常態不是例外，而它既不是例假、
       * 不是休息日、也不是國定假日 —— 加成標準待法源核對（計畫書 §8.1 #8）。
       * 在核對完成前擋下，不猜一個級距：猜錯的方向是少付工資。
       */
      throw new OvertimeRuleError(
        OvertimeRuleErrorReason.UNDEFINED_PREMIUM_FOR_DAY_TYPE,
        `No statutory premium tier is defined for day type ${workDayType}`,
      );
  }
};

/**
 * Info: (20260817 - Julian) 法定工時上限檢查（§32 II、III）。
 *
 * 回傳違反清單而非丟例外：一次申請可能同時破三條，而 service 需要知道
 * 破的是哪一條才能給出正確的錯誤碼。**但這不代表它是警示** ——
 * 呼叫端收到非空清單時必須 `throw`，越過這些線的輸入是違法，
 * 不是一個需要人判斷的例外（ADR 024 §6.2）。
 *
 * 三個月的上限**僅在 `extendedLimitAgreed` 為真時適用**：未經同意者
 * 每月上限就是 46 小時，三個月自然不可能超過 138 小時，
 * 額外檢查一次只會產出一條永遠不會觸發的規則。
 */
export function evaluateOvertimeLimits(
  input: IOvertimeLimitInput,
): IOvertimeLimitResult {
  const violations: IOvertimeLimitViolation[] = [];

  const dailyTotal = input.regularWorkMinutes + input.dailyOvertimeMinutes;
  if (dailyTotal > OVERTIME_DAILY_TOTAL_LIMIT_MINUTES) {
    violations.push({
      kind: OvertimeLimitKind.DAILY_TOTAL,
      limitMinutes: OVERTIME_DAILY_TOTAL_LIMIT_MINUTES,
      actualMinutes: dailyTotal,
    });
  }

  const monthlyLimit = input.extendedLimitAgreed
    ? OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES
    : OVERTIME_MONTHLY_LIMIT_MINUTES;
  if (input.monthlyOvertimeMinutes > monthlyLimit) {
    violations.push({
      kind: OvertimeLimitKind.MONTHLY,
      limitMinutes: monthlyLimit,
      actualMinutes: input.monthlyOvertimeMinutes,
    });
  }

  if (
    input.extendedLimitAgreed &&
    input.quarterlyOvertimeMinutes > OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES
  ) {
    violations.push({
      kind: OvertimeLimitKind.QUARTERLY,
      limitMinutes: OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES,
      actualMinutes: input.quarterlyOvertimeMinutes,
    });
  }

  return { violations };
}

/**
 * Info: (20260817 - Julian) 認列分鐘 = min(核准分鐘, 實際停留分鐘)（ADR 024 §2）。
 *
 * 申請 3 小時只待 1 小時就認列 1 小時 —— 系統不發明沒有發生過的加班。
 * 待了 3 小時只核准 1 小時則認列 1 小時，**超出的部分由回傳值的
 * `unapprovedMinutes` 交出去**，不靜默丟棄 —— 未核准的加班是勞資爭議
 * 最常見的起點，事實仍存在於 `AttendancePunch` 裡，只是沒有人看見。
 */
export function reconcileOvertimeMinutes(input: {
  approvedMinutes: number;
  actualMinutes: number;
}): { recognizedMinutes: number; unapprovedMinutes: number } {
  const { approvedMinutes, actualMinutes } = input;
  if (approvedMinutes < 0 || actualMinutes < 0) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `minutes must not be negative: approved=${approvedMinutes}, actual=${actualMinutes}`,
    );
  }
  return {
    recognizedMinutes: Math.min(approvedMinutes, actualMinutes),
    unapprovedMinutes: Math.max(0, actualMinutes - approvedMinutes),
  };
}
