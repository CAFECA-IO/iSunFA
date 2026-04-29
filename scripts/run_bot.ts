import "dotenv/config";
import crypto from "crypto";
import { registerBotService } from "../src/services/register.bot.service";
import { prepareTransferUserOp } from "../src/lib/utils/user_op_builder";
import { encodeWebAuthnSignature, hexToBase64Url } from "../src/lib/auth/crypto_utils";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";

async function main() {
  console.log("=== Bot Execution Started ===");

  // Info: (20260429 - Luphia) 1. Generate random seed
  const seed = crypto.randomBytes(32).toString("hex");
  const username = `Bot_${seed.substring(0, 6)}`;

  console.log(`[1] Generated random bot: ${username}`);
  console.log(`    Seed: ${seed}`);

  // Info: (20260429 - Luphia) 2. Register and Login
  console.log(`\n[2] Registering and logging in via registerBotService...`);
  const { dewt, scwAddress, privKeyHex, credentialID, pubKeyX, pubKeyY } = await registerBotService.registerAndLogin(seed, username);

  console.log(`    Bot SCW Address: ${scwAddress}`);
  console.log(`    Bot Private Key: ${privKeyHex.substring(0, 10)}...`);
  console.log(`    DeWT Token: ${dewt.substring(0, 20)}...`);

  // Info: (20260429 - Luphia) 3. Claim Check-in Reward
  console.log(`\n[3] Claiming daily check-in reward...`);
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Info: (20260429 - Luphia) 忽略自簽署憑證錯誤 (針對本地開發的 https://isunfa.localhost)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    console.log(`    Calling ${apiUrl}/api/v1/auth/checkin ...`);
    const res = await fetch(`${apiUrl}/api/v1/auth/checkin`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (res.ok && (data.code === "SUCCESS" || data.success)) {
      console.log(`    Success! Checkin Result:`, data.payload || data);
    } else {
      console.error(`    Check-in failed: ${data.message || JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("    Failed to reach check-in API. Make sure the local Next.js server is running.");
    console.error(error);
  }

  // Info: (20260429 - Luphia) 4. Ask an Accounting Question (Via Payment)
  console.log(`\n[4] Asking AI Consultant an accounting question (with payment)...`);
  try {
    const question = "請問公司新購買給業務使用的筆記型電腦，應該認列在哪個會計科目？是否可以抵扣營業稅？";
    console.log(`    Question: "${question}"`);
    console.log(`    Calling ${apiUrl}/api/v1/user/order to create analysis order...`);

    // Info: (20260429 - Luphia) 4.1 Create Order
    const orderRes = await fetch(`${apiUrl}/api/v1/user/order`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "ANALYSIS",
        category: "AI_CONSULTING",
        data: { question }
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || orderData.code !== "SUCCESS") {
      throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
    }

    const { orderId } = orderData.payload;
    const cost = 10; // Info: (20260429 - Luphia) 假設固定成本 10，或從 orderData 抓取
    console.log(`    Order Created: ${orderId}, Cost: ${cost} Credits`);

    // Info: (20260429 - Luphia) 4.2 Prepare Transfer UserOp
    const prepRes = await prepareTransferUserOp(scwAddress, cost, orderId);
    if (!prepRes.success || !prepRes.data) {
      throw new Error(`prepareTransferUserOp failed: ${prepRes.message}`);
    }
    const { userOp, userOpHash } = prepRes.data;

    // Info: (20260429 - Luphia) 4.3 Sign UserOp using Mock FIDO2
    const challengeBase64 = hexToBase64Url(userOpHash);
    const privKeyBytes = Buffer.from(privKeyHex, "hex");
    const authJson = registerBotService.createMockAuthenticationJSON(
      challengeBase64,
      credentialID,
      privKeyBytes
    );
    const encodedSignature = encodeWebAuthnSignature(
      authJson as AuthenticationJSON,
      BigInt(pubKeyX),
      BigInt(pubKeyY)
    );

    // Info: (20260429 - Luphia) 4.4 Submit Payment
    console.log(`    Submitting payment to ${apiUrl}/api/v1/user/order/${orderId}/blockchain_payment ...`);
    const paymentRes = await fetch(`${apiUrl}/api/v1/user/order/${orderId}/blockchain_payment`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userOp: { ...userOp, signature: encodedSignature },
        signature: encodedSignature,
        authentication: authJson
      }),
    });

    const paymentData = await paymentRes.json();
    if (!paymentRes.ok || paymentData.code !== "SUCCESS") {
      throw new Error(`Payment failed: ${JSON.stringify(paymentData)}`);
    }

    console.log(`    Payment Success! TxHash: ${paymentData.payload?.txHash}`);
    console.log(`    Report ID (Thread ID): ${paymentData.payload?.reportId}`);

  } catch (error) {
    console.error("    Failed during AI consultation payment flow.");
    console.error(error);
  }

  console.log("\n=== Bot Execution Finished ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
