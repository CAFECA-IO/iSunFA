import { paymentBotService } from "@/services/bot.payment.service";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { ORDER_TYPE } from "@/constants/status";
import { ApiCode } from "@/lib/utils/status";

export class AnalysisBotService {
  public async generateAnalysis(
    dewt: string,
    apiUrl: string,
    privKeyHex: string,
    credentialID: string,
    accountBookId: string,
  ): Promise<void> {
    console.log(
      `\n[Bot:Analysis] Asking AI Consultant an accounting question...`,
    );
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    try {
      const question = "請問根據目前這份帳簿的狀況，是否有任何節稅的建議？";
      console.log(`    Question: "${question}"`);

      // Info: (20260430 - Luphia) 1. Create Order
      const orderRes = await fetch(`${apiUrl}/api/v1/user/order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dewt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: ORDER_TYPE.ANALYSIS,
          category: ANALYSIS_CATEGORY.AI_CONSULTING,
          data: { question, accountBookId },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || orderData.code !== ApiCode.SUCCESS) {
        throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
      }

      const { orderId } = orderData.payload;
      const cost = 10;
      console.log(`    Order Created: ${orderId}, Cost: ${cost} Credits`);

      // Info: (20261015 - Luphia) 2. 以個人點數付款（DB 帳本，取代鏈上轉帳）
      const payment = await paymentBotService.payOrderWithPoints({
        dewt,
        apiUrl,
        orderId,
        credentialID,
        privKeyHex,
      });

      console.log(`[Bot:Analysis] Payment Success!`);
      console.log(`[Bot:Analysis] Report ID (Thread ID): ${payment.reportId}`);
    } catch (error) {
      console.error(
        "[Bot:Analysis] Failed during AI consultation payment flow.",
      );
      console.error(error);
    }
  }
}

export const analysisBotService = new AnalysisBotService();
