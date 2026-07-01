import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { businessMonitorService } from "@/services/business_monitor.service";

/**
 * Info:(20260610 - Julian) AI 諮詢功能
 * POST /api/v1/business_monitor/chat
 */
export const POST = async (req: NextRequest) => {
  try {
    const { question } = await req.json();

    if (!question) {
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    const result = await businessMonitorService.chat(question);
    return jsonOk(result);
  } catch (error) {
    console.error("❌ AI 諮詢失敗:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
};
