import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnService } from "@/services/webauthn.service";
import {
  generatePaymentOrder,
  generateAnalysisOrder,
  getOrdersByUserId,
} from "@/services/order.service";
import { ORDER_TYPE } from "@/constants/status";
import { IGenerateAnalysisParams } from "@/services/analysis.service";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { generatePaymentOrderSchema } from "@/validators";
import { CurrencyUnit } from "@/constants/price";

export async function POST(request: NextRequest) {
  try {
    // Info: (20260128 - Luphia) Verify user identity from DeWT token
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const { type, category, periodType, items, data } = body;

    // Info: (20260130 - Tzuhan) Ensure user exists in DB before creating order to avoid FK errors
    await webAuthnService.ensureUserSynced(user.address);

    if (
      type === ORDER_TYPE.OEN_PAYMENT ||
      type === ORDER_TYPE.BILLING_ON_PREMISE ||
      type === ORDER_TYPE.BILLING_SOLUTION
    ) {
      const parsed = generatePaymentOrderSchema.safeParse(body);
      if (!parsed.success) {
        return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
      }

      const {
        type: parsedType,
        amount: parsedAmount,
        unit: parsedUnit,
        credits: parsedCredits,
        paymentMethodId: parsedPaymentMethodId,
        title: parsedTitle,
        planId: parsedPlanId,
        billingInterval: parsedBillingInterval,
        baseCredits: parsedBaseCredits,
        bonusCredits: parsedBonusCredits,
        items: parsedItems,
        data: parsedData,
      } = parsed.data;

      const result = await generatePaymentOrder(user.id, {
        type: parsedType,
        amount: parsedAmount,
        unit: (parsedUnit || "TWD") as CurrencyUnit,
        credits: parsedCredits,
        paymentMethodId: parsedPaymentMethodId,
        title: parsedTitle,
        planId: parsedPlanId,
        billingInterval: parsedBillingInterval,
        baseCredits: String(parsedBaseCredits),
        bonusCredits: String(parsedBonusCredits),
        items: parsedItems,
        data: parsedData,
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
        ...fallbackData,
      };

      // Info: (20260128 - Luphia) Validate required analysis parameters
      if (!composedData.category) {
        return jsonFail(API_ERRORS.VA_MISSING_REQUIRED_FIELDS_FOR);
      }

      const isNonPeriodAnalysis = [
        ANALYSIS_CATEGORY.AI_CONSULTING,
        ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS,
        ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT,
      ].some((category) => composedData.category === category);

      if (!isNonPeriodAnalysis && !composedData.periodType) {
        return jsonFail(API_ERRORS.VA_MISSING_REQUIRED_FIELDS_FOR);
      }

      const generateAnalysisParams: IGenerateAnalysisParams = {
        items,
        data: composedData,
        type,
      };
      const result = await generateAnalysisOrder(
        user.id,
        generateAnalysisParams,
      );

      return jsonOk(result);
    }

    return jsonFail(API_ERRORS.VA_INVALID_ORDER_TYPE);
  } catch (error) {
    console.error("[API] /user/order POST error:", error);
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isBilling = searchParams.get("billing") === "true";

    const orders = await getOrdersByUserId(
      user.id,
      isBilling ? "billing" : type,
    );

    return jsonOk({ orders });
  } catch (error) {
    console.error("[API] /user/order GET error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
