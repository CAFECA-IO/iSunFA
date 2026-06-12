import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { DppService } from "@/services/dpp.service";
import { ApiCode } from "@/lib/utils/status";

export async function GET(
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
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function PUT(
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
    const body = (await request.json()) as { fileId?: string };

    if (!body.fileId) {
      return jsonFail({
        code: "ISDPP008",
        message: "Missing required parameter fileId",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    const dppService = new DppService();
    const updatedSku = await dppService.updateSkuWithSupplement(
      skuId,
      identity.address,
      body.fileId,
    );

    return jsonOk(updatedSku);
  } catch (error: unknown) {
    console.error(`[PUT /api/v1/user/dpp/sku/[sku_id]]`, error);
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
