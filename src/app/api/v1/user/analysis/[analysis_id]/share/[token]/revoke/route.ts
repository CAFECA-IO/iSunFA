import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { shareRepo } from "@/repositories/share.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string; token: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { analysisId, token } = await params;

    const updated = await shareRepo.updateToken({
      where: {
        token,
        analysisId,
        createdById: user.id,
      },
      data: { isActive: false },
    });

    return jsonOk({ isActive: updated.isActive });
  } catch (error) {
    console.error("[API] /user/analysis/share/revoke PATCH error:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_REVOKE_TOKEN_MAY);
  }
}
