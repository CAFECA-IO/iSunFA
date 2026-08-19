import { PunchType, WorkDayType } from "@/constants/attendance";
import { grantedMinutesOf } from "@/lib/leave_entitlement_rules";
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
 * `FO_OVERTIME_ON_REGULAR_OFF`（403，須依 §40 核備程序），
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
   * Info: (20260819 - Julian) 例假日出勤依 §40 原則上不得為之，僅限天災、事變或
   * 突發事件，且「應**報當地主管機關核備**」並事後補假休息。系統尚未實作核備
   * 與補假的記載，故**一律**擋下 —— 放行會讓一個違法的排班在系統裡
   * 看起來像一筆正常的加班（ADR 024 §4.5）。
   *
   * Info: (20260819 - Julian) §32 IV 的 `isEmergency` **擋不掉這一條**（review B7）。
   * 兩者都以天災事變為前提，但程序不同：§32 IV 是「通知工會／報主管機關
   * **備查**」，§40 是「報主管機關**核備**」，法律效果不同（備查是報請存查，
   * 核備須經主管機關認可）。拿前者的記載去放行後者，等於用一份不對的文件
   * 當通行證。核備的記載模型建立之前，例假日沒有可以放行的路徑。
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
 *   1. REGULAR_OFF（例假）                        → 擋下，須依 §40 核備程序
 *   2. `isEmergency`（§32 IV 天災事變經報備查）   → EMERGENCY_DOUBLE
 *   3. HOLIDAY（休假日經同意出勤，§39）           → HOLIDAY_DOUBLE
 *   4. REST_DAY  →  前 2 小時 / 2 小時後
 *   5. WORK      →  前 2 小時 / 2 小時後
 *
 * Info: (20260819 - Julian) #1 與 #2 的順序是**被修正過**的（review B7）。
 * 原本 `isEmergency` 排在最前面，於是申請人只要自己勾一個布林值，
 * 就同時跳到加倍級距並繞過 §40 —— 而系統裡沒有任何地方記載那次報備。
 * 例假日現在排在最前面且沒有旁路。
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

  /**
   * Info: (20260819 - Julian) 判定表 #1：例假日 —— 擋下而非給一個級距。
   * 排在 `isEmergency` **之前**：§32 IV 的備查不是 §40 的核備（review B7）。
   */
  if (workDayType === WorkDayType.REGULAR_OFF) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.REGULAR_OFF_REQUIRES_ARTICLE_40,
      "Overtime on a statutory rest day requires the Article 40 filing, which this system does not yet record",
    );
  }

  // Info: (20260819 - Julian) 判定表 #2：天災事變（§32 IV 經報備查）優先於其餘日別
  if (isEmergency) {
    return [{ order: 0, tier: OvertimePremiumTier.EMERGENCY_DOUBLE, minutes }];
  }

  // Info: (20260817 - Julian) 判定表 #3：休假日（國定假日）經同意出勤，工資加倍發給
  if (workDayType === WorkDayType.HOLIDAY) {
    return [{ order: 0, tier: OvertimePremiumTier.HOLIDAY_DOUBLE, minutes }];
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
 * `LeaveGrant` 的不變式要求 `grantedMinutes` 恰為 `grantedDays × dayEquivalentMinutes`
 * 的無條件進位（`assertGrantSource`）。補休的方向與年資給假相反 —— 分鐘是既定的
 * （等於該分段的加班分鐘），日數是推導出來的。直接寫 `minutes / dayEquivalentMinutes`
 * 會踩到浮點：`100 / 480 × 480 === 100.00000000000001`，進位後變 101，不變式當場失敗。
 *
 * ## 作法：整數除法取商，不碰浮點（review B6）
 *
 * `scaled = floor(minutes × 10¹⁰ ÷ dayEquivalentMinutes)`，全程 `bigint`。
 * 取商（而不是四捨五入）的理由不變且不對稱：往上捨會讓「分鐘」多一分，
 * 而這裡寧可讓「日」少個 10⁻¹⁰。
 *
 * 先前這裡是「浮點捨去後逐格退位」的迴圈 —— 那個迴圈是在補償
 * `Math.ceil(days × eq)` 的乘法誤差（註解舉的 `0.55 × 420 === 231.00000000000003`
 * 正是 B6 的同一個陷阱）。誤差的源頭已由 `grantedMinutesOf` 移除，
 * 退位迴圈連同它要補償的東西一起不見了。
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

  // Info: (20260819 - Julian) 整數除法取商：沒有浮點，因此沒有要補償的誤差
  const scaled =
    (BigInt(minutes) * COMPENSATORY_DAYS_SCALE) / BigInt(dayEquivalentMinutes);
  const days = Number(scaled) / Number(COMPENSATORY_DAYS_SCALE);

  /**
   * Info: (20260818 - Julian) 自己驗一次而不是相信上面的推導。
   *
   * 這個函式存在的唯一理由就是餵飽 `assertGrantSource` 的那條等式；
   * 若哪天有人改了小數位數或換了捨入方向，這裡要當場說出來，
   * 而不是留給 repository 在一筆真實的補休入帳時丟不變式錯誤。
   *
   * Info: (20260819 - Julian) 驗算走 `grantedMinutesOf`（額度引擎那一支唯一的
   * 換算實作），順帶把 `Number(scaled) / 10¹⁰` 這一步的十進位字串還原也一併驗掉。
   */
  if (grantedMinutesOf(days, dayEquivalentMinutes) !== minutes) {
    throw new OvertimeRuleError(
      OvertimeRuleErrorReason.INVALID_MINUTES,
      `grantedDays does not round-trip: minutes=${minutes}, dayEquivalentMinutes=${dayEquivalentMinutes}, days=${days}`,
    );
  }
  return days;
}

/**
 * Info: (20260819 - Julian) `grantedDays` 的小數位數（`bigint`，因為它是除數）。
 *
 * 10 位讓捨去的殘量遠小於一分鐘（10⁻¹⁰ × 1440 ≈ 1.4×10⁻⁷）。上限也有意義：
 * `1440 × 10¹⁰ = 1.44×10¹³` 落在雙精度可精確表示的整數範圍內，
 * 因此 `Number(scaled) / 10¹⁰` 的十進位字串就是 `scaled` 本身，
 * 交給 `grantedMinutesOf` 還原成分數時不會失真（該處由驗算把關）。
 */
const COMPENSATORY_DAYS_SCALE = 10_000_000_000n;

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
