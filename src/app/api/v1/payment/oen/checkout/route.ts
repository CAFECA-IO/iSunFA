import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IOenCheckoutRequest, IOenOrderData } from "@/interfaces/payment";
import { Prisma } from "@/generated/client";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { prisma } from "@/lib/prisma";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;
const OEN_TRANSACTION_TOKEN = process.env.OEN_TRANSACTION_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Info: (20260302 - Tzuhan) [流程 3-1: 接收結帳請求] 驗證使用者授權 DeWT token
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    // Info: (20260302 - Tzuhan) [流程 3-2: 取得訂單參數] 解析前端傳來的購買金額、點數、以及是否使用已綁定信用卡的選項
    const { amount, credits, paymentMethodId } = (await request.json()) as IOenCheckoutRequest;
    console.log(
      `[OEN Checkout] Request received: amount=${amount}, credits=${credits}, paymentMethodId=${paymentMethodId}, userId=${user.id}`,
    );

    if (!amount || amount <= 0 || !credits || credits <= 0) {
      console.error("[OEN Checkout] Invalid amount or credits");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid amount or credits");
    }

    // Info: (20260302 - Tzuhan) [流程 3-3: 檢查綁卡紀錄] 查詢資料庫中該使用者是否已有 OEN 綁定的 token
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { paymentMethods: true },
    });

    if (!dbUser) {
      console.error(`[OEN Checkout] User not found in DB: ${user.id}`);
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const oenPaymentMethod = dbUser.paymentMethods.find((pm) => pm.id === paymentMethodId && pm.provider === "OEN");
    const providerToken = oenPaymentMethod?.token;

    console.log(
      `[OEN Checkout] User ${JSON.stringify(dbUser)} fetched from DB: hasTokens=${!!providerToken}`,
    );

    if (paymentMethodId && providerToken && oenPaymentMethod) {
      // Info: (20260302 - Tzuhan) [流程 3-4a: 使用儲存的卡片直接扣款] 前端選擇使用舊卡，且後端確實有存 token
      console.log(`[OEN Checkout] Flow: Directly charge using saved token`);

      // Info: (20260302 - Tzuhan) [流程 3-5a: 建立 OEN_PAYMENT 訂單] 狀態預設為 PENDING
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          type: "OEN_PAYMENT",
          amount: amount,
          challenge: "N/A",
          data: {
            credits,
            amount,
          },
        },
      });
      console.log(`[OEN Checkout] Created pending payment order: ${order.id}`);

      // Info: (20260302 - Tzuhan) 建立 Transaction 紀錄，與訂單及信用卡綁定
      const paymentTransaction = await prisma.paymentTransaction.create({
        data: {
          userId: user.id,
          paymentMethodId: oenPaymentMethod.id,
          orderId: order.id,
          provider: "OEN",
          amount: amount,
          status: "PENDING",
        }
      });
      console.log(`[OEN Checkout] Created payment transaction: ${paymentTransaction.id}`);

      console.log(
        `[OEN Checkout] Calling OEN /token/transactions API: amount=${amount}, email=${dbUser.id}@isunfa.tw`,
      );

      // Info: (20260302 - Tzuhan) [流程 3-6a: 呼叫應援科技扣款 API] 使用 providerToken 和金額向 OEN Server 發起扣款授權請求
      const oenRes = await fetch(
        "https://payment-api.testing.oen.tw/token/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OEN_TRANSACTION_TOKEN}`,
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
        },
      );

      const oenData = await oenRes.json();
      console.log(
        `[OEN Checkout] OEN /token/transactions response: status=${oenRes.status}`,
        JSON.stringify(oenData),
      );

      if (oenData.code === "S0000" || oenRes.ok) {
        // Info: (20260302 - Tzuhan) [流程 3-7a: 扣款成功後鑄造代幣] OEN 端回應授權成功，直接呼叫合約將代幣 mint 給使用者錢包

        // Info: (20260302 - Tzuhan) 將實體交易紀錄標示為成功
        await prisma.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: "SUCCESS",
            rawData: oenData
          }
        });

        console.log(
          `[OEN Checkout] Charge successful, proceeding to mint ${credits} credits to ${user.address}...`,
        );

        const memo = JSON.stringify({
          provider: "OEN",
          orderId: order.id,
          amount,
        });
        const mintResult = await mintToAddress(
          CONTRACT_ADDRESSES.NTD_TOKEN,
          user.address,
          credits,
          memo,
        );
        console.log(
          `[OEN Checkout] Mint result: success=${mintResult.success}, message=${mintResult.message}`,
        );

        if (!mintResult.success) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "MINT_FAILED",
              data: {
                ...(order.data as object),
                oenResponse: oenData,
                error: mintResult.message,
              },
            },
          });
          return jsonFail(
            ApiCode.INTERNAL_SERVER_ERROR,
            "Payment succeeded but minting failed: " + mintResult.message,
          );
        }

        const txHash = (mintResult.data as { tx: string })?.tx;

        // Info: (20260302 - Tzuhan) [流程 3-9a: 更新訂單為成功] 紀錄鏈上交易 hash，向前端回傳不需要重新綁卡以及 txHash (對應流程 2-3b)
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            transactionHash: txHash,
            data: { ...(order.data as IOenOrderData), checkoutResponse: oenData } as Prisma.InputJsonObject,
          },
        });
        console.log(
          `[OEN Checkout] Order ${order.id} COMPLETED with txHash: ${txHash}`,
        );

        return jsonOk({
          requireBinding: false,
          success: true,
          txHash: txHash,
        });
      } else {
        // Info: (20260302 - Tzuhan) [流程 3-10a: OEN 扣款失敗] 記錄錯誤並拋錯給前端
        console.error(`[OEN Checkout] Charge failed via OEN`);

        // Info: (20260302 - Tzuhan) 將實體交易紀錄標示為失敗
        await prisma.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: "FAILED",
            rawData: oenData,
            errorMessage: "Payment failed via OEN"
          }
        });
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "FAILED",
            data: { ...(order.data as IOenOrderData), checkoutResponse: oenData } as Prisma.InputJsonObject,
          },
        });
        return jsonFail(
          ApiCode.INTERNAL_SERVER_ERROR,
          "Payment failed via OEN",
          oenData,
        );
      }
    } else {
      // Info: (20260302 - Tzuhan) [流程 3-4b: 導向綁卡與付款頁面] 前端要求不使用舊卡，或資料庫無綁定紀錄
      console.log(`[OEN Checkout] Flow: No token or wants to bind a new card`);

      // Info: (20260302 - Tzuhan) [流程 3-5b: 建立 OEN_BINDING 訂單] 此訂單主要用於「綁卡+授權」，後續的回呼才是正式扣款
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          type: "OEN_BINDING",
          amount: amount,
          challenge: "N/A",
          data: {
            credits,
            amount,
          },
        },
      });

      const originBase = request.nextUrl.origin;
      const webhookBase = process.env.NEXT_PUBLIC_APP_URL || originBase;

      console.log(`[OEN Checkout] webhookBase: ${webhookBase}`);

      // Info: (20260302 - Tzuhan) [流程 3-6b: 呼叫應援科技 checkout-token API] 取得一個供使用者填寫信用卡的對外付款頁面 ID
      //  Info: (20260302 - Tzuhan) 傳入的 successUrl 附帶了 payment_success=true (對應流程 5-1)，callbackUrl 則是供 OEN 背景 webhook 使用的結帳結果通知端點
      const oenRes = await fetch(
        "https://payment-api.testing.oen.tw/checkout-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OEN_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            merchantId: "mermer",
            successUrl: `${originBase}/pricing?tab=credits&payment_success=true&order_id=${order.id}&amount=${amount}&credits=${credits}`,
            failureUrl: `${originBase}/pricing?tab=credits&payment_failure=true&order_id=${order.id}`,
            customId: order.id,
            callbackUrl: `${webhookBase}/api/payment/callback/oen`,
          }),
        },
      );

      const oenData = await oenRes.json();
      console.log(
        `[OEN Checkout] OEN /checkout-token response: status=${oenRes.status}`,
        JSON.stringify(oenData),
      );

      if (oenData.code === "S0000" && oenData.data?.id) {
        // Info: (20260302 - Tzuhan) [流程 3-7b: 回傳重新導向的 URL] OEN 會給一個付款頁面 id，將其組裝為跳轉網址回傳給前端 (對應流程 2-3a)
        const paymentId = oenData.data.id;
        console.log(
          `[OEN Checkout] Received checkout-token paymentId: ${paymentId}`,
        );

        await prisma.order.update({
          where: { id: order.id },
          data: { data: { ...(order.data as IOenOrderData), paymentId: paymentId } as Prisma.InputJsonObject },
        });

        return jsonOk({
          requireBinding: true,
          paymentId: paymentId,
          redirectUrl: `https://mermer.testing.oen.tw/checkout/subscription/create/${paymentId}`,
        });
      } else {
        console.error(`[OEN Checkout] Failed to get OEN checkout token`);
        return jsonFail(
          ApiCode.INTERNAL_SERVER_ERROR,
          "Failed to get OEN checkout token",
          oenData,
        );
      }
    }
  } catch (error) {
    console.error("[API] /payment/oen/checkout error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
