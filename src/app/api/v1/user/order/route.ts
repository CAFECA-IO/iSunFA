import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnService } from "@/services/webauthn.service";
import { generatePaymentOrder, generateAnalysisOrder, getOrdersByUserId } from "@/services/order.service";
import { ORDER_TYPE } from "@/constants/status";
import { IGenerateAnalysisParams } from "@/services/analysis.service";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";

export async function POST(request: NextRequest) {
  try {
    // Info: (20260128 - Luphia) Verify user identity from DeWT token
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const body = await request.json();
    const {
      type,
      category,
      periodType,
      amount,
      unit,
      credits,
      paymentMethodId,
      items,
      data,
    } = body;

    // Info: (20260130 - Tzuhan) Ensure user exists in DB before creating order to avoid FK errors
    await webAuthnService.ensureUserSynced(user.address);

    if (type === ORDER_TYPE.OEN_PAYMENT) {
      if (!amount || amount <= 0 || !credits || credits <= 0) {
        return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid amount or credits");
      }
      if (!paymentMethodId) {
        return jsonFail(
          ApiCode.VALIDATION_ERROR,
          "paymentMethodId is required",
        );
      }
      const result = await generatePaymentOrder(user.id, {
        amount,
        unit,
        credits,
        paymentMethodId,
      });
      return jsonOk(result);
    }

    if (type === ORDER_TYPE.ANALYSIS) {
      // Info: (20260128 - Luphia) Generate Analysis Order and Challenge
      const fallbackData = (data || {}) as Record<string, unknown>;
      const composedData = {
        category: category || fallbackData.category,
        periodType: periodType || fallbackData.periodType,
        year: body.year || fallbackData.year,
        periodValue: body.periodValue || fallbackData.periodValue,
        country: body.country || fallbackData.country,
        keyword: body.keyword || fallbackData.keyword,
        isExternal: body.isExternal ?? fallbackData.isExternal,
        ...fallbackData
      };

      // Info: (20260128 - Luphia) Validate required analysis parameters
      if (!composedData.category) {
        return jsonFail(
          ApiCode.VALIDATION_ERROR,
          "Missing required fields for analysis",
        );
      }

      const isNonPeriodAnalysis = [ANALYSIS_CATEGORY.AI_CONSULTING, ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS].some((category) => composedData.category === category);

      if (!isNonPeriodAnalysis && !composedData.periodType) {
        return jsonFail(
          ApiCode.VALIDATION_ERROR,
          "Missing required fields for analysis (periodType)",
        );
      }

      const generateAnalysisParams: IGenerateAnalysisParams = {
        items,
        data: composedData,
        type,
      };
      const result = await generateAnalysisOrder(user.id, generateAnalysisParams);

      return jsonOk(result);
    }

    return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid order type");
  } catch (error) {
    console.error("[API] /user/order POST error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const orders = await getOrdersByUserId(user.id, type);

    return jsonOk({ orders });
  } catch (error) {
    console.error("[API] /user/order GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Failed to fetch orders");
  }
}
