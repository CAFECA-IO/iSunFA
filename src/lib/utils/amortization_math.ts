import { MoneyUtil } from "@/lib/utils/money";
import Decimal from "decimal.js";

/**
 * Info: (20260526 - Tzuhan)
 * Gets the number of days between two dates, inclusive of both start and end.
 * It resets the time to midnight before calculation to avoid daylight saving issues.
 */
export function getInclusiveDays(start: Date, end: Date): number {
  const utcStart = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const utcEnd = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((utcEnd - utcStart) / msPerDay) + 1;
}

/**
 * Info: (20260527 - Tzuhan)
 * [Stateless Engine Upgrade]
 * Given a schedule and a target month date, calculates the amortization amount
 * using Pro-rata temporis (exact days).
 * This function calculates the previously amortized amount mathematically without needing DB state.
 */
export function calculateStatelessAmortizationForMonth(
  totalAmount: Decimal,
  startDate: Date,
  endDate: Date,
  targetMonth: Date,
): Decimal {
  if (startDate > endDate) {
    throw new Error("startDate cannot be after endDate");
  }

  // Info: (20260526 - Tzuhan) Determine the start and end of the target month in UTC
  const monthStart = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  );

  // Info: (20260526 - Tzuhan) If the schedule ends before this month, or starts after this month, it's 0
  if (endDate < monthStart || startDate > monthEnd) {
    return new Decimal(0);
  }

  const isFinalMonth = monthEnd >= endDate;
  const totalDays = getInclusiveDays(startDate, endDate);

  if (totalDays <= 0) {
    return new Decimal(0);
  }

  // Info: (20260527 - Tzuhan) 計算此前累積的攤銷額 (Stateless Accumulation)
  let accumulatedRawAmt = new Decimal(0);
  const currentCursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
  );

  while (currentCursor < monthStart) {
    const curMonthStart = new Date(
      Date.UTC(currentCursor.getUTCFullYear(), currentCursor.getUTCMonth(), 1),
    );
    const curMonthEnd = new Date(
      Date.UTC(
        currentCursor.getUTCFullYear(),
        currentCursor.getUTCMonth() + 1,
        0,
      ),
    );

    const effStart = startDate > curMonthStart ? startDate : curMonthStart;
    const effEnd = endDate < curMonthEnd ? endDate : curMonthEnd;

    const covDays = getInclusiveDays(effStart, effEnd);
    if (covDays > 0) {
      const rawAmt = totalAmount.times(covDays).dividedBy(totalDays);
      const roundedAmt = MoneyUtil.toDecimal(
        rawAmt.toFixed(0, Decimal.ROUND_HALF_UP),
      );
      accumulatedRawAmt = accumulatedRawAmt.plus(roundedAmt);
    }

    // Info: (20260526 - Tzuhan) Move to next month
    currentCursor.setUTCMonth(currentCursor.getUTCMonth() + 1);
  }

  if (isFinalMonth) {
    // Info: (20260526 - Tzuhan) 尾差配平：最後一期強制吃掉所有剩餘餘額 (100% Stateless)
    return totalAmount.minus(accumulatedRawAmt);
  }

  // Info: (20260526 - Tzuhan) Calculate intersection for the current month
  const effectiveStart = startDate > monthStart ? startDate : monthStart;
  const effectiveEnd = endDate < monthEnd ? endDate : monthEnd;
  const coveredDays = getInclusiveDays(effectiveStart, effectiveEnd);

  if (coveredDays <= 0) {
    return new Decimal(0);
  }

  // Info: (20260526 - Tzuhan) amt = totalAmount * (coveredDays / totalDays)
  // Info: (20260526 - Tzuhan) use decimal.js for precision
  const rawAmt = totalAmount.times(coveredDays).dividedBy(totalDays);

  return MoneyUtil.toDecimal(rawAmt.toFixed(0, Decimal.ROUND_HALF_UP));
}
