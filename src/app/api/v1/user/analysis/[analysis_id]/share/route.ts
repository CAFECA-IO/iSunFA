import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { analysisRepo } from "@/repositories/analysis.repo";
import { shareRepo } from "@/repositories/share.repo";
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
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const analysisId = (await params).analysis_id;

    let hideFinancialData = true;
    try {
      const bodyText = await request.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        if (typeof body.hideFinancialData === "boolean") {
          hideFinancialData = body.hideFinancialData;
        }
      }
    } catch (e) {
      console.error("[API] /user/analysis/share POST error:", e);
    }

    const analysis = await analysisRepo.findById(analysisId);

    if (!analysis || analysis.userId !== user.id) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    let shareToken = await shareRepo.findTokenFirst({
      where: { analysisId: analysisId, isActive: true },
    });

    if (shareToken && shareToken.isFinancialDataHidden !== hideFinancialData) {
      shareToken = await shareRepo.updateToken({
        where: { id: shareToken.id },
        data: { isFinancialDataHidden: hideFinancialData },
      });
    }

    if (!shareToken) {
      shareToken = await shareRepo.createToken({
        data: {
          analysisId: analysisId,
          category: analysis.type,
          createdById: user.id,
          isFinancialDataHidden: hideFinancialData,
        },
      });
    }

    return jsonOk({ token: shareToken.token });
  } catch (error) {
    console.error("[API] /user/analysis/share POST error:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to generate share link",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
