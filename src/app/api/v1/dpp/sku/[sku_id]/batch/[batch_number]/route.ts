import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { DppService } from "@/services/dpp.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku_id: string; batch_number: string }> },
) {
  try {
    const { sku_id: skuId, batch_number: batchNumber } = await params;

    if (!skuId || !batchNumber) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const dppService = new DppService();
    const data = await dppService.getPublicBatchPassport(skuId, batchNumber);

    return jsonOk(data);
  } catch (error: unknown) {
    console.error(`[GET /api/v1/dpp/sku/[sku_id]/batch/[batch_number]]`, error);
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
