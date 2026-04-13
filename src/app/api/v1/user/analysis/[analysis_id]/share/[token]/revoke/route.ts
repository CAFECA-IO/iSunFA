import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string; token: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { analysisId, token } = await params;

    const updated = await prisma.reportShareToken.update({
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
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to revoke. Token may not exist or access denied.",
    );
  }
}
