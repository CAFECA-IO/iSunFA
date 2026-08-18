import { PunchType, WorkDayType } from "@/constants/attendance";
import {
  OVERTIME_DAILY_TOTAL_LIMIT_MINUTES,
  OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES,
  OVERTIME_MONTHLY_LIMIT_MINUTES,
  OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES,
  OVERTIME_TIER_BOUNDARY_MINUTES,
  OvertimePremiumTier,
} from "@/constants/overtime";
import {
  IMinuteInterval,
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

/**
 * Info: (20260818 - Julian) 打卡在場區間與加班區間的交集分鐘 —— D9 公式的另一半。
 *
 * ## 為什麼要先合併重疊
 *
 * 一天可能有多對打卡（外出、回工地、再打一次），而 `resolveOpenPunch` 對
 * `[IN, IN, OUT]` 這種漏刷序列會給出一個仍然合理的答案。若不先合併就逐段
 * 相加，重疊的兩段會被算兩次 —— 而多算出來的分鐘會被當成加班事實，
 * 那正是「零捏造」要擋的方向。
 *
 * ## 右端不含
 *
 * 18:00–20:00 是 120 分鐘，不是 121。與 `ShiftPattern` 的窗界一致。
 */
export function sumWindowOverlapMinutes(
  intervals: readonly IMinuteInterval[],
  windowStartMinute: number,
  windowEndMinute: number,
): number {
  if (windowEndMinute <= windowStartMinute) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `overtime window must be non-empty: start=${windowStartMinute}, end=${windowEndMinute}`,
    );
  }

  const clipped = mergeIntervals(
    intervals.map((interval) => ({
      startMinute: Math.max(interval.startMinute, windowStartMinute),
      endMinute: Math.min(interval.endMinute, windowEndMinute),
    })),
  );

  return clipped.reduce(
    (total, interval) => total + (interval.endMinute - interval.startMinute),
    0,
  );
}

/**
 * Info: (20260818 - Julian) 合併重疊與相鄰的區間，並依起點排序。
 *
 * 相鄰也合併（`endMinute === startMinute`）：18:00–19:00 與 19:00–20:00
 * 是連續在場的兩小時，拆成兩段會讓下游把它讀成「中間離開過」。
 */
export function mergeIntervals(
  intervals: readonly IMinuteInterval[],
): IMinuteInterval[] {
  const sorted = intervals
    .filter((interval) => interval.endMinute > interval.startMinute)
    .slice()
    .sort((left, right) => left.startMinute - right.startMinute);

  const merged: IMinuteInterval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && interval.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, interval.endMinute);
      continue;
    }
    merged.push({ ...interval });
  }
  return merged;
}

/**
 * Info: (20260818 - Julian) 從一組區間裡挖掉另一組區間（L29 的核心）。
 *
 * 「有打卡但無核准加班單的時段」= 在場區間 − 班別窗 − 已核准的加班區間。
 * 剩下的那些分鐘是**事實**：他人在現場，而沒有任何一張單涵蓋它。
 *
 * ## 這裡不做結論
 *
 * 剩下的時段可能是加班漏了申請，也可能只是下班後在休息室多待了半小時。
 * 系統的責任是讓它浮出來，由主管決定要補核准、要說明、還是要制止
 * （ADR 024 §2.1）—— 所以這支函式只回時段，不回任何判斷。
 */
export function subtractIntervals(
  base: readonly IMinuteInterval[],
  cuts: readonly IMinuteInterval[],
): IMinuteInterval[] {
  const holes = mergeIntervals(cuts);

  return mergeIntervals(base).flatMap((interval) => {
    let remaining: IMinuteInterval[] = [{ ...interval }];

    for (const hole of holes) {
      remaining = remaining.flatMap((piece) => {
        // Info: (20260818 - Julian) 完全不相交就原樣留著
        if (hole.endMinute <= piece.startMinute) return [piece];
        if (hole.startMinute >= piece.endMinute) return [piece];

        const pieces: IMinuteInterval[] = [];
        if (hole.startMinute > piece.startMinute) {
          pieces.push({
            startMinute: piece.startMinute,
            endMinute: hole.startMinute,
          });
        }
        if (hole.endMinute < piece.endMinute) {
          pieces.push({
            startMinute: hole.endMinute,
            endMinute: piece.endMinute,
          });
        }
        return pieces;
      });
    }
    return remaining;
  });
}

// Info: (20260818 - Julian) 區間總長。呼叫端十之八九接著就要加總，寫在這裡免得每處各寫一次
export function totalIntervalMinutes(
  intervals: readonly IMinuteInterval[],
): number {
  return intervals.reduce(
    (total, interval) => total + (interval.endMinute - interval.startMinute),
    0,
  );
}

