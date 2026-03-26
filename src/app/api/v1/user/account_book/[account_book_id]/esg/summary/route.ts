import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IEsgDashboardSummary } from "@/interfaces/esg";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";

export const dynamic = "force-dynamic";

/**
 * Info: (20260312 - Julian) 取得 ESG 儀表板摘要
 * GET /api/v1/user/account_book/:account_book_id/esg/summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookByIdAndUserAddress(
      accountBookId,
      sessionUser.address,
    );

    if (!accountBook) {
      return jsonFail(
        ApiCode.NOT_FOUND,
        "Accountbook not found or no permission",
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const currentYear = yearParam
      ? parseInt(yearParam, 10)
      : new Date().getFullYear();
    const currentMonth = monthParam ? parseInt(monthParam, 10) : null;

    let startDate: Date;
    let endDate: Date;

    if (currentMonth) {
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    }

    const esgRecords = await prisma.esgRecord.findMany({
      where: {
        accountBookId,
        dateTimestamp: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
      },
    });

    const incomes = await prisma.voucher.findMany({
      where: {
        accountBookId,
        tradingType: "INCOME",
        tradingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { lines: true },
    });

    let totalEmissions = 0;
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;

    esgRecords.forEach((r) => {
      const e = Number(r.emissions);
      totalEmissions += e;
      if (r.scope === "SCOPE_1") scope1 += e;
      else if (r.scope === "SCOPE_2") scope2 += e;
      else if (r.scope === "SCOPE_3") scope3 += e;
    });

    let revenue = 0;
    incomes.forEach((v) => {
      const val = v.lines.reduce((a, l) => a + l.amount, 0) / 2;
      revenue += val;
    });

    const totalEmissionsTons = totalEmissions / 1000;
    const scope1Tons = scope1 / 1000;
    const scope2Tons = scope2 / 1000;
    const scope3Tons = scope3 / 1000;

    const rev10k = revenue / 10000;
    const intensity = rev10k > 0 ? totalEmissionsTons / rev10k : null;

    const s1Pct = totalEmissions > 0 ? (scope1 / totalEmissions) * 100 : 0;
    const s2Pct = totalEmissions > 0 ? (scope2 / totalEmissions) * 100 : 0;
    const s3Pct = totalEmissions > 0 ? (scope3 / totalEmissions) * 100 : 0;

    const targets = await esgRepo.getEsgTargetsByAccountBookId(accountBookId);
    const target = targets.find((t) => t.year === currentYear);

    let goalProgress = 0;
    if (
      target &&
      target.totalEmissionTarget &&
      Number(target.totalEmissionTarget) > 0
    ) {
      const msInYear =
        new Date(currentYear, 11, 31, 23, 59, 59, 999).getTime() -
        new Date(currentYear, 0, 1).getTime();
      const spanMs = endDate.getTime() - startDate.getTime();
      const proportion = Math.min(1, spanMs / msInYear);
      const proportionalTarget =
        Number(target.totalEmissionTarget) * proportion;
      goalProgress = (totalEmissions / proportionalTarget) * 100; // Info: (20260326 - Julian) 碳排放目標達成率，單位為百分比
    }

    const dashboardSummary: IEsgDashboardSummary = {
      totalEmissions: {
        value: Number(totalEmissionsTons.toFixed(2)),
        unit: "tCO2e",
        estimatedEndOfMonth: 0,
        estimatedUnit: "tCO2e",
      },
      emissionIntensity: {
        value: intensity !== null ? Number(intensity.toFixed(2)) : null,
        unit: "tCO2e / 萬元營收",
        industryAverage: 0,
      },
      scopeDistribution: {
        scope1: {
          value: Number(scope1Tons.toFixed(2)),
          unit: "tCO2e",
          percentage: Number(s1Pct.toFixed(1)),
        },
        scope2: {
          value: Number(scope2Tons.toFixed(2)),
          unit: "tCO2e",
          percentage: Number(s2Pct.toFixed(1)),
        },
        scope3: {
          value: Number(scope3Tons.toFixed(2)),
          unit: "tCO2e",
          percentage: Number(s3Pct.toFixed(1)),
        },
      },
      goalProgress: {
        percentage: Number(goalProgress.toFixed(1)),
      },
    };

    return jsonOk(dashboardSummary);
  } catch (error) {
    console.error("Error fetching ESG summary:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch ESG summary",
    );
  }
}
