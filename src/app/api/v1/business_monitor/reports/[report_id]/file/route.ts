import { NextRequest, NextResponse } from "next/server";
import { jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { businessMonitorReportIdSchema } from "@/validators";
import { businessMonitorService } from "@/services/business_monitor.service";
import { logger } from "@/lib/utils/logger";
import { isFeatureEnabled } from "@/services/feature_flag.service";
import { FEATURE_FLAG } from "@/constants/feature_flag";

export const dynamic = "force-dynamic";

/**
 * Info: (20261022 - Luphia) 下載報告原始檔（取代原本模擬進度的 /download SSE）
 * GET /api/v1/business_monitor/reports/:report_id/file
 *
 * 報告是公開申報資料，與清單一樣不需登入；以來源 IP 套用讀取類限流，防整批爬取。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  // Info: (20261028 - Luphia) 企業觀測站預設隱藏：後台未開啟時對外就是沒有這支 API
  if (!(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR))) {
    return jsonFail(API_ERRORS.NF_FEATURE_DISABLED);
  }
  const identity =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = enforceRateLimit(identity, RateLimitBucketEnum.READ);
  if (limited) return limited;

  const { report_id: reportIdParam } = await params;
  const parsed = businessMonitorReportIdSchema.safeParse(reportIdParam);
  if (!parsed.success) return jsonFail(API_ERRORS.VL_INVALID_ID);

  try {
    const file = await businessMonitorService.getReportFile(parsed.data);
    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.body.length),
        // Info: (20261022 - Luphia) 檔名含中文，以 RFC 5987 的 filename* 帶 UTF-8；filename 給舊瀏覽器一個 ASCII 後備
        "Content-Disposition": `attachment; filename="report.${file.fileName.split(".").pop()}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("business monitor report file failed", {
      reportId: parsed.data,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
