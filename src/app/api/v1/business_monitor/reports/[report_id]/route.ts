import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { businessMonitorService } from "@/services/business_monitor.service";
import { isFeatureEnabled } from "@/services/feature_flag.service";
import { FEATURE_FLAG } from "@/constants/feature_flag";

/**
 * Info: (20260630 - Julian) 取得單一報告書的 API
 * GET /api/v1/business_monitor/reports/:report_id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  // Info: (20261028 - Luphia) 企業觀測站預設隱藏：後台未開啟時對外就是沒有這支 API
  if (!(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR))) {
    return jsonFail(API_ERRORS.NF_FEATURE_DISABLED);
  }
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
