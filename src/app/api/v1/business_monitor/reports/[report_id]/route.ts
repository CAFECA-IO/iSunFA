import { NextRequest } from "next/server";
import { IMockReport } from "@/interfaces/business_monitor";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { lanceDBService } from "@/services/lancedb.service";
import { mapFileNameToReport } from "@/lib/utils/report_mapper";
import { ILanceDBRow } from "@/interfaces/lance_db";

/**
 * ToDo: (20260610 - Julian) 用於開發 Business Monitor 的 Mock API，之後會移除
 * GET /api/v1/business_monitor/reports/:report_id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { report_id: string } },
) {
  const resolvedParams = await params;
  const { report_id: reportId } = resolvedParams;

  const reportIdNumber = parseInt(reportId, 10);

  // Load unique reports from LanceDB dynamically
  const table = await lanceDBService.getTable();
  const allRows = await table
    .query()
    .select(["reportId", "companyName"])
    .toArray();

  const uniqueReports: IMockReport[] = [];
  const seenIds = new Set<number>();

  allRows.forEach((row) => {
    const fileName = (row as unknown as ILanceDBRow).reportId;
    if (!fileName) return;
    const report = mapFileNameToReport(fileName);
    if (report && !seenIds.has(report.id)) {
      seenIds.add(report.id);
      uniqueReports.push(report);
    }
  });

  const report = uniqueReports.find((r) => r.id === reportIdNumber);

  if (!report) {
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }

  // Info: (20260610 - Julian) 找出該公司的所有報告書，並依照年份降序排列
  const companyReports = uniqueReports
    .filter((r) => r.company === report.company)
    .sort((a, b) => parseInt(b.reportYear, 10) - parseInt(a.reportYear, 10));

  // Info: (20260610 - Julian) 找出同產業的其他公司報告 (全顯示，不限數量)
  const industryReports = uniqueReports.filter(
    (r) => r.industry === report.industry && r.company !== report.company,
  );

  return jsonOk({
    report,
    companyReports,
    industryReports,
  });
}
