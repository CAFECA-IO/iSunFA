import { API_ERRORS } from "@/lib/utils/error_dictionary";
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
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { paymentRepo } from "@/repositories/payment.repo";
import { orderRepo } from "@/repositories/order.repo";
import { ORDER_STATUS } from "@/constants/status";
import { decodeFunctionData, keccak256, stringToBytes, parseAbi } from "viem";
import { AppError } from "@/lib/utils/error";
import { getPendingOrder } from "@/services/order.service";
import { publicClient } from "@/lib/viem_public";
import { ABIS } from "@/config/contracts";
import { webAuthnService } from "@/services/webauthn.service";
import { Prisma } from "@/generated";

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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260318 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { file, files, authentication } = body;
    const uploadFiles = files || (file ? [file] : []);

    // Info: (20260318 - Julian) 驗證 file 參數
    if (uploadFiles.length === 0) {
      console.error("Missing file or file hash");
      return jsonFail({
        code: "VA000099",
        message: "File is required",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    // Info: (20260413 - Luphia) Verify Payment Order before doing AI processing
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

        /**
         * Info: (20260418 - Luphia)
         * Removed synchronous `waitForTransactionReceipt` to prevent 45s API timeout.
         * We trust the transaction has been dispatched cleanly by blockchain_payment.
         * The background worker or asynchronous order completion handles failures.
         * Wait to complete order because multiple AI scans share the same order, so only complete it once if pending!
         */
        const existingOrder = await getPendingOrder(orderId, creator.id).catch(
          () => null,
        );
        if (existingOrder && existingOrder.status === "PENDING") {
          // Info: (20260420 - Luphia) Mark as PAID so MissionIssuer picks it up
          await paymentRepo.updateOrderStatus(orderId, ORDER_STATUS.PAID, {
            transactionHash: txHash,
          });
        }
      } else {
        const order = await getPendingOrder(orderId, creator.id).catch(
          () => null,
        );

        if (order && order.status === "PENDING") {
          await webAuthnService.verifySignature(
            sessionUser.address,
            authentication,
            order.challenge,
          );

          // Info: (20260420 - Luphia) Mark as PAID so MissionIssuer picks it up
          await paymentRepo.updateOrderStatus(orderId, ORDER_STATUS.PAID, {
            signature: JSON.stringify(authentication),
          });
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail(API_ERRORS.IS_UNKNOWN);
      }
      return jsonFail({
        code: "UN000099",
        message: String(
          `Verification failed: ${(error as Error).message}`,
        ).slice(0, 30),
        status: ApiCode.UNAUTHORIZED,
      });
    }

    const results: Array<{
      hash: string;
      journalId: string;
      voucherId: string;
      recordId: string;
    }> = [];
    const auditLogs: Array<{
      userId: string;
      dataType: "JOURNAL" | "VOUCHER" | "ESG_RECORD";
      dataId: string;
      accountBookId: string;
      action: "CREATE";
    }> = [];

    // Info: (20260318 - Julian) 將 files 存入 DB 並建立關聯
    for (const f of uploadFiles) {
      const uploadedFile = await fileRepo.createFile({
        hash: f.hash,
        fileName: f.file?.name,
      });

      if (!uploadedFile) {
        console.error("File upload failed for hash:", f.hash);
        continue;
      }

      const newJournal = await journalRepo.createJournal({
        accountBookId: accountBook.id,
        fileId: uploadedFile.id,
        text: "",
        tradingDate: new Date(),
        confidence: 0,
        isVerified: false,
        aiNote: "",
      });

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

      const newRecord = await esgRepo.createEsgRecord({
        accountBookId: accountBook.id,
        userId: creator.id,
        fileId: uploadedFile.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        tradingDate: new Date(),
        activityType: "",
        vendor: "",
        amount: 0,
        unit: "",
        emissions: 0,
        dqiScore: 0,
        aiNote: "",
        confidence: 0,
        isVerified: false,
      });

      auditLogs.push(
        {
          userId: creator.id,
          dataType: "JOURNAL",
          dataId: newJournal.id,
          accountBookId: accountBook.id,
          action: "CREATE" as const,
        },
        {
          userId: creator.id,
          dataType: "VOUCHER",
          dataId: newVoucher.id,
          accountBookId: accountBook.id,
          action: "CREATE" as const,
        },
        {
          userId: creator.id,
          dataType: "ESG_RECORD",
          dataId: newRecord.id,
          accountBookId: accountBook.id,
          action: "CREATE" as const,
        },
      );

      results.push({
        hash: f.hash,
        journalId: newJournal.id,
        voucherId: newVoucher.id,
        recordId: newRecord.id,
      });
    }

    if (auditLogs.length > 0) {
      await auditLogRepo.createManyAuditLogs(auditLogs);
    }

    try {
      const order = await orderRepo.findFirst({ where: { id: orderId } });
      if (order && order.data) {
        const orderData = order.data as Record<string, unknown>;
        if (orderData.files && Array.isArray(orderData.files)) {
          orderData.files = orderData.files.map((f: unknown) => {
            const fileObj = f as Record<string, unknown>;
            const match = results.find((r) => r.hash === fileObj.hash);
            if (match) {
              return {
                ...fileObj,
                journalId: match.journalId,
                voucherId: match.voucherId,
                esgRecordId: match.recordId,
              };
            }
            return f;
          });
          await orderRepo.update({
            where: { id: orderId },
            data: { data: orderData as Prisma.InputJsonValue },
          });
        }
      }
    } catch (e) {
      console.error("Failed to update order with generated IDs:", e);
    }

    return jsonOk({
      journalId: results[0]?.journalId,
      voucherId: results[0]?.voucherId,
      recordId: results[0]?.recordId,
      data: results,
    });
  } catch (error) {
    console.error("Error creating AI analysis:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to create AI analysis",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
