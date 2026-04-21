import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import {
  decodeFunctionData,
  keccak256,
  stringToBytes,
  parseAbi,
  decodeEventLog,
} from "viem";

import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { analysisService, IGenerateAnalysisParams } from "@/services/analysis.service";
import { webAuthnService } from "@/services/webauthn.service";
import { AppError } from "@/lib/utils/error";
import { completeOrder, failOrder, getPendingOrder } from "@/services/order.service";
import { getPeriodDateRange } from "@/lib/analysis/period";
import { publicClient } from "@/lib/viem_public";
import { ABIS } from "@/config/contracts";
import { paymentRepo } from "@/repositories/payment.repo";
import { analysisRepo, FullAnalysis } from "@/repositories/analysis.repo";
import { ORDER_TYPE } from "@/constants/status";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const {
      category,
      periodType,
      periodValue,
      year,
      country,
      keyword,
      authentication,
      isExternal,
      question,
      files,
    } = body;

    // Info: (20260128 - Luphia) Validate FIDO2 Signature OR Transaction Binding
    if (!authentication || !authentication.orderId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const orderId = authentication.orderId;
    const authWithTx = authentication as AuthenticationJSON & {
      transactionHash?: string;
    };
    const txHash = authWithTx.transactionHash;

    try {
      if (txHash) {
        // Info: (20260209 - Tzuhan) Verify Transaction Binding
        console.log(
          `[Analysis] Verifying transaction binding for Order ${orderId} in Tx ${txHash}`,
        );

        // Info: (20260209 - Tzuhan) 1. Get Transaction
        const tx = await publicClient.getTransaction({
          hash: txHash as `0x${string}`,
        });
        if (!tx) {
          throw new Error("Transaction not found");
        }

        // Info: (20260209 - Tzuhan) 2. Decode EntryPoint.handleOps
        let foundUserOp = false;
        let verifiedHash = false;

        try {
          const { args } = decodeFunctionData({
            abi: ABIS.ENTRY_POINT,
            data: tx.input,
          });
          const ops = args[0] as unknown as {
            sender: string;
            callData: `0x${string}`;
          }[];

          // Info: (20260209 - Tzuhan) 3. Find UserOp for this user
          for (const op of ops) {
            if (op.sender.toLowerCase() === user.address.toLowerCase()) {
              foundUserOp = true;
              // Info: (20260209 - Tzuhan) 4. Decode SCW.execute from callData
              // Info: (20260209 - Tzuhan) execute(address dest, uint256 value, bytes func)
              const executeAbi = parseAbi([
                "function execute(address, uint256, bytes) external",
              ]);

              const { args: executeArgs } = decodeFunctionData({
                abi: executeAbi,
                data: op.callData,
              });

              const innerCallData = executeArgs[2];

              // Info: (20260209 - Tzuhan) 5. Verify Hash
              const orderHash = keccak256(stringToBytes(orderId));
              /**
               * Info: (20260209 - Tzuhan)
               * The innerCallData should END with this hash (32 bytes = 64 hex chars)
               * innerCallData is `0x...`
               * remove 0x from orderHash
               */
              const hashHex = orderHash.slice(2).toLowerCase();
              if (innerCallData.toLowerCase().endsWith(hashHex)) {
                verifiedHash = true;
              } else {
                console.warn(
                  `[Analysis] Hash mismatch. Expected end with ${hashHex}, got data ${innerCallData}`,
                );
              }
              break;
            }
          }
        } catch (decodeError) {
          console.error(
            "[Analysis] Failed to decode transaction:",
            decodeError,
          );
          throw new Error("Invalid transaction structure");
        }

        if (!foundUserOp) {
          throw new Error(
            "No UserOperation found for this user in the transaction",
          );
        }
        if (!verifiedHash) {
          throw new Error("Transaction is not bound to this Order ID");
        }

        // Info: (20260305 - Tzuhan) Check if the UserOperation actually succeeded on-chain
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });
        if (!receipt) {
          throw new Error("Transaction receipt not found");
        }

        let userOpSuccess = false;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ABIS.ENTRY_POINT,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "UserOperationEvent") {
              const args = decoded.args as { sender: string; success: boolean };
              if (args.sender.toLowerCase() === user.address.toLowerCase()) {
                if (args.success) {
                  userOpSuccess = true;
                }
                break;
              }
            }
          } catch (e) {
            if (
              e instanceof Error &&
              e.name !== "AbiEventSignatureNotFoundError"
            ) {
              console.log(
                "[Info: (20260304 - Tzuhan)] Ignoring log decode error:",
                e,
              );
            }
          }
        }

        if (!userOpSuccess) {
          await failOrder(
            orderId,
            "UserOperation failed on-chain (e.g. out of gas or insufficient balance)",
          );
          throw new AppError({ code: "VL000099", message: "Token transfer failed on-chain", status: ApiCode.VALIDATION_ERROR });
        }

        // Info: (20260209 - Tzuhan) Mark order as complete
        await completeOrder(
          orderId,
          JSON.stringify({ verifiedVia: "tx", txHash }),
          txHash,
        );
      } else {
        // Info: (20260128 - Luphia) Fallback to Signature Verification (Legacy 2-step) or if txHash not provided

        // Info: (20260209 - Tzuhan) 1. Get Pending Order
        const order = await getPendingOrder(orderId, user.id);

        // Info: (20260209 - Tzuhan) 2. Verify Signature
        await webAuthnService.verifySignature(
          user.address,
          authentication,
          order.challenge,
        );

        // Info: (20260209 - Tzuhan) 3. Complete Order
        await completeOrder(
          orderId,
          JSON.stringify(authentication),
          undefined,
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail(API_ERRORS.IS_UNKNOWN);
      }
      console.error("Order verification failed:", error);
      return jsonFail({ code: "UN000099", message: String(`Verification failed: ${(error as Error).message}`).slice(0, 30), status: ApiCode.UNAUTHORIZED });
    }

    /**
     * Info: (20260420 - Tzuhan) [BUGFIX] Frontend uploads FIN_DATA during Order creation. 
     * We MUST fetch the Order from DB to retrieve the payload and pass it to generateAnalysis!
     */
    const orderData = await paymentRepo.getOrderById(orderId);
    if (!orderData) {
      return jsonFail(API_ERRORS.NF_ORDER);
    }

    const generateAnalysisParams: IGenerateAnalysisParams = {
      orderId,
      type: ORDER_TYPE.ANALYSIS,
      data: {
        category,
        periodType,
        periodValue,
        year,
        country,
        keyword,
        isExternal,
        question,
        files,
      }
    };
    const result = await analysisService.generateAnalysis(user.id, generateAnalysisParams);
    return jsonOk(result);
  } catch (error) {
    console.error("[API] /user/analysis error:", error);
    if (error instanceof AppError) {
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }
    return jsonFail({ code: "IS000099", message: String(error instanceof Error ? error.message : "Failed to generate analysis").slice(0, 30), status: ApiCode.INTERNAL_SERVER_ERROR });
  }
}

