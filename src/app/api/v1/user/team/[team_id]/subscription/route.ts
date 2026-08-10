import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { teamSubscriptionUpdateSchema } from "@/validators";
import {
  changeTeamSubscription,
  getTeamSubscriptionView,
} from "@/services/team_subscription.service";

function toFailResponse(error: unknown) {
  if (error instanceof ApiError) {
    return jsonFail({
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }
  return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
}

/**
 * Info: (20260807 - Luphia) GET /api/v1/user/team/[team_id]/subscription（設計書 §7）：
 * 方案、計費週期、雙視窗剩餘額度與 resetAt、費思費率（§5.3 定價揭露，與 env 同源）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const view = await getTeamSubscriptionView({
      userId: user.id,
      teamId,
      nowSec: Math.floor(Date.now() / 1000),
    });
    return jsonOk(view);
  } catch (error) {
    return toFailResponse(error);
  }
}

/**
 * Info: (20260807 - Luphia) PUT /api/v1/user/team/[team_id]/subscription（OWNER 專屬）：
 * free 免付款直接降級；付費方案建立 BILLING_SUBSCRIBE 訂單走既有付款流程。
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const parsed = teamSubscriptionUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const result = await changeTeamSubscription({
      userId: user.id,
      teamId,
      planId: parsed.data.planId,
      billingInterval: parsed.data.billingInterval,
      paymentMethodId: parsed.data.paymentMethodId,
      nowMs: Date.now(),
    });
    return jsonOk(result);
  } catch (error) {
    return toFailResponse(error);
  }
}
