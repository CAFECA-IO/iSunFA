import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";

export async function GET(req: NextRequest, { params }: { params: Promise<{ account_book_id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(ApiCode.NOT_FOUND, "Account book not found");

    const teamMember = await teamRepo.getTeamMember(sessionUser.id, accountBook.teamId);
    if (!teamMember) return jsonFail(ApiCode.FORBIDDEN, "No permission to view this account book");

    const esgRecords = await esgRepo.getVerifiedEsgRecordsByAccountBookId(accountBookId);

    const incomes = await voucherRepo.getVerifiedIncomesByAccountBookId(accountBookId);

    const yearlyData: Record<number, { emissions: number; revenue: number }> = {};

    esgRecords.forEach(r => {
      const year = new Date(r.dateTimestamp * 1000).getFullYear();
      if (!yearlyData[year]) yearlyData[year] = { emissions: 0, revenue: 0 };
      yearlyData[year].emissions += Number(r.emissions);
    });

    incomes.forEach(v => {
      const year = v.tradingDate.getFullYear();
      if (!yearlyData[year]) yearlyData[year] = { emissions: 0, revenue: 0 };
      const val = v.lines.reduce((a, l) => a + l.amount, 0) / 2;
      yearlyData[year].revenue += val;
    });

    const targets = await esgRepo.getEsgTargetsByAccountBookId(accountBookId);
    const targetMap = new Map(targets.map(t => [t.year, t]));

    const startYear = accountBook.createdAt.getFullYear();
    const endYear = 2050;

    const history = [];
    for (let year = startYear; year <= endYear; year++) {
      const data = yearlyData[year] || { emissions: 0, revenue: 0 };
      const rev10k = data.revenue / 10000;
      const intensity = rev10k > 0 ? (data.emissions / rev10k) : 0;
      const target = targetMap.get(year);

      history.push({
        year,
        emissions: data.emissions > 0 ? data.emissions : null,
        revenue: data.revenue > 0 ? data.revenue : null,
        intensity: data.emissions > 0 ? parseFloat(intensity.toFixed(2)) : null,
        totalEmissionTarget: target?.totalEmissionTarget ? Number(target.totalEmissionTarget) / 1000 : null,
        revenueEmissionTarget: target?.revenueEmissionTarget ? Number(target.revenueEmissionTarget) / 1000 : null,
      });
    }

    const currentYear = new Date().getFullYear();
    const currentYearData = history.find(h => h.year === currentYear) || null;
    const lastYearData = history.find(h => h.year === currentYear - 1) || null;
    
    // Info: (20260322 - Luphia) Provide a suggested intensity based on last year if available
    let suggestedTargetIntensity = 0;
    if (lastYearData && lastYearData.intensity) {
      suggestedTargetIntensity = lastYearData.intensity * 0.95;
    }

    return jsonOk({
       history,
       lastYearData,
       currentYearData,
       suggestedTargetIntensity
    });

  } catch (error) {
    console.error("Error fetching target info:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Server Error");
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ account_book_id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(ApiCode.NOT_FOUND, "Account book not found");

    const teamMember = await teamRepo.getTeamMember(sessionUser.id, accountBook.teamId);
    if (!teamMember) return jsonFail(ApiCode.FORBIDDEN, "No permission to view this account book");

    const body = await req.json();
    const { year, totalEmissionTarget, revenueEmissionTarget } = body;

    if (!year) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Year is required");
    }

    const target = await esgRepo.upsertEsgTarget({
      accountBookId,
      year: Number(year),
      totalEmissionTarget: totalEmissionTarget !== undefined && totalEmissionTarget !== null ? totalEmissionTarget * 1000 : null,
      revenueEmissionTarget: revenueEmissionTarget !== undefined && revenueEmissionTarget !== null ? revenueEmissionTarget * 1000 : null,
    });

    return jsonOk(target);
  } catch (error) {
    console.error("Error saving target info:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Server Error");
  }
}