// Info: (20260128 - Luphia) Get analysis history for the user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260311 - Tzuhan) Fetch associated tags and related mission data
    const fullAnalyses = await analysisRepo.getFullAnalysisHistoryByUserId(
      user.id,
    );

    // Info: (20260128 - Luphia) Map DB result to response format
    const history = fullAnalyses.map((analysis: FullAnalysis) => {
      const status = analysis.order?.status?.toLowerCase() || "unknown";
      const analysisData = analysis.data as Record<string, unknown> | null;
      let periodType = "unknown";

      if (analysisData?.missionName) {
        const parts = (analysisData.missionName as string).split("-");
        if (parts.length >= 3) {
          periodType = parts[2];
        }
      }

      // Info: (20260128 - Luphia) Safely access mission data, we assume analysis.data has generatedAt
      const missionData = analysis.data as Record<
        string,
        unknown
      > | null;
      const generatedAt =
        typeof missionData?.generatedAt === "string"
          ? missionData.generatedAt.split("T")[0]
          : analysis.createdAt.toISOString().split("T")[0];

      // Info: (20260128 - Luphia) Extract period info
      const year =
        typeof missionData?.year === "number"
          ? missionData.year
          : new Date().getFullYear();
      // Info: (20260128 - Luphia) If periodType not in data, fallback to previous parsing or unknown
      let pType =
        typeof missionData?.periodType === "string"
          ? missionData.periodType
          : periodType;
      // Info: (20260128 - Luphia) If still unknown and we have parsing logic success, use it
      if (pType === "unknown" && periodType !== "unknown") {
        pType = periodType;
      }

      const orderData = analysis.order?.data as Record<string, unknown> | null;
      const pValue =
        typeof missionData?.periodValue === "string" ||
          typeof missionData?.periodValue === "number"
          ? (missionData.periodValue as string | number)
          : (orderData?.periodValue as string | number) || "";

      // Info: (20260128 - Luphia) Fallback periodType from order if unknown
      if (pType === "unknown" && typeof orderData?.periodType === "string") {
        pType = orderData.periodType;
      }

      let periodStr = "N/A";
      if (pType !== "unknown" && pValue !== "") {
        try {
          const { start, end } = getPeriodDateRange(pType, year, pValue);
          periodStr = start === end ? start : `${start} ~ ${end}`;
        } catch (e) {
          console.warn("Failed to calc date range", e);
        }
      }
      // Info: (20260311 - Tzuhan) Extract country and keyword if they exist
      const country =
        typeof missionData?.country === "string"
          ? missionData.country
          : typeof orderData?.country === "string"
            ? orderData.country
            : undefined;

      const keyword =
        typeof missionData?.keyword === "string"
          ? missionData.keyword
          : typeof orderData?.keyword === "string"
            ? orderData.keyword
            : undefined;

      const tags = analysis.tags?.map((t) => t.tag.name) || [];

      const isExternal =
        typeof missionData?.isExternal === "boolean"
          ? missionData.isExternal
          : typeof orderData?.isExternal === "boolean"
            ? orderData.isExternal
            : false;

      // Info: (20260416 - Tzuhan) Parse sharing status
      const isShared = analysis.reportShareTokens && analysis.reportShareTokens.length > 0;
      const isFinancialDataHidden = isShared ? analysis.reportShareTokens[0].isFinancialDataHidden : true;

      return {
        id: analysis.id,
        generatedAt,
        category: analysis.type,
        periodType: pType,
        period: periodStr,
        year,
        periodValue: pValue,
        status: status,
        reportId: analysis.id,
        country,
        keyword,
        tags,
        isExternal,
        isShared,
        isFinancialDataHidden,
        retryCount: typeof missionData?.retryCount === 'number' ? missionData.retryCount : 0,
      };
    });

    return jsonOk(history);
  } catch (error) {
    console.error("[API] GET /user/analysis error:", error);
    return jsonFail({ code: "IN000099", message: "Failed to fetch analysis hi...", status: ApiCode.INTERNAL_SERVER_ERROR },  );
  }
}
