import { paymentBotService } from "@/services/bot.payment.service";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { ORDER_TYPE } from "@/constants/status";
import { ApiCode } from "@/lib/utils/status";

export class UploadBotService {
  public async uploadVoucher(
    dewt: string,
    apiUrl: string,
    privKeyHex: string,
    credentialID: string,
  ): Promise<string> {
    console.log(`\n[Bot:Upload] Starting upload voucher flow...`);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // Info: (20260430 - Luphia) 1. Create Team
    const teamRes = await fetch(`${apiUrl}/api/v1/user/team`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Bot Team" }),
    });
    const teamData = await teamRes.json();
    if (!teamRes.ok || teamData.code !== ApiCode.SUCCESS)
      throw new Error(`Team creation failed: ${JSON.stringify(teamData)}`);
    const teamId = teamData.payload.id;
    console.log(`[Bot:Upload] Team Created: ${teamId}`);

    // Info: (20260430 - Luphia) 2. Create Account Book
    const abRes = await fetch(`${apiUrl}/api/v1/user/account_book`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Bot Account Book",
        country: "TW",
        currency: "TWD",
        rule: "IFRS",
        teamId: teamId,
        enterpriseId: "bot-enterprise",
        startYear: new Date().getFullYear(),
        esgIndustryId: 1,
      }),
    });
    const abData = await abRes.json();
    if (!abRes.ok || abData.code !== ApiCode.SUCCESS)
      throw new Error(
        `Account Book creation failed: ${JSON.stringify(abData)}`,
      );
    const accountBookId = abData.payload.id;
    console.log(`[Bot:Upload] Account Book Created: ${accountBookId}`);

    // Info: (20260430 - Luphia) 3. Upload File
    const formData = new FormData();
    const blob = new Blob(["mock voucher data - invoice #123"], {
      type: "text/plain",
    });
    formData.append("file", blob, "bot_voucher.txt");

    const fileRes = await fetch(`${apiUrl}/api/v1/file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dewt}` },
      body: formData,
    });
    const fileData = await fileRes.json();
    if (!fileRes.ok || fileData.code !== ApiCode.SUCCESS)
      throw new Error(`File upload failed: ${JSON.stringify(fileData)}`);
    console.log(`[Bot:Upload] File API Response:`, fileData);

    // Info: (20260430 - Luphia) storage node returns hash, name, size
    const filePayload = fileData.payload;

    // Info: (20260430 - Luphia) 4. Create AI Analysis Order
    const orderRes = await fetch(`${apiUrl}/api/v1/user/order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: ORDER_TYPE.ANALYSIS,
        category: ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS,
        data: { accountBookId },
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || orderData.code !== ApiCode.SUCCESS)
      throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
    const { orderId } = orderData.payload;
    const cost = 10;
    console.log(
      `[Bot:Upload] Order Created: ${orderId}, Cost: ${cost} Credits`,
    );

    // Info: (20261015 - Luphia) 5. 以個人點數付款（DB 帳本，取代鏈上轉帳）
    await paymentBotService.payOrderWithPoints({
      dewt,
      apiUrl,
      orderId,
      credentialID,
      privKeyHex,
    });
    console.log(`[Bot:Upload] Payment Success!`);

    // Info: (20260430 - Luphia) 6. Create Voucher via AI Analysis
    const voucherRes = await fetch(
      `${apiUrl}/api/v1/user/account_book/${accountBookId}/ai_analysis`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dewt}`,
          "Content-Type": "application/json",
        },
        /**
         * Info: (20261015 - Luphia) 付款確認改看訂單狀態，`authentication` 只需帶 orderId。
         * 端點讀的是 `files` 陣列（原本送單數 `file`，會被擋在 VA_FILE_IS_REQUIRED）。
         */
        body: JSON.stringify({
          files: [{ hash: filePayload.hash, file: { name: filePayload.name } }],
          authentication: { orderId },
        }),
      },
    );
    const voucherData = await voucherRes.json();
    if (!voucherRes.ok || voucherData.code !== ApiCode.SUCCESS)
      throw new Error(
        `AI Analysis creation failed: ${JSON.stringify(voucherData)}`,
      );

    console.log(
      `[Bot:Upload] AI Analysis Triggered. Voucher Created: ${voucherData.payload?.voucherId}`,
    );

    return accountBookId;
  }
}

export const uploadBotService = new UploadBotService();
