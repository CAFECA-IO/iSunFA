import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { bundlerService } from "@/services/bundler.service";
import { analysisService } from "@/services/analysis.service";
import { webAuthnService } from "@/services/webauthn.service";
import { orderGenerator } from "@/lib/order/order.generator";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { publicClient } from "@/lib/viem_public";
import { analysisRepo } from "@/repositories/analysis.repo";
import { MISSION_STATUS } from "@/constants/status";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { order_id: orderId } = await params;
    const body = await request.json();
    const { userOp, signature, authentication } = body;

    if (!userOp || !signature || !authentication) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "userOp, signature, and authentication are required");
    }

    // Info: (20260417 - Luphia) 1. Get the pending Order
    const order = await orderGenerator.getPendingOrder(orderId, user.id);

    // Info: (20260417 - Luphia) 2. Validate FIDO2 Signature against the true userOpHash
    const authPayload = { ...authentication, signature }; // Info: (20260417 - Luphia) Mapped from client

    // Info: (20260417 - Luphia) Calculate real userOpHash from the submitted userOp matching what Bundler will do
    const { ABIS } = await import("@/config/contracts");
    const { hexToBase64Url } = await import("@/lib/auth/crypto_utils");
    const trueUserOpHash = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ENTRY_POINT,
      abi: ABIS.ENTRY_POINT,
      functionName: "getUserOpHash",
      args: [
        {
          sender: userOp.sender as `0x${string}`,
          nonce: BigInt(userOp.nonce),
          initCode: userOp.initCode as `0x${string}`,
          callData: userOp.callData as `0x${string}`,
          accountGasLimits: userOp.accountGasLimits as `0x${string}`,
          preVerificationGas: BigInt(userOp.preVerificationGas),
          gasFees: userOp.gasFees as `0x${string}`,
          paymasterAndData: userOp.paymasterAndData as `0x${string}`,
          signature: userOp.signature as `0x${string}`,
        },
      ],
    });

    await webAuthnService.verifySignature(user.address, authPayload, hexToBase64Url(trueUserOpHash as string));

    // Info: (20260417 - Luphia) 3. Dispatch Background Transaction without awaiting receipt
    const sendResult = await bundlerService.sendUserOpAsync(userOp, CONTRACT_ADDRESSES.ENTRY_POINT);
    const txHash = sendResult.transactionHash;

    // Info: (20260417 - Luphia) 4. Update order to mark it as verifying with txHash
    await orderGenerator.completeOrder(orderId, JSON.stringify({ verifiedVia: "async_tx", txHash }), txHash);

    /**
     * Info: (20260417 - Luphia) 5. Generate Analysis with PAYING status FIRST
     * Using any logic directly from the generated order data.
     */
    const orderData = order.data as Record<string, unknown>;
    const generateParams = {
      ...orderData,
      orderId: orderId,
      category: orderData.category as string,
      periodType: orderData.periodType as string,
      periodValue: orderData.periodValue as string,
      year: orderData.year as number,
      status: MISSION_STATUS.PAYING // Info: (20260417 - Luphia) Force PAYING status
    };

    const analysisRes = await analysisService.generateAnalysis(user.id, generateParams);

    // Info: (20260417 - Luphia) 6. Spawn Background task to wait for the receipt, and advance state
    type TAnalysisResData = { reportId?: string };
    const resData = (analysisRes.data || {}) as TAnalysisResData;

    if (analysisRes.success && resData.reportId) {
      // Info: (20260417 - Luphia) We don't await this so the API responds instantly
      const reportId = resData.reportId;

      publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
        .then(async (receipt) => {
          if (receipt.status !== "success") {
            // Info: (20260417 - Luphia) Payment failed on chain
            console.error(`[PaymentAsync] Tx ${txHash} reverted for order ${orderId}`);
            await orderGenerator.failOrder(orderId, "UserOp transaction reverted");
            // Info: (20260417 - Luphia) Mark mission failed
            const analysisObj = await analysisRepo.findById(reportId);
            if (analysisObj && analysisObj.missionId) {
              await analysisRepo.updateMissionUploadFailed(analysisObj.missionId, "Payment Tx Reverted on chain");
            }
          } else {
            // Info: (20260417 - Luphia) Payment Success logic
            console.log(`[PaymentAsync] Tx ${txHash} SUCCESS for order ${orderId}`);
            const analysisObj = await analysisRepo.findById(reportId);
            if (analysisObj && analysisObj.missionId) {
              await analysisRepo.updateMissionPaymentSuccess(analysisObj.missionId);
            }
          }
        }).catch(async (e) => {
          console.error(`[PaymentAsync] Polling error for tx ${txHash}:`, e);
        });
    }

    // Info: (20260417 - Luphia) 7. Return instantly
    return jsonOk({
      txHash,
      orderId: orderId,
      reportId: resData.reportId
    });

  } catch (error) {
    console.error("[API] POST blockchain_payment Error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}
