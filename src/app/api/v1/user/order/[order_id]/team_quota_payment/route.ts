import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail, jsonFailWithPayload } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ORDER_TYPE } from "@/constants/status";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { teamQuotaPaymentSchema } from "@/validators";
import {
  failOrder,
  getPendingOrder,
  markOrderCompleted,
  markOrderPaying,
} from "@/services/order.service";
import { resolveOrderSpendCost } from "@/lib/order/order_cost";
import { fulfillPaidAnalysisOrder } from "@/services/analysis_fulfillment.service";
import {
  QuotaExceededError,
  refundCredits,
  resolvePayingTeamId,
  spendCredits,
} from "@/services/spend.service";

/**
 * Info: (20260807 - Luphia) 團隊額度付款（設計書 §5 / P3）：
 * 分析訂單在訂閱額度或分配點數內扣抵，**免 WebAuthn 簽章、免鏈上交易**；
 * 額度用罄回 402（payload 附雙視窗 resetAt 與三條出路），前端 fallback 到
 * 既有 blockchain_payment 個人錢包簽章流程。冪等鍵 analysis:{orderId}。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { order_id: orderId } = await params;
    const parsed = teamQuotaPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    /**
     * Info: (20260813 - Luphia) 付款團隊（設計書 §5.6）：只屬一個團隊時 server 自動解析，
     * 屬多個團隊而未指定則回 TW_TEAM_AMBIGUOUS，由前端出選單。
     */
    const teamId = await resolvePayingTeamId(user.id, parsed.data.teamId);

    const order = await getPendingOrder(orderId, user.id);
    if (order.type !== ORDER_TYPE.ANALYSIS) {
      return jsonFail(API_ERRORS.VA_INVALID_ORDER_TYPE);
    }

    /**
     * Info: (20260813 - Luphia) 物流碳足跡以專屬 featureCode 記帳（設計書 §5.4）：
     * 它的扣款順序與其他功能相反（優先扣分配點數），而順序是由 featureCode 決定的，
     * 全部記成 AI_ANALYSIS 就分不出來、也對不了帳。category 可能巢狀於 data.data。
     */
    const orderData = order.data as {
      category?: string;
      data?: { category?: string };
    } | null;
    const category = orderData?.category ?? orderData?.data?.category;
    const featureCode =
      category === ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT
        ? BILLABLE_FEATURE_CODE.LOGISTICS_CARBON
        : BILLABLE_FEATURE_CODE.AI_ANALYSIS;

    // Info: (20260807 - Luphia) 1. 扣抵（訂閱額度 / 分配點數，順序依 featureCode）；金額 = 訂單點數成本
    const idempotencyKey = `analysis:${orderId}`;
    let spend;
    try {
      spend = await spendCredits({
        teamId,
        userId: user.id,
        featureCode,
        cost: resolveOrderSpendCost(BigInt(order.amount)),
        idempotencyKey,
        nowSec: Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      /**
       * Info: (20260813 - Luphia) 扣抵失敗即把訂單標記失敗，不讓它停在 PENDING。
       * 前端每次重試都會建一張新訂單，殘留的待付訂單會越積越多
       * （實測一次失敗的操作留下 4 張）；付不成的單就該收掉。
       */
      await failOrder(orderId, "team_quota_payment_failed").catch(
        (failError: unknown) => {
          console.error("[API] failed to close unpaid order", failError);
        },
      );
      if (error instanceof QuotaExceededError) {
        return jsonFailWithPayload(API_ERRORS.TW_QUOTA_EXCEEDED, error.data);
      }
      throw error;
    }

    // Info: (20260807 - Luphia) 2. 標記付款來源（無鏈上 tx，signature 記載扣抵來源供稽核）
    await markOrderPaying(
      orderId,
      JSON.stringify({ verifiedVia: "team_quota", source: spend.source }),
    );

    // Info: (20260807 - Luphia) 3. 履行（與 blockchain_payment 共用）；失敗即退還扣抵
    let resData: { reportId?: string };
    try {
      resData = await fulfillPaidAnalysisOrder(user.id, orderId, order.data);
    } catch (fulfillError) {
      await refundCredits({ idempotencyKey, operatorUserId: user.id });
      throw fulfillError;
    }

    await markOrderCompleted(orderId);

    return jsonOk({
      orderId,
      reportId: resData.reportId,
      billing: {
        source: spend.source,
        charged: spend.amount,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error("[API] POST team_quota_payment Error:", error);
    // Info: (20260808 - Luphia) 一律走 jsonFail：AppError 帶回其源自 API_ERRORS 的錯誤定義
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
