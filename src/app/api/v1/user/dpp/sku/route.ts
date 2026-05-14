import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";
import { DppService } from "@/services/dpp.service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);

    const token = authHeader.replace("Bearer ", "");
    const identity = await getIdentityFromDeWT(token);
    if (!identity || !identity.address) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const formData = await request.formData();
    const accountBookId = formData.get("accountBookId")?.toString();
    const files = formData.getAll("files") as File[];

    if (!accountBookId) {
      return jsonFail(API_ERRORS.ISDPP_MISSING_ACCOUNTBOOKID);
    }

    if (!files || files.length === 0) {
      return jsonFail(API_ERRORS.ISDPP_NO_FILES_PROVIDED_FOR_SKU_PARS);
    }

    const dppService = new DppService();
    const sku = await dppService.createSku(
      accountBookId,
      identity.address,
      files,
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
    return jsonFail(
      new ApiError(
        "ISDPP500",
        error instanceof Error ? error.message : "Failed to create SKU",
        ApiCode.INTERNAL_SERVER_ERROR,
      ),
    );
  }
}
