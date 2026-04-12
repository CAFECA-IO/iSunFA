import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { fileRepo } from "@/repositories/file.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { missionRepo } from "@/repositories/mission.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { missionGenerator } from "@/lib/worker/mission.generator";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
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
 * Info: (20260318 - Julian) AI 分析：生成日記帳、傳票、碳排查
 * POST /api/v1/user/account_book/:account_book_id/ai_analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260310 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260318 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const body = await request.json();
    const { file, authentication } = body;

    // Info: (20260318 - Julian) 驗證 file 參數
    if (!file) {
      console.error("Missing file or file hash");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    // Info: (20260413 - Luphia) Verify Payment Order before doing AI processing
    if (!authentication || !authentication.orderId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Order ID is required");
    }

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
            if (op.sender.toLowerCase() === sessionUser.address.toLowerCase()) {
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
              if (args.sender.toLowerCase() === sessionUser.address.toLowerCase()) {
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

        // Wait to complete order because multiple AI scans share the same order, so only complete it once if pending!
        const existingOrder = await orderGenerator.getPendingOrder(orderId, creator.id).catch(() => null);
        if (existingOrder && existingOrder.status === "PENDING") {
          await orderGenerator.completeOrder(
            orderId,
            JSON.stringify({ verifiedVia: "tx", txHash }),
            txHash,
          );
        }
      } else {
        const order = await orderGenerator.getPendingOrder(orderId, creator.id).catch(() => null);

        if (order && order.status === "PENDING") {
          await webAuthnService.verifySignature(
            sessionUser.address,
            authentication,
            order.challenge,
          );

          await orderGenerator.completeOrder(
            orderId,
            JSON.stringify(authentication),
            undefined,
          );
        }
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

    // Info: (20260318 - Julian) 將 file 存入 DB
    const uploadedFile = await fileRepo.createFile({
      hash: file.hash,
      fileName: file.file.name,
    });

    if (!uploadedFile) {
      console.error("File upload failed");
      return jsonFail(ApiCode.NOT_FOUND, "File upload failed");
    }

    // Info: (20260318 - Julian) 建立日記帳
    const newJournal = await journalRepo.createJournal({
      accountBookId: accountBook.id,
      fileId: uploadedFile.id,
      text: "",
      tradingDate: new Date(),
      confidence: 0,
      isVerified: false,
      aiNote: "",
    });

    if (!newJournal) {
      console.error("Journal creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "Journal creation failed");
    }

    // Info: (20260318 - Julian) 建立空白傳票
    const newVoucher = await voucherRepo.createVoucher({
      accountBookId: accountBook.id,
      fileId: uploadedFile.id,
      userId: creator.id,
      tradingDate: new Date(),
      note: "",
      lines: { create: [] },
      aiNote: "",
      confidence: 0,
      isVerified: false,
    });

    if (!newVoucher) {
      console.error("Voucher creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "Voucher creation failed");
    }

    // Info: (20260318 - Julian) 建立空白 ESG 紀錄
    const newRecord = await esgRepo.createEsgRecord({
      accountBookId: accountBook.id,
      userId: creator.id,
      fileId: uploadedFile.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      tradingDate: new Date(),
      activityType: "",
      vendor: "",
      rawActivityData: "",
      unit: "",
      emissions: 0,
      aiNote: "",
      confidence: 0,
      isVerified: false,
    });

    if (!newRecord) {
      console.error("ESG record creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "ESG record creation failed");
    }

    // Info: (20260318 - Julian) 新增 AuditLog
    await auditLogRepo.createManyAuditLogs([
      {
        userId: creator.id,
        dataType: "JOURNAL",
        dataId: newJournal.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
      {
        userId: creator.id,
        dataType: "VOUCHER",
        dataId: newVoucher.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
      {
        userId: creator.id,
        dataType: "ESG_RECORD",
        dataId: newRecord.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
    ]);

    // Info: (20260320 - Julian) 觸發 Mission Generator 寫入任務
    const missionDef = missionGenerator.generateMission({
      category: "document_parsing",
      periodType: "N/A", // Info: (20260320 - Julian) 憑證解析可不用
      periodValue: "N/A",
      year: new Date().getFullYear(),
      fileId: uploadedFile.id,
      fileBase64: file.base64,
      fileMimeType: file.file.type,
      accountBookId: accountBook.id,
      prerequisiteData: { accountBook },
    });

    if (missionDef) {
      await missionRepo.createMission({
        userId: creator.id,
        name: missionDef.name,
        status: AIAnalysisStatus.PENDING,
        tasks: {
          create: missionDef.tasks.map((task) => ({
            type: task.type,
            order: task.order,
            data: task.data,
            status: AIAnalysisStatus.PENDING,
          })),
        },
      });
    }

    return jsonOk({
      journalId: newJournal.id,
      voucherId: newVoucher.id,
      recordId: newRecord.id,
    });
  } catch (error) {
    console.error("Error creating AI analysis:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to create AI analysis",
    );
  }
}
