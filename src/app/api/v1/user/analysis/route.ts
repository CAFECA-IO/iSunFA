import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import {
  analysisService,
  IGenerateAnalysisParams,
} from "@/services/analysis.service";
import { AppError } from "@/lib/utils/error";
import { getPaidOrder } from "@/services/order.service";
import { getPeriodDateRange } from "@/lib/analysis/period";
import { analysisRepo, FullAnalysis } from "@/repositories/analysis.repo";
import { ORDER_TYPE } from "@/constants/status";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const {
      category,
      periodType,
      periodValue,
      year,
      country,
      keyword,
      authentication,
      isExternal,
      question,
      files,
    } = body;

    // Info: (20260128 - Luphia) Validate payment binding
    if (!authentication || !authentication.orderId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const orderId = authentication.orderId;

    /**
     * Info: (20261015 - Luphia) 付款確認改看訂單狀態（區塊鏈退役）。
     *
     * 原本這裡解碼鏈上交易、確認 UserOp 把點數轉給 MembershipSystem 且綁著這張訂單；
     * 沒帶 txHash 時則「驗訂單 challenge 的簽章就標成已付」——那條路一點都沒扣。
     * 現在付款只會經過點數帳本（point_payment）或團隊額度（team_quota_payment），
     * 兩者都在付款當下把訂單推進到付款後狀態，所以這裡只認那些狀態。
     */
    try {
      await getPaidOrder(orderId, user.id);
    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail({
          code: error.apiCode,
          message: error.message,
          status: error.code,
        });
      }
      throw error;
    }

    const generateAnalysisParams: IGenerateAnalysisParams = {
      orderId,
      type: ORDER_TYPE.ANALYSIS,
      data: {
        category,
        periodType,
        periodValue,
        year,
        country,
        keyword,
        isExternal,
        question,
        files,
      },
    };
    const result = await analysisService.generateAnalysis(
      user.id,
      generateAnalysisParams,
    );
    return jsonOk(result);
  } catch (error) {
    console.error("[API] /user/analysis error:", error);
    if (error instanceof AppError) {
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }
    return jsonFail({
      code: "IS000099",
      message: String(
        error instanceof Error ? error.message : "Failed to generate analysis",
      ).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}

// Info: (20260128 - Luphia) Get analysis history for the user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const category = request.nextUrl.searchParams.get("category") || undefined;

    // Info: (20260311 - Tzuhan) Fetch associated tags and related mission data
    const fullAnalyses = await analysisRepo.getFullAnalysisHistoryByUserId(
      user.id,
      category,
    );

    // Info: (20260128 - Luphia) Map DB result to response format
    const history = fullAnalyses.map((analysis: FullAnalysis) => {
      const status = analysis.order?.status?.toLowerCase() || "unknown";
      const analysisData = analysis.data as Record<string, unknown> | null;
      let periodType = "unknown";

      if (analysisData?.missionName) {
        const parts = (analysisData.missionName as string).split("-");
        if (parts.length >= 3) {
          periodType = parts[2];
        }
      }

      // Info: (20260128 - Luphia) Safely access mission data, we assume analysis.data has generatedAt
      const missionData = analysis.data as Record<string, unknown> | null;
      const generatedAt =
        typeof missionData?.generatedAt === "string"
          ? missionData.generatedAt.split("T")[0]
          : analysis.createdAt.toISOString().split("T")[0];

      // Info: (20260128 - Luphia) Extract period info
      const year =
        typeof missionData?.year === "number"
          ? missionData.year
          : new Date().getFullYear();
      // Info: (20260128 - Luphia) If periodType not in data, fallback to previous parsing or unknown
      let pType =
        typeof missionData?.periodType === "string"
          ? missionData.periodType
          : periodType;
      // Info: (20260128 - Luphia) If still unknown and we have parsing logic success, use it
      if (pType === "unknown" && periodType !== "unknown") {
        pType = periodType;
      }

      const orderData = analysis.order?.data as Record<string, unknown> | null;
      const pValue =
        typeof missionData?.periodValue === "string" ||
        typeof missionData?.periodValue === "number"
          ? (missionData.periodValue as string | number)
          : (orderData?.periodValue as string | number) || "";

      // Info: (20260128 - Luphia) Fallback periodType from order if unknown
      if (pType === "unknown" && typeof orderData?.periodType === "string") {
        pType = orderData.periodType;
      }

      let periodStr = "N/A";
      if (pType !== "unknown" && pValue !== "") {
        try {
          const { start, end } = getPeriodDateRange(pType, year, pValue);
          periodStr = start === end ? start : `${start} ~ ${end}`;
        } catch (e) {
          console.warn("Failed to calc date range", e);
        }
      }
      // Info: (20260311 - Tzuhan) Extract country and keyword if they exist
      const country =
        typeof missionData?.country === "string"
          ? missionData.country
          : typeof orderData?.country === "string"
            ? orderData.country
            : undefined;

      const keyword =
        typeof missionData?.keyword === "string"
          ? missionData.keyword
          : typeof orderData?.keyword === "string"
            ? orderData.keyword
            : undefined;

      const tags = analysis.tags?.map((t) => t.tag.name) || [];

      const isExternal =
        typeof missionData?.isExternal === "boolean"
          ? missionData.isExternal
          : typeof orderData?.isExternal === "boolean"
            ? orderData.isExternal
            : false;

      // Info: (20260416 - Tzuhan) Parse sharing status
      const isShared =
        analysis.reportShareTokens && analysis.reportShareTokens.length > 0;
      const isFinancialDataHidden = isShared
        ? analysis.reportShareTokens[0].isFinancialDataHidden
        : true;

      return {
        id: analysis.id,
        generatedAt,
        category: analysis.type,
        periodType: pType,
        period: periodStr,
        year,
        periodValue: pValue,
        status: status,
        reportId: analysis.id,
        country,
        keyword,
        tags,
        isExternal,
        isShared,
        isFinancialDataHidden,
        origin: (missionData?.origin ||
          (missionData?.data as Record<string, unknown>)?.origin ||
          orderData?.origin) as Record<string, unknown> | undefined,
        dest: (missionData?.dest ||
          (missionData?.data as Record<string, unknown>)?.dest ||
          orderData?.dest) as Record<string, unknown> | undefined,
        weightKg: (missionData?.weightKg ||
          (missionData?.data as Record<string, unknown>)?.weightKg ||
          orderData?.weightKg) as number | undefined,
        retryCount:
          typeof missionData?.retryCount === "number"
            ? missionData.retryCount
            : 0,
        action:
          missionData?.action ||
          (missionData?.data as Record<string, unknown>)?.action ||
          orderData?.action,
        items:
          missionData?.items ||
          (missionData?.data as Record<string, unknown>)?.items ||
          orderData?.items,
      };
    });

    return jsonOk(history);
  } catch (error) {
    console.error("[API] GET /user/analysis error:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_ANALYSIS_HI);
  }
}
