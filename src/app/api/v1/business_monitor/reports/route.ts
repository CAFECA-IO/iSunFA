import { NextRequest } from "next/server";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { businessMonitorService } from "@/services/business_monitor.service";

/**
 * Info:(20260630 - Julian) 讀取資料庫報告書清單
 * GET /api/v1/business_monitor/reports?query={query}&company={company}&industry={industry}&year={year}&page={page}&pageSize={pageSize}
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query") || undefined;
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
      query,
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
