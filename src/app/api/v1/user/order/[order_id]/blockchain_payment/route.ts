import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { bundlerService } from "@/services/bundler.service";
import { webAuthnService } from "@/services/webauthn.service";
import { getPendingOrder, markOrderPaying } from "@/services/order.service";
import { fulfillPaidAnalysisOrder } from "@/services/analysis_fulfillment.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { publicClient } from "@/lib/viem_public";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { order_id: orderId } = await params;
    const body = await request.json();
    const { userOp, signature, authentication } = body;

    if (!userOp || !signature || !authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260417 - Luphia) 1. Get the pending Order
    const order = await getPendingOrder(orderId, user.id);

    // Info: (20260417 - Luphia) 2. Validate FIDO2 Signature against the true userOpHash
    const authPayload = { ...authentication, signature }; // Info: (20260417 - Luphia) Mapped from client

    // Info: (20260417 - Luphia) Calculate real userOpHash from the submitted userOp matching what Bundler will do
    const { ABIS } = await import("@/config/contracts");
    const { hexToBase64Url } = await import("@/lib/auth/crypto_utils");
    const { encodeAbiParameters, parseAbiParameters, keccak256 } =
      await import("viem");
    const { isuncoin } = await import("@/lib/viem_public");

    const packed = encodeAbiParameters(
      parseAbiParameters(
        "address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32",
      ),
      [
        userOp.sender as `0x${string}`,
        BigInt(userOp.nonce),
        keccak256(userOp.initCode as `0x${string}`),
        keccak256(userOp.callData as `0x${string}`),
        BigInt(userOp.callGasLimit),
        BigInt(userOp.verificationGasLimit),
        BigInt(userOp.preVerificationGas),
        BigInt(userOp.maxFeePerGas),
        BigInt(userOp.maxPriorityFeePerGas),
        keccak256(userOp.paymasterAndData as `0x${string}`),
      ],
    );

    const hash = keccak256(packed);
    const trueUserOpHash = keccak256(
      encodeAbiParameters(parseAbiParameters("bytes32, address, uint256"), [
        hash,
        CONTRACT_ADDRESSES.ENTRY_POINT,
        BigInt(isuncoin.id),
      ]),
    );

    await webAuthnService.verifySignature(
      user.address,
      authPayload,
      hexToBase64Url(trueUserOpHash as string),
    );

    // Info: (20260419 - Luphia) Check if pending balance is sufficient before sending
    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CREDIT_POINT as `0x${string}`,
      abi: ABIS.CREDIT_POINT,
      functionName: "balanceOf",
      args: [user.address as `0x${string}`],
      blockTag: "pending",
    });

    if ((balance as bigint) < BigInt(order.amount)) {
      return jsonFail(API_ERRORS.VL_INSUFFICIENT_PENDING);
    }

    // Info: (20260417 - Luphia) 3. Dispatch Background Transaction without awaiting receipt
    const sendResult = await bundlerService.sendUserOpAsync(
      userOp,
      CONTRACT_ADDRESSES.ENTRY_POINT,
    );
    const txHash = sendResult.transactionHash;

    // Info: (20260417 - Luphia) 4. Update order to mark it as verifying with txHash
    await markOrderPaying(
      orderId,
      JSON.stringify({ verifiedVia: "async_tx", txHash }),
      txHash,
    );

    /**
     * Info: (20260417 - Luphia) 5. Generate Analysis with PAYING status FIRST
     * Using any logic directly from the generated order data.
     * Info: (20260807 - Luphia) 履行邏輯抽至 analysis_fulfillment.service（原樣搬移），
     * 與團隊額度付款路徑（team_quota_payment）共用。
     */
    const resData = await fulfillPaidAnalysisOrder(
      user.id,
      orderId,
      order.data,
    );

    // Info: (20260418 - Luphia) 6. Offload transaction verification entirely to the reliable background worker
    // Info: (20260418 - Luphia) The worker's transactionTrackerService will poll for TxHash success/reverted state seamlessly.

    // Info: (20260417 - Luphia) 7. Return instantly
    return jsonOk({
      txHash,
      orderId: orderId,
      reportId: resData.reportId,
    });
  } catch (error) {
    console.error("[API] POST blockchain_payment Error:", error);
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
