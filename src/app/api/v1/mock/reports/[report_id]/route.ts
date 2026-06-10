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
  const { report_id: reportId } = await params;

  const reportIdNumber = parseInt(reportId, 10);
  const report = mockReports.find((r) => r.id === reportIdNumber);

  if (!report) {
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }

  return jsonOk(report);
}
