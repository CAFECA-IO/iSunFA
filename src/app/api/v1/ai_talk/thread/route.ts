import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { IThread, IFile } from "@/interfaces/ai_talk";
import { talkRepo } from "@/repositories/talk.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ChatService } from "@/services/chat.service";
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
        .filter((tagId) => tagId.threadId === thread.id)
        .map((tagId) => tags.find((tag) => tag.id === tagId.tagId)?.name)
        .filter((name): name is string => !!name);

      // Info: (20260212 - Julian) 取得與討論串關聯的按讚數、倒讚數
      const countOfLike =
        likeCounts.find((reaction) => reaction.threadId === thread.id)?._count
          ._all ?? 0;
      const countOfDislike =
        dislikeCounts.find((reaction) => reaction.threadId === thread.id)
          ?._count._all ?? 0;

      return {
        id: thread.id,
        question: thread.question,
        answer: thread.answer ?? "-",
        createdAt: new Date(thread.createdAt).getTime() / 1000,
        authorName,
        tags: threadTags,
        countOfLike,
        countOfDislike,
        countOfShare: thread._count.shares,
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
          const ops = args[0];

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
          } catch { }
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Server configuration error",
      );
    }

    const chatService = new ChatService(apiKey);

    // Info: (20260213 - Julian) 整理圖片資料發給 AI (直接從 body 取得，不經由 DB)
    const imagesForAi = files.map((f: IFile) => ({
      data: f.base64,
      mimeType: f.mimeType,
    }));

    const { answer, tags } = await chatService.askAccountTalk(
      question,
      imagesForAi,
    );

    // Info: (20260212 - Julian) 建立討論串
    const thread = await talkRepo.createThread({
      question,
      userId: author.id,
      answer: answer,
    });

    // Info: (20260226 - Julian) 建立上傳檔案並與討論串關聯
    if (files.length > 0) {
      await talkRepo.createFiles(
        files.map((file: IFile) => ({
          hash: file.hash,
          fileName: file.fileName,
          threadId: thread.id,
        })),
      );
    }

    // Info: (20260212 - Julian) 建立標籤並關聯
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await talkRepo.upsertTag(tagName);

        await talkRepo.createThreadTag(thread.id, tag.id);
      }
    }

    return jsonOk({ threadId: thread.id });
  } catch (error) {
    console.error("[API] /threads error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
