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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonFail({
        ...API_ERRORS.VL_MISSING_PARAMS,
        message: "Missing file",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const service = new LogisticsImportService();
    const headers = service.extractHeaders(buffer);

    return jsonOk({ payload: { headers } });
  } catch (error) {
    console.error("Extract headers error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
