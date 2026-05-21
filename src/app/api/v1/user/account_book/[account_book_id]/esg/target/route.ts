import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { Decimal } from "decimal.js";
import { MoneyUtil } from "@/lib/utils/money";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);

    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) return jsonFail(API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS);

    const esgRecords =
      await esgRepo.getVerifiedEsgRecordsByAccountBookId(accountBookId);

    const incomes =
      await voucherRepo.getVerifiedIncomesByAccountBookId(accountBookId);

    const yearlyData: Record<number, { emissions: Decimal; revenue: Decimal }> =
      {};

    esgRecords.forEach((r) => {
      const date = new Date(r.tradingDate * 1000);
      const year = date.getFullYear();
      if (!yearlyData[year])
        yearlyData[year] = {
          emissions: new Decimal(0),
          revenue: new Decimal(0),
        };
      yearlyData[year].emissions = yearlyData[year].emissions.plus(
        new Decimal(r.emissions as string | number),
      );
    });

    incomes.forEach((v) => {
      const date = new Date(v.tradingDate * 1000);
      const year = date.getFullYear();
      if (!yearlyData[year])
        yearlyData[year] = {
          emissions: new Decimal(0),
          revenue: new Decimal(0),
        };
      const val = v.lineItems.lines
        .reduce(
          (a, l) => a.plus(new Decimal(l.amount as string | number)),
          new Decimal(0),
        )
        .div(2);
      yearlyData[year].revenue = yearlyData[year].revenue.plus(val);
    });

    const targets = await esgRepo.getEsgTargetsByAccountBookId(accountBookId);
    const targetMap = new Map(targets.map((t) => [t.year, t]));

    const startYear = accountBook.createdAt.getFullYear();
    const endYear = 2050;

    const history = [];
    for (let year = startYear; year <= endYear; year++) {
      const data = yearlyData[year] || {
        emissions: new Decimal(0),
        revenue: new Decimal(0),
      };
      const rev10k = data.revenue.div(10000);
      const intensity = rev10k.gt(0)
        ? data.emissions.div(rev10k)
        : new Decimal(0);
      const target = targetMap.get(year);

      history.push({
        year,
        emissions: data.emissions.gt(0) ? data.emissions.toString() : null,
        revenue: data.revenue.gt(0) ? data.revenue.toString() : null,
        intensity: data.emissions.gt(0)
          ? MoneyUtil.toDecimal(intensity.toFixed(2)).toString()
          : null,
        totalEmissionTarget: target?.totalEmissionTarget
          ? new Decimal(target.totalEmissionTarget).div(1000).toString()
          : null,
        revenueEmissionTarget: target?.revenueEmissionTarget
          ? new Decimal(target.revenueEmissionTarget).div(1000).toString()
          : null,
      });
    }

    const currentYear = new Date().getFullYear();
    const currentYearData = history.find((h) => h.year === currentYear) || null;
    const lastYearData =
      history.find((h) => h.year === currentYear - 1) || null;

    // Info: (20260322 - Luphia) Provide a suggested intensity based on last year if available
    let suggestedTargetIntensity = "0";
    if (lastYearData && lastYearData.intensity) {
      suggestedTargetIntensity = new Decimal(lastYearData.intensity)
        .times(0.95)
        .toFixed(2);
    }

    return jsonOk({
      history,
      lastYearData,
      currentYearData,
      suggestedTargetIntensity,
    });
  } catch (error) {
    console.error("Error fetching target info:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);

    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) return jsonFail(API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS);

    const body = await req.json();
    const { year, totalEmissionTarget, revenueEmissionTarget } = body;

    if (!year) {
      return jsonFail(API_ERRORS.VA_YEAR_IS_REQUIRED);
    }

    const target = await esgRepo.upsertEsgTarget({
      accountBookId,
      year: Number(year),
      totalEmissionTarget:
        totalEmissionTarget !== undefined && totalEmissionTarget !== null
          ? new Decimal(totalEmissionTarget).times(1000).toString()
          : null,
      revenueEmissionTarget:
        revenueEmissionTarget !== undefined && revenueEmissionTarget !== null
          ? new Decimal(revenueEmissionTarget).times(1000).toString()
          : null,
    });

    return jsonOk(target);
  } catch (error) {
    console.error("Error saving target info:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
