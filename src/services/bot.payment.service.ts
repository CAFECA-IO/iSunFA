import { registerBotService } from "@/services/bot.register.service";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { ApiCode } from "@/lib/utils/status";
import type { IPayOrderWithPointsResult } from "@/services/point_payment.service";

/**
 * Info: (20261015 - Luphia) 整合測試機器人的點數付款（區塊鏈退役，取代 blockchain_payment）。
 *
 * 原本機器人自己組 CREDIT_POINT 轉帳 UserOp、模擬 FIDO2 簽 userOpHash、送 blockchain_payment；
 * 現在走與真人相同的 API：
 * 1. `GET /api/v1/auth/options?action=login&purpose=USER_ACTION`（帶 DeWT）取得綁本人的 challenge
 * 2. 以機器人的私鑰模擬 assertion 簽那枚 challenge
 * 3. `POST /api/v1/user/order/[order_id]/point_payment` 由伺服器扣 DB 點數帳本並推進訂單
 *
 * 走 HTTP 而不是直接呼叫 service：這支腳本的用途就是端到端驗證 API。
 */
export interface IBotPointPaymentParams {
  dewt: string;
  apiUrl: string;
  orderId: string;
  credentialID: string;
  privKeyHex: string;
}

export class PaymentBotService {
  public async payOrderWithPoints(
    params: IBotPointPaymentParams,
  ): Promise<IPayOrderWithPointsResult> {
    const { dewt, apiUrl, orderId, credentialID, privKeyHex } = params;

    const optionsRes = await fetch(
      `${apiUrl}/api/v1/auth/options?action=login&purpose=${ChallengePurpose.USER_ACTION}`,
      { headers: { Authorization: `Bearer ${dewt}` } },
    );
    const optionsData = await optionsRes.json();
    if (!optionsRes.ok || optionsData.code !== ApiCode.SUCCESS) {
      throw new Error(
        `Payment challenge request failed: ${JSON.stringify(optionsData)}`,
      );
    }
    const { challenge, token } = optionsData.payload as {
      challenge: string;
      token: string;
    };

    const authentication = registerBotService.createMockAuthenticationJSON(
      challenge,
      credentialID,
      Buffer.from(privKeyHex, "hex"),
    );

    console.log(
      `    Submitting payment to ${apiUrl}/api/v1/user/order/${orderId}/point_payment ...`,
    );
    const paymentRes = await fetch(
      `${apiUrl}/api/v1/user/order/${orderId}/point_payment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dewt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fido2Signature: { authentication, challengeToken: token },
        }),
      },
    );
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok || paymentData.code !== ApiCode.SUCCESS) {
      throw new Error(`Payment failed: ${JSON.stringify(paymentData)}`);
    }

    return paymentData.payload as IPayOrderWithPointsResult;
  }
}

export const paymentBotService = new PaymentBotService();
