import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { IThread, IFile } from "@/interfaces/ai_talk";
import { talkRepo } from "@/repositories/talk.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import {
  decodeFunctionData,
  keccak256,
  stringToBytes,
  parseAbi,
  decodeEventLog,
} from "viem";
import { AppError } from "@/lib/utils/error";
import { orderGenerator } from "@/lib/order/order.generator";
import { analysisService } from "@/services/analysis.service";
import { MISSION_STATUS } from "@/constants/status";
import { publicClient } from "@/lib/viem_public";
import { ABIS } from "@/config/contracts";
import { webAuthnService } from "@/services/webauthn.service";

/**
 * Info: (20260112 - Julian) 取得所有討論串
 * GET /api/v1/ai_talk/thread
 */
export async function GET() {
  try {
    // Info: (20260212 - Julian) 取得所有討論串
    const threads = await talkRepo.listThreadsWithCounts();

    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tagIds = await talkRepo.getThreadTagsByThreadIds(
      threads.map((thread) => thread.id),
    );
    const tags = await talkRepo.getTagsByIds(
      tagIds.map((tagId) => tagId.tagId),
    );

    // Info: (20260212 - Julian) 取得討論串的使用者
    const users = await webAuthnRepo.findUsersByIds(
      threads.map((thread) => thread.userId),
    );

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚數、倒讚數
    const reactionCounts = await talkRepo.getReactionCounts();
    const likeCounts = reactionCounts.filter(
      (reaction) => reaction.type === "LIKE",
    );
    const dislikeCounts = reactionCounts.filter(
      (reaction) => reaction.type === "DISLIKE",
    );

    // Info: (20260212 - Julian) 整理資料
    const response: IThread[] = threads.map((thread) => {
      const authorName =
        users.find((user) => user.id === thread.userId)?.name ?? "Unknown";

      // Info: (20260212 - Julian) 取得與討論串關聯的標籤名
      const threadTags = tagIds
        .filter((tagId) => tagId.analysisId === thread.id)
        .map((tagId) => tags.find((tag) => tag.id === tagId.tagId)?.name)
        .filter((name): name is string => !!name);

      const countOfLike =
        likeCounts.find((reaction) => reaction.analysisId === thread.id)?._count
          ._all ?? 0;
      const countOfDislike =
        dislikeCounts.find((reaction) => reaction.analysisId === thread.id)
          ?._count._all ?? 0;

      const data = (thread.data as unknown as { question?: string; data?: { question?: string } }) || {};
      let questionStr = "";
      if (data.question) {
        questionStr = data.question;
      } else if (data.data?.question) {
        questionStr = data.data.question;
      }

      let answerStr = "-";
      if (thread.result) {
        if (typeof thread.result === "string") {
          try {
            const parsed = JSON.parse(thread.result);
            if (parsed && typeof parsed === "object" && typeof parsed.answer === "string") {
              answerStr = parsed.answer;
            } else {
              answerStr = thread.result;
            }
          } catch {
            answerStr = thread.result;
          }
        } else {
          answerStr = ((thread.result as unknown as { answer?: string })?.answer) || JSON.stringify(thread.result);
        }
      }

      return {
        id: thread.id,
        question: questionStr,
        answer: answerStr,
        createdAt: new Date(thread.createdAt).getTime() / 1000,
        authorName,
        tags: threadTags,
        countOfLike,
        countOfDislike,
        countOfShare: thread._count.reportShareTokens,
        countOfComment: thread._count.comments,
      };
    });

    return jsonOk(response);
  } catch (error) {
    console.error("[API] /threads error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

/**
 * Info: (20260112 - Julian) 向 AI 提問(建立討論串)
 * POST /api/v1/ai_talk/thread
 */
export async function POST(request: NextRequest) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const body = await request.json();
    const { question, files = [], authentication } = body;

    if (!authentication || !authentication.orderId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Order ID is required");
    }

    if (!question) {
      console.error("Missing question");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Question is required");
    }

    const author = await webAuthnRepo.findUserByAddress(user.address);

    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.NOT_FOUND, "Author not found");
    }

    // Info: (20260408 - Luphia) Verify Payment Order before doing AI processing
    const orderId = authentication.orderId;
    const authWithTx = authentication as AuthenticationJSON & {
      transactionHash?: string;
    };
    const txHash = authWithTx.transactionHash;

    try {
      if (txHash) {
        const tx = await publicClient.getTransaction({
          hash: txHash as `0x${string}`,
        });
        if (!tx) {
          throw new Error("Transaction not found");
        }

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

          for (const op of ops) {
            if (op.sender.toLowerCase() === user.address.toLowerCase()) {
              foundUserOp = true;
              const executeAbi = parseAbi([
                "function execute(address, uint256, bytes) external",
              ]);

              const { args: executeArgs } = decodeFunctionData({
                abi: executeAbi,
                data: op.callData,
              });

              const innerCallData = executeArgs[2];

              const orderHash = keccak256(stringToBytes(orderId));
              const hashHex = orderHash.slice(2).toLowerCase();
              if (innerCallData.toLowerCase().endsWith(hashHex)) {
                verifiedHash = true;
              }
              break;
            }
          }
        } catch {
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

        // Info: (20260418 - Luphia) Wait for receipt since blockchain_payment returns txHash instantly
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          timeout: 45000,
        });
        if (!receipt) {
          throw new Error("Transaction receipt could not be acquired");
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
          } catch {
            // Ignored
          }
        }

        if (!userOpSuccess) {
          await orderGenerator.failOrder(
            orderId,
            "UserOperation failed on-chain",
          );
          throw new AppError(
            ApiCode.VALIDATION_ERROR,
            "The token transfer failed on-chain. Order cancelled.",
          );
        }

        await orderGenerator.completeOrder(
          orderId,
          JSON.stringify({ verifiedVia: "tx", txHash }),
          txHash,
        );
      } else {
        const order = await orderGenerator.getPendingOrder(orderId, user.id);

        await webAuthnService.verifySignature(
          user.address,
          authentication,
          order.challenge,
        );

        await orderGenerator.completeOrder(
          orderId,
          JSON.stringify(authentication),
          undefined,
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail(error.code, error.message);
      }
      return jsonFail(
        ApiCode.UNAUTHORIZED,
        `Verification failed: ${(error as Error).message}`,
      );
    }
    // Info: (20260418 - Luphia) 觸發背景任務 (Analysis Mission)
    const orderData = await orderGenerator.getPendingOrder(orderId, user.id);
    const generateParams = {
      ...(orderData.data as Record<string, unknown>),
      orderId: orderId,
      category: "ai_talk",
      periodType: "daily",
      periodValue: "1",
      year: new Date().getFullYear(),
      question,
      files,
      status: MISSION_STATUS.PENDING
    };

    const analysisRes = await analysisService.generateAnalysis(author.id, generateParams);

    if (!analysisRes.success || !analysisRes.data?.reportId) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Failed to start AI Task");
    }

    const analysisId = analysisRes.data.reportId;

    // Info: (20260226 - Julian) 建立上傳檔案並與討論串關聯
    if (files.length > 0) {
      await talkRepo.createFiles(
        files.map((file: IFile) => ({
          hash: file.hash,
          fileName: file.fileName,
          analysisId: analysisId,
        })),
      );
    }

    // Info: (20260212 - Julian) 建立標籤並關聯 (由背景更新，這裡暫不處理)

    return jsonOk({ threadId: analysisId });
  } catch (error) {
    console.error("[API] /threads error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
