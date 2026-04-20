import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { talkRepo } from "@/repositories/talk.repo";
import { ApiCode } from "@/lib/utils/status";
import { bundlerService } from "@/services/bundler.service";
import { analysisService } from "@/services/analysis.service";
import { webAuthnService } from "@/services/webauthn.service";
import { getPendingOrder, markOrderPaying } from "@/services/order.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { publicClient } from "@/lib/viem_public";
import { ORDER_TYPE } from "@/constants/status";
import { ANALYSIS_CATEGORY, type AnalysisCategory, type AnalysisPeriod } from "@/constants/analysis";

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
    const order = await getPendingOrder(orderId, user.id);

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

    // Info: (20260419 - Luphia) Check if pending balance is sufficient before sending
    const { formatUnits } = await import("viem");
    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CREDIT_POINT as `0x${string}`,
      abi: ABIS.CREDIT_POINT,
      functionName: "balanceOf",
      args: [user.address as `0x${string}`],
      blockTag: "pending",
    });
    const pendingCredits = Number(formatUnits(balance as bigint, 18));

    if (pendingCredits < order.amount) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Insufficient pending balance");
    }

    // Info: (20260417 - Luphia) 3. Dispatch Background Transaction without awaiting receipt
    const sendResult = await bundlerService.sendUserOpAsync(userOp, CONTRACT_ADDRESSES.ENTRY_POINT);
    const txHash = sendResult.transactionHash;

    // Info: (20260417 - Luphia) 4. Update order to mark it as verifying with txHash
    await markOrderPaying(orderId, JSON.stringify({ verifiedVia: "async_tx", txHash }), txHash);

    /**
     * Info: (20260417 - Luphia) 5. Generate Analysis with PAYING status FIRST
     * Using any logic directly from the generated order data.
     */
    const orderData = order.data as Record<string, unknown>;
    const innerData = (orderData.data || orderData) as Record<string, unknown>;
    const category = innerData.category as string;

    let analysisRes: { success: boolean; data?: Record<string, unknown> | unknown } = { success: true };
    let resData: { reportId?: string } = {};

    // Info: (20260418 - Luphia) Automatically generate mission for ALL categories including ai_consulting, but SKIP journal_upload since it generates missions per-file manually.
    if (category !== ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS) {
      const generateParams = {
        orderId: orderId,
        type: ORDER_TYPE.ANALYSIS,
        data: {
          ...innerData,
          category: category as AnalysisCategory,
          periodType: innerData.periodType as AnalysisPeriod,
          periodValue: innerData.periodValue as string,
          year: innerData.year as number,
        }
      };

      analysisRes = await analysisService.generateAnalysis(user.id, generateParams);
      resData = (analysisRes.data || {}) as { reportId?: string };
    }

    // Info: (20260418 - Luphia) 建立上傳檔案並與討論串關聯 (Restore AI Talk logic)
    if (category === ANALYSIS_CATEGORY.AI_CONSULTING && resData.reportId && orderData.data) {
      type TPayloadFile = string | { hash: string; fileName?: string };
      const payloadData = orderData.data as { files?: TPayloadFile[] };
      if (payloadData.files && payloadData.files.length > 0) {
        await talkRepo.createFiles(
          payloadData.files.map((file: TPayloadFile) => {
            const isString = typeof file === 'string';
            const fileHash = isString ? file : file.hash;
            return {
              hash: fileHash,
              fileName: isString ? `${fileHash.substring(0, 8)}.png` : (file as { fileName?: string }).fileName || `${fileHash.substring(0, 8)}.png`,
              analysisId: resData.reportId!,
            };
          })
        );
      }
    }

    // Info: (20260418 - Luphia) 6. Offload transaction verification entirely to the reliable background worker
    // Info: (20260418 - Luphia) The worker's transactionTrackerService will poll for TxHash success/reverted state seamlessly.

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
