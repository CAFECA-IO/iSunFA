import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { paymentRepo } from "@/repositories/payment.repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payment_method_id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { payment_method_id: paymentMethodId } = await params;

    // Info: (20260409 - Luphia) Securely fetch transactions with matching userId
    const transactions = await paymentRepo.getPaymentTransactionsByPaymentMethodId(
      paymentMethodId,
      user.id
    );

    // Info: (20260410 - Luphia) Map transaction outputs to extract order items for receipt matching
    const mappedTransactions = transactions.map((t) => {
      const orderData = (t.order?.data as Record<string, unknown>) || {};
      
      let itemsFallback: { name: string; quantity: number | string; unitPrice: number | string; amount: number | string; remark: string }[] = [];
      if (orderData.planId) {
        itemsFallback = [{
          name: (orderData.title as string) || '會員訂閱',
          quantity: 1,
          unitPrice: t.amount,
          amount: t.amount,
          remark: orderData.billingInterval === 'year' ? '購買會員資格 (年繳)' : '購買會員資格'
        }];
      } else {
        let base = Number(orderData.baseCredits || orderData.credits || t.amount);
        let bonus = Number(orderData.bonusCredits || 0);

        if (!orderData.bonusCredits && orderData.credits && Number(orderData.credits) > Number(t.amount)) {
          base = Number(t.amount);
          bonus = Number(orderData.credits) - Number(t.amount);
        }

        itemsFallback.push({
          name: `iSunFA ${base} 點`,
          quantity: 1,
          unitPrice: t.amount,
          amount: t.amount,
          remark: `購買 ${base} 點`
        });

        if (bonus > 0) {
          itemsFallback.push({
            name: `iSunFA ${bonus} 點（贈品）`,
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            remark: `贈送 ${bonus} 點`
          });
        }
      }

      const items = orderData.items || itemsFallback;
      
      return {
        ...t,
        items
      };
    });

    return jsonOk({ transactions: mappedTransactions });
  } catch (error) {
    console.error("[API] /user/payment_method/[id]/transactions GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
