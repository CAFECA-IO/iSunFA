import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/utils/response";
import { businessMonitorService } from "@/services/business_monitor.service";

export const dynamic = "force-dynamic";

/**
 * Info:(20260701 - Julian) 從 storage 下載永續報告書
 * GET /api/v1/business_monitor/download?reportId={reportId}
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const reportId = searchParams.get("reportId") || "unknown";

  const stream = businessMonitorService.downloadReport(reportId);

  return jsonOk({
    stream,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
