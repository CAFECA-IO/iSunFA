import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260630 - Julian) 取得單一報告書的 API (Prisma/PostgreSQL 版本)
 * GET /api/v1/business_monitor/reports/:report_id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { report_id: string } },
) {
  const resolvedParams = await params;
  const { report_id: reportId } = resolvedParams;

  const reportIdNumber = parseInt(reportId, 10);

  const report = await prisma.report.findUnique({
    where: { id: reportIdNumber },
  });

  if (!report) {
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }

  // Info: (20260630 - Julian) 找出該公司的所有報告書，並依照年份降序排列
  const companyReports = await prisma.report.findMany({
    where: { companyName: report.companyName },
    orderBy: { reportYear: "desc" },
  });

  // Info: (20260630 - Julian) 找出同產業的其他公司報告
  const industryReports = await prisma.report.findMany({
    where: {
      industry: report.industry,
      companyName: { not: report.companyName },
    },
    orderBy: { reportYear: "desc" },
  });

  return jsonOk({
    report,
    companyReports,
    industryReports,
  });
}
