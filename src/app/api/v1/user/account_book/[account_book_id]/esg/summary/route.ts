import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IEsgDashboardSummary } from "@/interfaces/esg";

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
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId, team: { teamMembers: { some: { user: { address: sessionUser.address } } } } },
    });

    if (!accountBook) {
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found or no permission");
    }

    // Info: (20260312 - Julian) 取得摘要
    const summary = await prisma.esgDashboardSummary.findUnique({
      where: {
        accountBookId,
      },
    });

    // Info: (20260312 - Julian) 組合 response
    let dashboardSummary: IEsgDashboardSummary;

    if (summary) {
      const scope1 = Number(summary.scope1Emissions);
      const scope2 = Number(summary.scope2Emissions);
      const scope3 = Number(summary.scope3Emissions);
      const totalScopes = scope1 + scope2 + scope3;

      const calcPercentage = (val: number, total: number) =>
        total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0;

      dashboardSummary = {
        totalEmissions: {
          value: Number(summary.totalEmissions),
          unit: summary.emissionsUnit,
          estimatedEndOfMonth: Number(summary.estimatedEndOfMonth),
          estimatedUnit: summary.emissionsUnit,
        },
        emissionIntensity: {
          value: Number(summary.emissionIntensity),
          unit: summary.intensityUnit,
          industryAverage: Number(summary.industryAverage),
        },
        scopeDistribution: {
          scope1: {
            value: scope1,
            unit: summary.emissionsUnit,
            percentage: calcPercentage(scope1, totalScopes),
          },
          scope2: {
            value: scope2,
            unit: summary.emissionsUnit,
            percentage: calcPercentage(scope2, totalScopes),
          },
          scope3: {
            value: scope3,
            unit: summary.emissionsUnit,
            percentage: calcPercentage(scope3, totalScopes),
          },
        },
        goalProgress: {
          percentage: Number(summary.goalPercentage),
        },
      };
    } else {
      // Info: (20260312 - Julian) 預設空值
      dashboardSummary = {
        totalEmissions: {
          value: 0,
          unit: "kgCO2e",
          estimatedEndOfMonth: 0,
          estimatedUnit: "kgCO2e",
        },
        emissionIntensity: {
          value: 0,
          unit: "kg / 萬元營收",
          industryAverage: 0,
        },
        scopeDistribution: {
          scope1: { value: 0, unit: "kgCO2e", percentage: 0 },
          scope2: { value: 0, unit: "kgCO2e", percentage: 0 },
          scope3: { value: 0, unit: "kgCO2e", percentage: 0 },
        },
        goalProgress: {
          percentage: 0,
        },
      };
    }

    return jsonOk(dashboardSummary);
  } catch (error) {
    console.error("Error fetching ESG summary:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Failed to fetch ESG summary");
  }
}
