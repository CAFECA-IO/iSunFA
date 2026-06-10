import { NextRequest } from "next/server";
import { mockReports } from "@/interfaces/business_monitor";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info:(20260610 - Julian) 用於開發 Business Monitor 的 Mock API，之後會移除
 * GET /api/v1/mock/reports/:report_id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { report_id: string } },
) {
  const resolvedParams = await params;
  const { report_id: reportId } = resolvedParams;

  const reportIdNumber = parseInt(reportId, 10);
  const report = mockReports.find((r) => r.id === reportIdNumber);

  if (!report) {
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }

  // Info: (20260610 - Julian) 找出該公司的所有報告書，並依照年份降序排列
  const companyReports = mockReports
    .filter((r) => r.company === report.company)
    .sort((a, b) => parseInt(b.reportYear, 10) - parseInt(a.reportYear, 10));

  // Info: (20260610 - Julian) 找出同產業的其他公司報告 (全顯示，不限數量)
  const industryReports = mockReports.filter(
    (r) => r.industry === report.industry && r.company !== report.company,
  );

  return jsonOk({
    report,
    companyReports,
    industryReports,
  });
}
