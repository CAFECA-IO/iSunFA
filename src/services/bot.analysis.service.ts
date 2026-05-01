import { prepareTransferUserOp } from "@/lib/utils/user_op_builder";
import {
  encodeWebAuthnSignature,
  hexToBase64Url,
} from "@/lib/auth/crypto_utils";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { registerBotService } from "@/services/bot.register.service";

export class AnalysisBotService {
  public async generateAnalysis(
    dewt: string,
    apiUrl: string,
    scwAddress: string,
    privKeyHex: string,
    credentialID: string,
    pubKeyX: string,
    pubKeyY: string,
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
          type: "ANALYSIS",
          category: "AI_CONSULTING",
          data: { question, accountBookId },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || orderData.code !== "SUCCESS") {
        throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
      }

      const { orderId } = orderData.payload;
      const cost = 10;
      console.log(`    Order Created: ${orderId}, Cost: ${cost} Credits`);

      // Info: (20260430 - Luphia) 2. Prepare Transfer UserOp
      const prepRes = await prepareTransferUserOp(scwAddress, cost, orderId);
      if (!prepRes.success || !prepRes.data) {
        throw new Error(`prepareTransferUserOp failed: ${prepRes.message}`);
      }
      const { userOp, userOpHash } = prepRes.data;

      // Info: (20260430 - Luphia) 3. Sign UserOp using Mock FIDO2
      const challengeBase64 = hexToBase64Url(userOpHash);
      const privKeyBytes = Buffer.from(privKeyHex, "hex");
      const authJson = registerBotService.createMockAuthenticationJSON(
        challengeBase64,
        credentialID,
        privKeyBytes,
      );
      const encodedSignature = encodeWebAuthnSignature(
        authJson as AuthenticationJSON,
        BigInt(pubKeyX),
        BigInt(pubKeyY),
      );

      // Info: (20260430 - Luphia) 4. Submit Payment
      console.log(
        `    Submitting payment to ${apiUrl}/api/v1/user/order/${orderId}/blockchain_payment ...`,
      );
      const paymentRes = await fetch(
        `${apiUrl}/api/v1/user/order/${orderId}/blockchain_payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dewt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userOp: { ...userOp, signature: encodedSignature },
            signature: encodedSignature,
            authentication: authJson,
          }),
        },
      );

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok || paymentData.code !== "SUCCESS") {
        throw new Error(`Payment failed: ${JSON.stringify(paymentData)}`);
      }

      console.log(
        `[Bot:Analysis] Payment Success! TxHash: ${paymentData.payload?.txHash}`,
      );
      console.log(
        `[Bot:Analysis] Report ID (Thread ID): ${paymentData.payload?.reportId}`,
      );
    } catch (error) {
      console.error(
        "[Bot:Analysis] Failed during AI consultation payment flow.",
      );
      console.error(error);
    }
  }
}

export const analysisBotService = new AnalysisBotService();
