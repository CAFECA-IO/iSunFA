import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IOenOrderData } from "@/interfaces/payment";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { buildOenTransactionPayload } from "@/lib/utils/payment_helpers";
import { issuePurchasedPointsToMember } from "@/services/member.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { fulfillTeamPointPurchase } from "@/services/team_wallet.service";
import { fulfillTeamSubscriptionOrder } from "@/services/team_subscription.service";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { isProduction } from "@/lib/utils/common";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";

const OEN_BASE_URL = isProduction()
  ? "https://payment-api.oen.tw"
  : "https://payment-api.testing.oen.tw";

/**
 * Info: (20260815 - Luphia) 可由用戶在此端點互動付款的訂單型別（第二輪 C-10）。
 *
 * 新增型別時必須明確歸類：能讓用戶自己付款的列進來，
 * 伺服器自行發起的（席次補收、自動續訂）不要——它們沒有付款步驟，
 * 落到這裡只會走到結尾的個人鑄點 fallback。
 */
const CHECKOUT_PAYABLE_ORDER_TYPES: ReadonlySet<string> = new Set([
  ORDER_TYPE.OEN_PAYMENT,
  ORDER_TYPE.BILLING_POINT,
  ORDER_TYPE.BILLING_TEAM_POINT,
  ORDER_TYPE.BILLING_SUBSCRIBE,
  ORDER_TYPE.BILLING_ON_PREMISE,
  ORDER_TYPE.BILLING_SOLUTION,
  ORDER_TYPE.ANALYSIS,
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ payment_method_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const paymentMethodId = (await params).payment_method_id;
    if (!paymentMethodId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    // Info: (20260305 - Tzuhan) Expect authentication (FIDO payload) from client
    const { authentication, orderId } = await request.json();

    if (!orderId || !authentication) {
      return jsonFail(API_ERRORS.VA_MISSING_ORDERID_OR_FIDO_AUT);
    }

    const dbUser = await webAuthnRepo.getUserWithPaymentMethods(user.id);

    if (!dbUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const oenPaymentMethod = dbUser.paymentMethods.find(
      (pm) => pm.id === paymentMethodId && pm.provider === "OEN",
    );
    const providerToken = oenPaymentMethod?.token;

    if (!providerToken) {
      return jsonFail(API_ERRORS.NO_PAYMENT_METHOD_NOT_FOUND_OR);
    }

    const order = await paymentRepo.getOrderById(orderId);

    if (
      !order ||
      order.userId !== user.id ||
      order.status !== ORDER_STATUS.PENDING
    ) {
      return jsonFail(API_ERRORS.VA_INVALID_OR_EXPIRED_ORDER);
    }

    /**
     * Info: (20260815 - Luphia) 只有「本來就由用戶互動付款」的訂單能走這條路
     * （PR #6652 第二輪 C-10）。
     *
     * 改用白名單而非逐一排除：這支端點的結尾是「鑄造個人點數」的 fallback，
     * 任何沒被前面分流攔下的型別都會落到那裡——席次補收失敗留下的 PENDING 訂單
     * 就是這樣被使用者拿 orderId 打進來，再刷一次卡、鑄 0 點、席次也不會增加。
     *
     * 名單之外的型別多半是伺服器自行發起的扣款（席次補收、續訂），
     * 它們沒有「讓用戶付款」這個步驟，出現在這裡就是異常。
     */
    if (!CHECKOUT_PAYABLE_ORDER_TYPES.has(order.type)) {
      console.error("[checkout] order type is not payable here", {
        orderId: order.id,
        type: order.type,
      });
      return jsonFail(API_ERRORS.VA_INVALID_OR_EXPIRED_ORDER);
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
      return jsonFail(API_ERRORS.UN_ERROR);
    }

    // Info: (20260305 - Tzuhan) Create an initial transaction record, marking it PENDING, and save FIDO payload
    const paymentTransaction =
      await paymentRepo.createPaymentTransactionAndUpdateOrder(
        user.id,
        oenPaymentMethod.id,
        order.id,
        BigInt(amount),
        order.data as object,
        authentication,
      );

    const pmData = oenPaymentMethod.data as Record<string, string> | undefined;

    // Info: (20260809 - Luphia) 金流憑證以資料庫設定為準，env 為 fallback
    const oenAccessToken = await systemSettingService.get(
      SystemSettingKey.OEN_ACCESS_TOKEN,
    );
    // Info: (20260811 - Luphia) 與綁卡路徑取同一個設定值，避免兩邊商店代號不一致
    const oenMerchantId = await systemSettingService.get(
      SystemSettingKey.OEN_MERCHANT_ID,
    );

    // Info: (20260305 - Tzuhan) 準備打給應援科技的扣款請求
    const fetchUrl = `${OEN_BASE_URL}/token/transactions`;
    const fetchQuery = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oenAccessToken}`,
      },
      body: JSON.stringify(
        buildOenTransactionPayload(
          dbUser,
          pmData,
          order.id,
          amount,
          order.data as Record<string, unknown>,
          providerToken,
          oenMerchantId ?? "",
        ),
      ),
    };
    const oenRes = await fetch(fetchUrl, fetchQuery);

    const oenData = await oenRes.json();

    // Info: (20260306 - Tzuhan) 扣款失敗
    /**
     * Info: (20260814 - Luphia) 成功＝HTTP ok **且** 業務碼 S0000（PR #6652 第二輪 A-2）。
     * 原本的 `&&` 要求兩個失敗訊號同時出現，於是「HTTP 200 + 業務失敗碼」（卡片被拒的
     * 常見回覆形態）會被當成付款成功——開收據、鑄點、訂單完成，而錢沒收到。
     */
    if (!oenRes.ok || oenData.code !== "S0000") {
      await paymentRepo.failPaymentTransactionAndOrder(
        paymentTransaction.id,
        order.id,
        order.data as IOenOrderData,
        oenData,
        authentication,
      );
      return jsonFail(
        {
          code: "IN000099",
          message: "Payment failed via OEN",
          status: ApiCode.INTERNAL_SERVER_ERROR,
        },
        oenData,
      );
    }

    // Info: (20260306 - Tzuhan) 扣款成功，開始鑄造代幣
    await paymentRepo.completePaymentTransactionAndOrder(
      paymentTransaction.id,
      order.id,
      user.id,
      dbUser?.name || "Unknown",
      BigInt(amount),
      credits,
      order.data as IOenOrderData,
      oenData,
      authentication,
    );

    // Info: (20260807 - Luphia) 團隊購點分流（設計書 §6.1）：離鏈入池 + COMPLETED，不 mint 鏈上點數
    if (order.type === ORDER_TYPE.BILLING_TEAM_POINT) {
      try {
        await fulfillTeamPointPurchase(order);
        return jsonOk({ requireBinding: false, success: true });
      } catch (fulfillError) {
        /**
         * Info: (20260814 - Luphia) 已扣款但入池失敗（如錢包凍結）：訂單推進到
         * MINT_FAILED 並寫入原因。原本停在 PAID 且不記原因——PAID 是正常流程的
         * 中繼狀態，混在裡面就等於沒有人會發現這筆卡住了。
         */
        console.error("Team point fulfillment failed:", fulfillError);
        await paymentRepo.updateOrderMintFailed(
          order.id,
          (order.data as IOenOrderData) ?? {},
          oenData,
          `team point fulfillment failed: ${fulfillError instanceof Error ? fulfillError.message : String(fulfillError)}`,
        );
        return jsonFail(API_ERRORS.TW_WALLET_FROZEN);
      }
    }

    // Info: (20260807 - Luphia) 團隊訂閱分流（設計書 §7）：套用方案 + COMPLETED，不 mint 鏈上點數
    if (order.type === ORDER_TYPE.BILLING_SUBSCRIBE) {
      /**
       * Info: (20260814 - Luphia) 訂閱訂單缺 teamId 時，原本會**落到下方鑄造個人點數**——
       * 用戶付了訂閱費，拿到的是等值的個人點數，方案一秒都沒生效，而流程回報成功。
       * 這種訂單不該存在（建單端一律帶齊），出現時必須當場失敗並留痕。
       */
      if (!(order.data as { teamId?: string })?.teamId) {
        await paymentRepo.updateOrderMintFailed(
          order.id,
          (order.data as IOenOrderData) ?? {},
          oenData,
          "subscription order missing teamId",
        );
        return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
      }
      try {
        await fulfillTeamSubscriptionOrder(order, Date.now());
        return jsonOk({ requireBinding: false, success: true });
      } catch (fulfillError) {
        console.error("Team subscription fulfillment failed:", fulfillError);
        await paymentRepo.updateOrderMintFailed(
          order.id,
          (order.data as IOenOrderData) ?? {},
          oenData,
          `subscription fulfillment failed: ${fulfillError instanceof Error ? fulfillError.message : String(fulfillError)}`,
        );
        return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
      }
    }

    // Info: (20260306 - Tzuhan) 呼叫鑄造代幣合約
    const mintResult = await issuePurchasedPointsToMember(
      user.address,
      credits,
    );

    // Info: (20260306 - Tzuhan) 鑄造代幣失敗
    if (!mintResult.success) {
      await paymentRepo.updateOrderMintFailed(
        order.id,
        order.data as object,
        oenData,
        mintResult.message,
      );
      return jsonFail({
        code: "IS000099",
        message: String(
          "Payment succeeded but minting failed: " + mintResult.message,
        ).slice(0, 30),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    // Info: (20260306 - Tzuhan) 全部成功
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
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
