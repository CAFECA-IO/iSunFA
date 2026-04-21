import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { analysisRepo } from "@/repositories/analysis.repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysis_id: string }> },
) {
  try {
    const { analysis_id: analysisId } = await params;
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    if (!analysisId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    // Info: (20260130 - Luphia) Fetch analysis details
    const analysis = await analysisRepo.findById(analysisId);

    if (!analysis) {
      return jsonFail(API_ERRORS.NF_ANALYSIS);
    }

    // Info: (20260130 - Luphia) Authorization Check
    if (analysis.userId !== user.id) {
      return jsonFail({ code: "FO000099", message: "You do not have permission ...", status: ApiCode.FORBIDDEN },  );
    }

    const analysisData = analysis.data as Record<
      string,
      unknown
    > | null;
    let isExternal = false;
    if (typeof analysisData?.isExternal === "boolean") {
      isExternal = analysisData.isExternal;
    } else {
      // Info: (20260324 - Tzuhan) Fallback to order data if available
      const orderData = analysis.order?.data as Record<string, unknown> | null;
      if (typeof orderData?.isExternal === "boolean") {
        isExternal = orderData.isExternal;
      }
    }

    // Info: (20260130 - Luphia) Return full details including analysis result
    return jsonOk({
      id: analysis.id,
      status: analysis.order?.status ?? "UNKNOWN",
      result: analysis.result,
      createdAt: analysis.createdAt,
      type: analysis.type,
      isExternal,
      // Info: (20260130 - Luphia) Include any other necessary fields
    });
  } catch (error) {
    console.error(
      `[API] GET /user/analysis/${(await params).analysis_id} error:`,
      error,
    );
    return jsonFail({ code: "IN000099", message: String((error as Error).message || "Internal Server Error").slice(0, 30), status: ApiCode.INTERNAL_SERVER_ERROR });
  }
}
