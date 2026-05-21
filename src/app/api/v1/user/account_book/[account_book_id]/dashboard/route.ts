import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { MoneyUtil } from "@/lib/utils/money";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { Decimal } from "decimal.js";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { VerifyStatus } from "@/constants/verify_status";

type TimeUnit = "7d" | "30d" | "3m" | "1y" | "custom";
type GasType = "co2" | "ch4" | "n2o" | "f_gases";

const getBucketConfig = (
  timeUnit: TimeUnit,
  yearStr?: string | null,
  monthStr?: string | null,
) => {
  const end = new Date();
  const start = new Date(end);
  let bucketMs = 0;
  let count = 0;
  let labelFormat: Intl.DateTimeFormatOptions = {};

  if (timeUnit === "custom" && yearStr) {
    const yearNum = parseInt(yearStr, 10);
    const monthNum = monthStr ? parseInt(monthStr, 10) : null;

    if (monthNum) {
      start.setFullYear(yearNum, monthNum - 1, 1);
      start.setHours(0, 0, 0, 0);

      const d = new Date(start);
      d.setMonth(d.getMonth() + 1);
      end.setTime(d.getTime() - 1);

      const days = new Date(yearNum, monthNum, 0).getDate();
      count = days;
      bucketMs = 24 * 60 * 60 * 1000;
      labelFormat = { month: "short", day: "numeric" };
    } else {
      start.setFullYear(yearNum, 0, 1);
      start.setHours(0, 0, 0, 0);

      const d = new Date(start);
      d.setFullYear(d.getFullYear() + 1);
      end.setTime(d.getTime() - 1);

      count = 12;
      bucketMs = 0;
      labelFormat = { year: "2-digit", month: "short" };
    }
  } else if (timeUnit === "7d") {
    start.setDate(end.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    bucketMs = 24 * 60 * 60 * 1000;
    count = 7;
    labelFormat = { month: "short", day: "numeric" };
  } else if (timeUnit === "30d") {
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    bucketMs = 24 * 60 * 60 * 1000;
    count = 30;
    labelFormat = { month: "short", day: "numeric" };
  } else if (timeUnit === "3m") {
    start.setMonth(end.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    bucketMs = 7 * 24 * 60 * 60 * 1000;
    count = 13;
    labelFormat = { month: "short", day: "numeric" };
  } else if (timeUnit === "1y") {
    start.setFullYear(end.getFullYear() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    bucketMs = 30.44 * 24 * 60 * 60 * 1000;
    count = 12;
    labelFormat = { year: "2-digit", month: "short" };
  }

  return { start, end, bucketMs, count, labelFormat };
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const timeUnit = (searchParams.get("timeUnit") as TimeUnit) || "30d";
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");
    const validTimeUnits: TimeUnit[] = ["7d", "30d", "3m", "1y", "custom"];
    const unit = validTimeUnits.includes(timeUnit) ? timeUnit : "30d";

    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);

    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);

    // Info: (20260321 - Luphia) Configuration
    const { start, end, bucketMs, count, labelFormat } = getBucketConfig(
      unit,
      yearStr,
      monthStr,
    );

    // Info: (20260321 - Luphia) Initial old data to resolve trends (e.g. comparing previous period to current period)
    const prevStart = new Date(
      start.getTime() - (end.getTime() - start.getTime()),
    );

    // Info: (20260321 - Luphia) 1. Fetch Vouchers
    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId,
      startDate: prevStart.toISOString(),
      endDate: end.toISOString(),
      verifyStatus: VerifyStatus.VERIFIED,
      hideDeleted: true,
    });

    // Info: (20260321 - Luphia) 2. Fetch ESG
    const esgRecords = await esgRepo.getEsgRecordsByFilter({
      accountBookId,
      startDate: prevStart,
      endDate: end,
      verifyStatus: VerifyStatus.VERIFIED,
      hideDeleted: true,
    });

    // Info: (20260321 - Luphia) Initialize buckets
    const initializeBuckets = () =>
      Array.from({ length: count }, (_, i) => {
        let ts = start.getTime() + (bucketMs ? i * bucketMs : 0);
        if (unit === "1y" || (unit === "custom" && !monthStr)) {
          const d = new Date(start);
          d.setMonth(d.getMonth() + i);
          ts = d.getTime();
        }
        return {
          timestamp: ts,
          name: new Date(ts).toLocaleDateString("en-US", labelFormat),
          income: new Decimal(0),
          outcome: new Decimal(0),
          scope1: {
            co2: new Decimal(0),
            ch4: new Decimal(0),
            n2o: new Decimal(0),
            f_gases: new Decimal(0),
          },
          scope2: {
            co2: new Decimal(0),
            ch4: new Decimal(0),
            n2o: new Decimal(0),
            f_gases: new Decimal(0),
          },
          scope3: {
            co2: new Decimal(0),
            ch4: new Decimal(0),
            n2o: new Decimal(0),
            f_gases: new Decimal(0),
          },
        };
      });

    const buckets = initializeBuckets();

    // Info: (20260321 - Luphia) Aggregates for CURRENT period vs PREV period
    let currentIncome = new Decimal(0);
    let prevIncome = new Decimal(0);
    let currentOutcome = new Decimal(0);
    let prevOutcome = new Decimal(0);
    const currentGas = {
      co2: new Decimal(0),
      ch4: new Decimal(0),
      n2o: new Decimal(0),
      f_gases: new Decimal(0),
    };
    const prevGas = {
      co2: new Decimal(0),
      ch4: new Decimal(0),
      n2o: new Decimal(0),
      f_gases: new Decimal(0),
    };

    // Info: (20260321 - Luphia) Process Vouchers
    // Info: (20260506 - Julian) 以 IVoucher 重構
    vouchers.forEach((v) => {
      const tradingDateMs = v.tradingDate * 1000;
      const tradingDateObj = new Date(tradingDateMs);
      const isCurrent = tradingDateMs >= start.getTime();
      const val = v.lineItems.lines
        .reduce(
          (acc, line) => acc.plus(new Decimal(line.amount as string | number)),
          new Decimal(0),
        )
        .div(2); // Info: (20260321 - Luphia) Derived from lines

      if (isCurrent) {
        if (v.tradingType === "INCOME") currentIncome = currentIncome.plus(val);
        else if (v.tradingType === "OUTCOME")
          currentOutcome = currentOutcome.plus(val);

        let bIdx = 0;
        if (unit === "1y" || (unit === "custom" && !monthStr)) {
          const months =
            (tradingDateObj.getFullYear() - start.getFullYear()) * 12 +
            (tradingDateObj.getMonth() - start.getMonth());
          bIdx = Math.max(0, Math.min(count - 1, months));
        } else {
          bIdx = Math.max(
            0,
            Math.min(
              count - 1,
              Math.floor((tradingDateMs - start.getTime()) / bucketMs),
            ),
          );
        }

        if (v.tradingType === "INCOME")
          buckets[bIdx].income = buckets[bIdx].income.plus(val);
        else if (v.tradingType === "OUTCOME")
          buckets[bIdx].outcome = buckets[bIdx].outcome.plus(val);
      } else {
        if (v.tradingType === "INCOME") prevIncome = prevIncome.plus(val);
        else if (v.tradingType === "OUTCOME")
          prevOutcome = prevOutcome.plus(val);
      }
    });

    // Info: (20260321 - Luphia)  Process ESG
    esgRecords.forEach((e) => {
      const tradingDateMs = e.tradingDate * 1000;
      const isCurrent = tradingDateMs >= start.getTime();
      const em = new Decimal(e.emissions as number | string);
      /**
       * Info: (20260321 - Luphia) Determine gas type roughly from activityType or vendor
       * For authentic mapping, assuming 'co2' is default main
       */
      const activityTypeLower = e.activityType?.toLowerCase() || "";
      const gasType: GasType = activityTypeLower.includes("ch4")
        ? "ch4"
        : activityTypeLower.includes("n2o")
          ? "n2o"
          : activityTypeLower.includes("f_gas")
            ? "f_gases"
            : "co2";

      if (isCurrent) {
        currentGas[gasType] = currentGas[gasType].plus(em);

        let bIdx = 0;
        if (unit === "1y" || (unit === "custom" && !monthStr)) {
          const date = new Date(e.tradingDate);
          const months =
            (date.getFullYear() - start.getFullYear()) * 12 +
            (date.getMonth() - start.getMonth());
          bIdx = Math.max(0, Math.min(count - 1, months));
        } else {
          bIdx = Math.max(
            0,
            Math.min(
              count - 1,
              Math.floor((tradingDateMs - start.getTime()) / bucketMs),
            ),
          );
        }

        if (e.scope === "SCOPE_1")
          buckets[bIdx].scope1[gasType] =
            buckets[bIdx].scope1[gasType].plus(em);
        else if (e.scope === "SCOPE_2")
          buckets[bIdx].scope2[gasType] =
            buckets[bIdx].scope2[gasType].plus(em);
        else if (e.scope === "SCOPE_3")
          buckets[bIdx].scope3[gasType] =
            buckets[bIdx].scope3[gasType].plus(em);
      } else {
        prevGas[gasType] = prevGas[gasType].plus(em);
      }
    });

    // Info: (20260321 - Luphia) Compute Metrics & Charts
    const calculateTrend = (curr: Decimal, prev: Decimal) => {
      if (prev.isZero()) return curr.gt(0) ? 100 : 0;
      return curr.minus(prev).div(prev).times(100).toNumber();
    };

    let runningFunds = new Decimal(0); // Info: (20260406 - Luphia) Fix double counting (previously currentIncome - currentOutcome)

    const fundsData = buckets.map((b) => {
      const net = b.income.minus(b.outcome);
      const open = runningFunds;
      runningFunds = runningFunds.plus(net);
      const close = runningFunds;
      return {
        name: b.name,
        open: open.toString(),
        close: close.toString(),
        high: Decimal.max(open, close).toString(),
        low: Decimal.min(open, close).toString(),
        value: close.toString(),
      };
    });

    const revenueData = buckets.map((b) => ({
      name: b.name,
      value: b.income.toString(),
    }));
    const expenditureData = buckets.map((b) => ({
      name: b.name,
      value: b.outcome.toString(),
    }));

    const revTrend = calculateTrend(currentIncome, prevIncome);
    const expTrend = calculateTrend(currentOutcome, prevOutcome);
    const fundsTrendNum = calculateTrend(
      currentIncome.minus(currentOutcome),
      prevIncome.minus(prevOutcome),
    );

    const financialMetrics = {
      fundsTrend:
        (fundsTrendNum > 0 ? "+" : "") + fundsTrendNum.toFixed(1) + "%",
      revenueCurrent: currentIncome.toString(),
      revenueTrend: (revTrend > 0 ? "+" : "") + revTrend.toFixed(1) + "%",
      revenueTrendVal: revTrend,
      revenueTarget: prevIncome.times(1.1).toString(),
      revenueAchievement: prevIncome.gt(0)
        ? currentIncome.div(prevIncome.times(1.1)).times(100).toNumber()
        : currentIncome.gt(0)
          ? 100
          : 0,
      expenditureCurrent: currentOutcome.toString(),
      expenditureTrend: (expTrend > 0 ? "+" : "") + expTrend.toFixed(1) + "%",
      expenditureTrendVal: expTrend,
      expenditureBudget: prevOutcome.times(1.05).toString(),
      expenditureRate: prevOutcome.gt(0)
        ? currentOutcome.div(prevOutcome.times(1.05)).times(100).toNumber()
        : currentOutcome.gt(0)
          ? 100
          : 0,
      pendingCount: 0,
      applyingCount: 0,
      anomaliesCritical: 0,
      anomaliesWarning: 0,
      healthCompliant: 100,
      healthNonCompliant: 0,
      systems: [
        { key: "bank", status: "connected" },
        { key: "tax", status: "connected" },
        { key: "invoice", status: "connected" },
      ],
    };

    // Info: (20260322 - Luphia) Dynamic ESG Target Calculation
    const endYear = end.getFullYear();
    const esgTarget = await esgRepo.getEsgTargetByYear(accountBookId, endYear);
    const targetValue = esgTarget?.totalEmissionTarget
      ? new Decimal(esgTarget.totalEmissionTarget)
      : null;

    const periodEmissionsSum = esgRecords.reduce(
      (acc, current) => acc.plus(new Decimal(current.emissions || 0)),
      new Decimal(0),
    );

    let goalStatus = "on_track";
    let goalProgress = 0;
    let goalTargetStr = "No target set";

    if (targetValue !== null && targetValue.gt(0)) {
      const yearStartMs = new Date(endYear, 0, 1).getTime();
      const yearEndMs = new Date(endYear, 11, 31, 23, 59, 59, 999).getTime();
      const msInYear = yearEndMs - yearStartMs;
      const spanMs = end.getTime() - start.getTime();
      const proportion = Math.min(1, spanMs / msInYear);
      const proportionalTarget = targetValue.times(proportion); // Info: (20260322 - Luphia) kgCO2e

      goalProgress = Math.round(
        periodEmissionsSum.div(proportionalTarget).times(100).toNumber(),
      );
      goalTargetStr = `${proportionalTarget.div(1000).toDP(0).toString()} tCO2e`;

      const now = new Date();
      if (now.getTime() > end.getTime()) {
        goalStatus = periodEmissionsSum.lte(proportionalTarget)
          ? "achieved"
          : "not_achieved";
      } else {
        goalStatus = periodEmissionsSum.lte(proportionalTarget)
          ? "on_track"
          : "not_achieved";
      }
    }

    const generateGasPayload = (gasType: GasType) => {
      const ghgData = buckets.map((b) => {
        const s1 = b.scope1[gasType];
        const s2 = b.scope2[gasType];
        const s3 = b.scope3[gasType];
        return {
          name: b.name,
          scope1: s1.toString(),
          scope2: s2.toString(),
          scope3: s3.toString(),
          total: s1.plus(s2).plus(s3).toString(),
        };
      });

      const cGas = currentGas[gasType];
      const pGas = prevGas[gasType];
      const carbonTrend = calculateTrend(cGas, pGas);

      const currentS1 = ghgData.reduce(
        (acc, b) => acc.plus(new Decimal(b.scope1)),
        new Decimal(0),
      );
      const currentS2 = ghgData.reduce(
        (acc, b) => acc.plus(new Decimal(b.scope2)),
        new Decimal(0),
      );
      const currentS3 = ghgData.reduce(
        (acc, b) => acc.plus(new Decimal(b.scope3)),
        new Decimal(0),
      );

      return {
        ghgData,
        metrics: {
          carbonCost: "$" + MoneyUtil.formatDynamic(cGas.times(50), 0),
          carbonTrend:
            (carbonTrend > 0 ? "+" : "") + carbonTrend.toFixed(1) + "%",
          carbonTotal:
            (gasType === "co2" ? cGas.div(1000) : cGas).toFixed(1) +
            (gasType === "co2" ? "t" : "kg"),
          scope1Current:
            (gasType === "co2" ? currentS1.div(1000) : currentS1).toFixed(1) +
            (gasType === "co2" ? "t" : "kg"),
          scope1Trend: "+0%",
          scope1TrendVal: 0,
          scope2Current:
            (gasType === "co2" ? currentS2.div(1000) : currentS2).toFixed(1) +
            (gasType === "co2" ? "t" : "kg"),
          scope2Trend: "+0%",
          scope2TrendVal: 0,
          scope3Current:
            (gasType === "co2" ? currentS3.div(1000) : currentS3).toFixed(1) +
            (gasType === "co2" ? "t" : "kg"),
          scope3Trend: "+0%",
          scope3TrendVal: 0,
          emissionsIntensity: currentIncome.isZero()
            ? "N/A"
            : (gasType === "co2" ? cGas.div(1000) : cGas)
                .div(currentIncome.div(10000))
                .toFixed(2),
          isTop10Percent: true,
          goalStatus,
          goalProgress,
          goalTarget: goalTargetStr,
        },
      };
    };

    return jsonOk({
      financial: {
        fundsData,
        revenueData,
        expenditureData,
        metrics: financialMetrics,
      },
      gas: {
        co2: generateGasPayload("co2"),
        ch4: generateGasPayload("ch4"),
        n2o: generateGasPayload("n2o"),
        f_gases: generateGasPayload("f_gases"),
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_GENERATE_DASHBOAR);
  }
}
