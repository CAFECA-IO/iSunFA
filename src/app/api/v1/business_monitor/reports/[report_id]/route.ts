import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { businessMonitorService } from "@/services/business_monitor.service";

/**
 * Info: (20260630 - Julian) 取得單一報告書的 API
 * GET /api/v1/business_monitor/reports/:report_id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { report_id: reportId } = resolvedParams;
    const reportIdNumber = parseInt(reportId, 10);

    const result = await businessMonitorService.getReportDetail(reportIdNumber);

    if (!result) {
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    return jsonOk(result);
  } catch (error) {
    console.error("❌ 讀取單一報告書失敗:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
