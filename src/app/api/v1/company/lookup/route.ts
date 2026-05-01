import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { lookupCompany } from "@/lib/utils/company_lookup";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return jsonFail({
        code: "VA000099",
        message: "Query parameter is required",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    const results = await lookupCompany(query);
    return jsonOk(results);
  } catch (error) {
    console.error("[API] /company/lookup error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
