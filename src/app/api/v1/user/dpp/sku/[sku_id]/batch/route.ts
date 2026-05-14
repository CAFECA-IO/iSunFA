import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { DppService } from "@/services/dpp.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sku_id: string }> },
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);

    const identity = await getIdentityFromDeWT(authHeader);
    if (!identity || !identity.address) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { sku_id: skuId } = await params;
    const body = await request.json();

    const dppService = new DppService();
    const batch = await dppService.issueBatch(skuId, identity.address, body);

    return jsonOk(batch);
  } catch (error: unknown) {
    console.error(`[POST /api/v1/user/dpp/sku/[sku_id]/batch]`, error);
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