/**
 * Info: (20260818 - Julian) 補休批次的 `grantedDays`（§32-1 的 1:1 在「日」這一欄的樣子）。
 *
 * ## 為什麼需要一個函式
 *
 * `LeaveGrant` 的不變式要求 `grantedMinutes === Math.ceil(grantedDays × dayEquivalentMinutes)`
 * （`assertGrantSource`）。補休的方向與年資給假相反 —— 分鐘是既定的（等於該分段的
 * 加班分鐘），日數是推導出來的。直接寫 `minutes / dayEquivalentMinutes` 會踩到浮點：
 * `100 / 480 × 480 === 100.00000000000001`，`Math.ceil` 後變 101，不變式當場失敗。
 *
 * 因此先無條件**捨去**到 10 位小數，再逐格退到 `Math.ceil` 剛好回到 minutes
 * 為止（乘法自己也會產生誤差，見下方）。捨去而非四捨五入：往上捨會直接讓
 * 不變式失敗，而失敗的方向不對稱 —— 這裡寧可讓「日」少個 10⁻¹⁰，
 * 也不能讓「分鐘」多一分。
 *
 * 真正的量是分鐘（ADR 022 §2：帳本單位為分鐘，「日」只出現在授予與折現兩個端點）。
 */
export function deriveCompensatoryGrantDays(params: {
  minutes: number;
  dayEquivalentMinutes: number;
}): number {
  const { minutes, dayEquivalentMinutes } = params;

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `compensatory minutes must be a positive integer, got ${minutes}`,
    );
  }
  if (!Number.isInteger(dayEquivalentMinutes) || dayEquivalentMinutes <= 0) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `dayEquivalentMinutes must be a positive integer, got ${dayEquivalentMinutes}`,
    );
  }

  /**
   * Info: (20260818 - Julian) 先捨去到 10 位小數，再逐格退到乘得回來為止。
   *
   * 只捨去不夠：捨去後的日數乘回去**仍可能略微超過**。實測
   * `231 / 420 === 0.55`（十進位下是精確值），而 `0.55 * 420 === 231.00000000000003`
   * —— `Math.ceil` 之後變 232，不變式當場失敗。誤差來自乘法本身，
   * 不是來自捨去，所以要退一格（約 10⁻¹⁰ × 班長 ≈ 7×10⁻⁸ 分鐘）把它壓回去。
   *
   * 迴圈必然終止且實測最多退一格：每退一格讓乘積下降遠大於浮點誤差、
   * 又遠小於一分鐘，因此不可能退過頭而讓 `ceil` 掉到 minutes 以下。
   */
  let scaled = Math.floor(
    (minutes / dayEquivalentMinutes) * COMPENSATORY_DAYS_SCALE,
  );
  while (
    scaled > 0 &&
    Math.ceil((scaled / COMPENSATORY_DAYS_SCALE) * dayEquivalentMinutes) >
      minutes
  ) {
    scaled -= 1;
  }
  const days = scaled / COMPENSATORY_DAYS_SCALE;

  /**
   * Info: (20260818 - Julian) 自己驗一次而不是相信上面的推導。
   *
   * 這個函式存在的唯一理由就是餵飽 `assertGrantSource` 的那條等式；
   * 若哪天有人改了小數位數或換了捨入方向，這裡要當場說出來，
   * 而不是留給 repository 在一筆真實的補休入帳時丟不變式錯誤。
   */
  if (Math.ceil(days * dayEquivalentMinutes) !== minutes) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `grantedDays does not round-trip: minutes=${minutes}, dayEquivalentMinutes=${dayEquivalentMinutes}, days=${days}`,
    );
  }
  return days;
}

/**
 * Info: (20260818 - Julian) `grantedDays` 的小數位數。
 * 10 位讓乘回去的誤差遠小於一分鐘（10⁻¹⁰ × 1440 ≈ 1.4×10⁻⁷），
 * 又遠大於雙精度浮點自身的相對誤差，兩邊都有餘裕。
 */
const COMPENSATORY_DAYS_SCALE = 1e10;

/**
 * Info: (20260818 - Julian) 把成對打卡還原成「在場區間」。
 *
 * ## 它不取代 `resolveOpenPunch`
 *
 * `resolveOpenPunch` 答的是「他**現在**在不在現場」，是那個問題的唯一判斷點
 * （接線守則 §5 第 8 項）。這裡答的是另一個問題：「他**待了哪幾段**」——
 * 加班認列要的是後者，而把它塞回前者會讓一個已經被釘住的函式多一種語意。
 *
 * ## 漏刷怎麼辦
 *
 * 連續兩個 `CLOCK_IN` 只採信第一個（後者是重複刷），沒有配對到 `CLOCK_OUT`
 * 的最後一個 `CLOCK_IN` **整段捨棄** —— 不猜一個下班時刻。捨棄的方向是少算，
 * 而少算的加班會出現在 L29 的未核准清單裡被人看到；猜一個下班時刻則是
 * 憑空生出一段沒有證據的在場事實。
 */
export function derivePunchIntervals(
  punches: readonly { punchType: string; minuteOfDay: number }[],
): IMinuteInterval[] {
  const ordered = [...punches].sort(
    (left, right) => left.minuteOfDay - right.minuteOfDay,
  );

  const intervals: IMinuteInterval[] = [];
  let openAt: number | null = null;

  for (const punch of ordered) {
    if (punch.punchType === PunchType.CLOCK_IN) {
      // Info: (20260818 - Julian) 已經開著就不重開：重複刷卡不該把區間截短
      if (openAt === null) openAt = punch.minuteOfDay;
      continue;
    }
    if (punch.punchType !== PunchType.CLOCK_OUT) continue;
    if (openAt === null) continue;
    if (punch.minuteOfDay > openAt) {
      intervals.push({ startMinute: openAt, endMinute: punch.minuteOfDay });
    }
    openAt = null;
  }

  return intervals;
}
