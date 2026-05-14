import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";
import { DppService } from "@/services/dpp.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku_id: string }> },
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);

    const token = authHeader.replace("Bearer ", "");
    const identity = await getIdentityFromDeWT(token);
    if (!identity || !identity.address) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { sku_id: skuId } = await params;

    const dppService = new DppService();
    const skuData = await dppService.getSku(skuId, identity.address);

    return jsonOk(skuData);
  } catch (error: unknown) {
    console.error(`[GET /api/v1/user/dpp/sku/[sku_id]]`, error);
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(
      new ApiError(
        "ISDPP500",
        error instanceof Error ? error.message : "Failed to retrieve SKU",
        ApiCode.INTERNAL_SERVER_ERROR,
      ),
    );
  }
}
