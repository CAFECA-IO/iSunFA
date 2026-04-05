import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IOenOrderData } from "@/interfaces/payment";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { ORDER_STATUS } from "@/constants/status";
import { isProduction } from "@/lib/utils/common";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;
const OEN_BASE_URL = isProduction()
  ? "https://payment-api.oen.tw"
  : "https://payment-api.testing.oen.tw";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ payment_method_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const paymentMethodId = (await params).payment_method_id;
    if (!paymentMethodId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "paymentMethodId is required");
    }

    // Info: (20260305 - Tzuhan) Expect authentication (FIDO payload) from client
    const { authentication, orderId } = await request.json();

    if (!orderId || !authentication) {
      return jsonFail(
        ApiCode.VALIDATION_ERROR,
        "Missing orderId or FIDO authentication payload",
      );
    }

    const dbUser = await webAuthnRepo.getUserWithPaymentMethods(user.id);

    if (!dbUser) {
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const oenPaymentMethod = dbUser.paymentMethods.find(
      (pm) => pm.id === paymentMethodId && pm.provider === "OEN",
    );
    const providerToken = oenPaymentMethod?.token;

    if (!providerToken) {
      return jsonFail(
        ApiCode.NOT_FOUND,
        "Payment method not found or missing token",
      );
    }

    const order = await paymentRepo.getOrderById(orderId);

    if (
      !order ||
      order.userId !== user.id ||
      order.status !== ORDER_STATUS.PENDING
    ) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid or expired order");
    }

    const orderData = order.data as IOenOrderData;
    const { amount, credits } = orderData;

    // Info: (20260305 - Tzuhan) 驗證 FIDO2 簽名
    try {
      await webAuthnService.verifySignature(
        user.address,
        authentication,
        order.challenge,
      );
    } catch (error) {
      console.error("FIDO Verification failed during checkout:", error);
      return jsonFail(
        ApiCode.UNAUTHORIZED,
        "FIDO2 Signature verification failed",
      );
    }

    // Info: (20260305 - Tzuhan) Create an initial transaction record, marking it PENDING, and save FIDO payload
    const paymentTransaction =
      await paymentRepo.createPaymentTransactionAndUpdateOrder(
        user.id,
        oenPaymentMethod.id,
        order.id,
        amount,
        order.data as object,
        authentication,
      );

    // Info: (20260305 - Tzuhan) 準備打給應援科技的扣款請求
    const fetchUrl = `${OEN_BASE_URL}/token/transactions`;
    const fetchQuery = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OEN_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        merchantId: "mermer",
        amount: amount,
        currency: "TWD",
        token: providerToken,
        orderId: order.id,
        userName: dbUser.name || "Unknown",
        userEmail: `${dbUser.id}@isunfa.tw`,
        productDetails: [
          {
            productionCode: "ISUNFA-CREDITS",
            description: `iSunFA Credits - ${credits}`,
            quantity: 1,
            unit: "pcs",
            unitPrice: amount,
          },
        ],
      }),
    };
    const oenRes = await fetch(fetchUrl, fetchQuery);

    const oenData = await oenRes.json();

    // Info: (20260306 - Tzuhan) ======= 扣款失敗 =======
    if (oenData.code !== "S0000" && !oenRes.ok) {
      await paymentRepo.failPaymentTransactionAndOrder(
        paymentTransaction.id,
        order.id,
        order.data as IOenOrderData,
        oenData,
        authentication,
      );
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Payment failed via OEN",
        oenData,
      );
    }

    // Info: (20260306 - Tzuhan) ======= 扣款成功，開始鑄造代幣 =======
    await paymentRepo.completePaymentTransactionAndOrder(
      paymentTransaction.id,
      order.id,
      user.id,
      dbUser?.name || "Unknown",
      amount,
      credits,
      order.data as IOenOrderData,
      oenData,
      authentication,
    );

    // Info: (20260306 - Tzuhan) 呼叫鑄造代幣合約
    const memo = JSON.stringify({
      provider: "OEN",
      orderId: order.id,
      amount,
      credits,
      paymentMethodId,
    });
    const mintResult = await mintToAddress(
      CONTRACT_ADDRESSES.NTD_TOKEN,
      user.address,
      credits,
      memo,
    );

    // Info: (20260306 - Tzuhan) ======= 鑄造代幣失敗 =======
    if (!mintResult.success) {
      await paymentRepo.updateOrderMintFailed(
        order.id,
        order.data as object,
        oenData,
        mintResult.message,
      );
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Payment succeeded but minting failed: " + mintResult.message,
      );
    }

    // Info: (20260306 - Tzuhan) ======= 全部成功 =======
    const txHash = (mintResult.data as { tx: string })?.tx;

    if (txHash) {
      await paymentRepo.updateOrderCompleted(order.id, txHash);
    }

    return jsonOk({
      requireBinding: false,
      success: true,
      txHash: txHash,
    });
  } catch (error) {
    console.error("Internal Server Error in Checkout:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
