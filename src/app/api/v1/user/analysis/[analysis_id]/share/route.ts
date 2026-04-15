import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysis_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const analysisId = (await params).analysis_id;

    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis || analysis.userId !== user.id) {
      return jsonFail(ApiCode.FORBIDDEN, "Access denied or Analysis not found");
    }

    let shareToken = await prisma.reportShareToken.findFirst({
      where: { analysisId: analysisId, isActive: true },
    });

    if (!shareToken) {
      shareToken = await prisma.reportShareToken.create({
        data: {
          analysisId: analysisId,
          category: analysis.type,
          createdById: user.id,
        },
      });
    }

    return jsonOk({ token: shareToken.token });
  } catch (error) {
    console.error("[API] /user/analysis/share POST error:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to generate share link",
    );
  }
}
