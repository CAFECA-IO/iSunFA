import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { LogisticsImportService } from "@/services/logistics_import.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const { account_book_id: accountBookId } = await params;
    if (!accountBookId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const body = await request.json();
    const rows = body.rows;

    if (!rows || !Array.isArray(rows)) {
      return jsonFail({
        ...API_ERRORS.VL_MISSING_PARAMS,
        message: "Missing or invalid rows array",
      });
    }

    const service = new LogisticsImportService();
    const previewResult = service.previewData(rows);

    return jsonOk({ payload: previewResult });
  } catch (error) {
    console.error("Preview data error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
