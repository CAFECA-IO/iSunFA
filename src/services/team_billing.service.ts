import { logger } from "@/lib/utils/logger";
import { isProduction } from "@/lib/utils/common";
import { buildOenTransactionPayload } from "@/lib/utils/payment_helpers";
import { paymentRepo } from "@/repositories/payment.repo";
import { IOenOrderData } from "@/interfaces/payment";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";

/**
 * Info: (20260814 - Luphia) 以團隊記錄在案的綁定卡發起扣款（merchant-initiated，無 FIDO 簽章）。
 *
 * 續訂與期中加席次都需要「不打擾用戶、直接向已授權的卡請款」這件事。
 * 原本只有續訂 cron 有這段流程；席次補收再抄一份，兩邊就會各自長出不同的
 * 錯誤處理與稽核標記——而這是動用戶信用卡的程式碼，最不該有兩個版本。
 */

const OEN_BASE_URL = isProduction()
  ? "https://payment-api.oen.tw"
  : "https://payment-api.testing.oen.tw";

export interface ISavedCardChargeParams {
  userId: string;
  userName: string | null;
  orderId: string;
  // Info: (20260814 - Luphia) 實收金額（TWD 整數）
  amount: number;
  credits: number;
  orderData: IOenOrderData;
  paymentMethod: {
    id: string;
    token: string;
    data: unknown;
  };
  /**
   * Info: (20260814 - Luphia) 稽核用的授權來源標記（如自動續訂、席次補收）。
   * 這類扣款沒有當下的用戶動作可佐證，標記就是唯一的出處說明。
   */
  authMarker: string;
}

export interface ISavedCardChargeResult {
  ok: boolean;
  reason?: string;
}

export async function chargeOrderWithSavedCard(
  params: ISavedCardChargeParams,
): Promise<ISavedCardChargeResult> {
  const {
    userId,
    userName,
    orderId,
    amount,
    credits,
    orderData,
    paymentMethod,
    authMarker,
  } = params;

  const paymentTransaction =
    await paymentRepo.createPaymentTransactionAndUpdateOrder(
      userId,
      paymentMethod.id,
      orderId,
      BigInt(amount),
      orderData,
      authMarker,
    );

  const pmData = paymentMethod.data as Record<string, string> | undefined;

  /**
   * Info: (20260809 - Luphia) 金流憑證以資料庫設定為準，env 為 fallback；
   * 每次扣款重新解析，輪替後立即生效。商店代號與綁卡路徑取同一個設定值。
   */
  const [oenAccessToken, oenMerchantId] = await Promise.all([
    systemSettingService.get(SystemSettingKey.OEN_ACCESS_TOKEN),
    systemSettingService.get(SystemSettingKey.OEN_MERCHANT_ID),
  ]);

  const oenRes = await fetch(`${OEN_BASE_URL}/token/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${oenAccessToken}`,
    },
    body: JSON.stringify(
      buildOenTransactionPayload(
        { id: userId, name: userName ?? null },
        pmData,
        orderId,
        amount,
        orderData,
        paymentMethod.token,
        oenMerchantId ?? "",
      ),
    ),
  });
  const oenData = await oenRes.json();

  if (oenData.code !== "S0000" && !oenRes.ok) {
    await paymentRepo.failPaymentTransactionAndOrder(
      paymentTransaction.id,
      orderId,
      orderData,
      oenData,
      authMarker,
    );
    logger.error("saved card charge failed", {
      orderId,
      oenCode: oenData.code,
    });
    return { ok: false, reason: String(oenData.code ?? "unknown") };
  }

  await paymentRepo.completePaymentTransactionAndOrder(
    paymentTransaction.id,
    orderId,
    userId,
    userName || "Unknown",
    BigInt(amount),
    credits,
    orderData,
    oenData,
    authMarker,
  );

  return { ok: true };
}
