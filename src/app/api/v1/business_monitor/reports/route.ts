import { NextRequest } from "next/server";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { businessMonitorService } from "@/services/business_monitor.service";
import { isFeatureEnabled } from "@/services/feature_flag.service";
import { FEATURE_FLAG } from "@/constants/feature_flag";

/**
 * Info:(20260630 - Julian) 讀取資料庫報告書清單
 * GET /api/v1/business_monitor/reports?company={company}&industry={industry}&year={year}&page={page}&pageSize={pageSize}
 */
export async function GET(req: NextRequest) {
  // Info: (20261028 - Luphia) 企業觀測站預設隱藏：後台未開啟時對外就是沒有這支 API
  if (!(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR))) {
    return jsonFail(API_ERRORS.NF_FEATURE_DISABLED);
  }
  try {
    const searchParams = req.nextUrl.searchParams;
    const company = searchParams.get("company") || undefined;
    const industry = searchParams.get("industry") || undefined;
    const year = searchParams.get("year") || undefined;
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), {
      fallback: 4,
      max: 100,
    });

    const result = await businessMonitorService.getReports({
      company,
      industry,
      year,
      page,
      pageSize,
    });

    return jsonOk(result);
  } catch (error) {
    console.error("❌ 讀取報告書清單失敗:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
