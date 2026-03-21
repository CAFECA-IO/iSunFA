import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

export async function GET(req: NextRequest, { params }: { params: Promise<{ account_book_id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");

    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({ where: { id: accountBookId } });
    if (!accountBook) return jsonFail(ApiCode.NOT_FOUND, "Account book not found");

    const teamMember = await teamRepo.getTeamMember(sessionUser.id, accountBook.teamId);
    if (!teamMember) return jsonFail(ApiCode.FORBIDDEN, "No permission to view this account book");

    const esgRecords = await prisma.esgRecord.findMany({
      where: {
        accountBookId,
        isVerified: true
      }
    });

    const incomes = await prisma.voucher.findMany({
      where: {
        accountBookId,
        tradingType: 'INCOME',
        isVerified: true
      },
      include: { lines: true }
    });

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

    const currentYear = new Date().getFullYear();
    if (!yearlyData[currentYear]) yearlyData[currentYear] = { emissions: 0, revenue: 0 };

    const history = Object.entries(yearlyData).map(([yearParam, data]) => {
      const rev10k = data.revenue / 10000;
      const intensity = rev10k > 0 ? (data.emissions / rev10k) : 0;
      return {
        year: parseInt(yearParam),
        emissions: data.emissions,
        revenue: data.revenue,
        intensity: parseFloat(intensity.toFixed(2))
      };
    }).sort((a, b) => b.year - a.year); 

    const currentYearData = history.find(h => h.year === currentYear);
    const lastYearData = history.find(h => h.year === currentYear - 1) || {
      year: currentYear - 1,
      emissions: 0,
      revenue: 0,
      intensity: 0
    };

    let targetIntensity = 0;
    const summary = await prisma.esgDashboardSummary.findUnique({
      where: { accountBookId }
    });

    if (summary && summary.goalPercentage && lastYearData.intensity > 0) {
      targetIntensity = lastYearData.intensity * (1 - Number(summary.goalPercentage) / 100);
    } else {
      targetIntensity = lastYearData.intensity * 0.95;
    }

    return jsonOk({
       history,
       lastYearData,
       currentYearData,
       suggestedTargetIntensity: targetIntensity
    });

  } catch (error) {
    console.error("Error fetching target info:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Server Error");
  }
}
