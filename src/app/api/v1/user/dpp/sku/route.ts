import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { DppService } from "@/services/dpp.service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);

    const identity = await getIdentityFromDeWT(authHeader);
    if (!identity || !identity.address) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const accountBookId = body.accountBookId;
    const fileIds = body.fileIds as string[];

    if (!accountBookId) {
      return jsonFail(API_ERRORS.ISDPP_MISSING_ACCOUNTBOOKID);
    }

    if (!fileIds || fileIds.length === 0) {
      return jsonFail(API_ERRORS.ISDPP_NO_FILES_PROVIDED_FOR_SKU_PARS);
    }

    const dppService = new DppService();
    const sku = await dppService.createSku(
      accountBookId,
      identity.address,
      fileIds,
    );

    return jsonOk(sku);
  } catch (error: unknown) {
    console.error(`[POST /api/v1/user/dpp/sku]`, error);
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);

    const identity = await getIdentityFromDeWT(authHeader);
    if (!identity || !identity.address) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const dppService = new DppService();
    const skus = await dppService.getSkus(identity.address);

    return jsonOk(skus);
  } catch (error: unknown) {
    console.error(`[GET /api/v1/user/dpp/sku]`, error);
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
