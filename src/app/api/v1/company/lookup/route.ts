import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
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
    // Info: (20260611 - Tzuhan) 如果原始 query 有附帶 "(2066)"，就直接嘗試擷取出代碼作為條件
    const query = searchParams.get("query");

    if (!query) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }

    const results = await lookupCompany(query);
    return jsonOk(results);
  } catch (error) {
    console.error("[API] /company/lookup error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
